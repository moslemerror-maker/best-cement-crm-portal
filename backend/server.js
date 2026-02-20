const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const XLSX = require('xlsx');
const { run, all, init } = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const ALLOWED_ENTITIES = ['employees','dealers','subdealers','promoters'];

async function start() {
  await init();

  // Public health endpoints for uptime monitoring (no auth)
  app.get('/', (_req, res) => {
    res.status(200).json({ ok: true, service: 'best-cement-crm-backend' });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true, status: 'up' });
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
    try {
      const adminRows = await all('SELECT * FROM admin WHERE email = $1', [email]);
      if (adminRows.length > 0) {
        const admin = adminRows[0];
        const ok = await bcrypt.compare(password, admin.password);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ token, role: 'admin', email: admin.email });
      }

      const userRows = await all('SELECT * FROM users WHERE email = $1', [email]);
      if (userRows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      const user = userRows[0];
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, role: 'user', email: user.email, name: user.name || '' });
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
    }
  });

  function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h) return res.status(401).json({ error: 'Unauthorized' });
    const parts = h.split(' ');
    if (parts.length !==2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Unauthorized' });
    try {
      const payload = jwt.verify(parts[1], JWT_SECRET);
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  }

  app.get('/api/me', auth, async (req, res) => {
    res.json({ id: req.user.id, email: req.user.email, role: req.user.role || 'user' });
  });

  // Helper function to safely get value from row with multiple possible column names (case-insensitive)
  function getValue(row, possibleKeys) {
    // Create a normalized map of all row keys (trim and lowercase)
    const normalizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      const trimmedKey = key.trim();
      normalizedRow[trimmedKey.toLowerCase()] = value;
    }
    
    // Try to find matching key
    for (const key of possibleKeys) {
      const normalizedKey = key.trim().toLowerCase();
      if (normalizedRow[normalizedKey] !== undefined && normalizedRow[normalizedKey] !== null && normalizedRow[normalizedKey] !== '') {
        return normalizedRow[normalizedKey]?.toString().trim() || '';
      }
    }
    return '';
  }

  // Helper function to format dates from Excel
  function formatDate(dateValue) {
    if (!dateValue) return '';
    
    // If it's already a string in proper format
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return dateValue;
    }
    
    // If it's a number (Excel serial date)
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return '';
  }

  // Convert formatted date ('' or 'YYYY-MM-DD') to SQL-safe value (null or string)
  function dateOrNull(formattedDate) {
    if (!formattedDate || formattedDate === '') return null;
    return formattedDate;
  }

  // Bulk import from Excel (MUST be before generic :entity routes)
  app.post('/api/import', auth, upload.fields([{ name: 'dealers', maxCount: 1 }, { name: 'employees', maxCount: 1 }]), async (req, res) => {
    try {
      const result = { dealers: { inserted: 0, skipped: 0, details: [] }, employees: { inserted: 0, skipped: 0, details: [] } };
      
      // Import dealers if file provided
      if (req.files && req.files.dealers) {
        const workbook = XLSX.read(req.files.dealers[0].buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        console.log('📊 Dealers sheet columns:', Object.keys(rows[0] || {}));
        
        for (const row of rows) {
          try {
            const name = getValue(row, ['name']);
            const phone = getValue(row, ['phoneNo', 'phone']);
            
            if (!name || !phone) {
              result.dealers.skipped++;
              result.dealers.details.push({ status: 'skipped', reason: !name ? 'missing name' : 'missing phone', row });
              continue;
            }
            
            // Check for duplicates
            const exists = await all('SELECT id FROM dealers WHERE phone = $1', [phone]);
            if (exists.length > 0) {
              result.dealers.skipped++;
              result.dealers.details.push({ status: 'skipped', reason: 'duplicate phone', phone, row });
              continue;
            }
            
            const email = getValue(row, ['email', 'email id']) || '';
            const address = getValue(row, ['address']) || '';
            const district = getValue(row, ['region', 'district']) || '';
            const sales_promoter = getValue(row, ['associatedSalesmanName', 'salesman', 'sales_promoter']) || '';
            const dobFormatted = formatDate(getValue(row, ['dateOfBirth', 'dob', 'birthday']));
            const dob = dateOrNull(dobFormatted);
            const anniversaryFormatted = formatDate(getValue(row, ['anniversaryDate', 'anniversary']));
            const anniversary = dateOrNull(anniversaryFormatted);
            const meta = JSON.stringify({
              pinCode: getValue(row, ['pinCode']) || '',
              latitude: getValue(row, ['latitude']) || '',
              longitude: getValue(row, ['longitude']) || '',
              area: getValue(row, ['area']) || '',
              originalId: getValue(row, ['id']) || ''
            });
            
            const created_at = new Date().toISOString();
            await run(
              `INSERT INTO dealers (name, address, phone, email, district, sales_promoter, dob, anniversary, meta, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [name, address, phone, email, district, sales_promoter, dob, anniversary, meta, created_at]
            );
            result.dealers.inserted++;
            result.dealers.details.push({ status: 'inserted', name, phone });
          } catch (err) {
            console.error('Dealer insert error:', err.message);
            result.dealers.skipped++;
          }
        }
      }
      
      // Import employees if file provided
      if (req.files && req.files.employees) {
        const workbook = XLSX.read(req.files.employees[0].buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        console.log('👥 Employees sheet columns:', Object.keys(rows[0] || {}));
        
        for (let i = 0; i < rows.length; i++) {
          let row = null;
          try {
            row = rows[i];
            const name = getValue(row, ['Name', 'name']) || '';
            const phone = getValue(row, ['Phone', 'phone', 'phoneNo']) || '';
            
            if (i < 3) {
              console.log(`Row ${i}:`, { name, phone, allKeys: Object.keys(row) });
            }
            
            if (!name) {
              if (i < 3) console.log(`  → Skipped: Missing name`);
              result.employees.skipped++;
              result.employees.details.push({ rowIndex: i, status: 'skipped', reason: 'missing name', row });
              continue;
            }

            if (!phone) {
              if (i < 3) console.log(`  → Skipped: Missing phone`);
              result.employees.skipped++;
              result.employees.details.push({ rowIndex: i, status: 'skipped', reason: 'missing phone', row });
              continue;
            }
            
            // Check for duplicates  
            const exists = await all('SELECT id FROM employees WHERE phone = $1', [phone]);
            if (exists.length > 0) {
              result.employees.skipped++;
              result.employees.details.push({ rowIndex: i, status: 'skipped', reason: 'duplicate phone', phone, row });
              continue;
            }
            
            const email = getValue(row, ['email id', 'email', 'Email']) || '';
            const area = getValue(row, ['Zone', 'zone', 'area', 'Area']) || '';
            const district = '';
            const birthdayFormatted = formatDate(getValue(row, ['DOJ', 'doj', 'birthday', 'dateOfBirth']));
            const birthday = dateOrNull(birthdayFormatted);
            const meta = JSON.stringify({
              designation: getValue(row, ['Designation', 'designation']) || '',
              doj: formatDate(getValue(row, ['DOJ', 'doj'])) || '',
              originalId: getValue(row, ['Employee id', 'id']) || ''
            });
            
            const created_at = new Date().toISOString();
            await run(
              `INSERT INTO employees (name, area, district, phone, email, birthday, meta, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [name, area, district, phone, email, birthday, meta, created_at]
            );
            result.employees.inserted++;
            result.employees.details.push({ rowIndex: i, status: 'inserted', name, phone });
            if (i < 3) console.log(`  ✓ Inserted: ${name}`);
          } catch (err) {
            console.error('Employee insert error:', err && err.stack ? err.stack : err);
            result.employees.skipped++;
            result.employees.details.push({ rowIndex: i, status: 'error', reason: err && err.message ? err.message : String(err), row });
          }
        }
      }
      
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Import failed: ' + err.message });
    }
  });

  // User management (admin only)
  app.get('/api/users', auth, requireAdmin, async (_req, res) => {
    try {
      const rows = await all('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC NULLS LAST');
      res.json(rows);
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
    }
  });

  app.post('/api/users', auth, requireAdmin, async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing name/email/password' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    try {
      const existing = await all('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.length > 0) return res.status(409).json({ error: 'User with this email already exists' });
      const hashed = await bcrypt.hash(password, 10);
      const created_at = new Date().toISOString();
      const r = await run('INSERT INTO users (name, email, password, created_at) VALUES ($1, $2, $3, $4)', [name, email, hashed, created_at]);
      res.json({ id: r.lastID, ok: true });
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
    }
  });

  app.put('/api/users/:id', auth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Missing name/email' });
    try {
      const existing = await all('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (existing.length > 0) return res.status(409).json({ error: 'User with this email already exists' });

      if (password && password.trim().length > 0) {
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
        const hashed = await bcrypt.hash(password, 10);
        await run('UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4', [name, email, hashed, id]);
      } else {
        await run('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, email, id]);
      }

      res.json({ ok: true });
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
    }
  });

  app.delete('/api/users/:id', auth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      if (String(req.user.id) === String(id)) {
        return res.status(400).json({ error: 'Admin cannot delete own account' });
      }
      await run('DELETE FROM users WHERE id = $1', [id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
    }
  });

  // CRUD for entities
  app.get('/api/:entity', auth, async (req, res) => {
    const { entity } = req.params;
    if (!ALLOWED_ENTITIES.includes(entity)) return res.status(404).json({ error: 'Unknown entity' });
    try {
        // PostgreSQL uses created_at as timestamp; ensure ordering
        const rows = await all(`SELECT * FROM ${entity} ORDER BY created_at DESC NULLS LAST`);
        res.json(rows);
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
    }
  });

  app.post('/api/:entity', auth, async (req, res) => {
    const { entity } = req.params;
    if (!ALLOWED_ENTITIES.includes(entity)) return res.status(404).json({ error: 'Unknown entity' });
    try {
      const created_at = new Date().toISOString();
      let r;
      if (entity === 'dealers') {
        const { name, address, phone, email, district, sales_promoter, dob, anniversary, meta } = req.body;
        if (!name || !phone) return res.status(400).json({ error: 'Dealers require name and phone' });
        console.log('Dealers POST:', { name, address, phone, email, district, sales_promoter, dob, anniversary });
        r = await run(`INSERT INTO dealers (name,address,phone,email,district,sales_promoter,dob,anniversary,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [name,address,phone,email,district,sales_promoter,dob,anniversary,meta||'',created_at]);
      } else if (entity === 'subdealers') {
        const { name, dealer_id, area, district, potential, phone, email, birthday, meta } = req.body;
        if (!name || !phone) return res.status(400).json({ error: 'SubDealers require name and phone' });
        console.log('SubDealers POST:', { name, dealer_id, area, district, potential, phone, email, birthday });
        r = await run(`INSERT INTO subdealers (name,dealer_id,area,district,potential,phone,email,birthday,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [name,dealer_id || null, area || null, district || null, potential || null, phone || null, email || null, birthday || null, meta || '', created_at]);
      } else if (entity === 'employees') {
        const { name, area, district, phone, email, birthday, meta } = req.body;
        if (!name || !phone) return res.status(400).json({ error: 'Employees require name and phone' });
        console.log('Employees POST:', { name, area, district, phone, email, birthday });
        r = await run(`INSERT INTO employees (name,area,district,phone,email,birthday,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [name,area,district,phone,email,birthday,meta||'',created_at]);
      } else {
        const { name, email, phone, birthday, meta } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        console.log('Other entity POST:', { entity, name, email, phone, birthday });
        r = await run(`INSERT INTO ${entity} (name,email,phone,birthday,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [name,email,phone,birthday,meta||'',created_at]);
      }
      res.json({ id: r.lastID });
    } catch (err) {
      console.error('POST error:', err && err.stack ? err.stack : err);
      const msg = err && err.message ? err.message : String(err);
      res.status(500).json({ error: 'Server error: ' + msg });
    }
  });

  app.put('/api/:entity/:id', auth, async (req, res) => {
    const { entity, id } = req.params;
    if (!ALLOWED_ENTITIES.includes(entity)) return res.status(404).json({ error: 'Unknown entity' });
    try {
      if (entity === 'dealers') {
        const { name, address, phone, email, district, sales_promoter, dob, anniversary, meta } = req.body;
          await run(`UPDATE dealers SET name=$1,address=$2,phone=$3,email=$4,district=$5,sales_promoter=$6,dob=$7,anniversary=$8,meta=$9 WHERE id=$10`, [name,address,phone,email,district,sales_promoter,dob,anniversary,meta||'',id]);
      } else if (entity === 'subdealers') {
        const { name, dealer_id, area, district, potential, phone, email, birthday, meta } = req.body;
          await run(`UPDATE subdealers SET name=$1,dealer_id=$2,area=$3,district=$4,potential=$5,phone=$6,email=$7,birthday=$8,meta=$9 WHERE id=$10`, [name,dealer_id || null, area || null, district || null, potential || null, phone || null, email || null, birthday || null, meta||'',id]);
      } else if (entity === 'employees') {
        const { name, area, district, phone, email, birthday, meta } = req.body;
          await run(`UPDATE employees SET name=$1,area=$2,district=$3,phone=$4,email=$5,birthday=$6,meta=$7 WHERE id=$8`, [name,area,district,phone,email,birthday,meta||'',id]);
      } else {
        const { name, email, phone, birthday, meta } = req.body;
          await run(`UPDATE ${entity} SET name=$1,email=$2,phone=$3,birthday=$4,meta=$5 WHERE id=$6`, [name,email,phone,birthday,meta||'',id]);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/:entity/:id', auth, async (req, res) => {
    const { entity, id } = req.params;
    if (!ALLOWED_ENTITIES.includes(entity)) return res.status(404).json({ error: 'Unknown entity' });
    try {
        await run(`DELETE FROM ${entity} WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // birthdays across all entities for next N days
  app.get('/api/birthdays', auth, async (req, res) => {
    const days = parseInt(req.query.days || '7', 10);
    try {
      const results = [];
      
      // Get birthdays from dealers (use 'dob' column)
      const dealerRows = await all(`SELECT id,name,dob as birthday,phone,email FROM dealers WHERE dob IS NOT NULL AND dob != ''`);
      for (const r of dealerRows) {
        results.push({ entity: 'dealers', ...r });
      }
      
      // Get birthdays from other entities (use 'birthday' column)
      for (const e of ['subdealers','employees','promoters']) {
        const rows = await all(`SELECT id,name,birthday,phone,email FROM ${e} WHERE birthday IS NOT NULL AND birthday != ''`);
        for (const r of rows) {
          results.push({ entity: e, ...r });
        }
      }
      
      // compute upcoming birthdays
      const today = new Date();
      function nextBirthdayDate(bday) {
        // bday expected YYYY-MM-DD or YYYY/MM/DD
        const parts = bday.split(/[-/]/).map(Number);
        if (parts.length < 3) return null;
        const month = parts[1]-1;
        const day = parts[2];
        let nb = new Date(today.getFullYear(), month, day);
        if (nb < today) nb = new Date(today.getFullYear()+1, month, day);
        return nb;
      }
      const upcoming = results.map(r => {
        const nb = nextBirthdayDate(r.birthday);
        if (!nb) return null;
        const diffDays = Math.ceil((nb - today) / (1000*60*60*24));
        return { ...r, nextBirthday: nb.toISOString().slice(0,10), daysAway: diffDays };
      }).filter(x=>x && x.daysAway <= days).sort((a,b)=>a.daysAway - b.daysAway);
      res.json(upcoming);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // handle subdealers insert with more fields
  // (note: POST /api/:entity already covers 'subdealers' via generic handler,
  // but we add explicit support in case of additional columns)

  app.listen(PORT, () => {
    console.log(`Backend listening on ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start', err);
});
