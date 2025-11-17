# ONES AI Security Audit & Analysis

**Audit Date:** November 17, 2025  
**Environment:** Production (Vercel + Railway + Supabase)  
**Auditor:** AI Security Assessment

---

## Executive Summary

### Overall Security Rating: **B+ (Good, with critical improvements needed)**

**Strengths:**
- ✅ Strong password hashing (bcrypt with 10 rounds)
- ✅ JWT authentication with secure tokens
- ✅ OAuth token encryption (AES-256-GCM)
- ✅ HTTPS/TLS for all connections
- ✅ CORS properly configured
- ✅ Parameterized queries (Drizzle ORM prevents SQL injection)

**Critical Issues:**
- ❌ **NO HIPAA compliance** (biggest risk for health data)
- ❌ **Lab reports not encrypted at rest** in database
- ⚠️ File uploads lack end-to-end encryption
- ⚠️ Missing rate limiting on API endpoints
- ⚠️ Session secrets using weak defaults

---

## Detailed Security Analysis

### 1. Authentication & Authorization ✅ **STRONG**

#### Password Security
```typescript
// Location: server/routes.ts line 2160
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);
```

**Status:** ✅ **Excellent**
- Bcrypt with 10 salt rounds (industry standard)
- Passwords never stored in plaintext
- Proper password comparison using bcrypt.compare()

**Recommendations:**
- Consider increasing to 12 rounds for higher security (slight performance trade-off)
- Implement password strength requirements (min 12 chars, uppercase, numbers, symbols)

#### JWT Tokens
```typescript
// Location: server/routes.ts line 319-334
JWT_SECRET: process.env.JWT_SECRET
JWT_EXPIRES_IN: '7d'
```

**Status:** ⚠️ **GOOD, but needs improvement**

**Strengths:**
- Tokens expire after 7 days
- JWT_SECRET required from environment variable
- Proper token validation middleware

**Weaknesses:**
- **CRITICAL:** Check if Railway has JWT_SECRET set! If not, using weak generated secret
- 7-day expiration is long for health data (recommend 24 hours with refresh tokens)
- No token revocation mechanism

**IMMEDIATE ACTION REQUIRED:**
```bash
# Verify Railway has JWT_SECRET set
# If not, generate a strong secret:
openssl rand -base64 64
# Add to Railway environment variables
```

### 2. Data Encryption

#### OAuth Tokens ✅ **EXCELLENT**
```typescript
// Location: server/tokenEncryption.ts
Algorithm: AES-256-GCM
Key Size: 256 bits
IV: Random 16 bytes per encryption
Authentication: GCM tag validation
```

**Status:** ✅ **Military-grade encryption**
- Wearable OAuth tokens encrypted before database storage
- Authenticated encryption prevents tampering
- Proper key derivation from environment variable

**Verified:**
- ✅ Fitbit/Oura/Whoop access tokens encrypted
- ✅ Refresh tokens encrypted
- ✅ Random IV per encryption (prevents pattern detection)

#### Database Encryption ❌ **CRITICAL GAP**

**Current Status:**
```typescript
// Lab reports marked as encrypted, but NOT actually encrypted
encryptedAtRest: true  // ← This is just a boolean flag, not real encryption!
```

**The Problem:**
- Lab reports, health profiles, biometric data stored in **PLAINTEXT** in Supabase
- Only the `encryptedAtRest` flag is set to `true`, but NO actual encryption happens
- Database administrator or attacker with DB access can read all health data

**Risk Level:** 🔴 **CRITICAL** for HIPAA/health data

#### File Storage (Google Cloud Storage)
```typescript
// Location: server/objectStorage.ts
// Files uploaded to Google Cloud Storage
// ACL controls who can access
```

**Status:** ⚠️ **MODERATE** 

**Current Security:**
- ✅ Access Control List (ACL) system implemented
- ✅ User ownership tracking
- ✅ Audit logs for file operations
- ❌ **Files NOT encrypted client-side before upload**
- ❌ **GCS encryption relies on Google's server-side encryption** (not end-to-end)

**Risk:** Database breach or Google compromise could expose health documents

### 3. Network Security

#### HTTPS/TLS ✅ **STRONG**
- ✅ All traffic encrypted (Vercel/Railway/Supabase use TLS 1.2+)
- ✅ HTTPS enforced
- ✅ Secure cookies (httpOnly, secure in production)

#### CORS ✅ **PROPERLY CONFIGURED**
```typescript
// Location: server/index.ts lines 15-35
Allowed Origins:
- https://my-ones.vercel.app
- Preview deployments
- Localhost for development
```

**Status:** ✅ **Good**
- Credentials allowed for authenticated requests
- Proper origin whitelist

### 4. Input Validation & SQL Injection

#### SQL Injection Protection ✅ **EXCELLENT**
- Using Drizzle ORM with parameterized queries
- No raw SQL strings with user input
- Type-safe database operations

**Verified Safe:**
```typescript
// All queries use Drizzle ORM:
await storage.createUser({ email, password, name });
await storage.getFormulasByUserId(userId);
// No SQL injection possible
```

#### Input Validation ⚠️ **GOOD, could be better**
- ✅ Zod schemas validate most inputs
- ✅ Email validation
- ⚠️ Limited file type validation (only MIME check)
- ⚠️ No file content scanning for malware

**Recommendation:** Add file scanning for uploaded PDFs (ClamAV or similar)

### 5. Rate Limiting & DDoS Protection

#### Current Status: ❌ **MISSING**

**No rate limiting implemented on:**
- Signup endpoint (could be abused for spam)
- Login endpoint (brute force risk)
- API key endpoints (AI costs could skyrocket)
- File upload (storage abuse)

**Risk Level:** 🔴 **HIGH**

**Attack Scenarios:**
1. **Brute force login:** Attacker tries 1000s of password combinations
2. **API abuse:** Malicious user makes 1000s of AI requests → $$$$ OpenAI bills
3. **Storage abuse:** Upload GBs of files to exhaust storage quota
4. **DDoS:** Overwhelm server with requests

**IMMEDIATE FIX NEEDED:**
```typescript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

// Add before routes:
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

// Stricter limits for auth:
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
```

### 6. Session Management

#### Session Secrets
```typescript
// Location: server/index.ts line 45
secret: process.env.SESSION_SECRET || 'wearable-oauth-secret-change-in-production'
```

**Status:** ⚠️ **VULNERABLE**

**Problem:** Default fallback secret is weak and known
**Impact:** If SESSION_SECRET not set in Railway, sessions can be forged

**IMMEDIATE ACTION:**
```bash
# Generate strong session secret:
openssl rand -hex 64

# Add to Railway:
SESSION_SECRET=<generated-secret>
```

### 7. API Key Exposure

#### OpenAI API Key
```typescript
// Stored in: Railway environment variables
// Used in: server/routes.ts for AI chat
```

**Status:** ✅ **SECURE** (stored in env vars, not committed to Git)

**However:** No usage caps or monitoring
**Risk:** Malicious user could drain API credits

**Recommendation:**
- Set OpenAI usage limits in OpenAI dashboard
- Implement request throttling per user
- Monitor costs in real-time

---

## Lab Data Encryption - Replit vs Current

### How it was on Replit ✅
**Replit Secret Storage:**
- Environment variables encrypted at rest by Replit
- Accessible only through Replit's encrypted secrets manager
- Never exposed in logs or process lists

### Current Setup on Railway ⚠️
**Railway Environment Variables:**
- Encrypted in Railway's systems ✅
- But lab data in **Supabase is NOT encrypted** ❌

### The Gap: Database-Level Encryption

**What's NOT encrypted:**
```sql
-- In Supabase ones-prod database:
SELECT * FROM lab_analyses;
SELECT * FROM health_profiles;
SELECT * FROM file_uploads;
-- All readable in PLAINTEXT
```

**Anyone with database access can read:**
- Blood test results
- Health conditions
- Diagnoses
- Biometric data
- Uploaded lab reports

---

## How to Implement Field-Level Encryption

### Solution 1: Application-Level Encryption (Recommended)

Create an encryption service for sensitive fields:

```typescript
// server/fieldEncryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY; // 32-byte base64

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(FIELD_ENCRYPTION_KEY, 'base64');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  // Return: iv + tag + ciphertext (all base64)
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptField(ciphertext: string): string {
  const buffer = Buffer.from(ciphertext, 'base64');
  const key = Buffer.from(FIELD_ENCRYPTION_KEY, 'base64');
  
  const iv = buffer.subarray(0, 16);
  const tag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}
```

**Usage:**
```typescript
// When storing lab analysis:
const encryptedData = encryptField(JSON.stringify(labResults));
await storage.createLabAnalysis({
  userId,
  analysisData: encryptedData, // Encrypted!
  encryptedAtRest: true
});

// When retrieving:
const lab = await storage.getLabAnalysis(id);
const decryptedData = JSON.parse(decryptField(lab.analysisData));
```

### Solution 2: Transparent Data Encryption (TDE)

**Requires AWS RDS or Enterprise Database:**
- Entire database encrypted at disk level
- Transparent to application
- Managed by database provider
- **Requires HIPAA-compliant hosting**

**Cost:** $200-500/month minimum

### Solution 3: Hybrid Approach

**Sensitive fields encrypted** + **Database encryption**
- Best security posture
- Defense in depth
- Required for HIPAA

---

## Immediate Security Improvements (Priority Order)

### 🔴 CRITICAL (Do Before Accepting Real Customers)

1. **Implement Field-Level Encryption for PHI**
   - Encrypt lab_analyses.analysisData
   - Encrypt health_profiles sensitive fields
   - Encrypt file_uploads.metadata (if contains PHI)
   - **Effort:** 2-3 days
   - **Cost:** $0

2. **Add Rate Limiting**
   - Prevent brute force attacks
   - Protect API costs
   - **Effort:** 2 hours
   - **Cost:** $0

3. **Verify Environment Secrets**
   - Confirm JWT_SECRET is strong and set in Railway
   - Confirm SESSION_SECRET is set
   - Generate FIELD_ENCRYPTION_KEY
   - **Effort:** 30 minutes
   - **Cost:** $0

4. **Migrate to HIPAA-Compliant Infrastructure**
   - AWS RDS with BAA OR Aptible
   - Sign Business Associate Agreement
   - **Effort:** 1-2 weeks
   - **Cost:** $1,500-3,000/month

### ⚠️ HIGH PRIORITY (Within 1 Month)

5. **Implement JWT Refresh Tokens**
   - Reduce access token lifetime to 1 hour
   - Add refresh token rotation
   - **Effort:** 1 day

6. **Add File Content Scanning**
   - Scan PDFs for malware
   - Validate file integrity
   - **Effort:** 1 day

7. **Audit Logging Enhancement**
   - Log all PHI access
   - IP tracking
   - Anomaly detection
   - **Effort:** 2 days

### 📋 MEDIUM PRIORITY (Within 3 Months)

8. **Implement 2FA**
   - TOTP for users with health data
   - **Effort:** 3 days

9. **Security Headers**
   - Add helmet.js middleware
   - CSP, HSTS, X-Frame-Options
   - **Effort:** 2 hours

10. **Regular Security Audits**
    - Automated vulnerability scanning
    - Dependency updates
    - **Effort:** Ongoing

---

## Encryption Implementation Guide

### Step 1: Generate Encryption Key

```bash
# Generate 256-bit (32-byte) encryption key
openssl rand -base64 32

# Output example:
# xK8vN2mP9qR5sT7uV1wX3yZ4aB6cD8eF0gH2iJ4kL6m=
```

### Step 2: Add to Railway Environment

```bash
FIELD_ENCRYPTION_KEY=xK8vN2mP9qR5sT7uV1wX3yZ4aB6cD8eF0gH2iJ4kL6m=
```

### Step 3: Create Encryption Service

```typescript
// server/fieldEncryption.ts
// (See Solution 1 above for full code)
```

### Step 4: Encrypt Sensitive Fields

**Health Profiles:**
```typescript
// Before saving:
const sensitiveData = {
  conditions: user.conditions,
  medications: user.medications,
  allergies: user.allergies
};

await db.insert(healthProfiles).values({
  userId,
  encryptedData: encryptField(JSON.stringify(sensitiveData)),
  // Non-sensitive fields remain plaintext:
  age: user.age,
  gender: user.gender
});
```

**Lab Analyses:**
```typescript
// Encrypt entire analysis result:
const labAnalysis = await analyzeLabReport(file);
await db.insert(labAnalyses).values({
  userId,
  fileId,
  analysisData: encryptField(JSON.stringify(labAnalysis)),
  analyzedAt: new Date()
});
```

### Step 5: Decrypt on Retrieval

```typescript
// When reading:
const profile = await storage.getHealthProfile(userId);
const decryptedData = JSON.parse(decryptField(profile.encryptedData));
// Now you have: { conditions, medications, allergies }
```

---

## Cost-Benefit Analysis

### Option A: Stay on Supabase + Add Encryption

**Costs:**
- Development: 2-3 days ($0 if self-done)
- Runtime: $0 (minimal CPU overhead)
- **Total: FREE**

**Benefits:**
- ✅ Protects against database breaches
- ✅ Defense in depth
- ❌ Still NOT HIPAA compliant (no BAA)

**Compliance:** NOT sufficient for true HIPAA compliance

### Option B: Migrate to HIPAA-Compliant + Encryption

**Costs:**
- AWS RDS: $200-500/month
- AWS Support (for BAA): $1,250/month minimum
- Migration effort: 1-2 weeks
- Legal review: $2,000-5,000 one-time
- **Total: ~$2,000-3,000/month**

**Benefits:**
- ✅ Full HIPAA compliance
- ✅ Business Associate Agreement
- ✅ Encrypted at rest (database level)
- ✅ Encrypted in transit
- ✅ Audit trails
- ✅ Legal protection

**Compliance:** ✅ HIPAA compliant

---

## Recommended Immediate Actions (Next 48 Hours)

### Quick Wins (2 hours total):

1. **Add Rate Limiting** (30 min)
   ```bash
   npm install express-rate-limit
   ```
   Add to `server/index.ts` as shown above

2. **Verify/Add Secrets** (15 min)
   ```bash
   # In Railway, verify these are set:
   JWT_SECRET=<strong-secret>
   SESSION_SECRET=<strong-secret>
   TOKEN_ENCRYPTION_KEY=<existing-key>
   ```

3. **Generate Field Encryption Key** (5 min)
   ```bash
   openssl rand -base64 32
   # Add to Railway as FIELD_ENCRYPTION_KEY
   ```

4. **Create Encryption Service** (1 hour)
   - Copy `fieldEncryption.ts` code above
   - Test locally
   - Deploy

---

## Security Checklist

### Before Accepting Real Customer Data:

- [ ] Field-level encryption implemented for all PHI
- [ ] Rate limiting on all public endpoints
- [ ] All environment secrets verified strong
- [ ] JWT expiration reduced to 24 hours
- [ ] Session secret properly set
- [ ] HTTPS enforced everywhere
- [ ] CORS properly configured
- [ ] File upload limits enforced
- [ ] Privacy policy reviewed by lawyer
- [ ] Terms of service include data handling
- [ ] **Decision made:** HIPAA compliance path
  - [ ] If yes: Migrate to compliant infrastructure + BAA
  - [ ] If no: Add prominent disclaimers

### Before Production Launch:

- [ ] Penetration testing completed
- [ ] Security audit by third party
- [ ] Incident response plan documented
- [ ] Data breach notification process
- [ ] Regular backup verification
- [ ] Disaster recovery tested
- [ ] Monitoring and alerting configured
- [ ] Legal compliance verified (HIPAA, GDPR, etc.)

---

## Conclusion

### Current Security Posture: **B+ (Good Foundation, Critical Gaps)**

**You have:**
- ✅ Strong authentication
- ✅ Encrypted connections
- ✅ SQL injection protection
- ✅ OAuth token encryption

**You need:**
- 🔴 Field-level encryption for health data
- 🔴 Rate limiting
- 🔴 HIPAA compliance decision
- ⚠️ Stronger session management
- ⚠️ API cost controls

### Recommended Path Forward:

**Phase 1 (This Week):** 
- Implement field encryption
- Add rate limiting
- Verify all secrets

**Phase 2 (Next Month):**
- Decide on HIPAA compliance
- If yes: Migrate to AWS RDS + get BAA
- If no: Add strong disclaimers

**Phase 3 (Before Launch):**
- Security audit
- Legal review
- Penetration testing

### Bottom Line:

Your application has a solid security foundation, but **health data encryption** and **HIPAA compliance** are critical gaps that MUST be addressed before accepting real customers with real health information.

**The good news:** Most issues can be fixed quickly and at low cost. The encryption implementation is straightforward and can be done in a few days.
