# ONES AI Codebase Map

> **Last Updated:** January 8, 2026  
> **Purpose:** Guide for developers to understand what's core vs. future features

---

## Quick Reference

| Status | Meaning |
|--------|---------|
| ✅ **CORE** | Essential to current product - DO NOT MODIFY without testing |
| 🔮 **FUTURE** | Built but not active - can be cleaned up later |
| ⚠️ **SHARED** | Used by both core and future features - handle with care |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  Vercel: https://my-ones.vercel.app                            │
│  React + Vite + TailwindCSS + shadcn/ui                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│  Railway: https://myones-production.up.railway.app             │
│  Express.js + Node.js                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                │
│  Supabase (PostgreSQL) + Drizzle ORM                           │
│  Production: postgres.aytzwtehxtvoejgcixdn (us-east-1)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Server Code Map

### `/server/routes.ts` (~9,800 lines) ⚠️ MONOLITHIC

This file is too large and contains mixed concerns. Here's what's inside:

| Line Range | Feature | Status | Notes |
|------------|---------|--------|-------|
| 1-200 | Imports, config, ALLOWED_MODELS | ✅ CORE | AI model configuration |
| 200-450 | `callAnthropic()`, `callAnthropicStreaming()` | ✅ CORE | AI API calls |
| 450-700 | `buildCreateFormulaTool()` | ✅ CORE | Formula creation via AI |
| 700-1500 | System prompts, AI instructions | ✅ CORE | Core AI behavior |
| 1500-2500 | Auth routes (login, register, etc.) | ✅ CORE | Authentication |
| 2500-3000 | User routes | ✅ CORE | Profile management |
| 3000-4000 | Chat endpoint (streaming) | ✅ CORE | Main AI consultation |
| 4000-5000 | Formula routes | ✅ CORE | Formula CRUD |
| 5000-5500 | File upload routes | ✅ CORE | Lab uploads |
| 5500-6000 | Notification routes | ✅ CORE | Alerts, preferences |
| 6000-6500 | Consent routes | ✅ CORE | HIPAA compliance |
| 6500-7500 | Admin routes | ✅ CORE | Admin dashboard APIs |
| 7500-7800 | Newsletter, support tickets | ✅ CORE | User support |
| **7800-9650** | **Optimize routes (inline)** | **🔮 FUTURE** | Meal plans, workouts, etc. |

### `/server/routes/` (Modular Route Files)

| File | Lines | Status | Description |
|------|-------|--------|-------------|
| `auth.routes.ts` | ~200 | ✅ CORE | Login, register, logout, token refresh |
| `user.routes.ts` | ~300 | ✅ CORE | Profile, health profile, settings |
| `admin.routes.ts` | ~400 | ✅ CORE | Admin dashboard APIs |
| `formula.routes.ts` | ~250 | ✅ CORE | Formula CRUD operations |
| `files.routes.ts` | ~350 | ✅ CORE | File uploads, lab analysis |
| `notifications.routes.ts` | ~150 | ✅ CORE | Push notifications, preferences |
| `consents.routes.ts` | ~100 | ✅ CORE | HIPAA consent management |
| `support.routes.ts` | ~100 | ✅ CORE | Support tickets |
| `ingredients.routes.ts` | ~50 | ✅ CORE | Ingredient catalog API |
| `streaks.routes.ts` | ~134 | ⚠️ SHARED | Streak calculations (depends on daily logs) |
| `optimize.routes.ts` | ~1,364 | 🔮 FUTURE | Daily logs, meal plans, workouts |
| `wearables-junction.routes.ts` | ~701 | 🔮 FUTURE | Fitbit, Oura, Whoop integration |
| `webhooks.routes.ts` | ~250 | 🔮 FUTURE | Wearable webhooks |

### `/server/` (Support Files)

| File | Lines | Status | Description |
|------|-------|--------|-------------|
| `index.ts` | ~200 | ✅ CORE | Server entry point |
| `storage.ts` | ~4,400 | ⚠️ SHARED | Database operations (mixed core/future) |
| `db.ts` | ~50 | ✅ CORE | Database connection |
| `prompt-builder.ts` | ~800 | ✅ CORE | AI prompt construction |
| `fileAnalysis.ts` | ~300 | ✅ CORE | Lab report AI analysis |
| `objectStorage.ts` | ~200 | ✅ CORE | Google Cloud Storage |
| `objectAcl.ts` | ~150 | ✅ CORE | File access control |
| `tokenEncryption.ts` | ~100 | ✅ CORE | OAuth token encryption |
| `fieldEncryption.ts` | ~100 | ✅ CORE | PHI field encryption |
| `smsReminderScheduler.ts` | ~446 | ⚠️ SHARED | Supplement + workout reminders |
| `optimizeReminderScheduler.ts` | ~300 | 🔮 FUTURE | Optimize-specific reminders |
| `optimize-prompts.ts` | ~706 | 🔮 FUTURE | AI prompts for meal/workout plans |
| `optimize-plan-context.ts` | ~159 | 🔮 FUTURE | Plan context builder |
| `optimize-normalizers.ts` | ~279 | 🔮 FUTURE | Response normalizers |
| `workoutAnalysis.ts` | ~694 | 🔮 FUTURE | Workout analytics |
| `junction.ts` | ~250 | 🔮 FUTURE | Vital/Junction API client |
| `tokenRefreshScheduler.ts` | ~200 | 🔮 FUTURE | Wearable token refresh |
| `wearableDataScheduler.ts` | ~300 | 🔮 FUTURE | Wearable data sync |

### `/server/archived/` (Already Deprecated)

All files in this folder are 🔮 FUTURE / deprecated:
- Old wearable OAuth flows before Junction migration
- Can be deleted when ready

---

## Client Code Map

### `/client/src/pages/`

| File | Status | Description |
|------|--------|-------------|
| `HomePage.tsx` | ✅ CORE | Landing page |
| `LoginPage.tsx` | ✅ CORE | Authentication |
| `RegisterPage.tsx` | ✅ CORE | User registration |
| `DashboardPage.tsx` | ✅ CORE | Main user dashboard |
| `ChatPage.tsx` | ✅ CORE | AI consultation |
| `FormulaPage.tsx` | ✅ CORE | View current formula |
| `HealthProfilePage.tsx` | ✅ CORE | Health questionnaire |
| `SettingsPage.tsx` | ✅ CORE | User settings |
| `NotificationsPage.tsx` | ✅ CORE | Notification center |
| `LabResultsPage.tsx` | ✅ CORE | Lab upload and analysis |
| `OrderPage.tsx` | ✅ CORE | Order supplements |
| `ConsentsPage.tsx` | ✅ CORE | HIPAA consents |
| `admin/*.tsx` | ✅ CORE | Admin dashboard pages |
| `OptimizePage.tsx` | 🔮 FUTURE | Nutrition/workout/lifestyle hub |
| `WearablesPage.tsx` | 🔮 FUTURE | Wearable device connections |
| `GroceryListModal.tsx` | 🔮 FUTURE | Grocery shopping list |

### `/client/src/components/`

| Folder | Status | Description |
|--------|--------|-------------|
| `ui/` | ✅ CORE | shadcn/ui components |
| `dashboard/` | ✅ CORE | Dashboard widgets |
| `chat/` | ✅ CORE | AI chat interface |
| `formula/` | ✅ CORE | Formula display |
| `health-profile/` | ✅ CORE | Health questionnaire |
| `admin/` | ✅ CORE | Admin components |
| `layout/` | ✅ CORE | Navigation, sidebar |
| `optimize/` (19 files) | 🔮 FUTURE | All workout/nutrition/lifestyle UI |

### Key Components in `/client/src/components/optimize/` (ALL 🔮 FUTURE)

| Component | Lines | Description |
|-----------|-------|-------------|
| `NutritionPlanTab.tsx` | 935 | Meal planning interface |
| `LifestylePlanTab.tsx` | 632 | Sleep/stress tracking |
| `WorkoutPlanTab.tsx` | 639 | Workout plans |
| `DynamicExerciseLogger.tsx` | 459 | Log exercises |
| `MealLogger.tsx` | 423 | Log meals |
| `WorkoutAnalytics.tsx` | 402 | Workout stats |
| `NutritionHistory.tsx` | 351 | Meal history |
| `WorkoutHistory.tsx` | 333 | Exercise history |
| `WorkoutSchedule.tsx` | 289 | Schedule view |
| `LogWorkoutDialog.tsx` | 289 | Quick log modal |
| `OptimizeSmsPreferences.tsx` | 264 | SMS settings |
| `TodayNutritionSummary.tsx` | 242 | Daily nutrition |
| `SupplementTracker.tsx` | 230 | ⚠️ SHARED - supplement checkboxes |
| `QuickLogDialog.tsx` | 227 | Quick actions |
| `HydrationTracker.tsx` | 213 | Water tracking |
| `SetLogger.tsx` | 178 | Workout sets |
| `ExerciseLogForm.tsx` | 141 | Exercise form |
| `WorkoutPreferencesDialog.tsx` | 139 | Preferences |
| `DailyLogsHistory.tsx` | 134 | Log history |

---

## Database Schema Map

### `/shared/schema.ts` (~1,400 lines)

#### ✅ CORE Tables (Keep)

| Table | Description |
|-------|-------------|
| `users` | User accounts |
| `user_profiles` | Extended profile data |
| `health_profiles` | Health questionnaire answers |
| `formulas` | Custom supplement formulas |
| `formula_versions` | Formula history |
| `messages` | Chat message history |
| `chat_sessions` | Conversation sessions |
| `file_uploads` | Lab reports, documents |
| `audit_logs` | HIPAA compliance logs |
| `user_consents` | Consent records |
| `orders` | Supplement orders |
| `notifications` | User notifications |
| `notification_prefs` | Notification settings |
| `app_settings` | System configuration |
| `newsletter_subs` | Newsletter signups |
| `support_tickets` | Support requests |

#### ⚠️ SHARED Tables (Handle with Care)

| Table | Description | Notes |
|-------|-------------|-------|
| `optimize_daily_logs` | Daily tracking | Contains supplement_morning/afternoon/evening - CORE uses these fields |
| `streak_rewards` | Streak achievements | Depends on daily logs |
| `user_streaks` | Streak counts | Depends on daily logs |

#### 🔮 FUTURE Tables (Can Be Dropped Later)

| Table | Description |
|-------|-------------|
| `wearable_connections` | Device OAuth tokens |
| `biometric_data` | Sleep, HRV, etc. from devices |
| `biometric_trends` | Trend calculations |
| `optimize_plans` | AI-generated plans |
| `workout_preferences` | User workout settings |
| `workout_plans` | Generated workout plans |
| `workouts` | Workout templates |
| `workout_logs` | Logged workouts |
| `exercise_records` | Individual exercises |
| `meal_plans` | Generated meal plans |
| `recipes` | Meal recipes |
| `meal_logs` | Logged meals |
| `grocery_lists` | Shopping lists |

---

## API Endpoints Map

### ✅ CORE Endpoints

```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

Users:
GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/me/health-profile
POST   /api/users/me/health-profile
PATCH  /api/users/me/timezone

Chat:
POST   /api/chat                    # Main AI consultation (streaming)
GET    /api/chat/sessions
GET    /api/chat/sessions/:id/messages

Formulas:
GET    /api/formulas/active
GET    /api/formulas/:id
POST   /api/formulas

Files:
POST   /api/files/upload
GET    /api/files
GET    /api/files/:id/download
POST   /api/files/:id/analyze

Dashboard:
GET    /api/dashboard
GET    /api/dashboard/wellness

Streaks:
GET    /api/streaks
GET    /api/streaks/rewards

Notifications:
GET    /api/notifications
PATCH  /api/notifications/:id/read
GET    /api/notifications/unread-count

Admin:
GET    /api/admin/stats
GET    /api/admin/users
GET    /api/admin/ai-settings
POST   /api/admin/ai-settings
POST   /api/admin/ai-settings/test
```

### 🔮 FUTURE Endpoints

```
Optimize:
GET    /api/optimize/daily-logs      # ⚠️ SHARED - supplements use this!
POST   /api/optimize/daily-logs      # ⚠️ SHARED - supplements use this!
GET    /api/optimize/plans
POST   /api/optimize/plans/generate
POST   /api/optimize/meal-swap
POST   /api/optimize/recipe
GET    /api/optimize/grocery-list
POST   /api/optimize/grocery-list
GET    /api/optimize/workout-analysis
POST   /api/optimize/quick-log

Wearables:
GET    /api/wearables/connections
POST   /api/wearables/connect/:provider
GET    /api/wearables/callback/:provider
DELETE /api/wearables/disconnect/:provider
GET    /api/wearables/biometric-data
```

---

## Critical Dependencies

### ⚠️ Supplement Tracking Flow (DO NOT BREAK)

```
User clicks "Morning supplement" checkbox
         │
         ▼
SupplementTracker.tsx (client/src/components/optimize/)
         │
         ▼
POST /api/optimize/daily-logs
         │
         ▼
optimize.routes.ts → storage.upsertDailyLog()
         │
         ▼
optimize_daily_logs table (supplement_morning = true)
         │
         ▼
storage.updateAllStreaks() → user_streaks table
         │
         ▼
Dashboard shows streak count
```

### ⚠️ Dashboard Wellness Data Flow

```
GET /api/dashboard/wellness
         │
         ▼
routes.ts → storage.getDailyLog()
         │
         ▼
Returns: supplementMorning, supplementAfternoon, supplementEvening
         │
         ▼
Dashboard displays supplement status
```

---

## Environment Variables

### ✅ CORE (Required)

```bash
DATABASE_URL=           # Supabase PostgreSQL connection
JWT_SECRET=             # JWT signing key (hard-fails if missing in prod)
OPENAI_API_KEY=         # AI chat functionality
```

### ✅ CORE (Optional but Recommended)

```bash
ANTHROPIC_API_KEY=      # Claude models support
SENDGRID_API_KEY=       # Email notifications
TWILIO_ACCOUNT_SID=     # SMS reminders
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
GCS_BUCKET=             # File storage
GCS_SERVICE_ACCOUNT=
```

### 🔮 FUTURE (Wearables)

```bash
VITAL_API_KEY=          # Junction/Vital integration
VITAL_ENVIRONMENT=
FITBIT_CLIENT_ID=       # Direct OAuth (deprecated)
FITBIT_CLIENT_SECRET=
OURA_CLIENT_ID=
OURA_CLIENT_SECRET=
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
```

---

## Recommended Cleanup Order (For Future Developer)

### Phase 1: Safe Preparation
1. ✅ Add integration tests for supplement logging flow
2. ✅ Add integration tests for streak calculation
3. ✅ Add integration tests for dashboard wellness endpoint

### Phase 2: Client Cleanup (Low Risk)
1. Delete `/client/src/pages/WearablesPage.tsx`
2. Delete `/client/src/pages/GroceryListModal.tsx`
3. Delete `/client/src/components/optimize/` EXCEPT `SupplementTracker.tsx`
4. Update `App.tsx` routes

### Phase 3: Server Cleanup (Medium Risk)
1. Delete `/server/routes/wearables-junction.routes.ts`
2. Delete `/server/routes/webhooks.routes.ts`
3. Delete `/server/archived/` folder
4. Delete wearable schedulers
5. Remove wearable-related code from `smsReminderScheduler.ts`

### Phase 4: Schema Cleanup (High Risk - Needs Migration)
1. Create migration to drop unused tables
2. Keep `optimize_daily_logs` but remove unused columns
3. Update `storage.ts` to remove unused methods

---

## Questions?

Contact: [Your contact info]

For the full audit report, see: `docs/FEATURE_AUDIT_REPORT.md`
