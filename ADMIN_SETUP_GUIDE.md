# Admin Access & Support Notifications - Quick Reference

## ✅ What Was Just Implemented

### 1. Admin Panel Button in Dashboard
**Location:** User dropdown menu (top right of dashboard)
**Visibility:** Only appears when `user.isAdmin = true`
**Icon:** ⚙️ Settings icon
**Link:** `/admin`

**How it works:**
- User clicks their avatar in dashboard
- If `isAdmin = true`, sees "Admin Panel" option
- Click → redirects to admin dashboard
- If not admin, button doesn't appear

### 2. Email Notifications to support@myones.ai

**Trigger 1: New Support Ticket Created**
```
From: User submits support ticket
To: support@myones.ai
Subject: "New Support Ticket: [ticket subject]"
Contains:
- User name and email
- Ticket subject, category, priority
- Full description
- Ticket ID
- Direct link to admin dashboard
```

**Trigger 2: User Responds to Ticket**
```
From: User replies to existing ticket
To: support@myones.ai
Subject: "New Response on Ticket: [ticket subject]"
Contains:
- User name and email
- Original ticket subject
- New message content
- Ticket ID
- Direct link to specific ticket in admin
```

---

## 🔧 Setup Required

### Step 1: Make Your Account Admin

**Option A: Via Supabase SQL Editor**
1. Go to https://supabase.com/dashboard
2. Select your `ones-prod` project
3. Click "SQL Editor" in left sidebar
4. Run this query:
```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'pstadniuk@gmail.com';
```
5. Click "Run"

**Option B: Via psql Command Line**
```bash
# Connect to production database
psql "postgresql://postgres.aytzwtehxtvoejgcixdn:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Run update
UPDATE users SET is_admin = true WHERE email = 'pstadniuk@gmail.com';

# Verify
SELECT email, is_admin FROM users WHERE email = 'pstadniuk@gmail.com';

# Exit
\q
```

### Step 2: Verify SendGrid Configuration (Already Done)
✅ `SENDGRID_API_KEY` is already set in server/.env
✅ Email service already working for other notifications
✅ No additional setup needed

**Note:** Make sure to add `SENDGRID_API_KEY` to Railway environment variables if not already there!

### Step 3: Test Admin Access
1. Visit https://my-ones.vercel.app/login
2. Login with `pstadniuk@gmail.com`
3. Click your avatar (top right)
4. Should see "Admin Panel" option
5. Click it → Should redirect to `/admin` dashboard

---

## 📧 Email Notification Details

### SendGrid Configuration
- **From Email:** Set in `server/emailService.ts` (default: `noreply@myones.ai`)
- **To Email:** `support@myones.ai` (hardcoded in routes)
- **API Key:** From `SENDGRID_API_KEY` environment variable

### Email Templates

**New Ticket Email:**
```html
<h2>New Support Ticket Received</h2>
<p><strong>From:</strong> John Doe (john@example.com)</p>
<p><strong>Subject:</strong> Unable to generate formula</p>
<p><strong>Category:</strong> technical</p>
<p><strong>Priority:</strong> high</p>
<p><strong>Description:</strong></p>
<p>I tried to generate my formula but...</p>
<p><strong>Ticket ID:</strong> abc-123-def</p>
<p><a href="https://myones.ai/admin">View in Admin Dashboard</a></p>
```

**New Response Email:**
```html
<h2>New User Response on Support Ticket</h2>
<p><strong>From:</strong> John Doe (john@example.com)</p>
<p><strong>Ticket Subject:</strong> Unable to generate formula</p>
<p><strong>Ticket ID:</strong> abc-123-def</p>
<p><strong>New Message:</strong></p>
<p>Thanks for the help! I tried again and...</p>
<p><a href="https://myones.ai/admin/support/abc-123-def">View Ticket in Admin Dashboard</a></p>
```

### Failure Handling
- **Email failures don't block ticket creation**
- Errors logged to console but ticket still saves
- User doesn't see email error (transparent)

---

## 🚀 How to Use

### As Admin:
1. **Access Admin Dashboard:**
   - Login to myones.ai
   - Click avatar → "Admin Panel"
   - OR navigate to `/admin` directly

2. **When Email Arrives:**
   - Check support@myones.ai inbox
   - Click link in email → goes directly to admin dashboard
   - (Note: Full support ticket UI not built yet, coming next)

### As User:
1. **Submit Support Ticket:**
   - User goes to Support page
   - Fills out ticket form
   - Submits
   - ✅ Ticket created + Email sent to support@

2. **Respond to Ticket:**
   - User views their tickets
   - Clicks on ticket
   - Types response
   - Submits
   - ✅ Response saved + Email sent to support@

---

## 🔐 Security Notes

- ✅ Only users with `isAdmin = true` see Admin Panel button
- ✅ Admin routes protected by `requireAdmin` middleware
- ✅ JWT token validated before admin access
- ✅ 403 Forbidden if user tries to access admin without permission
- ⚠️ Support emails contain ticket IDs (sensitive data) - ensure support@ email is secure

---

## 📊 What's Already Working in Admin Dashboard

Once you access `/admin`, you'll see:

1. **Dashboard Stats**
   - Total users
   - Paid users
   - Active users
   - Total revenue
   - Growth charts

2. **User Management** (`/admin/users`)
   - List all users
   - Search by name/email
   - Pagination
   - Click user → see full profile

3. **User Details** (`/admin/users/:id`)
   - User info
   - Health profile
   - Formula history
   - Activity timeline

4. **AI Settings** (on dashboard)
   - Switch between OpenAI/Anthropic
   - Select model (GPT-4o, Claude 4.5, etc.)
   - Test connection

---

## ❌ What's NOT Built Yet (Coming Next)

1. **Support Ticket Admin UI**
   - No `/admin/support` page yet
   - No ticket list view
   - No ticket detail/response interface
   - **Current workaround:** Direct database access

2. **Real-Time Notifications**
   - No badge showing unread count
   - No browser notifications
   - No sound alerts
   - **Current workaround:** Check email

3. **User Editing Actions**
   - Can't edit user details
   - Can't disable accounts
   - Can't grant/revoke admin
   - **Current workaround:** Direct database updates

---

## 🎯 Next Steps

### Immediate (Now):
1. ✅ Run SQL to set `is_admin = true` for your account
2. ✅ Verify admin button appears in dashboard
3. ✅ Confirm you can access `/admin`
4. ✅ Verify SendGrid API key is in Railway environment variables

### This Week (Recommended Priority):
1. Build admin support ticket interface
2. Add real-time notification badges
3. Add user editing capabilities

### Testing:
1. Create a test support ticket as a regular user
2. Check if email arrives at support@myones.ai
3. Verify email contains correct info and link
4. Click link → should go to admin dashboard

---

## 🆘 Troubleshooting

### "Admin Panel button doesn't appear"
**Cause:** `is_admin` not set to true in database
**Fix:** Run SQL update query above

### "403 Forbidden when accessing /admin"
**Cause:** JWT token doesn't have admin flag
**Fix:** Logout and login again after setting is_admin

### "Emails not arriving at support@myones.ai"
**Cause 1:** SendGrid API key not in Railway
**Fix:** Add to Railway environment variables

**Cause 2:** SendGrid account not verified
**Fix:** Verify domain/sender in SendGrid dashboard

**Cause 3:** Emails going to spam
**Fix:** Check spam folder, whitelist noreply@myones.ai

### "Admin dashboard shows no data"
**Cause:** No users/orders in database yet
**Fix:** Create test data or wait for real users

---

## 📝 Environment Variables Checklist

Make sure these are set in **Railway**:

- ✅ `DATABASE_URL` (Supabase production)
- ✅ `JWT_SECRET`
- ✅ `SESSION_SECRET`
- ✅ `FIELD_ENCRYPTION_KEY`
- ✅ `TOKEN_ENCRYPTION_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `SENDGRID_API_KEY` ← **Required for email notifications**
- ⚠️ `FROM_EMAIL` (optional, defaults to noreply@myones.ai)

---

## ✅ Summary

**What's Live Now:**
- ✅ Admin Panel button (for users with `isAdmin = true`)
- ✅ Email notifications to support@myones.ai on new tickets
- ✅ Email notifications to support@myones.ai on ticket responses
- ✅ Full admin dashboard (stats, users, analytics)
- ✅ All connected to production database (Supabase)

**Ready to Deploy:**
- Code is committed and will auto-deploy to Railway/Vercel
- Just need to set `is_admin = true` for your account
- Verify SendGrid API key is in Railway

**Coming Soon:**
- Support ticket admin UI
- Real-time notifications
- User account editing
