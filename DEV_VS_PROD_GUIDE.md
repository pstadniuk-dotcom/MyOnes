# Development vs Production Environment Guide

## Your Current Setup ✅

### Development Environment (Local)
**Location:** This Replit workspace  
**Database:** Supabase `ones-dev` (frksbddeepdzlskvniqu)  
**Connection:** `postgresql://postgres.frksbddeepdzlskvniqu:...@aws-0-us-west-2.pooler.supabase.com:6543/postgres`  
**Purpose:** Safe space for testing, debugging, and development  
**Data:** Test users, sample formulas, experimental features

**What happens here:**
- You write and test code changes
- Create test accounts and data
- Try new features without affecting real users
- Database changes happen in `ones-dev` only

### Production Environment (Live)
**Frontend:** Vercel at https://my-ones.vercel.app  
**Backend:** Railway at https://myones-production.up.railway.app  
**Database:** Supabase `ones-prod` (aytzwtehxtvoejgcixdn)  
**Connection:** `postgresql://postgres.aytzwtehxtvoejgcixdn:...@aws-1-us-east-1.pooler.supabase.com:6543/postgres`  
**Purpose:** Real customer-facing application  
**Data:** Real customer information, orders, health data

**What happens here:**
- Real users sign up and use the app
- All customer data stored in `ones-prod` database
- Changes only deployed via GitHub → Railway/Vercel pipeline
- Your local development does NOT affect this

## How Data Separation Works

### Workflow Example:

1. **Local Development:**
   ```bash
   # In Replit workspace
   npm run dev
   # Creates test user → Stored in ones-dev
   # All data goes to ones-dev database
   ```

2. **Deploy to Production:**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   # → Railway auto-deploys backend
   # → Vercel auto-deploys frontend
   # Both use ones-prod database
   ```

3. **Result:**
   - Dev data stays in `ones-dev` ✅
   - Production data stays in `ones-prod` ✅
   - Zero overlap or contamination ✅

## Environment Variables

### Local (.env file):
```
DATABASE_URL=postgresql://postgres.frksbddeepdzlskvniqu:...  # ones-dev
```

### Railway (Environment Variables):
```
DATABASE_URL=postgresql://postgres.aytzwtehxtvoejgcixdn:...  # ones-prod
OPENAI_API_KEY=sk-...
JWT_SECRET=...
(all other production secrets)
```

### Vercel (Environment Variables):
```
VITE_API_BASE=https://myones-production.up.railway.app
```

## Database Schema Synchronization

When you make schema changes (add/modify tables):

```bash
# 1. Update shared/schema.ts locally
# 2. Push to dev database to test
npm run db:push

# 3. Test locally to verify it works
npm run dev

# 4. Commit and push to GitHub
git push origin main

# 5. Railway auto-deploys and runs migrations on ones-prod
# (Drizzle ORM automatically syncs schema on Railway startup)
```

## HIPAA Compliance with Supabase

### ⚠️ Important: Supabase Standard Tier is NOT HIPAA Compliant

**Current Status:**
- Supabase free/paid tiers do NOT provide HIPAA compliance
- PHI (Protected Health Information) storage requires BAA (Business Associate Agreement)
- Supabase does not currently offer HIPAA-compliant hosting

### HIPAA Requirements for Health Data:

1. **Business Associate Agreement (BAA)** - Contract ensuring compliance
2. **Encryption at rest and in transit** - Supabase has this ✅
3. **Access controls and audit logs** - Supabase has this ✅
4. **Physical safeguards** - Supabase has this ✅
5. **BAA from hosting provider** - Supabase does NOT provide this ❌

### Your Options for HIPAA Compliance:

#### Option 1: AWS RDS with BAA (Recommended for Healthcare)
- AWS offers HIPAA-compliant managed PostgreSQL
- Requires AWS Enterprise Support ($15k/year minimum)
- You sign a BAA with AWS
- Full compliance capabilities

**Setup:**
1. Create AWS RDS PostgreSQL instance
2. Enable encryption at rest
3. Configure VPC and security groups
4. Sign AWS BAA (through AWS account manager)
5. Update Railway DATABASE_URL to AWS RDS
6. Estimated cost: $100-300/month + compliance overhead

#### Option 2: Supabase Enterprise (Contact Sales)
- Supabase may offer HIPAA compliance on Enterprise tier
- Must contact sales: https://supabase.com/contact/enterprise
- Pricing not publicly listed (likely $5k+/month minimum)

#### Option 3: Compliant Hosting Providers
- **Aptible** - HIPAA-compliant PostgreSQL hosting ($1,499/month)
- **Google Cloud SQL** - HIPAA compliant with BAA (similar to AWS)
- **Azure Database for PostgreSQL** - HIPAA compliant with BAA

### What Data Requires HIPAA Compliance?

**PHI (Protected Health Information) includes:**
- ❌ Health conditions, diagnoses, treatments
- ❌ Lab results, blood work data
- ❌ Medication lists
- ❌ Biometric data linked to individuals
- ❌ Health records, medical history

**Non-PHI (Can use regular hosting):**
- ✅ De-identified aggregate health trends
- ✅ Anonymous research data
- ✅ User preferences (not health-related)
- ✅ General supplement information

### Your Current Risk Level

**What you're storing in ONES AI:**
- User health profiles (age, goals, conditions) - **PHI**
- Lab results and analyses - **PHI**
- Supplement formulas based on health - **PHI**
- Biometric data from wearables - **PHI**

**Verdict:** You NEED HIPAA compliance before accepting real customer data.

### Recommended Action Plan:

**Phase 1: Development (Now)**
- ✅ Continue using Supabase for dev/testing
- ✅ Use fake/test data only
- ✅ Add disclaimers: "Not for medical use, testing only"

**Phase 2: Pre-Launch (Before Real Users)**
- [ ] Choose HIPAA-compliant database provider
- [ ] Sign Business Associate Agreement
- [ ] Implement audit logging for all PHI access
- [ ] Add encryption layers for sensitive fields
- [ ] Get legal review of privacy policy

**Phase 3: Production Launch**
- [ ] Migrate to HIPAA-compliant infrastructure
- [ ] Enable comprehensive audit trails
- [ ] Implement user consent workflows
- [ ] Regular compliance audits

### Quick Migration Path if Needed

If you need to switch to HIPAA-compliant database later:

```bash
# 1. Create AWS RDS instance with BAA
# 2. Export from Supabase
pg_dump $SUPABASE_URL > backup.sql

# 3. Import to AWS RDS
psql $AWS_RDS_URL < backup.sql

# 4. Update Railway DATABASE_URL
# 5. Deploy - zero downtime migration
```

## Best Practices

### Development:
- Never use production DATABASE_URL locally
- Keep `.env` in `.gitignore`
- Use test data that looks realistic but is fake
- Test schema changes in dev before deploying

### Production:
- Never directly modify production database
- All changes via code → Git → Railway
- Monitor Railway logs for errors
- Backup production database regularly (Supabase auto-backups daily)

### Security:
- Use strong, unique passwords for each database
- Never commit `.env` files to Git
- Rotate secrets periodically
- Enable 2FA on Supabase, Railway, Vercel accounts

## Monitoring Your Setup

### Check Dev Database:
```bash
npm run test:db  # Connects to ones-dev
```

### Check Production Database:
```bash
# In Railway dashboard → Logs
# Look for successful database connections
```

### Check Frontend:
Visit https://my-ones.vercel.app and test signup/login

## Summary

✅ **Development isolated** - Your local changes won't affect production  
✅ **Production secure** - Real customer data separate from testing  
✅ **Auto-deployment** - Push to GitHub → Automatic updates  
⚠️ **HIPAA compliance** - NOT currently HIPAA compliant, must upgrade before real customer PHI  
✅ **Scalable** - Can handle growth on current stack  

---

**Next Steps for HIPAA:**
1. Consult with healthcare compliance lawyer
2. Decide on compliant hosting provider (AWS RDS recommended)
3. Budget for compliance ($2-5k/month for infrastructure + legal)
4. Implement before collecting real patient data
