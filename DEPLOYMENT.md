# Deployment Guide

This document shows how to deploy the Best Cement CRM Portal to free tier services.

## Overview
- **Backend**: Deployed to [Render.com](https://render.com) (free tier)
- **Frontend**: Deployed to [Vercel](https://vercel.com) (free tier)
- **Database**: Using your existing Neon PostgreSQL instance

## Backend Deployment (Render)

### Prerequisites
- GitHub account (to push code)
- Render account (sign up at render.com with GitHub)
- Your Neon PostgreSQL DATABASE_URL

### Steps

1. **Push code to GitHub**
   ```powershell
   cd "c:\Users\Moslem Ali Sheikh\Desktop\New folder"
   git add .
   git commit -m "Prepare for deployment"
   git push origin main  # or your branch
   ```

2. **Create Render Web Service**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` directory as root directory
   - Choose Node environment
   - Set the following environment variables:
     - `DATABASE_URL`: Your Neon connection string
       ```
       postgresql://neondb_owner:npg_Gc7vOtD4jNJI@ep-polished-bar-aif1g9ql.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
       ```
     - `JWT_SECRET`: A long random secret (e.g., `your-secret-key-here-min-32-chars`)
     - `NODE_ENV`: `production`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Click "Create Web Service"

3. **Get your backend URL**
   - After deployment, Render shows your service URL (e.g., `https://bestcement-backend.onrender.com`)
   - Copy this URL for use in frontend deployment

### Note on Free Tier
- Free Render services spin down after 15 minutes of inactivity
- First request takes ~30 seconds to wake up (acceptable for demo)
- Upgrade to paid tier if you need always-on service

---

## Frontend Deployment (Vercel)

### Prerequisites
- GitHub account (with code pushed)
- Vercel account (sign up at vercel.com with GitHub)
- Backend URL from Render (see above)

### Steps

1. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New +" → "Project"
   - Select your repository
   - Select `frontend` directory as root directory
   - Add environment variable:
     - `VITE_API_URL`: Your Render backend URL
       ```
       https://bestcement-backend.onrender.com/api
       ```
   - Click "Deploy"

2. **Get your frontend URL**
   - Vercel assigns a URL (e.g., `https://bestcement-frontend.vercel.app`)
   - Your app is live!

### Redeploy After Changes
- Push changes to GitHub
- Vercel auto-redeploys on push
- Or manually redeploy from Vercel dashboard

---

## Testing the Deployment

1. Open frontend URL in browser
2. Log in with:
   - Email: `admin@bestcement.local`
   - Password: `admin123`
3. Test dashboard, employees, dealers, and import features

---

## Troubleshooting

### Backend won't start
- Check Render logs: Dashboard → your service → "Logs"
- Verify `DATABASE_URL` environment variable is set correctly
- Make sure all npm dependencies are listed in `package.json`

### Frontend shows API errors
- Check browser console (F12 → Console)
- Verify `VITE_API_URL` environment variable is correct in Vercel
- Make sure backend is running and accessible

### Cold start slow
- First request to Render free tier takes ~30 sec (expected)
- Upgrade to paid tier to avoid this

---

## Costs

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| Render | Free | $0/month | Spins down after 15 min inactivity |
| Vercel | Free | $0/month | Always on, includes builds |
| Neon | Free | $0/month | PostgreSQL (you're already using this) |
| **Total** | | **$0/month** | No cost for demo/testing |

---

## Next Steps

### Optional Upgrades
- **Render Starter**: $7/month → always-on backend
- **Custom Domain**: $3.99/month (Vercel) or register elsewhere
- **Neon Pro**: $20+/month → more compute & storage

### Security Improvements (for production)
- Change default admin password
- Use strong `JWT_SECRET` (at least 32 random characters)
- Enable HTTPS (already done by Render/Vercel)
- Set up CORS restrictions on backend
- Use environment-specific database credentials

---

## File Changes Made

- `backend/render.yaml`: Configuration for Render deployment
- `frontend/vercel.json`: Configuration for Vercel deployment
- `backend/.env.example`: Template for backend env vars
- `frontend/.env.example`: Template for frontend env vars
- All frontend API calls updated to use `VITE_API_URL` environment variable

---

For support:
- Render docs: https://render.com/docs
- Vercel docs: https://vercel.com/docs
- Neon docs: https://neon.tech/docs
