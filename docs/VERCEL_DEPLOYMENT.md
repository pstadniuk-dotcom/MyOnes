# Vercel Deployment Guide

## Railway Backend URL
✅ **Backend deployed at:** `https://myones-production.up.railway.app`

## Deploy Frontend to Vercel

### Option 1: Vercel CLI (Recommended - Fastest)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from this directory**:
   ```bash
   vercel
   ```
   - Select your Vercel account
   - Link to existing project or create new one
   - Answer prompts (use defaults)

4. **Set environment variable**:
   ```bash
   vercel env add VITE_API_BASE production
   ```
   - When prompted, enter: `https://myones-production.up.railway.app`

5. **Redeploy with environment variable**:
   ```bash
   vercel --prod
   ```

### Option 2: Vercel Dashboard (Web UI)

1. **Go to [Vercel Dashboard](https://vercel.com/new)**

2. **Import Git Repository**:
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Choose `pstadniuk-dotcom/MyOnes` from GitHub
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist/public` (auto-detected from vercel.json)
   - **Install Command:** `npm install` (auto-detected)

4. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add variable:
     - **Name:** `VITE_API_BASE`
     - **Value:** `https://myones-production.up.railway.app`
     - **Environment:** Production (and optionally Preview/Development)

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like `https://my-ones.vercel.app`

## After Deployment

### Update OAuth Redirect URIs

Once you have your Vercel URL (e.g., `https://my-ones.vercel.app`), update OAuth apps:

1. **Oura** (if configured):
   - Go to Oura Cloud dashboard
   - Update redirect URI to: `https://myones-production.up.railway.app/api/wearables/callback/oura`

2. **Fitbit** (if configured):
   - Go to Fitbit Dev dashboard
   - Update redirect URI to: `https://myones-production.up.railway.app/api/wearables/callback/fitbit`

3. **Whoop** (if configured):
   - Go to Whoop Dev dashboard
   - Update redirect URI to: `https://myones-production.up.railway.app/api/wearables/callback/whoop`

### Test Your Deployment

Visit your Vercel URL and test:
- ✅ Homepage loads
- ✅ Sign up / Login works
- ✅ AI chat interface works
- ✅ File uploads work
- ✅ Database writes persist

## Troubleshooting

### Frontend shows "Network Error" or "Cannot connect to server"
- Check that `VITE_API_BASE` is set correctly in Vercel
- Verify Railway backend is still running
- Check browser console for CORS errors

### 404 errors on refresh
- Already fixed with `vercel.json` redirects configuration

### Build fails on Vercel
- Check build logs in Vercel dashboard
- Verify `vercel.json` and `package.json` are committed to GitHub
