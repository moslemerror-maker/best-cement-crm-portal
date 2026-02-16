# Best Cement CRM Portal

Monorepo with `backend` (Express + SQLite) and `frontend` (Vite + React).

Quick start (from repository root):

1. Install all dependencies:

```bash
cd "c:\Users\Moslem Ali Sheikh\Desktop\New folder\backend"
npm install
cd "..\\frontend"
npm install
```

2. Start backend and frontend in separate terminals:

```powershell
# terminal 1
cd "c:\Users\Moslem Ali Sheikh\Desktop\New folder\backend"
npm run dev

# terminal 2
cd "c:\Users\Moslem Ali Sheikh\Desktop\New folder\frontend"
npm run dev
```

3. Open frontend at http://localhost:5173 and login with seeded admin:

   Email: admin@bestcement.local
   Password: admin123

Notes:
- Backend seeds an admin user and uses `data.db` in `backend` folder.
- To deploy: frontend can be built and hosted on Vercel/Netlify; backend can be deployed to Render or Railway. For production, set `JWT_SECRET` env var and move DB to a managed DB if needed.