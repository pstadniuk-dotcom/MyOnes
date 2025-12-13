# Login/Signup Troubleshooting Guide

## Overview
This guide helps diagnose and fix issues with login and signup functionality in the ONES AI application, particularly in production deployments.

## Common Issue: Missing VITE_API_BASE

### Symptoms
- Login/signup buttons don't work
- Network errors in browser console
- "Cannot connect to server" messages
- API calls fail with 404 or connection errors
- Users see blank pages or error messages after clicking login/signup

### Root Cause
The `VITE_API_BASE` environment variable is not configured correctly in your deployment platform (Vercel). This variable tells the frontend where to find the backend API server.

### Quick Fix for Vercel Deployments

#### Step 1: Check Current Configuration
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (e.g., "my-ones")
3. Click **Settings** → **Environment Variables**
4. Look for `VITE_API_BASE`

#### Step 2: Add or Update VITE_API_BASE
If the variable is missing or incorrect:

1. Click **Add New** (or edit existing)
2. **Key:** `VITE_API_BASE`
3. **Value:** Your Railway backend URL
   - Format: `https://your-project-name.up.railway.app`
   - Example: `https://myones-production.up.railway.app`
   - ⚠️ Must include `https://`
   - ⚠️ No trailing slash
4. **Environments:** Select all (Production, Preview, Development)
5. Click **Save**

#### Step 3: Redeploy
After adding/updating the variable:
1. Go to **Deployments** tab
2. Click the three dots (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2-3 minutes)

#### Step 4: Verify Fix
1. Visit your Vercel URL (e.g., `https://my-ones.vercel.app`)
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. Look for: `✅ API configured: https://...`
5. Try logging in - it should now work!

---

## Validation Systems

Our application has **three layers** of validation to catch this issue:

### 1. Build-Time Validation
**When:** During `npm run build` or Vercel deployment  
**What:** Vite plugin checks if `VITE_API_BASE` is set  
**Result:** Build fails with clear error message if missing

**Example Output:**
```
🔍 Validating environment variables for production build...

❌ VITE_API_BASE is not set or is empty
   This variable is required for production deployment.

💡 To fix these issues:
   1. Set the missing environment variables in your deployment platform
   2. For Vercel: Project Settings → Environment Variables
   ...
```

### 2. Runtime Validation
**When:** When the app loads in the browser  
**What:** JavaScript code checks configuration on startup  
**Result:** Console errors and warnings if invalid

**Example Console Output:**
```javascript
❌ CRITICAL ERROR: VITE_API_BASE environment variable is not set!

This means the frontend cannot communicate with the backend.
API calls will fail because they have no target server.

To fix this in Vercel:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add VITE_API_BASE with your Railway backend URL
   Example: https://myones-production.up.railway.app
4. Redeploy your application

See DEPLOYMENT_GUIDE.md for detailed instructions.
```

### 3. User-Facing Error Page
**When:** App detects invalid configuration  
**What:** Shows helpful error page instead of broken UI  
**Result:** Clear instructions for users and administrators

---

## Advanced Troubleshooting

### Issue: Build Succeeds but Login Still Fails

**Possible Causes:**
1. ❌ Railway backend is down
2. ❌ CORS misconfiguration
3. ❌ Wrong Railway URL in VITE_API_BASE
4. ❌ Database connection issues

**Diagnostic Steps:**

#### Check Backend Status
1. Go to [Railway Dashboard](https://railway.app)
2. Open your backend project
3. Check **Deployments** tab - should show "Active"
4. Click on deployment → **View Logs**
5. Look for errors or crashes

#### Verify Backend URL
Test the Railway backend directly:
```bash
curl https://your-backend.up.railway.app/api/health
```

Should return:
```json
{"status":"ok"}
```

If this fails:
- Backend is not running
- Check Railway logs for errors
- Verify DATABASE_URL is set in Railway

#### Check CORS Configuration
The backend must allow requests from your Vercel frontend:

In `server/index.ts`:
```typescript
app.use(cors({
  origin: [
    'https://my-ones.vercel.app',  // Your Vercel URL
    'https://www.my-ones.vercel.app',
  ],
  credentials: true
}));
```

Add your Vercel URL to the `origin` array and redeploy Railway.

#### Verify Environment Variables Match

**Vercel (Frontend):**
```
VITE_API_BASE=https://myones-production.up.railway.app
```

**Railway (Backend):**
```
DATABASE_URL=postgresql://...  (your Supabase connection string)
JWT_SECRET=...  (long random string)
NODE_ENV=production
PORT=5000
```

---

## Testing Locally

### Simulate Production Environment

To test the validation locally:

1. **Test Build:**
   ```bash
   VITE_API_BASE=https://myones-production.up.railway.app npm run build
   ```

2. **Test without VITE_API_BASE (should fail):**
   ```bash
   npm run build
   ```
   Expected: Build fails with validation error

3. **Preview Built Site:**
   ```bash
   npx vite preview
   ```
   Visit `http://localhost:4173` and check console

### Local Development Mode

In development (localhost), the validation is less strict:
- Empty `VITE_API_BASE` is allowed (uses relative URLs)
- Backend runs on same port as frontend
- CORS is less restrictive

---

## Vercel-Specific Issues

### Issue: Environment Variable Not Taking Effect

**Solution 1: Clear Build Cache**
1. Vercel Dashboard → Settings → General
2. Scroll to "Build & Development Settings"
3. Enable "Ignore Build Cache" (temporary)
4. Redeploy

**Solution 2: Use Vercel CLI**
```bash
vercel env add VITE_API_BASE production
# Enter value when prompted
vercel --prod  # Force new production deployment
```

### Issue: Different Behavior in Preview vs Production

Vercel has separate environment variables for:
- **Production** - Live site
- **Preview** - Pull request deployments
- **Development** - Local `vercel dev`

Make sure `VITE_API_BASE` is set for **all three**.

---

## Railway-Specific Issues

### Issue: Backend Not Responding

**Check Railway Status:**
1. Railway Dashboard → Your Project
2. Check "Metrics" tab for CPU/Memory usage
3. Check "Deployments" for recent crashes
4. Review "Logs" for errors

**Common Backend Errors:**
- `DATABASE_URL must be set` → Add DATABASE_URL to Railway variables
- `Port 5000 already in use` → Railway auto-assigns ports (use `process.env.PORT`)
- `Connection timeout` → Check Supabase connection string

**Fix Database Connection:**
```bash
# In Railway variables, ensure DATABASE_URL is set:
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

---

## Checklist for New Deployments

### Frontend (Vercel)
- [ ] Repository connected to Vercel
- [ ] Framework preset: **Vite**
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist/public`
- [ ] Environment variable `VITE_API_BASE` set to Railway URL
- [ ] Build succeeds without errors
- [ ] Console shows `✅ API configured`

### Backend (Railway)
- [ ] Repository connected to Railway
- [ ] Build command: `npm run build`
- [ ] Start command: `npm start`
- [ ] All environment variables set (DATABASE_URL, JWT_SECRET, etc.)
- [ ] Deployment shows "Active" status
- [ ] Health check endpoint responds: `/api/health`
- [ ] Logs show no errors

### Database (Supabase)
- [ ] Project created on Supabase
- [ ] Connection pooler enabled
- [ ] Connection string copied to Railway DATABASE_URL
- [ ] Schema pushed: `npm run db:push`
- [ ] Tables visible in Supabase Table Editor

---

## Error Messages Reference

### "Cannot connect to the server"
**Meaning:** Frontend cannot reach backend  
**Fix:** Check VITE_API_BASE is set correctly

### "Session expired. Please log in again."
**Meaning:** JWT token invalid or expired  
**Fix:** This is normal - user needs to log in again

### "Too many login attempts"
**Meaning:** Rate limiting kicked in  
**Fix:** Wait 15 minutes or use different IP

### "Invalid email or password"
**Meaning:** Credentials don't match database  
**Fix:** User should reset password or check spelling

### "User with this email already exists"
**Meaning:** Signup with existing email  
**Fix:** User should use login instead of signup

---

## Getting Help

If this guide doesn't solve your issue:

1. **Check Browser Console** (F12 → Console tab)
   - Copy any error messages
   - Note the failing API endpoint

2. **Check Railway Logs**
   - Railway Dashboard → Logs
   - Copy recent error messages

3. **Check Vercel Build Logs**
   - Vercel Dashboard → Deployments → Click deployment → View Build Logs

4. **Contact Support** with:
   - Exact error message
   - Browser console screenshot
   - Railway logs (if applicable)
   - Vercel build logs (if applicable)
   - Steps you've already tried

---

## Prevention: Deployment Checklist

Use this before every deployment:

```bash
# 1. Verify environment variables locally
cat vercel.json
echo "VITE_API_BASE should be in Vercel env vars"

# 2. Test build
VITE_API_BASE=https://your-backend.up.railway.app npm run build

# 3. Run tests
npm test

# 4. Type check
npm run check

# 5. Deploy
git push origin main  # Triggers auto-deploy

# 6. Monitor deployment
# - Watch Vercel build logs
# - Check Railway stays active
# - Test login after deploy completes
```

---

## Related Documentation

- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Full deployment instructions
- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Vercel-specific setup
- [DEV_VS_PROD_GUIDE.md](DEV_VS_PROD_GUIDE.md) - Environment differences

---

**Last Updated:** 2025-12-13  
**Applies to:** ONES AI v1.0+
