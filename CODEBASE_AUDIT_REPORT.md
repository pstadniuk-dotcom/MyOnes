# ONES AI Codebase Audit Report

**Generated:** December 2025  
**Status:** ✅ CLEANUP COMPLETED  
**Purpose:** Identify unused files, dead code, and cleanup opportunities

---

## ✅ CLEANUP COMPLETED

The following cleanup was performed on December 3, 2025:

### Files/Folders Deleted
- 2 empty folders (`server/server/`, `client/src/client/`)
- 2 backup files (`.backup` files)
- 11 debug JSON files (`ai-response-*.json`)
- 5 Replit leftovers (`.replit`, `replit.md`, `.upm/`, `.local/`, `.config/`)
- 11 unused example components (`client/src/components/examples/`)
- 6 orphaned page components (not in router)
- 3 duplicate seed files (kept `seed-support-api.ts`)
- 12 unused UI components
- 21 outdated documentation files
- 4 misc files (logs, zip, screenshot)

### NPM Packages Removed
- `@neondatabase/serverless`
- `passport`, `passport-local`, `@types/passport`, `@types/passport-local`
- `memorystore`, `connect-pg-simple`, `@types/connect-pg-simple`
- `react-icons`, `pdf-parse`, `ws`, `@types/ws`
- `cmdk`, `embla-carousel-react`, `input-otp`, `vaul`, `react-resizable-panels`
- `@radix-ui/react-context-menu`, `@radix-ui/react-aspect-ratio`
- `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`

### Reorganization
- Created `docs/` folder with 4 essential docs
- Created `scripts/dev/` folder with 18 utility scripts
- Root now has only essential config files

---

## 📊 CLEANUP SUMMARY

| Category | Before | After | Removed |
|----------|--------|-------|---------|
| Root files | ~50 | ~25 | 25+ |
| npm packages | 727 | 698 | 29 |
| UI components | 47 | 35 | 12 |
| Documentation | 28 files | 4 files | 24 |
| Dev scripts | scattered | organized | moved |

---

## 🔵 CURRENT STRUCTURE (Post-Cleanup)

```
ones-backup/
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared types/schemas
├── migrations/             # Drizzle migrations
├── docs/                   # Essential documentation (4 files)
│   ├── design_guidelines.md
│   ├── DEV_VS_PROD_GUIDE.md
│   ├── RAILWAY_TROUBLESHOOTING.md
│   └── VERCEL_DEPLOYMENT.md
├── scripts/                # Utility scripts
│   ├── setup-supabase.mjs
│   └── dev/               # Development/test scripts (18 files)
├── .github/               # GitHub config + copilot-instructions.md
├── QUICKSTART.md          # Getting started guide
├── DEPLOYMENT_GUIDE.md    # Deployment instructions
└── [config files]         # package.json, tsconfig, vite, etc.
```

---

## ⚠️ REMAINING ITEMS (Optional Future Cleanup)

### Stripe Packages (Keep if Planning Payments)
```json
"@stripe/react-stripe-js": "^4.0.2"
"@stripe/stripe-js": "^7.9.0"
"stripe": "^18.5.0"
```

### Pre-existing TypeScript Errors (Unrelated to Cleanup)
- `ResearchCitationCard.tsx` - Interface type mismatch
- `routes.ts` - Missing `@shared/ingredient-research` module
- `routes.ts` - Missing `logger` imports in some routes

---

## 🔴 ORIGINAL AUDIT (For Reference)

### Empty Folders
```
server/server/                    # Empty nested folder
client/src/client/                # Empty nested folder
```

### Backup Files
```
server/prompt-builder.ts.backup   # Backup of active file
server/seed-support-api.ts.backup # Backup of active file
```

### Debug/Test JSON Files (Root Level)
```
ai-response-nutrition-1762702549522.json
ai-response-nutrition-1763765916539.json
ai-response-nutrition-1763766366391.json
ai-response-nutrition-1763783479230.json
ai-response-nutrition-1764049762777.json
ai-response-workout-1763763630505.json
ai-response-workout-1763788618171.json
ai-response-workout-1763789196215.json
ai-response-workout-1763789512017.json
ai-response-workout-1763790217759.json
ai-response-workout-1763792641270.json
```

### Replit Leftovers
```
.replit                          # Replit config (no longer using Replit)
replit.md                        # Replit documentation
.upm/                            # Replit package manager folder
.local/                          # Replit local storage
.config/                         # Replit config folder
```

### Unused Component Examples Folder
```
client/src/components/examples/  # Entire folder - 11 files, ZERO imports anywhere
├── AuthenticationModal.tsx
├── ComponentsExample.tsx
├── DatePickerExample.tsx
├── DropdownSelectExample.tsx
├── FormExample.tsx
├── InputsExample.tsx
├── MasterCRMPage.tsx
├── ModalsExample.tsx
├── ProgressIndicators.tsx
├── TabsNavigationExample.tsx
└── ToastNotificationExample.tsx
```

### Orphaned Page Components (Not in App.tsx Routes)
```
client/src/pages/ChatPage.tsx        # Exists but NOT imported in router
client/src/pages/FormulaPage.tsx     # Exists but NOT imported in router
client/src/pages/DashboardPage.tsx   # Exists but NOT imported in router
client/src/pages/LifestylePlanPage.tsx  # Exists but NOT imported in router
client/src/pages/NutritionPlanPage.tsx  # Exists but NOT imported in router
client/src/pages/WorkoutPlanPage.tsx    # Exists but NOT imported in router
```

---

## 🟡 POSSIBLY UNUSED - CHECK BEFORE DELETING

### Duplicate Seed Files (Keep Only One)
```
server/seed-support-api.ts       # Original - likely the one to keep
server/seed-support-api-new.ts   # Duplicate variant
server/seed-support-api-final.ts # Duplicate variant
server/seedSupport.ts            # Duplicate variant
server/seedSupportDirect.sql     # SQL version - may be needed
```
**Recommendation:** Review which one is actually used and delete the rest.

### Root-Level Development Scripts (May Still Be Useful)
```
test-youtube.ts                  # YouTube API test script
test-routes-crash.ts             # Route testing
test-schedulers-crash.ts         # Scheduler testing
test-storage-crash.ts            # Storage testing
test-port.js                     # Port testing
verify-server.ts                 # Server verification

test-supabase.mjs                # DB connection test
test-deployment.mjs              # Deployment verification
test-encryption.mjs              # Encryption testing
test-encryption-simple.mjs       # Simple encryption test
test-prompt-length.mjs           # Prompt testing

check-deployment.mjs             # Deployment checker
check-plan-data.mjs              # Plan data checker
update-health-profile.mjs        # DB update script
update-formula-dosages.mjs       # DB update script (NEW - just created)
set-admin.mjs                    # Admin setup script
setup-supabase.mjs               # Supabase setup wizard
test-prod-db.mjs                 # Production DB test
```
**Recommendation:** Move to `scripts/` folder or delete if no longer needed.

### Unused UI Components (From shadcn/ui - Installed But Not Imported)
```
client/src/components/ui/drawer.tsx        # NOT imported anywhere
client/src/components/ui/carousel.tsx      # NOT imported anywhere
client/src/components/ui/command.tsx       # NOT imported anywhere
client/src/components/ui/input-otp.tsx     # NOT imported anywhere
client/src/components/ui/menubar.tsx       # NOT imported anywhere
client/src/components/ui/navigation-menu.tsx # NOT imported anywhere
client/src/components/ui/pagination.tsx    # NOT imported anywhere
client/src/components/ui/resizable.tsx     # NOT imported anywhere
client/src/components/ui/toggle-group.tsx  # NOT imported anywhere
client/src/components/ui/context-menu.tsx  # NOT imported anywhere
client/src/components/ui/aspect-ratio.tsx  # NOT imported anywhere
client/src/components/ui/breadcrumb.tsx    # NOT imported anywhere
```
**Recommendation:** Keep for now (shadcn components are lightweight), but remove unused npm packages.

---

## 🟠 UNUSED NPM DEPENDENCIES (Can Remove from package.json)

### Definitely Unused
```json
"@neondatabase/serverless": "^0.10.4"  // No imports - was for Neon, now on Supabase
"passport": "^0.7.0"                   // No imports - not used for auth
"passport-local": "^1.0.0"             // No imports - not used for auth
"memorystore": "^1.6.7"                // No imports - session store not used
"connect-pg-simple": "^10.0.0"         // No imports - session store not used
"react-icons": "^5.4.0"                // No imports - using lucide-react instead
"openid-client"                        // If present - no imports
```

### Stripe (Partially Implemented - Not Live)
```json
"@stripe/react-stripe-js": "^4.0.2"    // Referenced in schema but no actual imports
"@stripe/stripe-js": "^7.9.0"          // Referenced in schema but no actual imports
"stripe": "^18.5.0"                    // Referenced in schema but no actual imports
```
**Recommendation:** Keep if planning to implement payments, otherwise remove.

### Possibly Unused (Verify Before Removing)
```json
"ws": "^8.18.0"                        // No WebSocket server found, only in docs
"pdf-parse": "^2.3.0"                  // No imports found (using pdf-to-img instead)
```

### Used by shadcn Components (Keep Even If UI Component Unused)
```json
"cmdk": "^1.1.1"                       // Used by ui/command.tsx
"embla-carousel-react": "^8.6.0"       // Used by ui/carousel.tsx
"input-otp": "^1.4.2"                  // Used by ui/input-otp.tsx
"vaul": "^1.1.2"                       // Used by ui/drawer.tsx
"react-resizable-panels": "^2.1.7"    // Used by ui/resizable.tsx
```

---

## 🔵 DOCUMENTATION FILES (Consider Archiving)

### Root-Level Markdown Files
```
ADMIN_DASHBOARD_PLAN.md
ADMIN_SETUP_GUIDE.md
AI_PROMPT_UPDATE_SUMMARY.md
COMPLETE_LANDING_PAGE_CODE.md
CRITICAL_FIX_FORMULA_REPLACEMENT.md
DEPLOYMENT_GUIDE.md                   # KEEP - useful
DEV_VS_PROD_GUIDE.md                  # KEEP - useful
EXECUTION_PLAN.md
HEALTH_TIPS_VARIETY.md
LAUNCH_CHECKLIST.md
MIGRATION_STATUS.md
NOTIFICATION_STRATEGY.md
NOTIFICATION_SYSTEM.md
OPTIMIZE_IMPLEMENTATION_SUMMARY.md
OPTION_2_IMPLEMENTATION.md
OPTION_2_QUICK_REFERENCE.md
QUICKSTART.md                         # KEEP - useful
RAILWAY_TROUBLESHOOTING.md            # KEEP - useful
ROOT_CAUSE_ANALYSIS.md
SECURITY_AUDIT.md
SECURITY_DEPLOYMENT.md
SUPPORT_CONTENT_AUDIT.md
SUPPORT_CONTENT_STRATEGY.md
TESTING_PROCEDURE.md
VERCEL_DEPLOYMENT.md                  # KEEP - useful
WEARABLES_AUDIT_AND_PLAN.md
design_guidelines.md                  # KEEP - useful
```
**Recommendation:** Create `docs/` folder and move documentation there. Keep only essential files in root.

---

## ✅ ACTIVELY USED (DO NOT DELETE)

### Core Application Files
- `server/routes.ts` - Main API (8839 lines)
- `server/storage.ts` - Database layer (2000+ lines)
- `server/index.ts` - Server entry point
- `server/prompt-builder.ts` - AI prompts
- `shared/schema.ts` - Database schema
- `shared/ingredients.ts` - Ingredient catalog
- `client/src/App.tsx` - React router
- All files imported in App.tsx routes

### Used UI Components
- accordion, alert-dialog, alert, avatar, badge, button, calendar, card, checkbox
- collapsible, dialog, dropdown-menu, form, hover-card, input, label, popover
- progress, radio-group, scroll-area, select, separator, sheet, sidebar, skeleton
- slider, switch, table, tabs, textarea, toast, toaster, toggle, tooltip, chart

---

## 📊 CLEANUP SUMMARY

| Category | Count | Action |
|----------|-------|--------|
| Empty folders | 2 | Delete |
| Backup files | 2 | Delete |
| Debug JSON files | 11 | Delete |
| Replit leftovers | 5 | Delete |
| Unused examples folder | 11 files | Delete |
| Orphaned pages | 6 | Delete or wire up |
| Duplicate seed files | 4 | Keep 1, delete rest |
| Root-level scripts | 18 | Move to scripts/ |
| Unused UI components | 12 | Optional delete |
| Unused npm packages | 6-9 | Remove from package.json |
| Documentation files | 27 | Move to docs/ |

---

## 🛠️ RECOMMENDED CLEANUP COMMANDS

### Phase 1: Safe Deletions (Empty/Backup/Debug)
```powershell
# Empty folders
Remove-Item -Path "server/server" -Force
Remove-Item -Path "client/src/client" -Force

# Backup files
Remove-Item -Path "server/prompt-builder.ts.backup" -Force
Remove-Item -Path "server/seed-support-api.ts.backup" -Force

# Debug JSON files
Remove-Item -Path "ai-response-*.json" -Force

# Replit leftovers
Remove-Item -Path ".replit" -Force
Remove-Item -Path "replit.md" -Force
Remove-Item -Path ".upm" -Recurse -Force
Remove-Item -Path ".local" -Recurse -Force
Remove-Item -Path ".config" -Recurse -Force

# Unused examples
Remove-Item -Path "client/src/components/examples" -Recurse -Force
```

### Phase 2: Organize Scripts
```powershell
# Create scripts folder if not exists
New-Item -Path "scripts/dev" -ItemType Directory -Force

# Move development scripts
Move-Item -Path "test-*.mjs" -Destination "scripts/dev/"
Move-Item -Path "test-*.ts" -Destination "scripts/dev/" -Exclude "tsconfig.json"
Move-Item -Path "check-*.mjs" -Destination "scripts/dev/"
Move-Item -Path "update-*.mjs" -Destination "scripts/dev/"
```

### Phase 3: NPM Cleanup
```bash
npm uninstall @neondatabase/serverless passport passport-local memorystore connect-pg-simple react-icons pdf-parse ws
```

### Phase 4: Documentation Organization
```powershell
New-Item -Path "docs" -ItemType Directory -Force
Move-Item -Path "*.md" -Destination "docs/" -Exclude "README.md"
```

---

## ⚠️ WARNINGS

1. **Do NOT delete pages without checking** - Some orphaned pages may be linked externally
2. **Do NOT remove Stripe packages** if payment feature is planned
3. **Test after npm cleanup** - Some transitive dependencies may break
4. **Backup before deleting** - Git commit current state first

---

## 📈 ESTIMATED SAVINGS

- **~30+ files** removed from root clutter
- **~6-9 npm packages** removed (~2-5MB node_modules reduction)
- **~15 unused UI components** (optional, minimal savings)
- **Cleaner project structure** for maintainability
