# ONES AI - Copilot Instructions

## Project Overview
ONES AI is a personalized supplement platform with conversational AI-driven formula creation. Users chat with an AI practitioner to receive custom supplement formulas based on their health profile, lab results, and goals.

**Tech Stack:** React (client) + Express (server) + PostgreSQL (Drizzle ORM) + OpenAI/Anthropic APIs

## Architecture

### Monorepo Structure
- `client/` - React frontend (Vite + TailwindCSS + shadcn/ui)
- `server/` - Express backend (API routes, AI logic, schedulers)
- `shared/` - Shared types, schemas, and ingredient catalog
- `migrations/` - Drizzle ORM migrations

### Key Path Aliases
```typescript
@/ → client/src/
@shared → shared/
@assets → attached_assets/
```

### Database Layer (Drizzle ORM)
- **Schema:** `shared/schema.ts` - Single source of truth for all tables (users, formulas, messages, orders, etc.)
- **DB Client:** `server/db.ts` - PostgreSQL connection via `drizzle-orm/node-postgres`
- **Storage:** `server/storage.ts` - Repository pattern with `DrizzleStorage` class
- **Migrations:** Run `npm run db:push` to sync schema changes (uses `drizzle.config.ts`)

**Important:** Schema changes require both updating `shared/schema.ts` AND running `db:push`.

## Critical Workflows

### Development
```bash
npm run dev          # Starts dev server with Vite HMR (port 5000)
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes to database
npm run test:db      # Test database connection and list tables
```

### Deployment (Supabase + Railway + Vercel)
```bash
# Database Setup
node setup-supabase.mjs           # Interactive Supabase configuration
npm run db:push                   # Push schema to Supabase
./migrate-to-supabase.sh          # Migrate data from Neon (optional)

# Deployment Verification
node check-deployment.mjs         # Check all config before deploy

# See QUICKSTART.md and DEPLOYMENT_GUIDE.md for full instructions
```

**Deployment Architecture:**
- **Frontend**: Vercel (React/Vite static site)
- **Backend**: Railway (Express API server)
- **Database**: Supabase (PostgreSQL with Drizzle ORM)

### AI Model Configuration
- Admin can configure AI provider/model at runtime via Admin Dashboard → AI Settings
- Supports OpenAI (gpt-4o, gpt-5) and Anthropic (Claude 4.5 Sonnet/Haiku/Opus)
- Settings persist in `app_settings` table (key: `ai_settings`)
- Fallback to environment variables if not overridden

### Authentication Flow
- **JWT-based:** Tokens generated in `server/routes.ts` with `generateToken()`, expire in 7 days
- **Middleware:** `requireAuth` validates Bearer token, sets `req.userId`
- **Admin routes:** `requireAdmin` additionally checks `user.isAdmin`
- **Client:** `AuthContext` manages token/user state, stores in localStorage
- **Password hashing:** bcrypt with 10 salt rounds

## AI Formula Generation (Critical)

### Ingredient System
**Source of truth:** `shared/ingredients.ts`
- **Base Formulas (18):** Fixed-dose proprietary blends (e.g., "Adrenal Support" = 420mg)
- **Individual Ingredients (200+):** Flexible dosing within ranges (e.g., Ashwagandha: 600mg fixed)
- **Formula limits:** Max 5500mg total per formula (enforced server-side)

### Prompt Building
- **Location:** `server/prompt-builder.ts`
- **Two modes:**
  - `buildGPT4Prompt()` - Simple Q&A mode
  - `buildO1MiniPrompt()` - Full consultation with formula creation
- **Context injection:** Health profile, active formula, lab data, conversation history
- **Key principles:** AI selects ingredients/doses, backend validates and calculates totals

### Formula Creation Flow
1. AI returns JSON block with `bases` and `additions` arrays
2. Backend validates ingredients against approved catalog (`shared/ingredients.ts`)
3. Backend normalizes ingredient names and validates dose ranges
4. Backend enforces 5500mg total limit
5. Formula saved to `formulas` table with version tracking

### Streaming Chat Implementation
- **Endpoint:** `POST /api/chat` (Server-Sent Events)
- **OpenAI:** Native streaming via `openai.chat.completions.create({ stream: true })`
- **Anthropic:** Non-streaming API, simulated by chunking response
- **Formula extraction:** Regex parses JSON block from markdown code fence
- **Client:** `client/src/components/AIChat.tsx` handles SSE connection

## Project-Specific Patterns

### Error Handling
- **Validation:** Zod schemas defined in `shared/schema.ts`, validated at route level
- **Database errors:** Caught in storage layer, logged to console, throw descriptive errors
- **API responses:** Consistent `{ error: string }` format for 4xx/5xx

### File Uploads (HIPAA-Compliant)
- **Service:** `server/objectStorage.ts` - Abstraction over Google Cloud Storage
- **Permissions:** ACL system in `server/objectAcl.ts` (user ownership + admin access)
- **Audit logs:** All file operations logged to `audit_logs` table
- **Lab reports:** PDF uploads trigger AI analysis via `server/fileAnalysis.ts`

### Scheduled Jobs
Three cron schedulers start in `server/index.ts`:
1. `smsReminderScheduler.ts` - Daily pill reminders
2. `tokenRefreshScheduler.ts` - Wearable OAuth token refresh
3. `wearableDataScheduler.ts` - Fetch biometric data from Fitbit/Oura/Whoop

### Wearable Integrations
- **OAuth flow:** Initiated via `/api/wearables/connect/:provider`
- **Callback:** `/api/wearables/callback/:provider` exchanges code for tokens
- **Token storage:** Encrypted in `wearable_connections.accessToken` (see `server/tokenEncryption.ts`)
- **Data sync:** Scheduler calls provider APIs, stores in `biometric_data` table

### React Query Patterns
- **Client setup:** `client/src/lib/queryClient.ts` configures defaults
- **API wrapper:** `apiRequest()` helper handles auth headers + error parsing
- **Queries:** Use `queryKey: ['/api/endpoint']` matching backend routes
- **Mutations:** Invalidate queries on success for cache consistency

### Component Library (shadcn/ui)
- **Location:** `client/src/components/ui/`
- **Config:** `components.json` defines import aliases
- **Usage:** Import from `@/components/ui/button` etc.
- **Theming:** Light mode only, configured in `tailwind.config.ts`

## Common Pitfalls to Avoid

1. **Schema changes without migration:** Always run `npm run db:push` after editing `shared/schema.ts`
2. **Formula validation bypass:** Never skip ingredient validation against `shared/ingredients.ts`
3. **AI prompt modification:** Changes to `prompt-builder.ts` affect formula quality - test thoroughly
4. **Hardcoded dosages:** Use ingredient catalog, not magic numbers
5. **Missing auth middleware:** Protected routes must use `requireAuth` or `requireAdmin`
6. **Formula total exceeds 5500mg:** Backend enforces limit, but AI should avoid suggesting it
7. **Wearable tokens unencrypted:** Always use `encryptToken()`/`decryptToken()` helpers

## Testing Shortcuts

### Quick Admin Access
Set `isAdmin: true` in database for test user:
```sql
UPDATE users SET is_admin = true WHERE email = 'test@example.com';
```

### Simulate AI Response
Bypass OpenAI in dev by mocking `server/routes.ts` chat endpoint (not implemented - manual testing required)

### Reset Formula
Delete user formulas to test first-time flow:
```sql
DELETE FROM formulas WHERE user_id = 'user-uuid';
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `server/routes.ts` | All API endpoints (6711 lines - core business logic) |
| `shared/schema.ts` | Database schema + Zod validators (878 lines) |
| `shared/ingredients.ts` | Ingredient catalog (1834 lines - formula rules) |
| `server/prompt-builder.ts` | AI system prompts (context injection logic) |
| `server/storage.ts` | Database abstraction layer (2000+ lines) |
| `client/src/App.tsx` | Route configuration (Wouter router) |
| `client/src/contexts/AuthContext.tsx` | Authentication state management |

## External Dependencies

- **OpenAI API:** Required for GPT-4o/GPT-5 (key in `OPENAI_API_KEY`)
- **Anthropic API:** Optional for Claude models (`ANTHROPIC_API_KEY`)
- **Google Cloud Storage:** File uploads (`@google-cloud/storage`)
- **Stripe:** Payment processing (referenced but not fully implemented)
- **SendGrid:** Transactional emails (`@sendgrid/mail`)
- **Twilio:** SMS notifications (`twilio`)

## Environment Variables
See `server/.env` for required vars:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Token signing (auto-generated if missing in dev)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - AI providers
- `SESSION_SECRET` - OAuth state management
- Provider-specific OAuth credentials (Fitbit, Oura, Whoop)
