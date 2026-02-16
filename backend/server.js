const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { run, all, init } = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const ALLOWED_ENTITIES = ['employees','dealers','subdealers','promoters'];

async function start() {
  await init();

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
    try {
      const rows = await all('SELECT * FROM admin WHERE email = $1', [email]);
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      const admin = rows[0];
      const ok = await bcrypt.compare(password, admin.password);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token });
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
          r = await run(`INSERT INTO dealers (name,address,phone,email,district,sales_promoter,dob,anniversary,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [name,address,phone,email,district,sales_promoter,dob,anniversary,meta||'',created_at]);
      } else if (entity === 'subdealers') {
        const { name, dealer_id, area, district, potential, phone, email, birthday, meta } = req.body;
        r = await run(`INSERT INTO subdealers (name,dealer_id,area,district,potential,phone,email,birthday,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [name,dealer_id || null, area || null, district || null, potential || null, phone || null, email || null, birthday || null, meta || '', created_at]);
      } else if (entity === 'employees') {
        const { name, area, district, phone, email, birthday, meta } = req.body;
          r = await run(`INSERT INTO employees (name,area,district,phone,email,birthday,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [name,area,district,phone,email,birthday,meta||'',created_at]);
      } else {
        const { name, email, phone, birthday, meta } = req.body;
          r = await run(`INSERT INTO ${entity} (name,email,phone,birthday,meta,created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [name,email,phone,birthday,meta||'',created_at]);
      }
      res.json({ id: r.lastID });
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Server error', detail: err && err.message ? err.message : String(err) });
    }
  });

  app.put('/api/:entity/:id', auth, async (req, res) => {
    const { entity, id } = req.params;
    if (!ALLOWED_ENTITIES.includes(entity)) return res.status(404).json({ error: 'Unknown entity' });
    try {
      if (entity === 'dealers') {
        const { name, address, phone, email, district, sales_promoter, dob, anniversary, meta } = req.body;
          await run(`UPDATE dealers SET name=$1,address=$2,phone=$3,email=$4,district=$5,sales_promoter=$6,dob=$7,anniversary=$8,meta=$9 WHERE id=$10`, [name,address,phone,email,district,sales_promoter,dob,anniversary,meta||'',id]);
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
      for (const e of ALLOWED_ENTITIES) {
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
