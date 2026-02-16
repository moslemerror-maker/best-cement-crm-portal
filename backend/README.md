# Backend (Express + SQLite)

Run from `backend` folder:

```bash
npm install
# set DATABASE_URL for Postgres (see Neon instructions below) or run a local Postgres
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
npm run dev   # or npm start
```

Default admin seeded: `admin@bestcement.local / admin123`

Neon (Postgres) instructions:

- Create a Neon project and database at https://neon.tech and copy the provided Postgres connection string.
- In PowerShell set the env var for the shell session:

```powershell
$Env:DATABASE_URL = 'postgresql://<user>:<pass>@<host>/<db>?sslmode=require'
npm run dev
```

- The server will run migrations on startup and seed the admin user.

Change `JWT_SECRET` in environment for production.
