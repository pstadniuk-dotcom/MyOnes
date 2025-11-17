# Security Deployment Checklist

## ✅ Completed Local Changes

### 1. Rate Limiting ✅
- **express-rate-limit** installed and configured
- **General API**: 100 requests per 15 minutes
- **Auth endpoints** (login/signup): 5 attempts per 15 minutes (prevents brute force)
- **AI/Chat endpoints**: 50 requests per hour (prevents cost abuse)

### 2. Field Encryption ✅
- **AES-256-GCM encryption** for all PHI data
- **Lab analyses**: `extractedMarkers` and `aiInsights` encrypted at rest
- **Health profiles**: `conditions`, `medications`, `allergies` encrypted at rest
- **Automatic encryption/decryption** in storage layer
- **Tested locally**: All tests passing ✅

### 3. Code Committed ✅
- All changes committed to main branch
- Ready to push to GitHub

---

## 🚀 Required Deployment Steps

### Step 1: Push Code to GitHub
```bash
# You need to push manually (authentication required):
git push origin main
```

This will trigger automatic Railway deployment.

---

### Step 2: Add Environment Variables to Railway

**CRITICAL:** Railway needs these new environment variables:

```bash
# Generate NEW encryption keys for production:
openssl rand -base64 32  # For FIELD_ENCRYPTION_KEY
openssl rand -hex 64     # For SESSION_SECRET (if not already set)
```

**Add to Railway:**

1. Go to https://railway.app/project/<your-project-id>/variables
2. Add these variables:

```
FIELD_ENCRYPTION_KEY=<output-from-openssl-rand-base64-32>
SESSION_SECRET=<output-from-openssl-rand-hex-64>
```

**⚠️ IMPORTANT:** Use DIFFERENT keys than in your local `.env`! Production keys should be unique.

3. Verify existing variables are set:
```
JWT_SECRET=<should-already-exist>
TOKEN_ENCRYPTION_KEY=<should-already-exist>
```

4. Click "Deploy" or wait for automatic deployment after git push

---

### Step 3: Verify Deployment

#### A. Check Railway Logs
```bash
# Look for:
✅ "serving on port 5000" 
✅ No encryption errors
❌ "FIELD_ENCRYPTION_KEY not set" = FAILED
```

#### B. Test Encryption
```bash
# Test that encryption works in production:
curl https://myones-production.up.railway.app/api/health

# Should return: {"status":"ok"}
```

#### C. Test Rate Limiting
```bash
# Make 6 rapid requests to login endpoint:
for i in {1..6}; do
  curl -X POST https://myones-production.up.railway.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done

# Expected:
# - First 5: HTTP 401 (Unauthorized)
# - 6th request: HTTP 429 (Too Many Requests)
```

---

## 🔐 Security Status After Deployment

### What's Protected ✅

1. **Brute Force Attacks**: Rate limiting prevents password guessing
2. **API Cost Abuse**: AI endpoints limited to 50 req/hour
3. **Database Breach**: PHI data encrypted even if DB is compromised
4. **Lab Data**: Blood test results encrypted at rest
5. **Health Info**: Medical conditions, medications encrypted at rest

### What's NOT Protected Yet ⚠️

1. **HIPAA Compliance**: Supabase is NOT HIPAA compliant
   - No Business Associate Agreement (BAA)
   - Not sufficient for real patient data long-term
   
2. **File Storage**: Lab PDFs in Google Cloud Storage NOT encrypted client-side
   - GCS uses server-side encryption
   - Not end-to-end encrypted

3. **Full Audit Trail**: Limited audit logging
   - No real-time anomaly detection
   - No automated security alerts

---

## 📊 Security Improvements Summary

| Security Issue | Status | Impact |
|----------------|--------|--------|
| Brute force attacks | ✅ **FIXED** | High |
| API cost abuse | ✅ **FIXED** | High |
| Lab data encryption | ✅ **FIXED** | Critical |
| Health profile encryption | ✅ **FIXED** | Critical |
| Rate limiting | ✅ **FIXED** | High |
| Session secrets | ✅ **FIXED** | Medium |
| HIPAA compliance | ❌ **Not addressed** | Critical for real customers |
| File encryption | ⚠️ **Partial** | Medium |
| 2FA | ❌ **Not implemented** | Medium |
| Security headers | ✅ **Already done** | Low |

---

## 🎯 Next Steps (Priority Order)

### Before Accepting Real Customers:

1. ✅ **Deploy encryption** (this checklist)
2. ⏸️ **Test end-to-end** with sample data
3. ⏸️ **Decide on HIPAA compliance**:
   - Option A: Migrate to AWS RDS + BAA (~$2,500/month)
   - Option B: Launch with disclaimers (NOT for real patient data)
4. ⏸️ **Penetration testing** (hire security firm or use automated tools)

### Within 1 Month:

5. ⏸️ Implement JWT refresh tokens (reduce token lifetime)
6. ⏸️ Add file content scanning for uploaded PDFs
7. ⏸️ Enhanced audit logging with anomaly detection

### Within 3 Months:

8. ⏸️ Implement 2FA for user accounts
9. ⏸️ Regular security audits and dependency updates
10. ⏸️ Incident response plan and data breach procedures

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Railway deployment successful (no build errors)
- [ ] Health check endpoint responds
- [ ] Rate limiting works (429 errors after limit)
- [ ] Login works (encryption doesn't break auth)
- [ ] Can create/update health profile
- [ ] Lab upload and analysis still works
- [ ] AI chat functionality intact
- [ ] No errors in Railway logs related to encryption
- [ ] Environment variables set correctly

---

## 🆘 Troubleshooting

### "FIELD_ENCRYPTION_KEY not set" Error

**Cause**: Railway environment variable missing

**Fix**:
1. Generate key: `openssl rand -base64 32`
2. Add to Railway environment variables
3. Redeploy

### "Failed to decrypt field" Error

**Cause**: Encryption key mismatch (changed key with existing encrypted data)

**Fix**:
- If dev database: Delete and recreate health profiles/lab analyses
- If production: **DO NOT change key** - data will be lost permanently

### Rate Limiting Too Strict

**Cause**: Default limits too low for your usage

**Fix**: Edit `server/index.ts` and adjust:
```typescript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,  // Increase from 100
  //...
});
```

### High Memory Usage

**Cause**: Encryption/decryption overhead

**Fix**: Railway should handle this, but monitor memory usage in Railway dashboard

---

## 📝 Notes

- **Encryption key rotation**: Not implemented yet. Changing keys will break existing encrypted data.
- **Backup encryption keys**: Store production keys in secure location (1Password, etc.)
- **Multiple environments**: Dev and prod should have DIFFERENT encryption keys
- **Key compromise**: If FIELD_ENCRYPTION_KEY is leaked, all encrypted data is compromised

---

## ✅ Deployment Complete Checklist

When everything is deployed and working:

- [ ] Code pushed to GitHub
- [ ] Railway deployed successfully
- [ ] FIELD_ENCRYPTION_KEY set in Railway
- [ ] SESSION_SECRET set in Railway
- [ ] Health check passing
- [ ] Rate limiting tested
- [ ] Sample health profile created (data encrypts)
- [ ] Sample lab analysis created (data encrypts)
- [ ] No encryption errors in logs
- [ ] Performance acceptable (no major slowdown)
- [ ] Vercel frontend still connects to Railway API
- [ ] SECURITY_AUDIT.md reviewed
- [ ] Team aware of HIPAA compliance gap

**Date Deployed:** __________
**Deployed By:** __________
**Production Encryption Key:** Stored in __________ (secure location)
