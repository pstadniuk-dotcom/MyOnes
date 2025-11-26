# Railway Deployment Troubleshooting

## Current Issue
Railway deployment showing 502 "Application failed to respond" error.

## Checklist to Verify on Railway Dashboard

Go to https://railway.app and check:

### 1. Build Logs
- Click on your project → Deployments → Latest deployment
- Check the **Build Logs** for any errors during `npm run build`
- Common issues:
  - Missing dependencies
  - TypeScript compilation errors
  - Build timeout

### 2. Deploy Logs
- Check the **Deploy Logs** (runtime logs)
- Look for:
  - "✅ SERVER LISTENING EVENT FIRED" (means server started)
  - Database connection errors
  - Missing environment variables
  - Port binding issues

### 3. Environment Variables (CRITICAL)
Verify these are set in Railway → Variables:

**Required:**
- `DATABASE_URL` - Your Supabase connection string
- `JWT_SECRET` - Token signing secret
- `NODE_ENV=production`
- `PORT` - Should be set automatically by Railway (don't manually set)

**AI Services (at least one required):**
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

**Optional but recommended:**
- `SENDGRID_API_KEY` - Email
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` - SMS
- `SESSION_SECRET` - OAuth
- Wearable OAuth credentials (OURA_*, FITBIT_*, etc.)

### 4. Common Railway Issues

**Issue: Build succeeds but deploy fails**
- Usually means missing environment variable (especially DATABASE_URL)
- Check deploy logs for error message

**Issue: Build fails**
- Check if all dependencies are in package.json
- Verify TypeScript compiles locally: `npm run check`

**Issue: 502 after successful deploy**
- Server might be crashing on startup
- Check deploy logs for crash message
- Often DATABASE_URL connection issue

## Quick Tests

### Test 1: Check if Railway is accessible
```powershell
Invoke-WebRequest -Uri "https://myones-production.up.railway.app" -UseBasicParsing
```

### Test 2: Check health endpoint
```powershell
Invoke-WebRequest -Uri "https://myones-production.up.railway.app/api/health" -UseBasicParsing
```

### Test 3: Build locally to catch issues
```bash
npm run build
```

## Next Steps

1. **Check Railway logs first** - This will tell you exactly what's failing
2. **Verify DATABASE_URL** - Most common issue
3. **Check build output** - Make sure `dist/index.js` is created
4. **Test locally in production mode**: `npm run build && npm start`

## Alternative: Deploy Backend to Vercel

If Railway continues to have issues, we can deploy the backend to Vercel as serverless functions. Let me know if you want to try this approach.
