# Quick Reference: Option 2 System Architecture

## How It Works Now

### 🎯 AI Responsibilities (Simplified)
- Choose appropriate ingredients based on user needs
- Set dosages for each ingredient  
- Provide clinical rationale
- Adapt consultation style to user sophistication

### 🔧 Backend Responsibilities (Automated)
- Calculate totalMg automatically
- Validate ingredient names against catalog
- Validate dosages against min/max limits
- Enforce 5500mg maximum limit
- Auto-trim formulas if <15% overage
- Provide error feedback to AI for self-correction

### 🔄 The Self-Healing Loop

```
User: "I want more energy"
  ↓
AI: Asks questions, gathers context (4-6 exchanges for new users, 2-3 for advanced)
  ↓
AI: Creates formula JSON without totalMg
  ↓
Backend: Calculates totalMg = 6250mg
  ↓
Backend: REJECTS (exceeds 5500mg)
  ↓
Backend: Appends error to chat: "Formula total: 6250mg exceeds 5500mg limit. Reduce by 750mg."
  ↓
AI: Sees error in chat history
  ↓
AI: "Let me adjust that formula for you. I'll reduce..."
  ↓
AI: Creates corrected formula (totalMg not included)
  ↓
Backend: Calculates totalMg = 4850mg
  ↓
Backend: ✅ ACCEPTS (within 5500mg)
  ↓
Formula saved successfully!
```

## User Sophistication Detection

### New User (Sarah)
**Detected by:**
- No blood tests uploaded
- No active formula
- First 1-2 messages in chat

**AI Behavior:**
- Warm welcome
- Educational approach
- 3-5 questions before formula
- Explains why each ingredient was chosen
- Encourages blood tests for optimization

**Example Opening:**
> "Welcome to ONES! I'm here to help you create a personalized supplement formula. Let's start by understanding what you're hoping to achieve. What are your main health goals right now?"

### Advanced User (Mike)
**Detected by:**
- Has blood test results uploaded
- Has active formula (v1+)
- Multiple versions (v3+) indicates very advanced

**AI Behavior:**
- Skip education, jump to analysis
- Reference specific biomarkers
- 1-2 targeted questions
- Data-driven recommendations
- Formula tweaking and comparison

**Example Opening:**
> "I see you have blood work and an active formula. Your TSH of 3.2 is functional but could be optimized. Are you noticing any changes in energy or focus since starting the current formula?"

## Formula Creation Rules

### What AI Outputs
```json
{
  "bases": [
    {"ingredient": "Heart Support", "amount": 450, "unit": "mg", "purpose": "cardiovascular health"}
  ],
  "additions": [
    {"ingredient": "Ashwagandha", "amount": 600, "unit": "mg", "purpose": "stress management"}
  ],
  "rationale": "This formula targets your reported fatigue...",
  "warnings": ["Monitor for interactions with blood pressure medication"],
  "disclaimers": ["Not medical advice", "Consult healthcare provider"]
}
```

### What Backend Adds
```json
{
  // ... all the above ...
  "totalMg": 1050,  // ← Backend calculates this
  "version": 1,     // ← Backend tracks this
  "userId": "xxx",  // ← Backend adds this
  "createdAt": "..." // ← Backend timestamps it
}
```

## Ingredient Quick Reference (What AI Sees)

### Popular Base Formulas
- Heart Support (450mg) - cardiovascular, CoQ10, L-Carnitine
- Alpha Gest III (600mg) - digestion, enzymes, HCl  
- Liver Support (500mg) - detox, liver health
- Adrenal Support (400mg) - stress, cortisol, energy
- Thyroid Support (300mg) - metabolism, thyroid function

### Top Individual Ingredients
- Ashwagandha (600mg fixed) - stress, anxiety, cortisol
- CoEnzyme Q10 (100-200mg) - heart, energy, antioxidant
- L-Theanine (200-400mg) - calm focus, anxiety
- Camu Camu (2500mg fixed) - immune, vitamin C
- Green Tea (676mg fixed) - metabolism, antioxidants
- Turmeric (400-1000mg) - inflammation
- NAD+ (100-300mg) - anti-aging, cellular health

### Common Formulas by Goal
- **Cardiovascular:** Heart Support + CoQ10 + Garlic + Hawthorn Berry
- **Stress/Anxiety:** Adrenal Support + Ashwagandha + L-Theanine + GABA
- **Digestion:** Alpha Gest III + Ginger Root + Aloe Vera
- **Energy:** Adrenal Support + Red Ginseng + CoQ10 + Shilajit
- **Immune:** Camu Camu + Astragalus + Cats Claw + Chaga
- **Brain/Focus:** Lions Mane + Phosphatidylcholine + L-Theanine

## Validation Rules

### Critical Errors (Formula Rejected)
1. **Unapproved ingredients** - Not in catalog
2. **Exceeds 5500mg total** - Over maximum safe limit
3. **Dosage violations** - Outside min/max range for ingredient

### Non-Critical Errors (Auto-corrected)
1. **Slightly over limit (<15%)** - Backend auto-trims lowest priority ingredients
2. **Misspelled ingredient names** - Backend normalizes automatically

### Fixed Dosages (Must Be Exact)
- Ashwagandha: exactly 600mg
- Camu Camu: exactly 2500mg
- Green Tea: exactly 676mg
- (Backend validates and rejects if wrong)

### Dosage Ranges (Flexible)
- CoQ10: 100-200mg
- Turmeric: 400-1000mg  
- Ginger Root: 500-2000mg
- (AI can choose within range)

## Error Messages AI Sees

### Example: Formula Too Large
```
⚠️ VALIDATION ERROR - Formula Rejected

❌ Problem: Formula total dosage is 6250mg, which exceeds the maximum safe limit of 5500mg.

Required Fix: Reduce total by 750mg by:
- Using fewer base formulas
- Reducing individual ingredient doses
- Focusing on top priority health goals

Please create a corrected formula that stays within the 5500mg limit.
```

### Example: Wrong Dosage
```
⚠️ VALIDATION ERROR - Formula Rejected

❌ Problem: Formula contains dosage violations.

Errors:
- Camu Camu must be exactly 2500mg (you used 1500mg)
- Ginger Root minimum is 500mg (you used 400mg)

Please create a corrected formula using the exact dosages from the catalog.
```

## Key Differences from Old System

| Aspect | Old System | New System (Option 2) |
|--------|-----------|---------------------|
| Prompt Size | 39,561 chars | ~12,000 chars (70% reduction) |
| Math Calculation | AI calculates totalMg | Backend calculates totalMg |
| Error Handling | AI must get it right first time | AI sees errors and self-corrects |
| Ingredient Catalog | Full 12K char iteration in prompt | Condensed quick reference |
| User Adaptation | One-size-fits-all | Detects new vs advanced users |
| Success Rate | ~20% | Target: 95%+ |
| CRITICAL Markers | 49 markers (alert fatigue) | 3 core rules (focused) |

## Testing Scenarios

### Test 1: New User (Sarah)
```
User: "I want to feel more energetic"
Expected: 
- Warm welcome
- 3-5 questions about lifestyle, medications, sleep
- Educational tone
- Formula after 4-6 exchanges
- Backend calculates totalMg correctly
```

### Test 2: Advanced User (Mike)  
```
User has blood tests showing: TSH 3.2, Vitamin D 28
Expected:
- AI jumps into data analysis
- References specific biomarkers
- 1-2 targeted questions
- Formula within 2-3 exchanges
- Optimization focus
```

### Test 3: Validation Error
```
AI creates formula: 6250mg total
Expected:
- Backend rejects formula
- Error shown in chat
- AI sees error in next message
- AI creates corrected formula (under 5500mg)
- Backend accepts corrected version
```

## Success Metrics

- **Calculation Accuracy:** 100% (backend does all math)
- **Dosage Compliance:** Target 95%+ (validation + self-correction)
- **Formula Creation Success:** Target 95%+ (from 20%)
- **User Satisfaction:** Natural conversation, less robotic
- **Prompt Efficiency:** 70% reduction in cognitive load

---

**Status:** Core implementation complete, testing phase pending  
**Next:** Test with real user scenarios to validate success rate improvement
