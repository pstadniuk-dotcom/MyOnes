# Future Features (Hidden / Not Yet Launched)

Features that are fully or partially built but hidden from the UI. Code is preserved in place and can be re-enabled when ready.

---

## 1. Build Custom Formula (from scratch)

**Status:** Hidden (Feb 25 2026)
**Why hidden:** Users shouldn't be self-building formulas yet — the platform is AI-consultation-driven.

**What it does:**
- Lets users pick a capsule count (6/9/12), then manually select system supports and individual ingredients with dose sliders to build a formula without an AI consultation.

**Files involved:**
- `client/src/features/formulas/components/CustomFormulaBuilderDialog.tsx` — full dialog component (691 lines)
- `client/src/pages/MyFormulaPage.tsx` — card + dialog render (search for `Build Custom Formula Card — hidden for now`)

**To re-enable:**
1. Uncomment the "Build Custom Formula Card" JSX block in `MyFormulaPage.tsx` (~line 813)
2. Restore the `<CustomFormulaBuilderDialog>` render (~line 1383)

---

## 2. Formula Customization (Edit / Add Ingredients)

**Status:** Hidden (Feb 25 2026)
**Why hidden:** Same as above — users shouldn't be manually editing AI-generated formulas yet.

**What it does:**
- Adds a sparkles (✨) button on each formula card that opens a dialog to add/remove system supports and individual ingredients to an existing AI-generated formula.

**Files involved:**
- `client/src/features/formulas/components/FormulaCustomizationDialog.tsx` — full dialog component (572 lines)
- `client/src/pages/MyFormulaPage.tsx` — customize button + dialog render (search for `Customize Button — hidden for now`)
- `server/modules/formulas/formulas.service.ts` — `customizeFormula()` backend method already exists

**To re-enable:**
1. Restore the Customize `<Button>` JSX in `FormulaCard` component (~line 1781)
2. Restore the `<FormulaCustomizationDialog>` render (~line 1366)

---

## Notes

- Both features share the ingredient catalog API (`/api/ingredient-catalog`) which remains active for admin and AI use.
- The select dropdowns in both dialogs use the shared shadcn Select component. The scroll-arrow buttons were removed in favor of native mouse-wheel scrolling — that change is global and remains in place.
- Backend endpoints for custom formula creation (`POST /api/formulas/custom`) and customization (`POST /api/formulas/:id/customize`) are still active and functional.
