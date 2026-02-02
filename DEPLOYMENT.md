# CareCircle Production Deployment Guide

Deploy CareCircle to production for **$0/month** using free-tier cloud services.

## Quick Start (90 Minutes)

### Prerequisites

- GitHub account with this repository
- Node.js 20+ and pnpm installed locally

---

## Step 1: Generate Production Secrets (5 min)

Before deploying, generate secure secrets:

```bash
node scripts/generate-secrets.js
```

Save the output - you'll need these values in Steps 4 and 5.

---

## Step 2: Create Free Cloud Accounts (20 min)

Sign up for these services (all have permanent free tiers):

| # | Service | Link | Purpose |
|---|---------|------|---------|
| 1 | **Neon** | [neon.tech](https://neon.tech) | PostgreSQL database (3GB free) |
| 2 | **Upstash** | [upstash.com](https://upstash.com) | Redis cache (10K cmds/day) |
| 3 | **Cloudinary** | [cloudinary.com](https://cloudinary.com) | File storage (25GB free) |
| 4 | **Render** | [render.com](https://render.com) | Backend API hosting |
| 5 | **Vercel** | [vercel.com](https://vercel.com) | Frontend hosting |

**Tip:** Sign up with GitHub for faster setup.

---

## Step 3: Database Setup - Neon (10 min)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click **"New Project"**
3. Configure:
   - Name: `carecircle-prod`
   - Region: `US East` (or closest to your users)
4. Click **"Create Project"**
5. **Copy your connection string:**
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Run Database Migrations

```bash
# Set the production DATABASE_URL
export DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require"

# Push the schema to Neon
pnpm --filter @carecircle/database db:push
```

---

## Step 4: Deploy Backend - Render (15 min)

### Option A: Blueprint Deployment (Recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New" → "Blueprint"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` and create the service
5. Add environment variables in the dashboard:

### Required Environment Variables

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `DATABASE_URL` | `postgresql://...` | Neon dashboard |
| `REDIS_HOST` | `xxx.upstash.io` | Upstash dashboard |
| `REDIS_PASSWORD` | `your-password` | Upstash dashboard |
| `UPSTASH_REDIS_REST_URL` | `https://xxx.upstash.io` | Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | `AXlk...` | Upstash dashboard |
| `JWT_SECRET` | `64-char-hex` | `node scripts/generate-secrets.js` |
| `JWT_REFRESH_SECRET` | `64-char-hex` | `node scripts/generate-secrets.js` |
| `ENCRYPTION_KEY` | `32-char-hex` | `node scripts/generate-secrets.js` |
| `CLOUDINARY_CLOUD_NAME` | `your-cloud-name` | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | `your-api-key` | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | `your-secret` | Cloudinary dashboard |
| `FRONTEND_URL` | `https://your-app.vercel.app` | After Vercel deploy |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | After Vercel deploy |

6. Click **"Create Web Service"**
7. Wait 5-10 minutes for deployment
8. Note your API URL: `https://carecircle-api.onrender.com`

### Verify API is Running

```bash
curl https://carecircle-api.onrender.com/health
# Should return: {"status":"ok","timestamp":"...","environment":"production"}
```

---

## Step 5: Deploy Frontend - Vercel (15 min)

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repository
3. Configure:
   - **Framework:** Next.js
   - **Root Directory:** `apps/web`
4. Add **Environment Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://carecircle-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `https://carecircle-api.onrender.com` |
| `NEXT_PUBLIC_APP_NAME` | `CareCircle` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | `your-cloud-name` |

5. Click **"Deploy"**
6. Wait 2-3 minutes
7. Note your URL: `https://carecircle-xxx.vercel.app`

### Update Backend CORS

Go back to Render dashboard and update:
- `FRONTEND_URL` = your Vercel URL
- `CORS_ORIGIN` = your Vercel URL

Render will auto-redeploy.

---

## Step 6: Keep Backend Awake (5 min)

Render free tier sleeps after 15 minutes. Two options:

### Option A: UptimeRobot (Recommended)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up (free)
3. Add Monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://carecircle-api.onrender.com/health`
   - **Interval:** 5 minutes
4. Done! Your API stays awake 24/7.

### Option B: GitHub Actions (Already Configured)

The repository includes `.github/workflows/keep-alive.yml` which pings every 14 minutes.

To enable:
1. Go to your GitHub repo → Settings → Secrets
2. Add secret: `API_HEALTH_URL` = `https://carecircle-api.onrender.com/health`

---

## Step 7: Verify Everything (10 min)

### Checklist

- [ ] **API Health:** `curl https://your-api.onrender.com/health` returns 200
- [ ] **Web Loads:** Open `https://your-app.vercel.app`
- [ ] **Can Register:** Create a test account
- [ ] **Can Login:** Login works
- [ ] **Database:** Data persists after logout/login

### Troubleshooting

**API returns 502/503:**
- Wait 30 seconds (cold start from sleep)
- Check Render logs for errors

**Database connection failed:**
- Verify `DATABASE_URL` has `?sslmode=require` at the end
- Check Neon dashboard for connection issues

**CORS errors:**
- Verify `FRONTEND_URL` and `CORS_ORIGIN` match your Vercel URL exactly
- Include `https://` prefix

**Images not loading:**
- Check Cloudinary credentials are correct
- Verify `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set in Vercel

---

## Cost Summary

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Vercel | 100GB bandwidth | $0 |
| Render | 750 hrs/month | $0 |
| Neon | 3GB database | $0 |
| Upstash | 10K cmds/day | $0 |
| Cloudinary | 25GB storage | $0 |
| UptimeRobot | 50 monitors | $0 |

**Total: $0/month** for up to 2,000 active users

---

## Custom Domain (Optional)

### Vercel (Frontend)
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. SSL is automatic

### Render (Backend)
1. Render Dashboard → Your Service → Settings → Custom Domain
2. Add subdomain like `api.yourdomain.com`
3. Configure DNS CNAME record
4. SSL is automatic

---

## Scaling Up

When you outgrow free tiers:

| Bottleneck | Solution | Cost |
|------------|----------|------|
| Redis (10K cmds/day) | Upstash Pro | $10/mo |
| Backend (cold starts) | Render Starter | $7/mo |
| Database (3GB) | Neon Pro | $19/mo |
| Bandwidth (100GB) | Vercel Pro | $20/mo |

---

## CI/CD Pipeline

The repository includes GitHub Actions for:

1. **Test on PR:** Runs tests before merge
2. **Deploy on Push:** Auto-deploys when you push to `deployment` branch
3. **Keep Alive:** Prevents Render sleep

### Manual Deployment

```bash
# Switch to deployment branch
git checkout deployment

# Make changes...

# Commit and push
git add .
git commit -m "Update deployment"
git push origin deployment

# Render and Vercel will auto-deploy
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `render.yaml` | Render infrastructure config |
| `apps/web/vercel.json` | Vercel deployment config |
| `env/prod.env` | Production environment template |
| `.github/workflows/deploy-production.yml` | CI/CD pipeline |
| `.github/workflows/keep-alive.yml` | Prevent Render sleep |
| `scripts/generate-secrets.js` | Generate secure secrets |

---

## Support

- **Deployment Issues:** Check service dashboards for logs
- **Code Issues:** Open a GitHub issue
- **Documentation:** See `docs/deployment/` folder

Happy deploying! 🚀

