# Railway Environment Variables — ONES Production Setup

This document lists all environment variables that must be configured in the Railway dashboard for the ONES backend to function correctly in production.

**Where to add them:**
Railway Dashboard → Your Project → Service → Variables tab → Add Variable

---

## 🔐 Required — Core Security

| Variable | Description | Example Format |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres:[password]@[host]:5432/postgres?sslmode=require` |
| `JWT_SECRET` | Long random string for signing auth tokens (min 32 chars) | `openssl rand -hex 32` output |
| `SESSION_SECRET` | Random string for OAuth session state | `openssl rand -hex 32` output |
| `TOKEN_ENCRYPTION_KEY` | Key for encrypting wearable OAuth tokens | 32-char hex string |
| `FIELD_ENCRYPTION_KEY` | Key for encrypting sensitive DB fields | 32-char hex string |

---

## 🗄️ Required — Database (Supabase)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase dashboard → API settings |

---

## 📧 Required — Email (SendGrid)

| Variable | Value |
|---|---|
| `SENDGRID_API_KEY` | SendGrid API key (starts with `SG.`) |
| `SENDGRID_FROM_EMAIL` | `noreply@ones.health` |
| `SENDGRID_FROM_NAME` | `ONES` |

---

## 🌐 Required — App URLs

These control where email verification links and OAuth redirects point. **Must be set to production URLs on Railway.**

| Variable | Value |
|---|---|
| `FRONTEND_URL` | `https://ones.health` (or Vercel URL if custom domain not yet live) |
| `APP_URL` | `https://myones-production.up.railway.app` (your Railway backend URL) |

---

## 🤖 Required — AI Providers

At least one of the following must be set:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (for GPT-4o / GPT-5) |
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude models) |
| `AI_PROVIDER` | Default provider: `openai` or `anthropic` |
| `AI_MODEL` | Default model: e.g. `gpt-4o` or `claude-sonnet-4-5` |

---

## 💬 Optional — SMS (Twilio)

Required only if SMS reminder feature is active:

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM` | Twilio sender phone number (e.g. `+18553890981`) |
| `TWILIO_PHONE_NUMBER` | Same as above (redundant alias used in some places) |

---

## ⌚ Optional — Wearable Integrations

Required only if Oura / Fitbit integrations are active:

| Variable | Description |
|---|---|
| `OURA_CLIENT_ID` | Oura Ring OAuth app client ID |
| `OURA_CLIENT_SECRET` | Oura Ring OAuth app secret |
| `FITBIT_CLIENT_ID` | Fitbit OAuth app client ID |
| `FITBIT_CLIENT_SECRET` | Fitbit OAuth app secret |
| `JUNCTION_API_KEY` | Junction (Vital) wearables API key |
| `JUNCTION_REGION` | Junction region (e.g. `us`) |
| `JUNCTION_ENV` | Junction environment: `sandbox` or `production` |

---

## 💳 Optional — Payments (Stripe)

Required only when payment processing is activated:

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

---

## 🏷️ Environment Flag

| Variable | Value |
|---|---|
| `APP_ENV` | `prod` |

---

## Notes

- **Never commit `.env` to GitHub.** Railway variables are set directly in the dashboard and are injected at runtime.
- **`DATABASE_URL` must include `?sslmode=require`** for Supabase connections.
- **`FRONTEND_URL`** must match exactly where the React frontend is hosted (Vercel URL or custom domain). It is used to generate email verification links — a mismatch will cause broken links in emails.
- After adding or changing variables in Railway, the service will automatically redeploy.
