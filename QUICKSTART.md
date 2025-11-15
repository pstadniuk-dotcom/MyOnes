# 🚀 Quick Start - Deploy ONES AI

## Current Status
✅ **Code is ready** - All files in place, 28 database tables defined  
⚠️ **Database**: Currently using Neon (working), need to migrate to Supabase  
⚠️ **Hosting**: Need to deploy to Railway (backend) + Vercel (frontend)

---

## Option A: Quick Deploy (Keep Neon - Easiest!)

If you want to deploy quickly with your existing Neon database:

### 1. Deploy Backend to Railway
```bash
# Railway will auto-detect from package.json
1. Go to https://railway.app/new
2. Connect GitHub: pstadniuk-dotcom/MyOnes
3. Add environment variables (copy from server/.env)
4. Deploy!
```

### 2. Deploy Frontend to Vercel
```bash
1. Go to https://vercel.com/new
2. Connect GitHub: pstadniuk-dotcom/MyOnes
3. Set environment variable:
   VITE_API_BASE=https://your-railway-url.railway.app
4. Deploy!
```

**Done!** Your app is live. Total time: ~10 minutes.

---

## Option B: Full Migration to Supabase

### Prerequisites
- [ ] Supabase account (https://supabase.com)
- [ ] Railway account (https://railway.app)
- [ ] Vercel account (https://vercel.com)

### Step 1: Create Supabase Project (5 min)

1. **Create project** at https://supabase.com/dashboard
   - Name: `ones-ai-prod`
   - Region: Choose closest to you
   - Password: Save it somewhere safe!

2. **Get connection string**
   - Go to Settings → Database
   - Copy "Connection pooling" string
   - Should look like:
     ```
     postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
     ```

3. **Update your .env**
   ```bash
   # Edit server/.env
   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

4. **Push schema to Supabase**
   ```bash
   npm run db:push
   ```

5. **Verify it worked**
   ```bash
   npm run test:db
   # Should show 28 tables created
   ```

### Step 2: Migrate Data from Neon (Optional, 5 min)

Only if you want to keep existing data:

```bash
# Make sure you've updated server/.env with Supabase URL first!
./migrate-to-supabase.sh
```

### Step 3: Deploy to Railway (10 min)

1. **Create Railway project**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select: `pstadniuk-dotcom/MyOnes`

2. **Add environment variables**
   - Click on your service → Variables tab
   - Add these (copy from `server/.env`):
   
   ```bash
   # Required
   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
   JWT_SECRET=a5f6f9ef65acd0b74b6bc0d81e0768e701e339a549aa730fec04532fa1e76134
   SESSION_SECRET=wearable-oauth-secret-change-in-production
   NODE_ENV=production
   PORT=5000
   
   # AI (copy your keys)
   OPENAI_API_KEY=sk-proj-...
   ANTHROPIC_API_KEY=sk-ant-...
   
   # Email/SMS (copy your keys)
   SENDGRID_API_KEY=SG...
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM=+1...
   
   # Wearables (copy your keys)
   OURA_CLIENT_ID=...
   OURA_CLIENT_SECRET=...
   FITBIT_CLIENT_ID=...
   FITBIT_CLIENT_SECRET=...
   ```

3. **Deploy**
   - Railway auto-deploys on git push
   - Wait for build to complete (~2 minutes)
   - Copy your Railway URL: `https://myones-production.up.railway.app`

### Step 4: Deploy to Vercel (5 min)

1. **Create Vercel project**
   - Go to https://vercel.com/new
   - Import Git Repository: `pstadniuk-dotcom/MyOnes`
   - Framework: Vite (auto-detected)

2. **Add environment variables**
   ```bash
   VITE_API_BASE=https://myones-production.up.railway.app
   VITE_ENABLE_WEARABLES=true
   VITE_APP_ENV=production
   ```

3. **Deploy**
   - Click "Deploy"
   - Wait for build (~2 minutes)
   - Your app is live!

### Step 5: Update OAuth Redirects (5 min)

Update redirect URIs for wearable integrations:

**Oura** (https://cloud.ouraring.com/oauth/applications)
```
https://myones-production.up.railway.app/api/wearables/callback/oura
```

**Fitbit** (https://dev.fitbit.com/apps)
```
https://myones-production.up.railway.app/api/wearables/callback/fitbit
```

### Step 6: Test Everything (10 min)

- [ ] Visit your Vercel URL
- [ ] Sign up for a new account
- [ ] Log in
- [ ] Start AI chat
- [ ] Upload a lab report
- [ ] Create a formula
- [ ] Check database in Supabase (should see new user)

---

## Helpful Commands

```bash
# Test database connection
npm run test:db

# Push schema changes
npm run db:push

# Check deployment readiness
node check-deployment.mjs

# Migrate from Neon to Supabase
./migrate-to-supabase.sh

# Local development
npm run dev

# Build for production
npm run build
```

---

## Troubleshooting

### "Database connection failed"
```bash
# Run diagnostic
npm run test:db

# Check your DATABASE_URL in server/.env
# Make sure it ends with ?sslmode=require
```

### "Railway build failed"
- Check build logs in Railway dashboard
- Verify all environment variables are set
- Make sure PORT=5000 is set

### "Vercel build failed"
- Check build logs in Vercel dashboard
- Verify VITE_API_BASE is set correctly
- Test local build: `npm run build`

### "API calls return 404"
- Check VITE_API_BASE in Vercel env vars
- Make sure Railway URL is correct
- Check CORS settings in server/index.ts

### "AI not responding"
- Check OPENAI_API_KEY or ANTHROPIC_API_KEY in Railway
- Verify API key is valid
- Check Railway logs for errors

---

## What You Get

### Free Tier Costs
- Supabase: Free (500MB database, 2GB egress)
- Railway: $5/month (Hobby plan, 500 execution hours)
- Vercel: Free (unlimited bandwidth on Hobby)

**Total: ~$5/month**

### URLs You'll Get
- **Frontend**: `https://myones-xxx.vercel.app` (or your custom domain)
- **Backend API**: `https://myones-production-xxx.railway.app`
- **Database**: Supabase dashboard access

---

## Next Steps After Deployment

1. **Custom Domain** (Optional)
   - Vercel: Add `myones.ai`
   - Railway: Add `api.myones.ai`

2. **Monitoring**
   - Railway: Check logs and metrics
   - Vercel: Check analytics
   - Supabase: Monitor database usage

3. **Backups**
   - Supabase: Enable automated backups (Settings → Database → Backups)
   - Keep a local backup: `pg_dump DATABASE_URL > backup.sql`

---

Need help? Check:
- DEPLOYMENT_GUIDE.md (detailed guide)
- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
