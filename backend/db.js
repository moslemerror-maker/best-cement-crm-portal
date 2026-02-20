const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bestcement';

const pool = new Pool({ connectionString: DATABASE_URL, ssl: (process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false });

async function run(sql, params = []) {
  const client = await pool.connect();
  try {
    const isInsert = /^\s*INSERT/i.test(sql);
    let q = sql;
    if (isInsert && !/RETURNING\s+id/i.test(sql)) q = sql + ' RETURNING id';
    const res = await client.query(q, params);
    if (isInsert) {
      if (!res.rows || res.rows.length === 0) {
        throw new Error('INSERT failed: no rows returned');
      }
      return { lastID: res.rows[0].id };
    }
    return res;
  } finally {
    client.release();
  }
}

async function all(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function init() {
  // create tables with Postgres types
  await run(`CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT
  )`, []);

  await run(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMP
  )`, []);

  await run(`CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name TEXT,
    area TEXT,
    district TEXT,
    phone TEXT,
    email TEXT,
    birthday DATE,
    meta TEXT,
    created_at TIMESTAMP
  )`, []);

  await run(`CREATE TABLE IF NOT EXISTS dealers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    district TEXT,
    sales_promoter TEXT,
    dob DATE,
    anniversary DATE,
    meta TEXT,
    created_at TIMESTAMP
  )`, []);

  await run(`CREATE TABLE IF NOT EXISTS subdealers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    dealer_id INTEGER,
    area TEXT,
    district TEXT,
    potential NUMERIC,
    email TEXT,
    phone TEXT,
    birthday DATE,
    meta TEXT,
    created_at TIMESTAMP
  )`, []);

  await run(`CREATE TABLE IF NOT EXISTS promoters (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    birthday DATE,
    meta TEXT,
    created_at TIMESTAMP
  )`, []);

  // seed admin if none
  const admins = await all('SELECT * FROM admin LIMIT 1');
  if (admins.length === 0) {
    const pw = await bcrypt.hash('admin123', 10);
    await run('INSERT INTO admin (email, password) VALUES ($1, $2)', ['admin@bestcement.local', pw]);
    console.log('Seeded admin: admin@bestcement.local / admin123');
  }

  // migration: ensure dealers columns exist (for safety when migrating from old sqlite)
  try {
    const colsRes = await all(`SELECT column_name FROM information_schema.columns WHERE table_name='dealers'`);
    const colNames = colsRes.map(c=>c.column_name);
    const needed = [
      ['address','TEXT'],
      ['district','TEXT'],
      ['sales_promoter','TEXT'],
      ['dob','DATE'],
      ['anniversary','DATE'],
      ['meta','TEXT'],
      ['created_at','TIMESTAMP']
    ];
    for (const [col, type] of needed) {
      if (!colNames.includes(col)) {
        await run(`ALTER TABLE dealers ADD COLUMN ${col} ${type}`, []);
      }
    }

    // Ensure subdealers has the new columns
    try {
      const subCols = await all(`SELECT column_name FROM information_schema.columns WHERE table_name='subdealers'`);
      const subNames = subCols.map(c=>c.column_name);
      const subNeeded = [
        ['dealer_id','INTEGER'],
        ['area','TEXT'],
        ['district','TEXT'],
        ['potential','NUMERIC'],
        ['created_at','TIMESTAMP']
      ];
      for (const [col, type] of subNeeded) {
        if (!subNames.includes(col)) {
          await run(`ALTER TABLE subdealers ADD COLUMN ${col} ${type}`, []);
        }
      }
    } catch (e) {
      console.error('Failed ensuring subdealers columns', e && e.stack ? e.stack : e);
    }
  } catch (e) {
    console.error('Migration check failed for dealers', e && e.stack ? e.stack : e);
  }

  // migration: ensure users columns exist
  try {
    const userCols = await all(`SELECT column_name FROM information_schema.columns WHERE table_name='users'`);
    const userNames = userCols.map(c => c.column_name);
    const userNeeded = [
      ['name', 'TEXT'],
      ['email', 'TEXT'],
      ['password', 'TEXT'],
      ['created_at', 'TIMESTAMP']
    ];
    for (const [col, type] of userNeeded) {
      if (!userNames.includes(col)) {
        await run(`ALTER TABLE users ADD COLUMN ${col} ${type}`, []);
      }
    }
  } catch (e) {
    console.error('Migration check failed for users', e && e.stack ? e.stack : e);
  }
}

module.exports = { pool, run, all, init };
