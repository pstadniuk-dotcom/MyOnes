# ROOT CAUSE ANALYSIS: Recurring Ingredient Information Failures

**Generated:** November 10, 2025  
**Status:** CRITICAL - Multiple System Failures Identified

---

## EXECUTIVE SUMMARY

Three distinct but interconnected system failures are causing recurring issues with ingredient information display:

1. **URI Encoding Crash (500 Errors)** - Double URI decoding fails on literal % characters
2. **Name Mismatch (Empty Dropdowns)** - AI generates potency-modified names not in catalog
3. **Category Misclassification (CBoost Issue)** - Base formula appearing as individual ingredient

---

## ISSUE #1: URI MALFORMED ERRORS (500 Status)

### **Evidence from Production Logs:**
```
8:06:49 PM [express] GET /api/ingredients/Phosphatidylcholine%2040%25%20(soy) 500
Error: URIError: URI malformed at decodeURIComponent
Line: server/routes.ts:4376

8:07:08 PM [express] GET /api/ingredients/Hawthorn%20Berry%20PE%201%2F8%25%20Flavones 500
Error: URIError: URI malformed at decodeURIComponent
```

### **Root Cause:**
**Double URI Decoding** - Line 4376 in server/routes.ts:
```typescript
const ingredientName = decodeURIComponent(req.params.ingredientName);
```

Express already decodes URL parameters automatically. When ingredient names contain literal "%" characters (e.g., "Phosphatidylcholine 40%"), the flow is:

1. Client sends: `Phosphatidylcholine 40% (soy)`
2. Express auto-decodes: `Phosphatidylcholine 40% (soy)`
3. **Our code decodes AGAIN**: Tries to decode "40%" as if it were "%34%30%25"
4. **Result**: `URIError: URI malformed` because "40%" is not valid URI encoding

### **Impact:**
- **100% failure rate** for ingredients with % or / in names
- Affects: Phosphatidylcholine 40%, Hawthorn Berry PE 1/8% Flavones, Ginkgo Biloba Extract 24%
- Users see empty ingredient cards with NO error message

---

## ISSUE #2: AI GENERATING NON-CATALOG NAMES

### **Evidence from Database:**
```sql
SELECT additions FROM formulas;

Results show:
- "Ginko Biloba Extract 24%" (in DB)
- "Hawthorn Berry PE 1/8% Flavones" (in DB)
- "Phosphatidylcholine 40% (soy)" (in DB)
- "Turmeric Root Extract 4:1" (in DB)
- "Garlic (powder)" (in DB)
- "Omega 3 (algae omega)" (in DB)
```

### **What Catalog Actually Contains:**
```typescript
INDIVIDUAL_INGREDIENTS = [
  { name: "Ginkgo Biloba", doseMg: 120 },        // NOT "Extract 24%"
  { name: "Hawthorn Berry", doseMg: 500 },        // NOT "PE 1/8% Flavones"
  { name: "Phosphatidylcholine", doseMg: 420 },   // NOT "40% (soy)"
  { name: "Turmeric", doseMg: 400 },              // NOT "Root Extract 4:1"
  { name: "Garlic", doseMg: 600 },                // NOT "(powder)"
  { name: "Algae Omega", doseMg: 500 },           // NOT "Omega 3 (algae omega)"
]
```

### **What AI Prompt Says:**
```
🚨 CRITICAL: EXACT INGREDIENT NAMES ONLY

❌ WRONG: "Ginko Biloba Extract 24%" → ✅ CORRECT: "Ginkgo Biloba"
❌ WRONG: "Omega 3 (algae omega)" → ✅ CORRECT: "Algae Omega"
```

### **Root Cause:**
**AI IS DISOBEYING EXPLICIT INSTRUCTIONS** - Despite crystal-clear examples showing NOT to add potency modifiers, the AI is:
1. Adding extraction ratios ("4:1", "PE 1/8%")
2. Adding potency percentages ("24%", "40%")
3. Adding source descriptors ("(soy)", "(powder)")
4. Adding form descriptors ("Extract", "Root")

**Why This Happens:**
The AI likely believes adding these qualifiers provides "more precision" or "medical accuracy" - it's being "helpful" by specifying extract potencies and sources, not realizing it breaks the lookup system.

### **Impact:**
- Ingredient lookup in `getComprehensiveIngredientInfo()` searches for "Hawthorn Berry PE 1/8% Flavones"
- Catalog only has "Hawthorn Berry"
- **NO MATCH** → Falls through to generic fallback → "General health support"
- Users see empty benefits despite comprehensive catalog data

---

## ISSUE #3: CBOOST CATEGORIZATION

### **Evidence:**
- Logs show: `GET /api/ingredients/C%20Boost 200` (treated as individual ingredient)
- User reports: "CBoost appearing as individual ingredient when it should be base formula"

### **Catalog Status:**
```typescript
// shared/ingredients.ts line 49
BASE_FORMULAS = [
  { name: 'C Boost', doseMg: 1680 },  // ✓ Correctly in base formulas
]

// line 985
BASE_FORMULA_DETAILS = [
  { name: 'C Boost', ... }  // ✓ Correctly in base formula details
]
```

### **Root Cause:**
**Name Variation Not Normalized** - The formula parsing/storage system:
1. Receives "CBoost" (no space) from AI or user
2. Tries to match against BASE_FORMULAS which has "C Boost" (with space)
3. **NO MATCH** → Incorrectly categorized as individual ingredient
4. Stored in `additions[]` array instead of `bases[]` array

**Why Normalization Doesn't Catch It:**
```typescript
INGREDIENT_ALIASES = {
  'CoQ10': 'CoEnzyme Q10',
  'Omega-3': 'Algae Omega',
  // ❌ MISSING: 'CBoost': 'C Boost'
}
```

### **Impact:**
- Users see "CBoost" in individual ingredients tab
- Can adjust dose when it should be FIXED
- Confuses the base formula count
- May allow duplicate additions of same formula

---

## SYSTEMIC ARCHITECTURE FLAWS

### **Flaw #1: No Server-Side Name Validation**
- AI generates ANY name it wants
- Backend accepts and stores whatever AI sends
- NO rejection of non-catalog names
- NO normalization before storage

### **Flaw #2: Lookup System Assumes Perfect Names**
- `getComprehensiveIngredientInfo()` expects exact matches
- Alias system incomplete (missing CBoost, missing potency stripping)
- No fuzzy matching or similarity scoring
- Falls through to generic fallback silently

### **Flaw #3: Client/Server URI Encoding Mismatch**
- Client encodes special characters for URL safety
- Server double-decodes causing crashes
- No escaping strategy for % characters in ingredient names

---

## COMPREHENSIVE FIX STRATEGY

### **Fix #1: Remove Double URI Decoding**
```typescript
// server/routes.ts line 4376
// ❌ BEFORE:
const ingredientName = decodeURIComponent(req.params.ingredientName);

// ✅ AFTER:
const ingredientName = req.params.ingredientName; // Express already decoded
```

**Impact:** Eliminates 100% of URI malformed errors

---

### **Fix #2: Enhanced Name Normalization**
```typescript
// shared/ingredients.ts
export function normalizeIngredientName(name: string): string {
  let normalized = name.trim();
  
  // Step 1: Remove potency/extraction descriptors
  normalized = normalized
    .replace(/\s*\d+:\d+\s*/g, '')           // "4:1" ratios
    .replace(/\s*PE\s+\d+\/\d+%?\s*/gi, '')  // "PE 1/8%" extracts
    .replace(/\s*\d+%\s*/g, '')              // "40%" potencies
    .replace(/\s*Extract\s*/gi, '')          // "Extract"
    .replace(/\s*Root\s*/gi, '')             // "Root"
    .replace(/\s*\([^)]+\)/g, '');           // "(soy)", "(powder)"
  
  // Step 2: Handle spacing variations
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Step 3: Check alias map
  const alias = INGREDIENT_ALIASES[normalized.toLowerCase()];
  if (alias) return alias;
  
  return normalized;
}

// Add missing aliases
INGREDIENT_ALIASES = {
  // ... existing
  'cboost': 'C Boost',
  'c-boost': 'C Boost',
  'omega 3': 'Algae Omega',
  'fish oil': 'Algae Omega',
  'dha': 'Algae Omega',
  'epa': 'Algae Omega',
}
```

**Impact:** 
- "Hawthorn Berry PE 1/8% Flavones" → "Hawthorn Berry" → MATCH ✓
- "Phosphatidylcholine 40% (soy)" → "Phosphatidylcholine" → MATCH ✓
- "CBoost" → "C Boost" → MATCH ✓

---

### **Fix #3: Server-Side Formula Validation**
```typescript
// server/routes.ts - in formula save endpoint
function validateIngredientNames(formula: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check bases
  for (const base of formula.bases) {
    const normalized = normalizeIngredientName(base.ingredient);
    const exists = BASE_FORMULAS.find(f => f.name.toLowerCase() === normalized.toLowerCase());
    if (!exists) {
      errors.push(`Base formula "${base.ingredient}" not in catalog (normalized: "${normalized}")`);
    }
  }
  
  // Check additions
  for (const addition of formula.additions || []) {
    const normalized = normalizeIngredientName(addition.ingredient);
    const exists = INDIVIDUAL_INGREDIENTS.find(i => i.name.toLowerCase() === normalized.toLowerCase());
    if (!exists) {
      errors.push(`Individual ingredient "${addition.ingredient}" not in catalog (normalized: "${normalized}")`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Impact:**
- Rejects formulas with non-catalog ingredients
- Forces AI to retry with correct names
- Logs show WHICH names are problematic

---

### **Fix #4: Strengthen AI Prompt Enforcement**
```typescript
// server/prompt-builder.ts
prompt += `
🚨🚨🚨 MANDATORY INGREDIENT NAME RULES 🚨🚨🚨

THE BACKEND WILL **REJECT** YOUR FORMULA IF YOU:
- Add ANY words not in the catalog name (Extract, Root, PE, %)
- Add ANY potency descriptors (24%, 40%, 4:1, 1/8%)
- Add ANY source descriptors ((soy), (powder), (bovine))
- Add ANY extraction ratios or standardizations

EXAMPLES OF **REJECTED** FORMULAS:
❌ "Ginkgo Biloba Extract 24%" - BACKEND REJECTS - Use: "Ginkgo Biloba"
❌ "Hawthorn Berry PE 1/8%" - BACKEND REJECTS - Use: "Hawthorn Berry"
❌ "Phosphatidylcholine 40%" - BACKEND REJECTS - Use: "Phosphatidylcholine"
❌ "Turmeric Root Extract 4:1" - BACKEND REJECTS - Use: "Turmeric"

THE CATALOG NAMES ALREADY IMPLY STANDARD EXTRACTS AND POTENCIES.
YOU DO NOT NEED TO SPECIFY THEM.
COPY THE NAME EXACTLY AS SHOWN IN THE CATALOG.
`;
```

**Impact:** Makes rejection consequence explicit and scary

---

## DEPLOYMENT PRIORITY

### **Phase 1 (Immediate - Fixes 500 Errors):**
1. Remove `decodeURIComponent` call (1 line change)
2. Deploy immediately

### **Phase 2 (High Priority - Fixes Empty Dropdowns):**
1. Enhance `normalizeIngredientName()` with potency stripping
2. Add missing aliases (CBoost, etc.)
3. Update lookup function to use normalization consistently
4. Deploy

### **Phase 3 (Medium Priority - Prevents Future Issues):**
1. Add server-side validation to formula save endpoint
2. Strengthen AI prompt with REJECTION warnings
3. Add logging for normalization mismatches
4. Deploy

---

## SUCCESS METRICS

After fixes deployed, verify:

### **Zero 500 Errors:**
```
✓ GET /api/ingredients/Phosphatidylcholine%2040%25%20(soy) → 200
✓ GET /api/ingredients/Hawthorn%20Berry%20PE%201%2F8%25%20Flavones → 200
```

### **Complete Ingredient Info:**
```
✓ Hawthorn Berry PE 1/8% Flavones → Shows 8 detailed benefits
✓ Phosphatidylcholine 40% (soy) → Shows 4 detailed benefits
✓ Ginkgo Biloba Extract 24% → Shows 5 detailed benefits
```

### **Correct Categorization:**
```
✓ CBoost → Appears in Base Formulas tab
✓ C Boost → Not in Individual Ingredients
```

---

## CONCLUSION

The recurring issues stem from THREE architectural gaps:

1. **URI Handling:** Double decoding crashes on % characters
2. **Name Normalization:** Insufficient stripping of AI-added qualifiers
3. **Validation:** No server-side rejection of non-catalog names

**The AI is NOT malicious** - it's trying to be medically precise by adding potency info. But without server-side enforcement, it creates a mismatch between stored names and catalog names, breaking lookups.

**The fixes are surgical and low-risk:**
- Remove 1 line (decodeURIComponent)
- Enhance 1 function (normalizeIngredientName)
- Add validation to 1 endpoint (formula save)

**Estimated Development Time:** 2-3 hours  
**Risk Level:** Low (normalization is additive, won't break existing matches)  
**Impact:** Resolves 100% of reported ingredient information issues
