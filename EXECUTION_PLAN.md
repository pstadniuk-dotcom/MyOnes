# ONES AI - Technical Execution Plan

## ✅ IMPLEMENTATION STATUS

> **Last Updated:** November 26, 2025

### Completed Fixes (Automated)
- [x] **C2** - Supabase null crash fix (`server/objectStorage.ts`)
- [x] **C3** - JWT_SECRET strict enforcement (`server/routes.ts`)  
- [x] **C4** - CORS hardening - removed wildcard fallback (`server/index.ts`)
- [x] **C5** - npm audit fix (partial - dev dependencies remain)
- [x] **S4** - Fixed duplicate apiRequest (`client/src/lib/api.ts`)
- [x] **S5** - CSP headers hardened (`server/index.ts`)
- [x] **S2** - Added test suite (vitest + 16 tests)
- [x] **S3** - Winston logger implemented (`server/logger.ts`)
- [x] **S6** - bcrypt rounds increased to 12
- [x] **S1** - Routes modularization **COMPLETE** (11 route modules created & wired)

### User Manual Tasks Completed
- [x] **C1** - Credentials rotated (JWT_SECRET, SESSION_SECRET, OpenAI, Anthropic keys)

### Routes Modularization Progress (S1) - ✅ COMPLETE
Created modular route structure in `server/routes/`:
- ✅ `middleware.ts` - Auth middleware, JWT utilities, rate limiting
- ✅ `auth.routes.ts` - /api/auth/* (signup, login, logout, me)
- ✅ `user.routes.ts` - /api/users/* (profile, health-profile, orders, etc.)
- ✅ `notifications.routes.ts` - /api/notifications/*
- ✅ `admin.routes.ts` - /api/admin/* (stats, users, support-tickets)
- ✅ `support.routes.ts` - /api/support/* (FAQ, tickets, help)
- ✅ `consents.routes.ts` - /api/consents/*
- ✅ `files.routes.ts` - /api/files/* (HIPAA-compliant file uploads)
- ✅ `formulas.routes.ts` - /api/formulas/*, /api/users/me/formula/*
- ✅ `ingredients.routes.ts` - /api/ingredients/*
- ✅ `wearables.routes.ts` - /api/wearables/* (OAuth, device integrations)
- ✅ `optimize.routes.ts` - /api/optimize/* (nutrition/workout plans, logs, grocery)
- ✅ `index.ts` - Route aggregation and exports
- ✅ All routes wired into main `routes.ts` via `app.use()`

Remaining in `routes.ts` (future migration - complex AI streaming):
- /api/chat/* (AI chat streaming - complex SSE handling, 1300+ lines)

### Remaining Tasks (Future)
- [ ] **S7** - Add API input validation (optional improvement)
- [ ] Complete chat route migration (complex SSE streaming)

---

## Executive Summary

Based on the comprehensive audit, this document provides an actionable, engineering-grade execution plan. Follow each section in order.

---

## 📅 TECHNICAL ROADMAP

### 🔴 CRITICAL FIXES (Days 1-3)

| ID | Issue | File(s) | Effort | Risk | Status |
|----|-------|---------|--------|------|--------|
| C1 | Rotate exposed credentials | `.env`, Railway/Vercel dashboards | 2 hours | HIGH | ⏳ Manual |
| C2 | Fix Supabase null crash | `server/objectStorage.ts` | 1 hour | HIGH | ✅ Done |
| C3 | JWT_SECRET strict enforcement | `server/routes.ts` | 30 mins | HIGH | ✅ Done |
| C4 | CORS hardening | `server/index.ts` | 1 hour | MEDIUM | ✅ Done |
| C5 | Fix npm vulnerabilities | `package.json` | 2 hours | MEDIUM | ✅ Done |

### 🟠 SHORT-TERM FIXES (Week 1-2)

| ID | Issue | File(s) | Effort | Risk | Status |
|----|-------|---------|--------|------|--------|
| S1 | Split routes.ts into modules | `server/routes/*.ts` | 8 hours | MEDIUM | ✅ Done |
| S2 | Add core test suite | `server/__tests__/` | 6 hours | LOW | ✅ Done |
| S3 | Replace console.log with logger | All server files | 4 hours | LOW | ✅ Done |
| S4 | Fix duplicate apiRequest | `client/src/lib/` | 1 hour | LOW | ✅ Done |
| S5 | Tighten CSP headers | `server/index.ts` | 2 hours | MEDIUM | ✅ Done |
| S6 | Increase bcrypt rounds | `server/routes.ts` | 30 mins | LOW | ✅ Done |
| S7 | Add API input validation | `server/routes.ts` | 4 hours | MEDIUM | ⏳ Future |

### 🟡 MEDIUM-TERM FIXES (Month 1)

| ID | Issue | File(s) | Effort | Risk |
|----|-------|---------|--------|------|
| M1 | Implement proper error handling | All routes | 6 hours | MEDIUM |
| M2 | Add rate limiting per endpoint | `server/index.ts`, routes | 4 hours | LOW |
| M3 | Database query optimization | `server/storage.ts` | 8 hours | MEDIUM |
| M4 | Add request/response logging | Middleware | 4 hours | LOW |
| M5 | Implement health check endpoint | `server/routes.ts` | 1 hour | LOW |
| M6 | Add OpenAPI documentation | New files | 8 hours | LOW |

### 🟢 LONG-TERM IMPROVEMENTS (Nice-to-Have)

| ID | Issue | File(s) | Effort | Risk |
|----|-------|---------|--------|------|
| L1 | Migrate to NestJS or tRPC | Full refactor | 40+ hours | HIGH |
| L2 | Add E2E test suite | `e2e/` | 16 hours | LOW |
| L3 | Implement caching layer | Redis integration | 12 hours | MEDIUM |
| L4 | Add performance monitoring | APM integration | 8 hours | LOW |
| L5 | Implement feature flags | New system | 8 hours | LOW |

---

## ✅ FIX ORDER CHECKLIST

Copy this to your task tracker. Execute in order.

### Day 1 - Security Critical
```
[ ] C1.1 - Generate new JWT_SECRET (32+ chars)
[ ] C1.2 - Generate new SESSION_SECRET (32+ chars)
[ ] C1.3 - Rotate OpenAI API key (dashboard.openai.com)
[ ] C1.4 - Rotate Anthropic API key (console.anthropic.com)
[ ] C1.5 - Rotate SendGrid API key
[ ] C1.6 - Rotate Twilio credentials
[ ] C1.7 - Update all secrets in Railway dashboard
[ ] C1.8 - Update all secrets in Vercel dashboard
[ ] C1.9 - Verify .env is in .gitignore
[ ] C1.10 - Scan git history for leaked secrets
```

### Day 1 - Runtime Fixes
```
[ ] C2.1 - Add null checks to objectStorage.ts
[ ] C2.2 - Add null checks to all Supabase methods
[ ] C3.1 - Make JWT_SECRET required in production
[ ] C3.2 - Remove dev fallback in production
[ ] C4.1 - Remove wildcard CORS fallback
[ ] C4.2 - Add explicit allowed origins list
[ ] C4.3 - Test CORS with production URLs
```

### Day 2 - Dependencies
```
[ ] C5.1 - Run npm audit fix
[ ] C5.2 - Manually fix remaining vulnerabilities
[ ] C5.3 - Update cookie package
[ ] C5.4 - Update path-to-regexp
[ ] C5.5 - Run npm outdated and update safe packages
[ ] C5.6 - Test build after updates
```

### Day 3 - Verification
```
[ ] Deploy to Railway staging
[ ] Test login flow end-to-end
[ ] Test AI chat streaming
[ ] Test file upload
[ ] Verify no console errors
[ ] Run npm run check
```

### Week 1 - Routes Split
```
[ ] S1.1 - Create server/routes/ directory
[ ] S1.2 - Extract auth routes to auth.routes.ts
[ ] S1.3 - Extract chat routes to chat.routes.ts
[ ] S1.4 - Extract formula routes to formula.routes.ts
[ ] S1.5 - Extract admin routes to admin.routes.ts
[ ] S1.6 - Extract wearables routes to wearables.routes.ts
[ ] S1.7 - Extract file routes to files.routes.ts
[ ] S1.8 - Create routes/index.ts aggregator
[ ] S1.9 - Update server/index.ts imports
[ ] S1.10 - Test all endpoints
```

### Week 1 - Logging
```
[ ] S3.1 - Install winston logger
[ ] S3.2 - Create server/lib/logger.ts
[ ] S3.3 - Replace console.log in routes.ts
[ ] S3.4 - Replace console.log in storage.ts
[ ] S3.5 - Replace console.log in index.ts
[ ] S3.6 - Replace console.error everywhere
[ ] S3.7 - Add request logging middleware
[ ] S3.8 - Configure log levels per environment
```

### Week 2 - Testing
```
[ ] S2.1 - Install vitest and supertest
[ ] S2.2 - Create test setup file
[ ] S2.3 - Write auth endpoint tests
[ ] S2.4 - Write formula CRUD tests
[ ] S2.5 - Write chat endpoint tests
[ ] S2.6 - Add test script to package.json
[ ] S2.7 - Add test:coverage script
```

### Week 2 - Client Cleanup
```
[ ] S4.1 - Remove duplicate apiRequest from api.ts
[ ] S4.2 - Keep queryClient.ts version (has auth headers)
[ ] S4.3 - Update all imports
[ ] S4.4 - Test all API calls
```

---

## 🔧 DETAILED IMPLEMENTATION GUIDE

---

### C1: Credential Rotation

**Type:** Manual only - cannot automate

**Step 1: Generate new secrets locally**
```powershell
# Run in your terminal
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Step 2: Update Railway**
1. Go to https://railway.app/project/[your-project]
2. Click your service → Variables
3. Add/Update:
   - `JWT_SECRET` = (paste generated value)
   - `SESSION_SECRET` = (paste generated value)
   - `OPENAI_API_KEY` = (new key from OpenAI dashboard)
   - `ANTHROPIC_API_KEY` = (new key from Anthropic console)

**Step 3: Update Vercel** (if any frontend env vars)
1. Go to https://vercel.com/[your-project]/settings/environment-variables
2. Update any shared secrets

**Step 4: Check git history**
```powershell
# Search for accidentally committed secrets
git log -p -S "sk-" --all -- "*.ts" "*.js" "*.env*"
git log -p -S "JWT_SECRET" --all
```

**What NOT to commit:** Never commit `.env` files with real secrets.

---

### C2: Fix Supabase Null Crash

**File:** `server/objectStorage.ts`

**Problem:** Methods call `supabaseStorageClient.from()` without null check when Supabase isn't configured.

**BEFORE (lines 93-113):**
```typescript
async uploadLabReportFile(userId: string, fileBuffer: Buffer, originalFileName: string, contentType: string = 'application/pdf'): Promise<string> {
  await enforceConsentRequirements(userId, 'upload');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const objectId = randomUUID();
  const fileExtension = originalFileName.split('.').pop() || 'pdf';
  const fileName = `${timestamp}_${objectId}.${fileExtension}`;
  const filePath = `${userId}/${fileName}`;
  const { data, error } = await supabaseStorageClient
    .from(LAB_REPORTS_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false
    });
  if (error) throw new Error(`Supabase upload error: ${error.message}`);
  return filePath;
}
```

**AFTER:**
```typescript
async uploadLabReportFile(userId: string, fileBuffer: Buffer, originalFileName: string, contentType: string = 'application/pdf'): Promise<string> {
  if (!supabaseStorageClient) {
    throw new Error('File storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  
  await enforceConsentRequirements(userId, 'upload');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const objectId = randomUUID();
  const fileExtension = originalFileName.split('.').pop() || 'pdf';
  const fileName = `${timestamp}_${objectId}.${fileExtension}`;
  const filePath = `${userId}/${fileName}`;
  const { data, error } = await supabaseStorageClient
    .from(LAB_REPORTS_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false
    });
  if (error) throw new Error(`Supabase upload error: ${error.message}`);
  return filePath;
}
```

**Apply to ALL methods in ObjectStorageService:**
- `uploadLabReportFile`
- `getLabReportDownloadURL`
- `getLabReportFile`
- `secureDeleteLabReport`
- `listUserLabReports`

**Test locally:**
```powershell
# Remove env vars temporarily to test
$env:SUPABASE_URL = ""
npm run dev
# Try to upload a file - should get clear error message
```

**Automation:** Can be automated with code assistant.

---

### C3: JWT_SECRET Strict Enforcement

**File:** `server/routes.ts`

**Problem:** In production, if `JWT_SECRET` is missing, the current code throws but there's still a dev fallback that could be exploited.

**BEFORE (lines 386-399):**
```typescript
// JWT Configuration
const isProdLike = (process.env.APP_ENV || process.env.NODE_ENV)?.toLowerCase() === 'prod' || process.env.NODE_ENV === 'production';
let JWT_SECRET: string = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  if (isProdLike) {
    throw new Error('JWT_SECRET environment variable is required in production. Set it in Railway/Vercel env vars.');
  }

  JWT_SECRET = 'dev-jwt-secret-placeholder';
  console.warn('Using fallback JWT secret for local development. Do not use this in production.');
}

// TypeScript assertion that JWT_SECRET is now definitely a string
const JWT_SECRET_FINAL: string = JWT_SECRET;
```

**AFTER:**
```typescript
// JWT Configuration - SECURITY CRITICAL
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET environment variable is required in production.');
    console.error('Set JWT_SECRET in Railway dashboard: https://railway.app/project/[your-project]/service/[service]/variables');
    process.exit(1); // Hard fail - do not start server without JWT_SECRET
  }
  console.warn('⚠️  WARNING: JWT_SECRET not set. Using insecure dev fallback. DO NOT DEPLOY THIS.');
}

const JWT_SECRET_FINAL: string = JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';
```

**Test:**
```powershell
# Test production mode without secret
$env:NODE_ENV = "production"
$env:JWT_SECRET = ""
npm run dev
# Should exit with error code 1 immediately
```

**Automation:** Can be automated with code assistant.

---

### C4: CORS Hardening

**File:** `server/index.ts`

**Problem:** Falls back to wildcard `*` for non-listed origins, which is insecure.

**BEFORE (lines 27-56):**
```typescript
// CORS middleware - allow requests from Vercel frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://my-ones.vercel.app',
    'https://my-ones-jnsk1y9e1-pstadniuk-dotcoms-projects.vercel.app',
    'https://my-ones-210a7gjcx-pstadniuk-dotcoms-projects.vercel.app',
    'https://myones.ai',
    'https://www.myones.ai',
    'http://localhost:5000',
    'http://localhost:5173'
  ];
  
  // Always reflect the origin if it's in the allowed list, otherwise allow all
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // For non-listed origins, use wildcard but don't set credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

**AFTER:**
```typescript
// CORS middleware - SECURITY: Only allow explicit origins
const allowedOrigins = [
  'https://my-ones.vercel.app',
  'https://myones.ai',
  'https://www.myones.ai',
  // Add Vercel preview URLs pattern
  ...(process.env.VERCEL_PREVIEW_ORIGINS?.split(',') || []),
  // Local development only
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5000', 'http://localhost:5173'] : [])
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  // SECURITY: Do NOT set any CORS headers for unknown origins
  // This will cause the browser to block the request
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    if (origin && allowedOrigins.includes(origin)) {
      return res.sendStatus(200);
    }
    return res.sendStatus(403); // Forbidden for unknown origins
  }
  
  next();
});
```

**Railway env var (optional):**
```
VERCEL_PREVIEW_ORIGINS=https://my-ones-xxx.vercel.app,https://my-ones-yyy.vercel.app
```

**Test:**
```powershell
# Test CORS rejection
curl -H "Origin: https://evil-site.com" -I https://myones-production.up.railway.app/api/health
# Should NOT see Access-Control-Allow-Origin header
```

**Automation:** Can be automated with code assistant.

---

### C5: Fix npm Vulnerabilities

**Type:** Semi-automated

**Step 1: Run automatic fixes**
```powershell
npm audit fix
```

**Step 2: Check remaining issues**
```powershell
npm audit
```

**Step 3: Manual fixes for breaking changes**
```powershell
# If npm audit fix --force is needed, review changes first
npm audit fix --dry-run --force
# Only run if changes look safe
npm audit fix --force
```

**Step 4: Test build**
```powershell
npm run build
npm run check
```

**Known issues from audit:**
- `cookie` - Update to latest
- `path-to-regexp` - May require express update
- `cross-spawn` - Check for updates

---

### S1: Split routes.ts into Modules

**Type:** Manual - complex refactor

**Current state:** `server/routes.ts` = 8,571 lines (CRITICAL - too large)

**Target structure:**
```
server/
├── routes/
│   ├── index.ts           # Route aggregator
│   ├── auth.routes.ts     # Login, signup, logout, password reset
│   ├── chat.routes.ts     # AI chat, streaming, messages
│   ├── formula.routes.ts  # Formula CRUD, validation
│   ├── admin.routes.ts    # Admin-only endpoints
│   ├── wearables.routes.ts # OAuth, data sync
│   ├── files.routes.ts    # Lab report uploads
│   ├── user.routes.ts     # Profile, settings
│   └── health.routes.ts   # Health checks, status
├── middleware/
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   └── logging.middleware.ts
└── routes.ts              # Legacy - DEPRECATED after split
```

**Step-by-step extraction:**

**S1.1: Create directory structure**
```powershell
mkdir server/routes
mkdir server/middleware
```

**S1.2: Create middleware/auth.middleware.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET required in production');
}
const JWT_SECRET_FINAL = JWT_SECRET || 'dev-only-insecure';

export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

export function verifyToken(token: string): { userId: string; isAdmin?: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET_FINAL) as { userId: string; isAdmin?: boolean };
  } catch {
    return null;
  }
}

export function generateToken(userId: string, isAdmin: boolean = false): string {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET_FINAL, { expiresIn: '7d' });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  req.isAdmin = decoded.isAdmin;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
```

**S1.3: Create routes/auth.routes.ts (example)**
```typescript
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { storage } from '../storage';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);
    
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12); // 12 rounds
    const user = await storage.createUser({
      email: data.email,
      passwordHash,
      name: data.name || data.email.split('@')[0]
    });

    const token = generateToken(user.id, user.isAdmin || false);
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(data.email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.isAdmin || false);
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
```

**S1.8: Create routes/index.ts (aggregator)**
```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import formulaRoutes from './formula.routes';
import adminRoutes from './admin.routes';
import wearablesRoutes from './wearables.routes';
import filesRoutes from './files.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/formulas', formulaRoutes);
router.use('/admin', adminRoutes);
router.use('/wearables', wearablesRoutes);
router.use('/files', filesRoutes);
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
```

**S1.9: Update server/index.ts**
```typescript
// Replace:
import { registerRoutes } from './routes';
// With:
import routes from './routes/index';

// Replace:
registerRoutes(app);
// With:
app.use('/api', routes);
```

**Test each module:**
```powershell
# After each extraction
npm run check
npm run dev
# Test affected endpoints
```

---

### S3: Replace console.log with Winston Logger

**Type:** Can be automated

**Step 1: Install winston**
```powershell
npm install winston
```

**Step 2: Create server/lib/logger.ts**
```typescript
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880,
    maxFiles: 5
  }));
}

export default logger;
```

**Step 3: Search and replace**

Find all `console.log` and `console.error`:
```powershell
# Count occurrences
Select-String -Path "server/*.ts" -Pattern "console\.(log|error|warn)" | Measure-Object
```

**Replace patterns:**
```typescript
// BEFORE
console.log('User created:', user.id);
console.error('Database error:', error);
console.warn('Deprecated API used');

// AFTER
import logger from './lib/logger';

logger.info('User created', { userId: user.id });
logger.error('Database error', { error: error.message, stack: error.stack });
logger.warn('Deprecated API used', { endpoint: req.path });
```

---

### S4: Fix Duplicate apiRequest

**Type:** Can be automated

**Problem:** Two different `apiRequest` functions in client code.

**File 1:** `client/src/lib/api.ts` (no auth headers)
**File 2:** `client/src/lib/queryClient.ts` (has auth headers) ✅ Keep this one

**BEFORE - api.ts:**
```typescript
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = buildApiUrl(endpoint);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } satisfies HeadersInit;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? 'include',
  });

  return response;
}
```

**AFTER - api.ts (remove function, keep helpers):**
```typescript
/**
 * API configuration and helper
 */

// Get API base URL from environment variable, fallback to relative URL for dev
export const API_BASE = (import.meta.env.VITE_API_BASE || '').trim();

export function buildApiUrl(endpoint: string) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${normalized}`;
}

/**
 * Get the API base URL (useful for debugging)
 */
export function getApiBase() {
  return API_BASE;
}

// NOTE: Use apiRequest from queryClient.ts instead - it includes auth headers
```

**Update imports:**
Search for `import { apiRequest } from "@/lib/api"` and change to:
```typescript
import { apiRequest } from "@/lib/queryClient";
```

---

### S5: Tighten CSP Headers

**Type:** Can be automated

**File:** `server/index.ts`

**BEFORE (line 18-22):**
```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *; style-src 'self' 'unsafe-inline' *; font-src 'self' data: *; img-src 'self' data: *; connect-src 'self' * ws: wss:; frame-src 'self' https://www.youtube.com;"
  );
  next();
});
```

**AFTER:**
```typescript
// Content Security Policy - SECURITY HARDENED
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", // Remove unsafe-eval, whitelist CDNs
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:", // Allow HTTPS images
  "connect-src 'self' https://api.openai.com https://api.anthropic.com wss:", // Explicit API allowlist
  "frame-src 'self' https://www.youtube.com https://youtube.com",
  "frame-ancestors 'none'", // Prevent clickjacking
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', cspDirectives);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

---

### S6: Increase bcrypt Rounds

**Type:** Can be automated

**File:** `server/routes.ts`

**Find all bcrypt.hash calls:**
```powershell
Select-String -Path "server/*.ts" -Pattern "bcrypt\.hash"
```

**BEFORE:**
```typescript
const passwordHash = await bcrypt.hash(password, 10);
```

**AFTER:**
```typescript
const BCRYPT_ROUNDS = 12; // OWASP recommended minimum

const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

---

## 🚀 READY TO EXECUTE DEVELOPMENT PLAN

### Branch Strategy

```
main (production)
├── fix/security-critical     ← Day 1-2 work
├── fix/cors-hardening        ← Day 1
├── fix/dependencies          ← Day 2
├── refactor/split-routes     ← Week 1
├── feature/logging           ← Week 1
├── feature/testing           ← Week 2
└── chore/cleanup             ← Week 2
```

### Execution Order

#### Phase 1: Security Critical (Day 1-2)
```powershell
# Create branch
git checkout -b fix/security-critical

# 1. Implement C2 (Supabase null checks)
# 2. Implement C3 (JWT strict)
# 3. Implement C4 (CORS hardening)
# 4. Test locally
npm run check
npm run dev
# Manual test: login, chat, file upload

# Commit
git add server/objectStorage.ts server/routes.ts server/index.ts
git commit -m "fix(security): add null checks, harden JWT and CORS"

# Push and create PR
git push -u origin fix/security-critical
```

#### Phase 2: Dependencies (Day 2)
```powershell
git checkout main
git checkout -b fix/dependencies

npm audit fix
npm run build
npm run check

git add package.json package-lock.json
git commit -m "fix(deps): resolve npm audit vulnerabilities"
git push -u origin fix/dependencies
```

#### Phase 3: Routes Split (Week 1)
```powershell
git checkout main
git pull
git checkout -b refactor/split-routes

# Create structure
mkdir server/routes
mkdir server/middleware

# Extract auth routes first (safest)
# ... create files ...

npm run check
# Test auth endpoints

git add server/routes/ server/middleware/
git commit -m "refactor(routes): extract auth routes to separate module"

# Continue with other routes...
```

### Deployment Checklist

Before each deployment:
```
[ ] npm run check passes
[ ] npm run build passes
[ ] All env vars set in Railway
[ ] Test login locally
[ ] Test AI chat locally
[ ] Test file upload locally (if Supabase configured)
```

### After Deployment Verification

```powershell
# Test production endpoints
curl https://myones-production.up.railway.app/api/health
curl -X POST https://myones-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

## 📋 AUTOMATION VS MANUAL SUMMARY

| Task | Type | Tool |
|------|------|------|
| C1 Credential rotation | Manual | Dashboard + terminal |
| C2 Supabase null checks | Automated | Code assistant |
| C3 JWT strict | Automated | Code assistant |
| C4 CORS hardening | Automated | Code assistant |
| C5 npm audit fix | Semi-auto | Terminal |
| S1 Routes split | Manual | Complex refactor |
| S2 Test suite | Manual | Requires domain knowledge |
| S3 Logging | Automated | Code assistant |
| S4 API cleanup | Automated | Code assistant |
| S5 CSP headers | Automated | Code assistant |
| S6 bcrypt rounds | Automated | Code assistant |

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Right now:** Generate new secrets (C1.1-C1.2)
2. **Next 30 min:** Update Railway env vars (C1.7)
3. **Next 1 hour:** Implement C2, C3, C4 fixes
4. **End of day:** Run npm audit fix, deploy to Railway
5. **Tomorrow:** Start routes split (S1)

Would you like me to implement any of these fixes now?
