# 🚀 ONES AI - Deployment Migration Guide

## Current Status
- ✅ **Database**: Neon (with all tables populated)
- ⚠️ **Target**: Migrate to Supabase + Railway + Vercel

## Step-by-Step Migration Plan

### Part 1: Supabase Setup

#### 1.1 Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization: **Your Org**
4. Project name: `ones-ai-prod` (or `ones-ai-dev` for testing)
5. Database password: **Choose a strong password** (save it!)
6. Region: Choose closest to your users (e.g., `us-west-1`)
7. Click "Create new project" (takes ~2 minutes)

#### 1.2 Get Connection String
1. Once created, go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **Connection pooling** (recommended for production)
4. Copy the **Connection string** (URI format)
5. It should look like:
   ```
   postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

#### 1.3 Update Your .env File
```bash
# In server/.env, update:
DATABASE_URL=postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

#### 1.4 Push Schema to Supabase
```bash
npm run db:push
```

This will create all 28 tables in your new Supabase database.

---

### Part 2: Railway Setup (Backend API)

#### 2.1 Install Railway CLI (Optional)
```bash
npm install -g @railway/cli
railway login
```

OR use the Railway dashboard at https://railway.app

#### 2.2 Create Railway Project
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select repository: `pstadniuk-dotcom/MyOnes`
5. Click "Deploy Now"

#### 2.3 Configure Environment Variables
In Railway dashboard → Your Project → Variables, add:

**Required:**
```
DATABASE_URL=postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=a5f6f9ef65acd0b74b6bc0d81e0768e701e339a549aa730fec04532fa1e76134
NODE_ENV=production
PORT=5000
```

**AI Services:**
```
OPENAI_API_KEY=sk-proj-SXSpLaMKz_HSQ6FQb7eEa...
ANTHROPIC_API_KEY=sk-ant-api03-bcKDAD13XQ5LDYstGRswmH1u...
```

**Email/SMS:**
```
SENDGRID_API_KEY=SG.8qVQzg1wROChUoVJJtRXaA...
TWILIO_ACCOUNT_SID=AC...  # Get from Twilio Console
TWILIO_AUTH_TOKEN=...     # Get from Twilio Console
TWILIO_FROM=+1...         # Your Twilio phone number
```

**OAuth (Wearables):**
```
OURA_CLIENT_ID=1dda21d4-1ac6-4e3f-b177-97750c0f7d4f
OURA_CLIENT_SECRET=NJU6wrINp-8PojFves_kKw7FBWw5-ocOowjtlccqd00
FITBIT_CLIENT_ID=23TPXB
FITBIT_CLIENT_SECRET=0060b86f49357dd224c84501ff957f62
SESSION_SECRET=your-session-secret-here-change-in-production
```

**Google Cloud Storage (for file uploads):**
```
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json
GCS_BUCKET_NAME=ones-ai-uploads
```

#### 2.4 Configure Build Settings
In Railway → Settings → Build:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Root Directory**: Leave empty (monorepo root)

#### 2.5 Deploy
Railway will auto-deploy. You'll get a URL like:
```
https://myones-production.up.railway.app
```

---

### Part 3: Vercel Setup (Frontend)

#### 3.1 Create Vercel Project
1. Go to https://vercel.com/new
2. Import Git Repository
3. Select: `pstadniuk-dotcom/MyOnes`
4. Framework Preset: **Vite**
5. Root Directory: Leave as `./` (we have vercel.json configured)

#### 3.2 Configure Environment Variables
In Vercel → Settings → Environment Variables:

```
VITE_API_BASE=https://myones-production.up.railway.app
VITE_ENABLE_WEARABLES=true
VITE_APP_ENV=production
```

**⚠️ CRITICAL:** The `VITE_API_BASE` variable is **required** for the frontend to communicate with the backend.
- Must be an absolute URL (include `https://`)
- Must point to your Railway backend URL
- If missing, the build will fail with a validation error
- See [Login/Signup Troubleshooting Guide](docs/LOGIN_SIGNUP_TROUBLESHOOTING.md) if you encounter issues

#### 3.3 Build Settings (Auto-detected from vercel.json)
- Build Command: `npm run build`
- Output Directory: `dist/public`
- Install Command: `npm install`

#### 3.4 Deploy
Click "Deploy" - Vercel will build and deploy your frontend.

---

### Part 4: Data Migration (Optional - If keeping Neon data)

If you want to migrate existing data from Neon to Supabase:

#### Option A: pg_dump (Recommended)
```bash
# Dump from Neon
pg_dump "postgresql://neondb_owner:npg_QAi9ZGyEvIs6@ep-curly-frog-a6aeyl2v.us-west-2.aws.neon.tech/neondb" > neon-backup.sql

# Restore to Supabase
psql "postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" < neon-backup.sql
```

#### Option B: Fresh Start
Just push the schema and start fresh (if this is dev/testing data).

---

### Part 5: Post-Deployment Checklist

#### 5.1 Test the Full Stack
- [ ] Vercel frontend loads
- [ ] Can sign up/login
- [ ] API calls work (check Network tab)
- [ ] Database writes work
- [ ] File uploads work (GCS)
- [ ] AI chat works
- [ ] Email notifications work
- [ ] SMS works (if enabled)

#### 5.2 Update OAuth Redirect URIs
For each wearable provider:
1. Oura: https://cloud.ouraring.com/oauth/applications
2. Fitbit: https://dev.fitbit.com/apps
3. Whoop: Update redirect URIs to:
   ```
   https://myones-production.up.railway.app/api/wearables/callback/[provider]
   ```

#### 5.3 Configure Custom Domain (Optional)
**Vercel (Frontend):**
- Add domain: `myones.ai`
- Point DNS: CNAME to `cname.vercel-dns.com`

**Railway (Backend API):**
- Add domain: `api.myones.ai`
- Point DNS: CNAME to Railway's provided CNAME

#### 5.4 Set up CORS (If needed)
In `server/index.ts`, update CORS to allow your Vercel domain:
```typescript
app.use(cors({
  origin: ['https://myones.ai', 'https://www.myones.ai'],
  credentials: true
}));
```

---

## Troubleshooting

### Login/Signup Issues ⚠️
**Most Common Issue:** Missing or incorrect `VITE_API_BASE` configuration

If users cannot log in or sign up:
1. Check that `VITE_API_BASE` is set in Vercel environment variables
2. Verify the URL is correct (should be your Railway backend URL)
3. See detailed guide: **[Login/Signup Troubleshooting Guide](docs/LOGIN_SIGNUP_TROUBLESHOOTING.md)**

### Database Connection Issues
Run the diagnostic script:
```bash
node test-supabase.mjs
```

### Railway Build Fails
- Check build logs in Railway dashboard
- Verify all dependencies are in package.json
- Check Node version compatibility

### Vercel Build Fails
- **If build fails with environment variable error:** This is expected! Set `VITE_API_BASE` in Vercel
- Check build logs for specific errors
- Verify VITE_API_BASE is set correctly
- Check that client build works locally: `VITE_API_BASE=https://your-backend.up.railway.app npm run build`

### API Calls Fail (CORS)
- Add Railway URL to CORS whitelist
- Check browser console for errors
- Verify VITE_API_BASE in Vercel env vars
- See [Login/Signup Troubleshooting Guide](docs/LOGIN_SIGNUP_TROUBLESHOOTING.md)

---

## Migration Commands Quick Reference

```bash
# Test Supabase connection
node test-supabase.mjs

# Push schema to Supabase
npm run db:push

# Local development
npm run dev

# Build for production
npm run build

# Deploy Railway (auto on git push)
git push origin main

# Deploy Vercel (auto on git push)
git push origin main
```

---

## Cost Estimates (Approximate)

- **Supabase Free Tier**: $0/month (up to 500MB DB, 2GB bandwidth)
- **Railway Hobby**: $5/month (includes 500 hours execution)
- **Vercel Hobby**: $0/month (free for personal projects)

**Total**: ~$5/month for hobby tier, or $0 if using all free tiers

---

## Need Help?

If you run into issues:
1. Check Railway/Vercel build logs
2. Run diagnostic script: `node test-supabase.mjs`
3. Check environment variables are set correctly
4. Verify database schema is pushed: `npm run db:push`

---

Last updated: November 15, 2025
