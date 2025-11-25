import { storage } from './storage';
import './db';

// Comprehensive help articles
const helpArticles = [
  // Getting Started Category
  {
    category: 'Getting Started',
    title: 'Understanding Your Personalized Supplement Formula',
    content: `Welcome to ONES! Your personalized formula is created by AI based on your unique health profile, lab results, and goals. This guide explains exactly what's in your formula and why.

WHAT'S IN YOUR FORMULA

Your ONES formula contains two types of ingredients:

**Base Formulas (2-3 selected)**
These are proprietary blends targeting specific health systems. Each base formula contains multiple active ingredients at therapeutic dosages. Examples include:
- Adrenal Support (420mg) - Supports stress response and hormone balance
- Heart Support (450mg) - Cardiovascular health and energy
- Immune Support (350mg) - Defense and recovery

**Individual Additions (5-7 ingredients)**
Single therapeutic ingredients added on top of base formulas to address your specific needs. Examples:
- Ashwagandha (600mg) - Stress reduction and cortisol management
- CoQ10 (200mg) - Cellular energy and heart health
- Curcumin (500mg) - Anti-inflammatory support

TOTAL DOSAGE: 4500-5500MG

Your complete formula typically contains 4500-5500mg total, delivered in 6-9 capsules per day (size 00 capsules). This range maximizes therapeutic benefit while maintaining cost-effectiveness.

CAPSULE BREAKDOWN

The system automatically calculates your capsule count:
- Each capsule holds ~550mg
- Total formula ÷ 550mg = capsules per day
- Distributed across 3 meals (morning, lunch, dinner)

Example: 4,950mg formula = 9 capsules/day = 3 capsules per meal

WHY THESE INGREDIENTS?

The AI selects ingredients based on:

1. **Your Lab Results** - Addressing deficiencies or elevated biomarkers
   Example: Low vitamin D (25 ng/mL) → AI adds Vitamin D3

2. **Reported Symptoms** - Targeting what you're experiencing
   Example: Brain fog + fatigue → AI adds Lion's Mane + B-Complex

3. **Health Goals** - Supporting what you want to achieve
   Example: Goal = Better sleep → AI adds Magnesium + L-Theanine

4. **Medication Interactions** - Only safe combinations
   The AI automatically excludes ingredients that interact with your medications

HOW TO READ YOUR FORMULA PDF

After your consultation, you'll receive a PDF with:
- Complete ingredient list with dosages
- Rationale for each ingredient (linked to your specific data)
- Daily dosing instructions
- Warnings or considerations

FORMULA VERSIONS

Your formula can be updated anytime:
- Upload new lab results → AI adjusts recommendations
- Report new symptoms → AI adds targeted support
- Change medications → AI removes contraindicated ingredients

Each update creates a new version while preserving your history in My Formula page.

INGREDIENT SOURCING

All ONES ingredients are:
- Third-party tested for purity
- Sourced from FDA-registered facilities
- Free from fillers, artificial colors, and common allergens
- Selected for bioavailability (how well your body absorbs them)

COMMON QUESTIONS

**Q: Can I request changes to my formula?**
A: Yes! Just return to the AI consultation and say "I'd like to modify my formula" or "Can we remove ingredient X?"

**Q: What if I have side effects?**
A: Stop taking the supplement and contact support@ones.ai immediately. The AI can create a modified formula avoiding problematic ingredients.

**Q: How long until I see results?**
A: Most users notice improvements within 2-4 weeks. Some benefits (like energy) appear quickly, while others (like inflammation reduction) take 6-8 weeks.

NEED HELP?

- View your complete formula: Dashboard > My Formula
- Request updates: Dashboard > Consultation
- Contact support: support@ones.ai`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Getting Started',
    title: 'Creating Your Account and Setting Up Your Profile',
    content: `Welcome to ONES! This guide will walk you through creating your account and setting up your health profile for personalized supplement recommendations.

## Step 1: Sign Up

1. Visit the Ones AI homepage
2. Click "Get Started" or "Sign Up" in the top right corner
3. Enter your:
   - Full name
   - Email address
   - Phone number (optional, for SMS reminders)
   - Secure password
4. Click "Create Account"

[Screenshot placeholder: Sign-up form]

## Step 2: Complete Your Health Profile

After creating your account, you'll be guided to complete your health profile. This information helps our AI create accurate, personalized recommendations:

### Basic Information
- Age
- Biological sex
- Height and weight

[Screenshot placeholder: Basic health information form]

### Lifestyle Factors
- Sleep hours per night
- Exercise frequency
- Stress levels (1-10 scale)
- Smoking status
- Alcohol consumption

[Screenshot placeholder: Lifestyle factors form]

### Medical History
- Current medications
- Known allergies
- Chronic conditions
- Recent symptoms

[Screenshot placeholder: Medical history form]

## Step 3: Upload Lab Results (Optional but Recommended)

For the most accurate recommendations, upload your recent blood test results:

1. Navigate to Profile > Lab Reports
2. Click "Upload Lab Results"
3. Select your PDF or image file
4. Our AI will automatically extract relevant biomarkers

[Screenshot placeholder: Lab upload interface]

## Next Steps

Once your profile is complete, you can:
- Start a consultation with Ones AI
- Receive your personalized formula
- Place your first order

Need help? Contact our support team at support@ones.ai`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Getting Started',
    title: 'How to Start Your First AI Consultation',
    content: `Your AI consultation is where personalized health optimization begins. Our AI practitioner analyzes your health data to create a custom supplement formula tailored to your unique needs.

ACCESSING THE CONSULTATION

1. Log into your ONES dashboard
2. Click "Consultation" in the left sidebar
3. The AI chat interface will open

The consultation typically takes 10-20 minutes for new users, less for formula updates.

WHAT THE AI WILL ASK

The consultation follows a structured approach:

**Phase 1: Current Health Status**
- How you're feeling today
- Energy levels and sleep quality
- Any active symptoms or concerns
- Stress levels and mental clarity

Example: "I've been experiencing afternoon fatigue and brain fog. My sleep is okay but I wake up groggy."

**Phase 2: Medical Background**
- Current medications (CRITICAL - ensures safety)
- Known allergies
- Chronic conditions or diagnoses
- Recent illnesses or surgeries

Be thorough here! The AI cross-references every ingredient against your medications to prevent interactions.

**Phase 3: Lab Data Review** (if uploaded)
The AI will:
- Identify biomarkers outside normal ranges
- Explain what elevated/low values mean
- Recommend targeted ingredients for specific deficiencies

Example: "Your vitamin D is 22 ng/mL (low). I'm adding 5000 IU vitamin D3 to bring you into optimal range (40-60 ng/mL)."

**Phase 4: Health Goals**
- What you want to improve (energy, sleep, focus, etc.)
- Timeline expectations
- Specific performance or wellness targets

**Phase 5: Formula Creation**
The AI will:
1. Select 2-3 base formulas targeting your main health systems
2. Add 5-7 individual ingredients for specific needs
3. Calculate total dosage (typically 4500-5500mg)
4. Explain the rationale for each ingredient

UNDERSTANDING THE AI'S RECOMMENDATIONS

When the AI creates your formula, it explains:

**Ingredient Selection**
"For your elevated LDL (151 mg/dL), I'm adding Heart Support (450mg) which contains L-Carnitine, CoQ10, and Magnesium. These work synergistically to support cardiovascular health and healthy cholesterol metabolism."

**Dosage Calculation**
"Your total formula is 4,950mg delivered in 9 capsules per day (3 with each meal)."

**Safety Checks**
"I've verified no interactions with your current medications (Metformin, Lisinopril)."

TIPS FOR A GREAT CONSULTATION

**Do:**
- Upload recent lab results before starting (optional but highly recommended)
- List ALL medications and supplements you currently take
- Be specific about symptoms (when they occur, severity, duration)
- Ask questions if you don't understand something

**Don't:**
- Rush through questions - accuracy matters for safety
- Skip the medication list - this is critical
- Hesitate to mention "minor" symptoms - they may be important
- Forget to mention allergies or sensitivities

AFTER YOUR CONSULTATION

Once your formula is created:

1. **Review Your Formula** - Click "See Your Formulation" to see:
   - Complete ingredient list with dosages
   - Rationale for each ingredient linked to YOUR specific data
   - Daily dosing instructions (capsules per meal)
   - Any warnings or considerations

2. **Download Your PDF** - Professional formula document with:
   - All ingredients and active compounds
   - Scientific rationale
   - Usage instructions
   - Interaction warnings

3. **Place Your Order** - When ready:
   - Select subscription frequency (30/60/90 days)
   - Choose shipping preferences
   - Set up payment

UPDATING YOUR FORMULA

Your formula can evolve as your health changes:

**Return to consultation and say:**
- "I got new lab results" → AI analyzes and updates formula
- "I'm experiencing [new symptom]" → AI adds targeted support
- "I started taking [new medication]" → AI checks interactions and adjusts
- "Can we remove [ingredient]?" → AI modifies formula

Each update creates a new version. Your formula history is saved under My Formula → View All Versions.

CONSULTATION PHILOSOPHY

The AI acts like a real practitioner:
- Asks clarifying questions when needed
- Explains medical terms in plain language
- Considers whole-person health, not just symptoms
- Updates recommendations as your health evolves
- Never rushes you through important decisions

COMMON FIRST CONSULTATION QUESTIONS

**Q: Do I need lab results to get a formula?**
A: No, but labs give the most accurate recommendations. Without labs, the AI makes conservative evidence-based suggestions.

**Q: How long does the consultation take?**
A: 10-20 minutes for first-time users. Formula updates take 5-10 minutes.

**Q: Can I save and resume later?**
A: Yes! The AI saves your conversation. Return anytime to continue.

**Q: What if I disagree with a recommendation?**
A: Just tell the AI! "I don't want to take [ingredient]" and it will create an alternative formula.

**Q: Is my health data private?**
A: Absolutely. All consultations are encrypted and HIPAA-compliant. We never sell your data.

NEED HELP?

- Stuck during consultation? Click the help icon (?) in the chat
- Questions about ingredients? Ask the AI to explain in detail
- Technical issues? Email support@ones.ai
- Want to speak to a human? Contact our clinical team

Your AI practitioner is available 24/7 to create, explain, and update your personalized health formula.`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Getting Started',
    title: 'Uploading and Understanding Lab Results',
    content: `Lab results are the gold standard for personalized supplement recommendations. This guide explains how to upload your blood work and what the AI analyzes.

WHY UPLOAD LAB RESULTS?

Without labs, the AI makes educated guesses based on symptoms. With labs, the AI sees your exact biomarker levels and can:
- Target specific deficiencies with precise dosing
- Avoid recommending nutrients you already have in excess
- Track improvement over time
- Make evidence-based adjustments to your formula

Example: 
- Without labs: "You mentioned fatigue → I'll add B-vitamins"
- With labs: "Your B12 is 210 pg/mL (low normal) and vitamin D is 18 ng/mL (deficient) → I'll add 1000mcg B12 + 5000 IU D3"

SUPPORTED FILE FORMATS

Upload any of these:
- PDF reports (LabCorp, Quest, Function Health, Any Lab Test Now)
- JPG/PNG images (clear photos of paper reports)
- Scanned documents

Maximum file size: 10MB

HOW TO UPLOAD

1. Log into ONES dashboard
2. Click "Profile" in the left sidebar
3. Select "Lab Reports" tab
4. Click "Upload Lab Results"
5. Choose your file
6. Add optional notes (test date, lab provider)
7. Click "Upload"

The AI automatically extracts biomarker values within 30 seconds.

WHAT THE AI ANALYZES

**Complete Blood Count (CBC):**
- White blood cells → Immune function
- Red blood cells → Oxygen transport, anemia
- Hemoglobin/Hematocrit → Iron status
- Platelets → Clotting function

**Metabolic Panel:**
- Glucose → Blood sugar control
- Kidney function (creatinine, BUN)
- Liver enzymes (ALT, AST)
- Electrolytes (sodium, potassium)

**Lipid Panel:**
- Total cholesterol
- LDL (bad cholesterol)
- HDL (good cholesterol)
- Triglycerides

**Thyroid Panel:**
- TSH (thyroid stimulating hormone)
- T3/T4 (thyroid hormones)

**Vitamins & Minerals:**
- Vitamin D (25-OH)
- B12
- Folate
- Iron/Ferritin
- Magnesium
- Zinc

**Inflammatory Markers:**
- C-Reactive Protein (CRP)
- Homocysteine

**Hormones:**
- Testosterone
- Estradiol
- Cortisol
- DHEA

UNDERSTANDING YOUR RESULTS

The AI explains each biomarker in plain language:

**Example:**
"Your vitamin D is 22 ng/mL. The lab says 'normal' is >20, but optimal is 40-60 ng/mL. Low vitamin D is linked to fatigue, weakened immunity, and bone health. I'm adding 5000 IU vitamin D3 daily to bring you into the optimal range."

**Reference Ranges:**
- Lab "normal" = what most people have (not necessarily optimal)
- ONES "optimal" = ranges associated with best health outcomes
- AI targets optimal, not just normal

HOW THE AI USES YOUR LABS

**Step 1: Identify Abnormalities**
Scans all biomarkers for values outside optimal ranges

**Step 2: Correlate with Symptoms**
"Your ferritin is 18 ng/mL (low) AND you mentioned fatigue → Iron deficiency anemia is likely"

**Step 3: Select Targeted Ingredients**
"I'm adding Iron (18mg as ferrous bisglycinate) + Vitamin C (250mg to enhance absorption)"

**Step 4: Calculate Dosages**
Based on how far you are from optimal range

**Step 5: Monitor Over Time**
"Upload new labs in 90 days to see if we've brought your vitamin D from 22 to 50+"

COMMON LAB-BASED RECOMMENDATIONS

**Low Vitamin D (<30 ng/mL):**
→ Vitamin D3 (2000-5000 IU)

**Elevated LDL (>130 mg/dL):**
→ Heart Support base formula (contains CoQ10, L-Carnitine, Magnesium)

**Low B12 (<400 pg/mL):**
→ Methylcobalamin B12 (1000mcg)

**High CRP (>3.0 mg/L):**
→ Curcumin (500mg), Omega-3 (1000mg EPA/DHA)

**Low Ferritin (<30 ng/mL women, <50 men):**
→ Iron (18mg) + Vitamin C

**Low Magnesium (<2.0 mg/dL or symptoms):**
→ Magnesium Glycinate (300-400mg elemental)

GETTING YOUR FIRST LABS

**Option 1: Your Doctor**
Ask for a "comprehensive metabolic panel with lipids, CBC, vitamin D, and B12"

**Option 2: Direct-to-Consumer Labs**
- Function Health (500+ biomarkers, $499/year, recommended)
- Any Lab Test Now
- Ulta Lab Tests
- Request Labs

**What to Order (Minimum):**
- Complete Metabolic Panel (CMP)
- Complete Blood Count (CBC)
- Lipid Panel
- Vitamin D (25-OH)
- Vitamin B12
- Thyroid Panel (TSH, Free T3, Free T4)

**Comprehensive Panel (Ideal):**
All of the above, plus:
- Iron Panel (iron, ferritin, TIBC)
- Inflammatory markers (CRP, homocysteine)
- Hormones (testosterone, estradiol, cortisol)
- Advanced lipids (ApoB, Lp(a))

RE-TESTING FREQUENCY

Upload new labs every 3-6 months to:
- Track improvements from supplementation
- Adjust dosages based on progress
- Catch new deficiencies early
- Validate that formulation is working

The AI will prompt you: "It's been 90 days since your last labs. Ready to upload new results and optimize your formula?"

PRIVACY & SECURITY

- All lab uploads are encrypted (HIPAA-compliant)
- Only you and the AI can access your data
- We never sell or share your health information
- Delete labs anytime from Profile > Lab Reports

TROUBLESHOOTING UPLOADS

**Upload Failed:**
- Ensure file is under 10MB (compress large PDFs)
- Check file format (PDF, JPG, PNG only)
- Try a different browser (Chrome works best)

**AI Didn't Extract Values:**
- Make sure text is clear and readable
- Avoid heavily shadowed photos
- Re-scan at higher resolution if possible
- You can manually enter values in consultation

**Missing Biomarkers:**
- Not all lab reports include all markers
- AI works with whatever data you provide
- Upload multiple reports to fill in gaps

NEED HELP?

- Questions about specific biomarkers? Ask the AI during consultation
- Upload errors? Email support@ones.ai with screenshot
- Interpreting results? The AI explains everything in plain language

Lab results transform your ONES experience from good to exceptional. Upload yours today!`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'How to Take Your Supplements Correctly',
    content: `Taking your supplements correctly maximizes absorption and effectiveness. This guide covers timing, storage, and best practices.

DAILY DOSING SCHEDULE

Your ONES formula is divided across 3 meals:

[Screenshot placeholder: Upload flow]

## What Happens Next

Our AI automatically:
1. **Extracts data** - Reads all biomarker values
2. **Identifies issues** - Flags out-of-range results
3. **Analyzes patterns** - Looks for related imbalances
4. **Updates recommendations** - Adjusts formula based on findings

[Screenshot placeholder: Extracted lab data display]

## Key Biomarkers We Analyze

### Cardiovascular
- Total cholesterol, LDL, HDL
- Triglycerides
- Homocysteine
- CRP (inflammation)

### Metabolic
- Glucose, HbA1c
- Insulin
- Thyroid panel (TSH, T3, T4)

### Nutritional
- Vitamin D, B12
- Iron, Ferritin
- Magnesium
- Omega-3 index

### Other Important Markers
- Liver enzymes
- Kidney function
- Complete blood count
- Hormone levels

[Screenshot placeholder: Biomarker analysis results]

## Privacy & Security

Your lab data is:
- **Encrypted** - At rest and in transit
- **HIPAA-compliant** - Medical-grade security
- **Never shared** - Only used for your recommendations
- **Deletable** - Remove anytime from your profile

## Re-uploading Lab Results

Upload new labs anytime to:
- Track progress over time
- Update recommendations
- Monitor changes
- Optimize your formula

The AI will compare results and adjust your formula accordingly.

Questions about a specific biomarker? Ask the AI for detailed explanations!`,
    displayOrder: 4,
    isPublished: true
  },

  // Formula & Health Category
  {
    category: 'Formula & Health',
    title: 'Ingredient Safety and Quality Standards',
    content: `# Ingredient Safety and Quality Standards

At Ones AI, we maintain rigorous quality and safety standards for every ingredient in your formula.

## Our Approved Catalog

Every ingredient goes through strict evaluation:

### Efficacy Requirements
- **Clinical evidence** - Research-backed benefits
- **Optimal dosing** - Effective therapeutic ranges
- **Bioavailability** - Proven absorption

### Safety Standards
- **Third-party testing** - Purity and potency verified
- **GMP certification** - Good Manufacturing Practices
- **No harmful additives** - Clean, quality ingredients

[Screenshot placeholder: Ingredient quality badges]

## What's NOT in Your Formula

We exclude:
- Proprietary blends (amounts always disclosed)
- Artificial colors or sweeteners
- Common allergens (unless specifically needed)
- Mega-doses beyond safety limits
- Unproven or dangerous compounds

## Dosage Safety

All formulas are validated against:
- **Maximum daily limits** - Based on research
- **Interaction checks** - Against your medications
- **Synergistic effects** - How ingredients work together

[Screenshot placeholder: Safety validation system]

## Third-Party Testing

All ingredients undergo:
- Heavy metal testing (lead, mercury, arsenic, cadmium)
- Microbial testing
- Potency verification
- Purity analysis

## Allergen Information

Common allergens in some ingredients:
- Soy (lecithin, phosphatidylcholine)
- Fish/shellfish (some omega-3 sources)
- Tree nuts (some oils)

The AI flags any allergens based on your profile.

[Screenshot placeholder: Allergen warning display]

## Medication Interactions

Before each formula, the AI:
1. Reviews your medication list
2. Checks known interactions
3. Adjusts dosages if needed
4. Provides specific warnings

**Important:** Always consult your doctor before starting any new supplement, especially if you take medications or have chronic conditions.

## Quality Certifications

Our manufacturing partners hold:
- FDA-registered facility status
- GMP (Good Manufacturing Practice) certification
- NSF International certification
- Third-party quality audits

Questions about a specific ingredient? The AI can provide detailed safety information and research.`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'How to Adjust Your Formula Over Time',
    content: `# How to Adjust Your Formula Over Time

Your health needs change - your formula should too. Here's how to optimize your supplements over time.

## When to Update Your Formula

Consider adjustments when:
- **New lab results** - Updated biomarkers may show different needs
- **Health goals change** - Shifting from energy to immune support
- **New symptoms** - Addressing emerging health concerns
- **Seasonal changes** - Winter immune support, summer energy
- **Medication changes** - New drugs may create interactions

[Screenshot placeholder: Formula update timeline]

## How to Request Changes

### Option 1: AI Consultation
1. Go to the Consultation page
2. Tell the AI what you want to adjust
3. Examples:
   - "Add more immune support"
   - "Remove the sleep ingredients"
   - "Increase vitamin D to 5000 IU"
   - "Add stress management support"

[Screenshot placeholder: Requesting formula changes]

### Option 2: Upload New Labs
1. Upload recent blood work
2. AI automatically analyzes
3. Recommends adjustments
4. You approve changes

## Formula Versioning

Every change creates a new formula version:
- Previous formulas saved in history
- Can revert to any past version
- Compare versions side-by-side
- Track what changed and why

[Screenshot placeholder: Formula history with versions]

## Timing Your Adjustments

**Best practices:**
- Wait 30-60 days between changes
- Allow time to assess effectiveness
- Upload new labs every 3-6 months
- Make one change at a time

**Exception:** Immediate adjustments for:
- Side effects or adverse reactions
- New medications
- Allergic reactions
- Doctor recommendations

## Tracking Progress

Monitor your formula's effectiveness:
- Energy levels
- Sleep quality
- Symptom changes
- Lab improvements
- Mood and focus

[Screenshot placeholder: Progress tracking interface]

## Cost Considerations

Formula changes may affect pricing:
- Some ingredients cost more than others
- Total formula amount impacts price
- Subscription pricing considers average cost

The AI will show cost changes before confirming adjustments.

## Collaboration with Healthcare Providers

Share your formula with your doctor:
1. Export formula PDF
2. Show ingredient list and dosages
3. Discuss with provider
4. Make medically-guided adjustments

Your doctor's input can improve formula safety and effectiveness!`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Understanding the Science Behind Your Recommendations',
    content: `# Understanding the Science Behind Your Recommendations

Ones AI uses evidence-based research to create your formula. Here's how the science works.

## Our Research Process

For every ingredient recommendation, the AI:

### 1. Reviews Clinical Studies
- Randomized controlled trials (RCTs)
- Meta-analyses
- Systematic reviews
- Observational studies

[Screenshot placeholder: Research evidence levels]

### 2. Evaluates Evidence Quality
- **Strong** - Multiple high-quality RCTs
- **Moderate** - Some RCTs, consistent findings
- **Preliminary** - Limited studies, promising results
- **Limited** - Theoretical or traditional use

### 3. Applies to Your Profile
- Matches ingredients to your needs
- Considers your biomarkers
- Accounts for medications
- Factors in health goals

## How AI Analyzes Your Lab Results

When you upload labs, the AI:

1. **Extracts biomarkers** - Reads all values
2. **Compares to optimal ranges** - Not just "normal"
3. **Identifies patterns** - Related imbalances
4. **Cross-references research** - What nutrients help
5. **Calculates dosages** - Based on deficiency severity

[Screenshot placeholder: Lab analysis workflow]

## Example: Low Vitamin D

If your labs show vitamin D = 25 ng/mL:

**Analysis:**
- Optimal range: 40-60 ng/mL
- You're deficient (below 30)
- Gap: ~20 ng/mL to reach optimal

**Research:**
- Studies show 1000 IU raises levels ~5 ng/mL
- To gain 20 ng/mL = ~4000 IU daily
- Supported by meta-analyses

**Recommendation:**
- Vitamin D3: 4000-5000 IU
- Monitor levels in 3 months
- Adjust based on retest

## Personalization Factors

Your formula is customized based on:

### Biological Factors
- Age (nutrient needs change)
- Sex (different requirements)
- Weight (dosing considerations)
- Genetics (nutrient metabolism)

### Health Status
- Current conditions
- Symptoms
- Lab values
- Medication effects

### Lifestyle
- Diet quality
- Exercise intensity
- Stress levels
- Sleep patterns
- Sunlight exposure

[Screenshot placeholder: Personalization factors diagram]

## Ongoing Research Updates

The AI stays current with:
- Latest published studies
- Updated safety data
- New ingredient research
- Emerging health insights

Your formula benefits from the newest science automatically.

## Asking for Research

Want to dive deeper? Ask the AI:
- "Show me research on [ingredient]"
- "What studies support this dosage?"
- "Are there any risks I should know about?"
- "How does this help with [condition]?"

The AI can cite specific studies and explain the science in simple terms.

[Screenshot placeholder: Research citation in chat]

## Limitations

The AI is transparent about:
- When evidence is limited
- Areas of scientific uncertainty
- When doctor consultation is needed
- Supplement limitations vs. medical treatment

**Remember:** Supplements support health but don't replace medical care. Always work with your healthcare provider for serious conditions.`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Managing Side Effects and Interactions',
    content: `# Managing Side Effects and Interactions

While generally safe, supplements can cause side effects or interact with medications. Here's what you need to know.

## Common Side Effects

Some ingredients may cause mild effects, especially when starting:

### Digestive
- Nausea (take with food)
- Upset stomach
- Constipation or diarrhea
- Bloating

**Solutions:**
- Start with half dose
- Take with meals
- Split doses throughout day
- Increase gradually

[Screenshot placeholder: Side effect management tips]

### Other Possible Effects
- Headaches (often temporary)
- Sleep changes (adjust timing)
- Skin reactions (rare)
- Energy fluctuations

## When to Stop and Contact Support

**Stop immediately if you experience:**
- Severe allergic reaction (hives, difficulty breathing)
- Persistent nausea or vomiting
- Unusual bleeding or bruising
- Severe headache or dizziness
- Any concerning symptoms

Contact emergency services for severe reactions.
Contact our support for non-emergency concerns: support@ones.ai

[Screenshot placeholder: Emergency contact card]

## Medication Interactions

Some supplements interact with medications:

### Blood Thinners (Warfarin, etc.)
- Avoid: High-dose vitamin K, fish oil
- Caution: Turmeric, garlic, ginger
- **Always:** Consult your doctor

### Blood Pressure Medications
- Caution: Magnesium, CoQ10
- Monitor: Blood pressure regularly
- **Always:** Inform your doctor

### Diabetes Medications
- Caution: Chromium, alpha-lipoic acid
- Monitor: Blood sugar levels
- **Always:** Work with your doctor

### Thyroid Medications
- Timing: Take supplements 4 hours apart
- Caution: Iodine, selenium
- **Always:** Check with doctor

[Screenshot placeholder: Drug interaction warnings]

## The AI's Interaction Checks

Before creating your formula, the AI:
1. Reviews your medication list
2. Flags potential interactions
3. Adjusts ingredients/dosages
4. Provides specific warnings

**Example warning:**
"You're taking warfarin. We've excluded fish oil and limited vitamin K to avoid bleeding risk. Please consult your doctor before starting this formula."

## Timing Your Supplements

**Best practices:**
- Take with food (reduces stomach upset)
- Morning for energy-supporting ingredients
- Evening for calming supplements
- Separate from thyroid meds (if applicable)

[Screenshot placeholder: Supplement timing guide]

## Monitoring Your Response

Track how you feel:
- Week 1-2: Initial adjustment
- Week 3-4: Early benefits
- Month 2-3: Full effects

Keep notes on:
- Energy levels
- Sleep quality
- Digestive changes
- Any side effects

## Updating Your Formula for Tolerance

If you experience issues:
1. Message the AI: "I'm having [symptom]"
2. AI investigates the cause
3. Recommends adjustments
4. Creates modified formula

Common adjustments:
- Reducing dosages
- Removing problematic ingredients
- Changing timing recommendations
- Substituting alternatives

## Working with Your Doctor

**Before starting:**
- Share your formula
- Discuss potential interactions
- Get medical clearance

**During supplementation:**
- Report any changes to doctor
- Monitor relevant health markers
- Adjust medications if needed (with doctor)

**Remember:** Your doctor has final say on what's safe for your specific medical situation. Always follow their guidance.

Questions or concerns? The AI can help troubleshoot or connect you with human support.`,
    displayOrder: 4,
    isPublished: true
  },

  // Billing & Subscription Category
  {
    category: 'Billing & Subscription',
    title: 'Understanding Pricing and Payment Options',
    content: `# Understanding Pricing and Payment Options

Ones AI offers flexible pricing for your personalized supplements. Here's everything you need to know.

## How Pricing Works

Your formula cost depends on:
- **Ingredients included** - Some cost more than others
- **Total formula amount** - Higher dosages = more capsules
- **Supply duration** - Bulk discounts available

[Screenshot placeholder: Pricing breakdown]

## Supply Options

Choose your supply duration:

### 1-Month Supply
- Pay-as-you-go flexibility
- No commitment
- Standard pricing

### 3-Month Supply
- **Save 10%** off monthly price
- Convenient quarterly delivery
- Still no subscription

### 6-Month Supply
- **Save 15%** off monthly price
- Best value option
- Free shipping included

**Important:** These are one-time purchases, NOT subscriptions. You're never auto-charged.

## Payment Methods

We accept:
- Credit cards (Visa, Mastercard, Amex, Discover)
- Debit cards
- **Coming soon:** PayPal, Apple Pay, Google Pay

[Screenshot placeholder: Payment method selection]

## Secure Checkout

Your payment is protected by:
- 256-bit SSL encryption
- PCI-DSS compliance
- Stripe payment processing
- No stored card numbers

## Order Confirmation

After checkout, you'll receive:
1. Email confirmation immediately
2. Receipt with order details
3. Tracking number when shipped (24-48 hours)
4. Delivery updates via email/SMS

[Screenshot placeholder: Order confirmation email]

## Refund Policy

**Custom formulas are made-to-order and generally non-refundable.**

**Exceptions:**
- Damaged products → Free replacement
- Defective capsules → Free replacement
- Wrong formula shipped → Full refund

See our full refund policy in the Help Center or contact support@ones.ai

## Formula Changes and Pricing

If you update your formula:
- New formula = new price
- Price shown before checkout
- No surprise charges
- Previous orders unaffected

## Tax and Shipping

- **Shipping:** Free on all orders
- **Tax:** Calculated at checkout based on your state
- **International:** Not yet available (US only currently)

[Screenshot placeholder: Checkout page with tax/shipping]

## Need Help?

Payment questions? Contact us:
- Email: support@ones.ai
- Support ticket: Dashboard > Support
- Response within 24 hours`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Billing & Subscription',
    title: 'Tracking Your Order and Delivery',
    content: `# Tracking Your Order and Delivery

Here's what to expect after placing your order and how to track delivery.

## Order Processing Timeline

### Day 1: Order Placed
- Confirmation email sent
- Payment processed
- Formula sent to manufacturing

### Days 1-3: Manufacturing
- Custom formula created
- Capsules filled with your exact blend
- Quality testing performed
- Packaged for shipping

[Screenshot placeholder: Order status - Manufacturing]

### Day 3-4: Shipped
- Tracking number generated
- Email/SMS notification sent
- Order leaves facility

### Days 5-7: Delivery
- Standard shipping (USPS/UPS)
- Delivered to your address
- Signature may be required

[Screenshot placeholder: Tracking page]

## Tracking Your Order

### Via Email
- Check your confirmation email
- Click the tracking link
- View real-time updates

### Via Dashboard
1. Go to Dashboard > Orders
2. Click on your order
3. View current status
4. See tracking number

[Screenshot placeholder: Order history page]

### Via Carrier Website
- Use tracking number
- Check USPS.com or UPS.com
- Get detailed delivery updates

## Delivery Methods

**Standard Shipping (Free)**
- 5-7 business days
- USPS or UPS
- Tracking included

**Express Shipping**
- Coming soon
- 2-3 business days
- Additional fee

## Delivery Issues

### Not Home for Delivery?
- Carrier leaves notice
- Pick up at local facility
- Or schedule redelivery

### Package Delayed?
1. Check tracking for updates
2. Wait 2 days past estimate
3. Contact support if still missing

### Package Damaged?
1. Take photos of damage
2. Contact support immediately
3. We'll send free replacement

[Screenshot placeholder: Support contact card]

## What's in Your Package

Your delivery includes:
- Custom formula capsules (in bottle)
- Ingredient list label
- Dosage instructions
- Storage recommendations
- Safety information
- Formula breakdown card

[Screenshot placeholder: Package contents]

## Storage Instructions

After receiving your order:
- Store in cool, dry place
- Keep away from sunlight
- Tightly close bottle after each use
- Check expiration date (typically 18-24 months)

## Reordering

When running low:
1. Return to dashboard
2. Click "Reorder" on past order
3. Or create new formula if needs changed
4. Checkout with saved payment

**Tip:** Order when you have 2-3 weeks supply remaining to avoid gaps.

Questions about your delivery? Contact support@ones.ai with your order number.`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Billing & Subscription',
    title: 'Refunds, Returns, and Replacements',
    content: `# Refunds, Returns, and Replacements

Understanding our policies for custom-made supplement orders.

## Our Refund Policy

**Important: Custom formulas are made-to-order and generally non-refundable.**

Why? Each formula is:
- Uniquely created for you
- Manufactured on-demand
- Cannot be resold to others
- Personalized to your health data

[Screenshot placeholder: Custom order explanation]

## When Refunds ARE Provided

We offer full refunds for:

### Manufacturing Defects
- Wrong ingredients included
- Incorrect dosages
- Quality issues with capsules
- Contamination

### Shipping Errors
- Wrong formula shipped
- Incorrect quantity
- Missing items

### Damage in Transit
- Broken bottle
- Crushed capsules
- Leaked or spoiled product

[Screenshot placeholder: Damaged product example]

## Free Replacements

For these issues, we provide free replacement:
- Damaged products
- Defective capsules
- Missing doses
- Quality concerns

**No return shipping needed** - We trust you and value your time.

## How to Request Refund/Replacement

1. Contact support within 30 days
   - Email: support@ones.ai
   - Or submit support ticket
2. Provide:
   - Order number
   - Photos of issue (if applicable)
   - Description of problem
3. We'll respond within 24 hours
4. Replacement ships in 2-3 days

[Screenshot placeholder: Support ticket form]

## What's NOT Covered

Refunds/replacements NOT provided for:
- Changed mind after ordering
- Different formula needed (can order new one)
- Side effects (adjust formula instead)
- Didn't work as expected (supplements vary by individual)

## Adjusting Your Formula

If your formula isn't right:
1. Return to AI consultation
2. Describe the issues
3. Request adjustments
4. Create updated formula
5. Place new order

Previous order is still valid - use up remaining supply while waiting for new formula.

[Screenshot placeholder: Formula adjustment process]

## Satisfaction Guarantee

While we can't refund custom orders, we're committed to:
- Creating formulas that work for you
- Adjusting until you're satisfied
- Supporting your health journey
- Standing behind our quality

## Quality Promise

Every formula undergoes:
- Third-party testing
- Quality control checks
- Potency verification
- Safety validation

If quality standards aren't met, we make it right.

## International Returns

Currently, we only ship within the US. International shipping coming soon.

## Contact Us

Questions about refunds or replacements?
- Email: support@ones.ai
- Support ticket: Dashboard > Support
- Response time: Within 24 hours

We're here to help ensure you get the supplements you need!`,
    displayOrder: 3,
    isPublished: true
  },

  // Technical Support Category
  {
    category: 'Technical Support',
    title: 'Troubleshooting Login and Account Access Issues',
    content: `# Troubleshooting Login and Account Access Issues

Having trouble accessing your account? Here are solutions to common login problems.

## Can't Remember Password

### Reset Your Password:
1. Go to login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check email for reset link (check spam folder)
5. Click link and create new password
6. Log in with new password

[Screenshot placeholder: Password reset flow]

**Password Requirements:**
- At least 8 characters
- Mix of letters and numbers
- At least one uppercase letter recommended

## Email Not Recognized

If you get "Email not found":

### Check for Typos
- Verify email spelling
- Remove extra spaces
- Try alternate email addresses

### Possible Reasons
- Used different email to sign up
- Account not yet created
- Typed email incorrectly during signup

**Solution:** Try creating a new account. If email is already registered, you'll be notified.

[Screenshot placeholder: Email error message]

## Password Reset Email Not Arriving

If you don't receive the reset email:

1. **Check spam/junk folder** - Our emails sometimes get filtered
2. **Wait 5-10 minutes** - Emails can be delayed
3. **Verify email address** - Make sure it's spelled correctly
4. **Add us to contacts** - support@ones.ai and noreply@ones.ai
5. **Try again** - Request another reset email

Still no email? Contact support@ones.ai

## Account Locked

After 5 failed login attempts, your account locks for 30 minutes.

**Solutions:**
- Wait 30 minutes and try again
- Use password reset instead
- Contact support if urgent

[Screenshot placeholder: Account locked message]

## Browser Issues

### Clear Browser Cache and Cookies
1. Open browser settings
2. Find "Clear browsing data"
3. Select "Cookies" and "Cached images"
4. Clear last hour or all time
5. Restart browser
6. Try logging in again

### Try Different Browser
- Chrome (recommended)
- Firefox
- Safari
- Edge

### Disable Browser Extensions
- Ad blockers can interfere
- Privacy extensions may block login
- Try incognito/private mode

[Screenshot placeholder: Browser compatibility notice]

## Mobile App Issues

Currently, Ones AI is web-only:
- Use mobile browser (Chrome, Safari)
- Add to home screen for app-like experience
- Mobile app coming soon!

## Two-Factor Authentication (Coming Soon)

We're adding 2FA for enhanced security:
- SMS codes
- Authenticator app support
- Backup codes

## Account Security Tips

**Keep your account secure:**
- Use strong, unique password
- Don't share login credentials
- Log out on shared devices
- Update password periodically
- Enable 2FA when available

[Screenshot placeholder: Security best practices]

## Still Can't Log In?

Contact our support team:
- Email: support@ones.ai
- Include: Email address used for account
- Describe: What error you're seeing
- We'll respond within 24 hours

**For urgent access issues:** Mark your support ticket as "High Priority"`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'File Upload Issues and Solutions',
    content: `# File Upload Issues and Solutions

Having trouble uploading lab results or other files? Here's how to fix common upload problems.

## Supported File Types

We accept:
- **PDF files** (.pdf) - Lab reports, documents
- **Images** (.jpg, .jpeg, .png) - Photos of reports
- **Max file size:** 10MB per file

[Screenshot placeholder: Accepted file types]

## Upload Not Working

### Check File Size
- Files must be under 10MB
- Compress large PDFs:
  - Use online PDF compressor
  - Or re-scan at lower resolution
- For images, reduce quality/size

### Verify File Type
- Must be .pdf, .jpg, .jpeg, or .png
- Convert other formats (use free online converters)
- Rename file to have correct extension

[Screenshot placeholder: File size error]

### Browser Issues
Try these steps:
1. Refresh the page (F5 or Cmd+R)
2. Clear browser cache
3. Try different browser (Chrome recommended)
4. Disable ad blockers/extensions
5. Try incognito/private mode

## Upload Stuck or Freezing

**If upload bar doesn't move:**
1. Wait 2-3 minutes (large files take time)
2. Check internet connection
3. Close other browser tabs
4. Restart browser
5. Try again

**If browser freezes:**
- Force quit browser
- Restart computer if needed
- Try smaller file size

[Screenshot placeholder: Upload progress bar]

## File Rejected After Upload

Possible reasons:
- File corrupted
- Unsupported file type
- File too large
- Scan quality too low (for images)

**Solutions:**
- Re-export PDF from original source
- Re-take photo of lab report (better lighting)
- Try different file format
- Split multi-page reports into smaller files

## Poor OCR Results (AI Can't Read)

If AI struggles to extract lab data:

### For PDF Files
- Ensure PDF is text-based, not image-based
- Re-export from original source
- Try converting to high-quality image

### For Image Files
- Use good lighting (no shadows)
- Keep camera steady (no blur)
- Capture entire page
- Use high resolution (at least 1200x1600)
- Ensure text is readable when zoomed in

[Screenshot placeholder: Good vs bad lab photo examples]

## Mobile Upload Tips

**Taking photos on phone:**
1. Use back camera (better quality)
2. Hold phone steady
3. Ensure good lighting
4. Capture full page
5. Review photo before uploading
6. Retake if text is blurry

**Uploading from phone:**
- Use mobile browser (Chrome/Safari)
- Select file from photos app
- Wait for upload (may take longer on mobile data)
- Use WiFi for faster uploads

## Multiple File Uploads

To upload multiple lab reports:
1. Upload one file at a time
2. Wait for each to complete
3. Or combine pages into single PDF

**Combining PDFs:**
- Use free online PDF merger
- Or phone scanning app (Adobe Scan, CamScanner)

[Screenshot placeholder: Multiple file upload interface]

## Network/Connection Issues

**Slow or unstable internet:**
- Use WiFi instead of mobile data
- Move closer to router
- Disconnect other devices
- Try uploading during off-peak hours
- Reduce file size

**Upload times:**
- Small files (< 1MB): Few seconds
- Medium files (1-5MB): 10-30 seconds
- Large files (5-10MB): 30-60 seconds

## Still Having Issues?

Contact support with:
1. Screenshot of error message
2. File type and size
3. Browser and device used
4. What happens when you try

Email: support@ones.ai
Or submit support ticket in dashboard

We'll help you get your files uploaded!`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Browser Compatibility and Requirements',
    content: `# Browser Compatibility and Requirements

Ones AI works best with modern web browsers. Here's what you need for the best experience.

## Recommended Browsers

### ✅ Fully Supported (Best Experience)
- **Google Chrome** 90+ (recommended)
- **Mozilla Firefox** 88+
- **Apple Safari** 14+
- **Microsoft Edge** 90+

### ⚠️ Limited Support
- Internet Explorer - NOT supported
- Older browser versions - May have issues

[Screenshot placeholder: Browser logos]

## Checking Your Browser Version

### Chrome
1. Click three dots (top right)
2. Help > About Google Chrome
3. Version shown at top

### Firefox
1. Click menu (three lines)
2. Help > About Firefox
3. Version shown in window

### Safari
1. Safari menu > About Safari
2. Version shown in popup

### Edge
1. Click three dots
2. Help and feedback > About Microsoft Edge
3. Version shown at top

## Updating Your Browser

**Why update?**
- Security improvements
- Better performance
- New features
- Bug fixes
- Compatibility

**How to update:**
Most browsers auto-update. To manually update:
- Chrome/Firefox/Edge: Check version page (auto-updates)
- Safari: Update via Mac App Store > Updates

[Screenshot placeholder: Browser update screen]

## Required Browser Features

Ones AI needs these enabled:

### JavaScript
- Required for all functionality
- Enabled by default in modern browsers
- If disabled, site won't work

### Cookies
- Required for login and sessions
- Enable in browser settings
- Third-party cookies not required

### Local Storage
- Used for session data
- Automatically available
- Can't be disabled in modern browsers

## Recommended Settings

For best experience:

### Enable
- JavaScript (required)
- Cookies (required)
- Pop-ups from ones.ai (for file downloads)

### Disable (temporarily)
- Ad blockers (may block features)
- Privacy extensions that block scripts
- VPNs if causing connection issues

[Screenshot placeholder: Browser settings]

## Mobile Browser Support

### iOS (iPhone/iPad)
- **Safari** - Full support
- **Chrome** - Full support
- iOS 14+ recommended

### Android
- **Chrome** - Full support
- **Firefox** - Full support
- Android 10+ recommended

## Common Browser Issues

### Site Not Loading
1. Clear cache and cookies
2. Disable extensions
3. Try incognito/private mode
4. Update browser
5. Try different browser

### Features Not Working
- Enable JavaScript
- Allow cookies
- Disable ad blockers
- Check browser version

### Slow Performance
- Close unused tabs
- Clear browser cache
- Disable unnecessary extensions
- Update to latest version
- Restart browser

[Screenshot placeholder: Browser settings page]

## Screen Resolution

**Recommended:**
- Desktop: 1280x720 or higher
- Mobile: 375x667 or higher (iPhone SE size+)

**Supported:**
- Minimum: 320px wide (small phones)
- Responsive design adapts to all sizes

## Internet Connection

**Minimum speed:**
- 3 Mbps download
- 1 Mbps upload

**Recommended:**
- 10+ Mbps for file uploads
- Stable connection for AI chat

## Privacy & Tracking

**What we use:**
- Essential cookies only
- Session management
- No advertising trackers
- HIPAA-compliant privacy

**Privacy-focused browsers:**
- Brave, Firefox Focus work fine
- May need to allow cookies for our site

[Screenshot placeholder: Privacy notice]

## Still Having Browser Issues?

Contact support with:
- Browser name and version
- Operating system
- Screenshot of issue
- Error messages seen

Email: support@ones.ai

We'll help you get Ones AI working smoothly!`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Data Privacy and Account Security',
    content: `# Data Privacy and Account Security

Your health data is sensitive. Here's how we protect it and how you can keep your account secure.

## Our Privacy Commitments

### HIPAA Compliance
We maintain HIPAA-level standards for:
- Data encryption
- Access controls
- Audit logging
- Privacy practices

**Note:** While we follow HIPAA standards, we're a supplement platform, not a covered healthcare entity.

[Screenshot placeholder: Security badges]

### What Data We Collect

**Health Information:**
- Health profile (age, sex, conditions, etc.)
- Lab results and biomarkers
- Medications and allergies
- Chat conversations with AI
- Formula history

**Account Information:**
- Name and email
- Shipping address
- Phone number (optional)
- Payment methods (tokenized, not stored)

**Usage Data:**
- Login history
- Page views
- Feature usage

We NEVER sell your data to third parties.

## How We Protect Your Data

### Encryption
- **In transit:** 256-bit SSL/TLS
- **At rest:** AES-256 encryption
- **Backups:** Encrypted and secure

### Access Controls
- Staff access strictly limited
- Role-based permissions
- Audit logs of all access
- Regular security training

### Infrastructure
- SOC 2 certified hosting (AWS/GCP)
- Regular security audits
- Penetration testing
- 24/7 monitoring

[Screenshot placeholder: Security architecture diagram]

## Your Privacy Rights

You can:
- **Access** your data - Download anytime
- **Delete** your account - Permanent removal
- **Export** your information - Machine-readable format
- **Correct** inaccuracies - Update anytime

### Deleting Your Account

To permanently delete:
1. Go to Settings > Account
2. Click "Delete Account"
3. Confirm deletion
4. All data erased within 30 days

**Warning:** This is permanent and cannot be undone.

[Screenshot placeholder: Account deletion confirmation]

## Account Security Best Practices

### Strong Password
- At least 12 characters
- Mix of letters, numbers, symbols
- Unique (not used elsewhere)
- Avoid personal information

### Password Manager
- Use 1Password, LastPass, etc.
- Generates strong passwords
- Remembers them for you
- More secure than reusing passwords

### Enable 2FA (Coming Soon)
When available:
- Use authenticator app (Google Authenticator, Authy)
- Save backup codes
- More secure than SMS

[Screenshot placeholder: 2FA setup screen]

### Other Security Tips
- Never share your password
- Log out on shared devices
- Don't click suspicious email links
- Verify website URL (ones.ai)
- Keep browser updated

## Recognizing Phishing

**We will NEVER:**
- Email asking for password
- Request payment outside platform
- Send suspicious links
- Ask for credit card details via email

**Red flags:**
- Unexpected password reset emails
- Urgent security warnings
- Poor grammar/spelling
- Strange sender addresses
- Requests for sensitive info

If suspicious, contact support@ones.ai to verify.

[Screenshot placeholder: Phishing example]

## Data Sharing

We share data only when:
- **Required by law** - Court orders, subpoenas
- **With your consent** - Sharing with your doctor (you initiate)
- **Service providers** - Payment processing, hosting (under strict contracts)

**Never shared:**
- Marketing companies
- Data brokers
- Social media platforms
- Insurance companies
- Employers

## Third-Party Integrations

Currently integrated services:
- **Stripe** - Payment processing (PCI-DSS compliant)
- **SendGrid** - Email delivery (GDPR compliant)
- **Twilio** - SMS reminders (SOC 2 certified)

All partners sign data protection agreements.

## Compliance & Certifications

We maintain:
- SOC 2 Type II compliance
- GDPR readiness
- CCPA compliance (California)
- PCI-DSS for payments

[Screenshot placeholder: Compliance badges]

## Reporting Security Issues

Found a security vulnerability?
- Email: security@ones.ai
- We take all reports seriously
- Responsible disclosure appreciated
- May offer bug bounty

## Questions About Privacy?

- Read full privacy policy: ones.ai/privacy
- Contact: privacy@ones.ai
- Support ticket: Dashboard > Support

Your trust is our priority. We're committed to protecting your health information.`,
    displayOrder: 4,
    isPublished: true
  }
];

// Comprehensive FAQ items
const faqItems = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'How does Ones AI create personalized supplement formulas?',
    answer: 'Ones AI analyzes your health profile, lab results, medications, and health goals using advanced AI algorithms. It reviews scientific research on thousands of ingredients, then creates a custom formula tailored specifically to your needs. The AI considers dosage safety, ingredient interactions, and evidence-based effectiveness to ensure you get exactly what your body needs.',
    displayOrder: 1
  },
  {
    category: 'Getting Started',
    question: 'Do I need to upload lab results to use Ones AI?',
    answer: 'No, lab results are optional but highly recommended. Without labs, the AI creates formulas based on your health profile, symptoms, and goals. With lab results, recommendations become much more precise because the AI can see your exact nutrient levels, biomarkers, and potential deficiencies. Upload labs anytime to improve your formula accuracy.',
    displayOrder: 2
  },
  {
    category: 'Getting Started',
    question: 'How long does it take to see results from my formula?',
    answer: 'Results vary by individual and ingredient. Some benefits (like energy support) may be noticed within 1-2 weeks. Others (like improving vitamin D levels or reducing inflammation) typically take 30-60 days of consistent use. The AI provides specific timing expectations for your formula based on your goals and the ingredients included.',
    displayOrder: 3
  },
  
  // Formula & Health
  {
    category: 'Formula & Health',
    question: 'Can I change my formula after ordering?',
    answer: 'Yes! Return to the AI consultation anytime to request changes. Tell the AI what you want to add, remove, or adjust. Each change creates a new formula version (your previous versions are saved). You can order the new formula immediately or continue using your current supply while the new one ships.',
    displayOrder: 1
  },
  {
    category: 'Formula & Health',
    question: 'Are the ingredients in my formula safe to take together?',
    answer: 'Yes, safety is our top priority. Before creating your formula, the AI checks for: (1) Interactions between ingredients, (2) Interactions with your medications, (3) Maximum safe dosages for each ingredient, (4) Combined effects of similar nutrients. Every formula is validated against safety limits. If you have concerns, always consult your healthcare provider.',
    displayOrder: 2
  },
  {
    category: 'Formula & Health',
    question: 'What if I experience side effects from my formula?',
    answer: 'Most ingredients are well-tolerated, but individual responses vary. Common mild effects include digestive changes (take with food to help). If you experience side effects: (1) Reduce your dose by half temporarily, (2) Contact the AI to discuss adjustments, (3) Stop immediately if you have severe reactions. The AI can modify your formula to remove problematic ingredients while maintaining your health benefits.',
    displayOrder: 3
  },
  {
    category: 'Formula & Health',
    question: 'Can I take my formula if I\'m on prescription medications?',
    answer: 'The AI automatically checks for drug interactions based on your medication list. However, you should ALWAYS consult your doctor before starting any new supplement, especially if you take: blood thinners, blood pressure medications, diabetes medications, thyroid medications, or immunosuppressants. Share your formula PDF with your doctor for their review.',
    displayOrder: 4
  },

  // Billing & Subscription
  {
    category: 'Billing & Subscription',
    question: 'Is this a subscription service? Will I be charged automatically?',
    answer: 'No, Ones AI is NOT a subscription service. You make one-time purchases for 1, 3, or 6-month supplies. We NEVER auto-charge you. When you\'re running low, simply log in and place a new order. You control exactly when and what you buy.',
    displayOrder: 1
  },
  {
    category: 'Billing & Subscription',
    question: 'Can I get a refund if I don\'t like my formula?',
    answer: 'Custom formulas are made-to-order specifically for you and cannot be resold, so we generally cannot offer refunds for change of mind. However, we DO provide full refunds for: manufacturing defects, shipping errors, or damaged products. If your formula isn\'t working well, the AI can adjust it - we\'re committed to getting your formula right.',
    displayOrder: 2
  },
  {
    category: 'Billing & Subscription',
    question: 'How much do custom formulas cost?',
    answer: 'Pricing depends on your specific formula ingredients and total amount. Some ingredients cost more than others. You\'ll see the exact price before checkout. Supply options: 1-month (standard pricing), 3-month (save 10%), 6-month (save 15% + free shipping). There are no hidden fees.',
    displayOrder: 3
  },
  {
    category: 'Billing & Subscription',
    question: 'When will my order ship and how can I track it?',
    answer: 'Orders ship within 2-3 business days after placement (custom formulas are made fresh for you). You\'ll receive tracking information via email and SMS when it ships. Standard delivery takes 5-7 business days via USPS or UPS. Track your order anytime in Dashboard > Orders.',
    displayOrder: 4
  },

  // Technical Support
  {
    category: 'Technical Support',
    question: 'What browsers work best with Ones AI?',
    answer: 'Ones AI works best on: Google Chrome 90+, Mozilla Firefox 88+, Safari 14+, and Microsoft Edge 90+. We recommend keeping your browser updated for the best experience. Mobile browsers (Chrome, Safari on iOS/Android) are fully supported. Internet Explorer is NOT supported.',
    displayOrder: 1
  },
  {
    category: 'Technical Support',
    question: 'I\'m having trouble uploading my lab results. What should I do?',
    answer: 'Common solutions: (1) Ensure file is PDF, JPG, or PNG format under 10MB, (2) Try a different browser (Chrome works best), (3) Clear your browser cache, (4) For images, ensure good lighting and the text is readable. If issues persist, contact support@ones.ai with a screenshot of the error.',
    displayOrder: 2
  },
  {
    category: 'Technical Support',
    question: 'How do I reset my password?',
    answer: 'On the login page, click "Forgot Password?" Enter your email address and check your inbox (and spam folder) for a reset link. Click the link to create a new password. If you don\'t receive the email within 10 minutes, try requesting again or contact support@ones.ai.',
    displayOrder: 3
  },
  {
    category: 'Technical Support',
    question: 'Is my health data safe and private?',
    answer: 'Yes, absolutely. We use HIPAA-level security standards including 256-bit encryption, SOC 2 certified hosting, and strict access controls. Your health data is NEVER sold to third parties. We only share data when required by law or with your explicit consent (like sharing with your doctor). You can delete your account and all data anytime.',
    displayOrder: 4
  }
];

export async function seedSupportData() {
  console.log('🌱 Starting support data seeding...');
  
  try {
    // Seed help articles
    console.log('📚 Creating help articles...');
    for (const article of helpArticles) {
      try {
        await storage.createHelpArticle(article);
        console.log(`  ✓ Created: "${article.title}"`);
      } catch (error) {
        console.error(`  ✗ Failed to create article "${article.title}":`, error);
      }
    }
    
    // Seed FAQ items
    console.log('❓ Creating FAQ items...');
    for (const faq of faqItems) {
      try {
        await storage.createFaqItem(faq);
        console.log(`  ✓ Created: "${faq.question}"`);
      } catch (error) {
        console.error(`  ✗ Failed to create FAQ "${faq.question}":`, error);
      }
    }
    
    console.log('✅ Support data seeding complete!');
    console.log(`   - ${helpArticles.length} help articles created`);
    console.log(`   - ${faqItems.length} FAQ items created`);
    
  } catch (error) {
    console.error('❌ Error seeding support data:', error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSupportData()
    .then(() => {
      console.log('✨ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
