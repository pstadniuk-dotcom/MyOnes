import './db';
import { db } from './db';
import { helpArticles, faqItems } from '../shared/schema';

const helpArticlesData = [
  {
    category: 'Getting Started',
    title: 'Creating Your Account and Setting Up Your Profile',
    content: `# Creating Your Account and Setting Up Your Profile

Welcome to Ones AI! This comprehensive guide will walk you through creating your account and setting up your complete health profile for personalized supplement recommendations. The more thorough you are during setup, the more accurate your AI-generated formula will be.

## Why Your Profile Matters

Your health profile is the foundation for all recommendations. Our AI uses this information to:
- Create safe, personalized supplement formulas
- Avoid interactions with your medications
- Account for your allergies and sensitivities
- Target your specific health goals
- Optimize dosages based on your age, weight, and biological sex
- Consider your lifestyle factors (sleep, exercise, stress)

The AI will NEVER recommend anything that conflicts with your health conditions or medications. Accuracy during setup ensures safety and effectiveness.

## Step 1: Sign Up for Your Account

### Creating Your Account

1. Visit the Ones AI homepage at ones.ai
2. Click "Get Started" or "Sign Up" in the top right corner
3. Enter your information:
   - **Full name:** Used for personalization and shipping
   - **Email address:** Your account login (must be valid)
   - **Phone number:** Optional, but recommended for SMS order tracking and pill reminders
   - **Password:** Must be at least 8 characters with letters and numbers

4. Review Terms of Service and Privacy Policy
5. Click "Create Account"
6. Check your email for verification link
7. Click the verification link to activate your account

[Screenshot placeholder: Sign-up form showing name, email, phone, password fields]

### Email Verification

You'll receive an email within 2-3 minutes. If you don't see it:
- Check your spam/junk folder
- Add support@ones.ai to your contacts
- Request a new verification email from the login page
- Contact support if issues persist

### Security Tips

- Use a strong, unique password (password manager recommended)
- Enable two-factor authentication when available
- Don't share your account credentials
- Log out on shared devices

## Step 2: Complete Your Health Profile

After account creation, you'll be guided through a comprehensive health assessment. The AI consultation will collect this information conversationally, but you can also pre-fill it in your profile.

### Phase 1: Basic Demographics

The AI needs this to calculate safe dosages:

**Required Information:**
- Age (affects metabolism and nutrient needs)
- Biological sex (influences hormone-related recommendations)
- Height and weight (determines dosage calculations)

**Why we ask:** Supplement dosages are NOT one-size-fits-all. A 120lb woman needs different amounts than a 200lb man. Age affects nutrient absorption and metabolism.

[Screenshot placeholder: Basic demographics form]

### Phase 2: Lifestyle Factors

These directly impact your supplement needs:

**Sleep:**
- Hours per night (average)
- Sleep quality (good/fair/poor)
- Sleep issues (if any)

**Exercise:**
- Frequency (days per week)
- Intensity (light/moderate/vigorous)
- Type (cardio, strength, sports, etc.)

**Stress Level:**
- Scale of 1-10
- Main stressors
- How you manage stress

**Substances:**
- Smoking status (never/former/current)
- Alcohol consumption (drinks per week)
- Caffeine intake (cups per day)
- Recreational substances

**Dietary Habits:**
- Diet type (omnivore, vegetarian, vegan, keto, etc.)
- Food allergies or intolerances
- Supplement use (current vitamins/supplements)

**Why we ask:** Your lifestyle creates nutritional demands and deficiencies. Athletes need more nutrients. Poor sleep depletes B vitamins. Stress burns through magnesium. Alcohol interferes with nutrient absorption.

[Screenshot placeholder: Lifestyle factors questionnaire]

### Phase 3: Medical History

Critical for safety and avoiding interactions:

**Current Medications:**
- Prescription medications (name and dosage)
- Over-the-counter drugs
- Supplements you already take

**Important:** Be thorough here! The AI checks EVERY medication for interactions with potential supplements. Missing a medication could lead to dangerous interactions.

**Allergies:**
- Medication allergies
- Food allergies
- Environmental allergies
- Previous reactions to supplements

**Chronic Conditions:**
- Diagnosed medical conditions
- Active health issues
- Past major illnesses/surgeries
- Family medical history (optional but helpful)

**Current Symptoms:**
- What you're experiencing now
- How long symptoms have persisted
- Severity (mild/moderate/severe)
- Symptoms you want to address

**Why we ask:** Safety first. The AI will NOT recommend anything that could interact with your medications or trigger allergies. Chronic conditions require special consideration for supplement safety.

[Screenshot placeholder: Medical history form showing medication list, allergies, conditions]

### Phase 4: Health Goals

Tell the AI what you want to achieve:

**Common Health Goals:**
- Increase energy and reduce fatigue
- Improve sleep quality
- Support immune function
- Reduce stress and anxiety
- Enhance cognitive function and focus
- Support cardiovascular health
- Improve athletic performance and recovery
- Balance hormones
- Support digestive health
- Promote healthy aging
- Address specific nutrient deficiencies

You can select multiple goals. The AI will prioritize based on your lab results (if uploaded) and symptom severity.

[Screenshot placeholder: Health goals selection interface]

## Step 3: Upload Lab Results (Highly Recommended)

Lab results transform your formula from "good" to "excellent" by revealing exact deficiencies and biomarker imbalances.

### Why Upload Labs?

**Without labs:** The AI makes educated guesses based on symptoms, demographics, and diet.

**With labs:** The AI sees your EXACT nutrient levels and can:
- Identify specific deficiencies (even asymptomatic ones)
- Calculate precise dosages to optimize levels
- Track changes over time
- Catch issues before they become symptomatic
- Provide more targeted, evidence-based recommendations

**Example:** You report fatigue. Without labs, the AI might recommend general energy support. WITH labs showing vitamin D = 18 ng/mL (severely deficient), the AI prescribes exactly 4,000 IU to reach optimal 40-60 ng/mL range in 8-12 weeks.

### Supported Lab Types

**Any standard blood panel works:**
- LabCorp, Quest Diagnostics
- Function Health (recommended)
- Hospital lab results
- Physician-ordered labs
- Direct-to-consumer lab companies
- International labs (any language)

**Supported Formats:**
- PDF reports (preferred)
- Clear photos of paper results
- Scanned documents
- JPEG, PNG, or PDF files
- Maximum file size: 10MB

[Screenshot placeholder: Lab upload interface with drag-and-drop]

### How to Upload

1. Log into your dashboard
2. Navigate to Profile > Lab Reports tab
3. Click "Upload Lab Results" button
4. Select your file or drag-and-drop
5. Add optional notes (test date, lab name, etc.)
6. Click "Upload" and wait for processing

**Processing time:** 10-30 seconds depending on file size

### What Happens After Upload

Our AI-powered OCR system:

1. **Extracts all biomarker values** - Reads every test result, even from images
2. **Identifies out-of-range results** - Flags low, high, or optimal values
3. **Analyzes patterns** - Connects related biomarkers for insights
4. **Updates recommendations** - Immediately adjusts your formula
5. **Highlights priorities** - Shows which deficiencies need attention

You can review all extracted data before it's used. Corrections can be made if OCR misreads anything.

[Screenshot placeholder: Extracted lab data showing biomarkers with status indicators]

### Key Biomarkers We Analyze

**Comprehensive Metabolic Panel (CMP):**
- Glucose, kidney function, liver enzymes, electrolytes

**Lipid Panel:**
- Total cholesterol, LDL, HDL, triglycerides

**Vitamin & Mineral Levels:**
- Vitamin D, B12, folate, iron, ferritin, magnesium, calcium

**Thyroid Function:**
- TSH, T3, T4

**Inflammatory Markers:**
- CRP, homocysteine

**Hormone Levels:**
- Testosterone, estrogen, cortisol (if available)

**And many more** - Our AI recognizes hundreds of biomarkers

### Getting Labs If You Don't Have Any

**Option 1: Ask Your Doctor**
Most physicians will order comprehensive labs if you ask. Request:
- Complete Blood Count (CBC)
- Comprehensive Metabolic Panel (CMP)
- Lipid Panel
- Vitamin D
- B12 and folate
- Iron/ferritin
- Thyroid panel (TSH, free T3, free T4)

**Option 2: Direct-to-Consumer Labs**
Companies like Function Health offer comprehensive testing without doctor orders:
- 100+ biomarkers
- Convenient at-home collection or lab visits
- Results in 2-3 weeks
- Typically $200-500

## Step 4: Review and Confirm

Before starting your AI consultation:

1. Review your profile for accuracy
2. Ensure all medications are listed
3. Double-check allergies
4. Verify your health goals
5. Confirm lab data was extracted correctly

### Editing Your Profile Later

Your profile is never locked. You can update it anytime:
- Add new medications or conditions
- Upload new lab results
- Change health goals
- Update lifestyle factors

The AI will automatically adjust your formula based on any profile changes.

## Next Steps: Starting Your AI Consultation

Once your profile is complete, you're ready to begin your first consultation:

1. Click "Consultation" in the sidebar
2. The AI will greet you and review your profile
3. Answer any additional questions the AI asks
4. The AI will create your personalized formula
5. Review your formula and place your first order

**Pro tip:** Upload labs BEFORE starting your consultation for the most accurate formula right away.

## Privacy & Data Security

Your health information is protected:
- **HIPAA-level encryption** - 256-bit SSL for data in transit
- **Secure storage** - SOC 2 certified servers
- **Access controls** - Limited staff access, audit logs
- **Never sold** - We NEVER sell your data to third parties
- **You control it** - Delete your account and all data anytime

Your data is used ONLY to create your personalized recommendations and improve our AI models (anonymized).

## Need Help?

**Email Support:** support@ones.ai (24-hour response time)

**Common Questions:**
- "Can I skip the profile and just get a formula?" - No, safety requires accurate health data
- "How long does setup take?" - 10-15 minutes for complete profile
- "Is my data secure?" - Yes, HIPAA-level encryption and SOC 2 certified
- "Can I change my profile later?" - Absolutely, update anytime

Ready to get started? Create your account and begin your personalized health journey!`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Getting Started',
    title: 'How to Start Your First AI Consultation',
    content: `# How to Start Your First AI Consultation

Your AI consultation is where the magic happens - our intelligent GPT-4o-powered system analyzes your complete health profile, reviews scientific research, and creates a personalized supplement formula tailored specifically to you. This guide will walk you through the entire consultation process, what to expect, and how to get the most accurate recommendations.

## What Is the AI Consultation?

The Ones AI consultation is a conversational experience powered by GPT-4o, the most advanced AI model available. Unlike generic supplement recommendations, our AI:

- **Reviews YOUR unique health data** - age, medications, conditions, goals, lab results
- **Analyzes scientific research** - cross-references thousands of clinical studies
- **Checks for safety** - scans for medication interactions and contraindications
- **Calculates precise dosages** - based on your body weight, deficiencies, and goals
- **Creates your custom formula** - combining 32 base formulas + 29 individual ingredients

The consultation typically takes 10-20 minutes depending on complexity. You can pause and resume anytime.

## Before You Start: Preparation

For the best results, complete these steps BEFORE your first consultation:

### 1. Complete Your Health Profile
Make sure you've entered:
- All current medications (prescription and OTC)
- Known allergies
- Chronic conditions
- Current symptoms
- Health goals

**Why:** The AI uses this to create safe, personalized recommendations.

### 2. Upload Lab Results (Highly Recommended)
If you have recent blood work:
- Go to Profile > Lab Reports
- Upload PDF or image files
- Wait for AI to extract biomarkers

**Why:** Lab results increase recommendation accuracy by 10x. The AI can see EXACT nutrient levels instead of guessing.

**Example:** "I feel tired" → AI recommends general energy support
vs.
Labs showing Iron = 15 (deficient) → AI prescribes Iron 65mg to reach optimal 50-150 range

### 3. Gather Information About Current Supplements
If you're currently taking vitamins/supplements:
- List each supplement name
- Note dosages
- Mention how long you've been taking them
- Describe any effects (positive or negative)

**Why:** The AI needs to know what you're already taking to avoid duplicates and ensure compatibility.

## Accessing the Consultation

### Starting Your First Consultation

1. **Log into your Ones AI dashboard**
   - Navigate to ones.ai
   - Enter your email and password
   - Click "Sign In"

2. **Click "Consultation" in the left sidebar**
   - You'll see the chat interface
   - The AI will greet you personally

3. **Begin the conversation**
   - The AI starts with a friendly introduction
   - It will review your health profile
   - Then begin asking clarifying questions

[Screenshot placeholder: Consultation interface showing chat window with AI greeting]

### The Consultation Interface

**What you'll see:**
- **Left panel:** Chat history with the AI
- **Right panel:** Your health profile summary
- **Bottom:** Text input to respond to AI questions
- **Top right:** Pause/resume button

**Features:**
- Unlimited message length
- File upload capability (for additional lab reports)
- Copy/paste from medical records
- Previous conversation history

## The Consultation Process: What to Expect

The AI guides you through a systematic health assessment. Here's the typical flow:

### Phase 1: Introduction & Profile Review (2-3 minutes)

**What happens:**
- AI introduces itself and explains the process
- Reviews your health profile for accuracy
- Asks you to confirm or update key information
- Explains how it will create your formula

**Example AI message:**
"Hi Sarah! I'm your Ones AI health consultant. I've reviewed your profile and see that you're a 34-year-old female taking levothyroxine for hypothyroidism. Your main goals are increasing energy and improving sleep. Is this information still accurate?"

**Your role:**
- Confirm the information
- Correct any inaccuracies
- Add anything missing

### Phase 2: Health Goals Deep Dive (3-5 minutes)

**What happens:**
- AI asks detailed questions about your health goals
- Explores symptoms in depth
- Understands severity and timeline
- Prioritizes goals based on your input

**Example questions:**
- "You mentioned wanting to increase energy. On a scale of 1-10, how would you rate your current energy levels?"
- "When did you first notice the fatigue? Has it gotten worse over time?"
- "What time of day do you feel most tired? Morning, afternoon, or all day?"
- "What have you tried so far to improve energy?"

**Your role:**
- Be specific and thorough
- Describe symptoms in detail
- Mention what you've already tried
- Prioritize your most important goals

**Pro tip:** The more detail you provide, the better your formula. Instead of "I'm tired," try "I wake up exhausted even after 8 hours of sleep, crash around 2 PM, and rely on coffee to function."

### Phase 3: Lab Results Analysis (2-5 minutes, if uploaded)

**What happens:**
- AI reviews your extracted lab data
- Identifies deficiencies and imbalances
- Explains what each abnormal result means
- Connects biomarkers to your symptoms

**Example AI analysis:**
"I see your vitamin D level is 22 ng/mL, which is deficient (optimal: 40-60). This could definitely contribute to your fatigue and low mood. I also notice your ferritin is 18 ng/mL (low), which commonly causes afternoon energy crashes. Let's address both of these."

**Your role:**
- Review the AI's interpretation
- Ask questions about any biomarker you don't understand
- Mention if you've started addressing any deficiency since labs were done

**Common biomarkers the AI analyzes:**
- Vitamin D (optimal: 40-60 ng/mL)
- Iron/Ferritin (varies by sex)
- B12 (optimal: >400 pg/mL)
- TSH (optimal: 0.5-2.5 mIU/L)
- Homocysteine (optimal: <7 μmol/L)
- hs-CRP (optimal: <1 mg/L)

### Phase 4: Medication & Interaction Review (2-3 minutes)

**What happens:**
- AI reviews every medication you're taking
- Checks for potential supplement interactions
- Adjusts formula to ensure safety
- Provides specific warnings

**Example AI safety check:**
"You're taking Warfarin (blood thinner). I'll need to avoid high-dose vitamin K and vitamin E, as these could interfere with your medication. I'll also keep vitamin D at a safe level to avoid affecting calcium metabolism."

**Your role:**
- Confirm all medications are listed
- Mention any recent changes
- Ask about specific supplements you're curious about

**Critical:** DO NOT skip this part. Supplement-drug interactions can be dangerous.

### Phase 5: Formula Creation (1-2 minutes)

**What happens:**
- AI synthesizes all information
- Selects appropriate ingredients
- Calculates optimal dosages
- Creates your personalized formula
- Presents formula with detailed rationale

**What you'll receive:**
- Complete ingredient list with amounts
- Total daily dosage (4500-5500mg)
- Number of capsules per day (4-9 capsules)
- Purpose of each ingredient
- Scientific rationale
- Safety information
- Expected timeline for results

[Screenshot placeholder: Formula card showing ingredients, dosages, and rationale]

**Example formula presentation:**
"Based on your health profile and lab results, I've created a formula to address your fatigue, support thyroid function, and improve sleep quality. Your formula contains 8 ingredients totaling 4800mg, delivered in 6 capsules daily..."

### Phase 6: Formula Review & Questions (Variable)

**What happens:**
- AI presents your complete formula
- Explains each ingredient's purpose
- Answers your questions
- Makes adjustments if requested
- Provides research citations

**Your role:**
- Review the formula carefully
- Ask questions about any ingredient
- Request changes if desired
- Understand how to take it

**Common questions to ask:**
- "Why did you choose [specific ingredient]?"
- "What research supports this dosage?"
- "Can I take this with food?"
- "When should I expect results?"
- "Are there any side effects?"
- "Can I split the capsules throughout the day?"

**Pro tip:** The AI can cite specific research studies. Ask "Show me research on [ingredient]" for evidence-based explanations.

### Phase 7: Ordering & Next Steps (1 minute)

**What happens:**
- AI saves your formula
- Explains ordering process
- Provides next steps
- Sets expectations for delivery

**Your role:**
- Click "See Your Formulation" to review on the Formulation page
- Choose supply duration (1-month, 3-month, 6-month)
- Proceed to checkout when ready

## Tips for a Successful Consultation

### Be Thorough and Honest
- Don't minimize symptoms
- Don't exaggerate to get more supplements
- Mention ALL medications, even OTC
- Be honest about lifestyle (diet, alcohol, smoking)

**Why:** The AI can only be as accurate as the information you provide. Honesty ensures safety.

### Upload Labs BEFORE Starting
- Lab results dramatically improve accuracy
- AI can calculate exact dosages needed
- Identifies hidden deficiencies you might not feel yet
- Tracks progress over time

### Ask Questions Freely
- There are NO dumb questions
- The AI is designed to educate
- Request research citations
- Ask about alternatives
- Understand WHY, not just WHAT

### Take Your Time
- Consultations aren't timed
- You can pause and resume anytime
- Gather medical records if needed
- Think through symptoms carefully

### Request Adjustments
- Formula not quite right? Ask for changes
- "Add more [goal] support"
- "Remove [ingredient] because [reason]"
- "Increase [nutrient] dosage"

The AI creates unlimited formula versions until you're satisfied.

## Common Consultation Scenarios

### Scenario 1: No Lab Results

**What happens:** AI creates formula based on:
- Your symptoms
- Demographics (age, sex, weight)
- Health goals
- Dietary patterns

**Recommendation:** Order labs and re-consult in 2-4 weeks for optimized formula.

### Scenario 2: Complex Medical History

**What happens:** AI takes extra time to:
- Review all conditions
- Check medication interactions
- Research contraindications
- Create ultra-safe formula

**Expect:** More questions, longer consultation (20-30 min)

### Scenario 3: Already Taking Many Supplements

**What happens:** AI will:
- Review your current stack
- Identify duplicates
- Suggest consolidation
- Find gaps in coverage
- Ensure dosages are safe

**Result:** Often a SIMPLER formula that's more effective

### Scenario 4: Very Specific Goals

**Example:** "I want to optimize my formula for marathon training"

**What happens:** AI will:
- Research endurance athlete needs
- Increase anti-inflammatory support
- Add muscle recovery ingredients
- Optimize electrolytes and minerals
- Time dosages around training

## After Your First Consultation

### Review Your Formula
- Go to "My Formulation" tab
- Review all ingredients and dosages
- Read the complete rationale
- Understand timing and instructions

### Compare Formula Versions
- Each consultation creates a new version
- You can compare side-by-side
- Revert to previous versions
- Track changes over time

### Place Your Order
- Choose supply duration
- Select shipping speed
- Complete secure checkout
- Receive tracking information

### Schedule Follow-Up
- Re-consult after 30-60 days
- Upload new labs every 3-6 months
- Adjust for goal changes
- Optimize based on results

## Frequently Asked Questions

**Q: How long does a consultation take?**
A: 10-20 minutes on average. Complex cases may take 30 minutes.

**Q: Can I stop and resume later?**
A: Yes! Your conversation is saved. Return anytime to continue.

**Q: Will the AI prescribe medications?**
A: No. Ones AI only recommends supplements. We do not prescribe drugs.

**Q: Can I have multiple consultations?**
A: Absolutely! Re-consult anytime to update your formula.

**Q: Is my health information private?**
A: Yes. HIPAA-level encryption. Never sold to third parties.

**Q: What if I disagree with a recommendation?**
A: Ask the AI to remove it or explain the research. You have final say.

**Q: Can I consult without providing all health information?**
A: You can, but recommendations will be less accurate and potentially less safe.

## Need Support?

**Email:** support@ones.ai (24-hour response)

**In-Consultation Help:**
- Ask the AI directly - "I have a question about..."
- It's designed to answer questions during consultation
- Can clarify any confusion in real-time

**Emergency Note:** For medical emergencies, call 911. Ones AI provides supplement recommendations, not emergency medical advice.

Ready to start your personalized health journey? Log in and click "Consultation" to begin!`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Getting Started',
    title: 'Understanding Your Personalized Formula',
    content: `# Understanding Your Personalized Formula

Your formula is custom-built based on your unique health profile, goals, and biomarkers.

## Formula Components

Every formula contains:
- Base Formulas (pre-formulated blends)
- Individual Ingredients (single nutrients)

[Screenshot placeholder: Formula breakdown]

## Reading Your Formula Card

Your formula shows:
1. Total Dosage (max 5500mg)
2. Ingredient List with amounts
3. Purpose for each ingredient
4. Overall rationale
5. Safety warnings

## Capsule Information

- 00-size capsules (easy to swallow)
- 4-9 capsules per day
- Take together or split between meals

[Screenshot placeholder: Capsule details]

## Updating Your Formula

Return to the AI consultation anytime to request changes. Previous versions are saved in your history.

Need clarification? Ask the AI for research and evidence!`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Getting Started',
    title: 'Uploading and Understanding Lab Results',
    content: `# Uploading and Understanding Lab Results

Lab results provide the most accurate foundation for your personalized formula.

## Supported Formats

- PDF reports from LabCorp, Quest, Function Health, etc.
- Images (clear photos of paper reports)
- Scanned documents

[Screenshot placeholder: File upload]

## How to Upload

1. Go to Dashboard > Profile > Lab Reports
2. Click "Upload Lab Results"
3. Select your file (max 10MB)
4. Add optional notes
5. Click "Upload"

## What Happens Next

Our AI automatically:
1. Extracts all biomarker values
2. Identifies out-of-range results
3. Analyzes patterns
4. Updates your recommendations

[Screenshot placeholder: Extracted lab data]

## Key Biomarkers

We analyze cardiovascular, metabolic, nutritional markers and more.

## Privacy & Security

Your lab data is encrypted, HIPAA-compliant, never shared, and deletable anytime.

Questions? Ask the AI for detailed explanations!`,
    displayOrder: 4,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Ingredient Safety and Quality Standards',
    content: `# Ingredient Safety and Quality Standards

We maintain rigorous quality and safety standards for every ingredient.

## Our Approved Catalog

Every ingredient undergoes strict evaluation for:
- Clinical evidence and research backing
- Optimal therapeutic dosing
- Proven bioavailability

[Screenshot placeholder: Quality certifications]

## What's NOT in Your Formula

We exclude:
- Proprietary blends
- Artificial colors or sweeteners
- Mega-doses beyond safety limits
- Unproven compounds

## Third-Party Testing

All ingredients undergo heavy metal testing, microbial testing, potency verification, and purity analysis.

## Medication Interactions

The AI reviews your medications, checks interactions, and adjusts dosages with specific warnings.

**Important:** Always consult your doctor before starting supplements, especially if you take medications.

Questions? The AI can provide detailed safety information.`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'How to Adjust Your Formula Over Time',
    content: `# How to Adjust Your Formula Over Time

Your health needs change - your formula should too.

## When to Update

Consider adjustments when:
- New lab results available
- Health goals change
- New symptoms emerge
- Seasonal changes
- Medication changes

[Screenshot placeholder: Formula timeline]

## How to Request Changes

### Option 1: AI Consultation
Tell the AI what to adjust:
- "Add more immune support"
- "Remove sleep ingredients"
- "Increase vitamin D to 5000 IU"

### Option 2: Upload New Labs
AI automatically analyzes and recommends adjustments.

## Formula Versioning

Every change creates a new version:
- Previous formulas saved
- Can revert to any version
- Compare side-by-side
- Track changes

## Timing Your Adjustments

Wait 30-60 days between changes to assess effectiveness. Upload new labs every 3-6 months.

## Collaboration with Doctors

Share your formula PDF with your healthcare provider for medically-guided adjustments.`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Understanding the Science Behind Your Recommendations',
    content: `# Understanding the Science Behind Your Recommendations

Ones AI uses evidence-based research to create your formula.

## Our Research Process

For every ingredient, the AI:
1. Reviews clinical studies (RCTs, meta-analyses)
2. Evaluates evidence quality
3. Applies findings to your profile

[Screenshot placeholder: Research evidence pyramid]

## How AI Analyzes Labs

When you upload labs:
1. Extracts biomarkers
2. Compares to optimal ranges
3. Identifies patterns
4. Cross-references research
5. Calculates dosages

## Example: Low Vitamin D

If labs show vitamin D = 25 ng/mL:
- Optimal: 40-60 ng/mL
- You need ~20 ng/mL increase
- Research shows 1000 IU raises ~5 ng/mL
- Recommendation: 4000-5000 IU daily

## Personalization Factors

Your formula considers:
- Biological factors (age, sex, weight)
- Health status (conditions, symptoms, labs)
- Lifestyle (diet, exercise, stress, sleep)

## Asking for Research

Ask the AI:
- "Show me research on [ingredient]"
- "What studies support this dosage?"
- "Are there any risks?"

The AI cites specific studies and explains the science simply.

**Remember:** Supplements support health but don\'t replace medical care.`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Formula & Health',
    title: 'Managing Side Effects and Interactions',
    content: `# Managing Side Effects and Interactions

While generally safe, supplements can cause side effects or interact with medications.

## Common Side Effects

Some ingredients may cause mild effects when starting:
- Digestive (take with food)
- Headaches (often temporary)
- Sleep changes (adjust timing)

**Solutions:**
- Start with half dose
- Take with meals
- Split doses throughout day
- Increase gradually

## When to Stop

Stop immediately if you experience:
- Severe allergic reaction
- Persistent nausea or vomiting
- Unusual bleeding or bruising
- Severe headache or dizziness

Contact emergency services for severe reactions.
Contact support@ones.ai for non-emergency concerns.

## Medication Interactions

Some supplements interact with:
- Blood thinners
- Blood pressure medications
- Diabetes medications
- Thyroid medications

**Always:** Consult your doctor before starting.

## The AI's Interaction Checks

Before creating your formula, the AI:
1. Reviews your medication list
2. Flags potential interactions
3. Adjusts ingredients/dosages
4. Provides specific warnings

## Monitoring Your Response

Track how you feel over weeks 1-2, 3-4, and months 2-3.

## Working with Your Doctor

Share your formula with your doctor before starting and report any changes during supplementation.

Questions? The AI can help troubleshoot or connect you with human support.`,
    displayOrder: 4,
    isPublished: true
  },
  {
    category: 'Billing & Subscription',
    title: 'Understanding Pricing and Payment Options',
    content: `# Understanding Pricing and Payment Options

Ones AI offers flexible pricing for your personalized supplements.

## How Pricing Works

Your formula cost depends on:
- Ingredients included
- Total formula amount
- Supply duration

## Supply Options

### 1-Month Supply
- Pay-as-you-go flexibility
- No commitment

### 3-Month Supply
- **Save 10%** off monthly price
- Convenient quarterly delivery

### 6-Month Supply
- **Save 15%** off monthly price
- Free shipping included

**Important:** These are one-time purchases, NOT subscriptions. You're never auto-charged.

## Payment Methods

We accept:
- Credit cards (Visa, Mastercard, Amex, Discover)
- Debit cards

## Secure Checkout

Your payment is protected by:
- 256-bit SSL encryption
- PCI-DSS compliance
- Stripe payment processing

## Order Confirmation

After checkout:
1. Email confirmation immediately
2. Receipt with order details
3. Tracking number when shipped
4. Delivery updates via email/SMS

## Refund Policy

Custom formulas are made-to-order and generally non-refundable.

**Exceptions:**
- Damaged products → Free replacement
- Defective capsules → Free replacement
- Wrong formula shipped → Full refund

Contact support@ones.ai for assistance.`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Billing & Subscription',
    title: 'Tracking Your Order and Delivery',
    content: `# Tracking Your Order and Delivery

Here's what to expect after placing your order.

## Processing Timeline

### Day 1: Order Placed
- Confirmation email sent
- Payment processed
- Formula sent to manufacturing

### Days 1-3: Manufacturing
- Custom formula created
- Capsules filled
- Quality testing
- Packaged for shipping

### Day 3-4: Shipped
- Tracking number generated
- Email/SMS notification

### Days 5-7: Delivery
- Standard shipping (USPS/UPS)
- Delivered to your address

## Tracking Your Order

### Via Dashboard
1. Go to Dashboard > Orders
2. Click on your order
3. View tracking number

### Via Email
Check confirmation email for tracking link.

## Delivery Methods

**Standard Shipping (Free)**
- 5-7 business days
- USPS or UPS
- Tracking included

## Delivery Issues

### Package Delayed?
1. Check tracking for updates
2. Wait 2 days past estimate
3. Contact support if still missing

### Package Damaged?
1. Take photos
2. Contact support immediately
3. Free replacement sent

## What's in Your Package

Your delivery includes:
- Custom formula capsules
- Ingredient list label
- Dosage instructions
- Storage recommendations
- Safety information

## Storage Instructions

Store in cool, dry place away from sunlight. Check expiration date (18-24 months).

Questions? Contact support@ones.ai with your order number.`,
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
- Cannot be resold
- Personalized to your health data

## When Refunds ARE Provided

We offer full refunds for:
- Manufacturing defects
- Shipping errors
- Damage in transit

## Free Replacements

For these issues:
- Damaged products
- Defective capsules
- Missing doses
- Quality concerns

**No return shipping needed** - We trust you.

## How to Request Refund/Replacement

1. Contact support within 30 days
   - Email: support@ones.ai
   - Or submit support ticket
2. Provide order number and photos
3. We respond within 24 hours
4. Replacement ships in 2-3 days

## What's NOT Covered

- Changed mind after ordering
- Different formula needed
- Side effects
- Didn\'t work as expected

## Adjusting Your Formula

If your formula isn\'t right:
1. Return to AI consultation
2. Describe the issues
3. Request adjustments
4. Create updated formula

## Satisfaction Guarantee

While we can\'t refund custom orders, we're committed to:
- Creating formulas that work
- Adjusting until satisfied
- Supporting your health journey
- Standing behind quality

Contact: support@ones.ai for questions.`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Troubleshooting Login and Account Access Issues',
    content: `# Troubleshooting Login and Account Access Issues

Having trouble accessing your account?

## Can\'t Remember Password

1. Go to login page
2. Click "Forgot Password?"
3. Enter your email
4. Check email for reset link (check spam)
5. Create new password
6. Log in

**Password Requirements:**
- At least 8 characters
- Mix of letters and numbers
- Uppercase letter recommended

## Email Not Recognized

If "Email not found":
- Check for typos
- Try alternate email
- Verify spelling

**Solution:** Try creating new account. If email exists, you'll be notified.

## Reset Email Not Arriving

1. Check spam/junk folder
2. Wait 5-10 minutes
3. Verify email address
4. Add support@ones.ai to contacts
5. Request again

Still no email? Contact support@ones.ai

## Account Locked

After 5 failed attempts, account locks for 30 minutes.

**Solutions:**
- Wait 30 minutes
- Use password reset
- Contact support if urgent

## Browser Issues

### Clear Cache and Cookies
1. Open browser settings
2. Clear browsing data
3. Select cookies and cache
4. Restart browser
5. Try again

### Try Different Browser
- Chrome (recommended)
- Firefox, Safari, Edge

## Account Security Tips

- Use strong, unique password
- Don\'t share credentials
- Log out on shared devices
- Enable 2FA when available

## Still Can't Log In?

Contact support:
- Email: support@ones.ai
- Include your email address
- Describe error message
- We respond within 24 hours`,
    displayOrder: 1,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'File Upload Issues and Solutions',
    content: `# File Upload Issues and Solutions

Having trouble uploading lab results?

## Supported File Types

We accept:
- PDF files (.pdf)
- Images (.jpg, .jpeg, .png)
- Max file size: 10MB

## Upload Not Working

### Check File Size
- Files must be under 10MB
- Compress large PDFs online
- Reduce image quality/size

### Verify File Type
- Must be correct extension
- Convert other formats
- Rename file if needed

### Browser Issues
1. Refresh page
2. Clear browser cache
3. Try different browser (Chrome recommended)
4. Disable ad blockers
5. Try incognito mode

## Upload Stuck or Freezing

If upload bar doesn't move:
1. Wait 2-3 minutes
2. Check internet connection
3. Close other tabs
4. Restart browser
5. Try again

## Poor OCR Results

If AI can\'t read your file:

### For PDFs
- Ensure text-based, not image
- Re-export from source
- Try high-quality image

### For Images
- Use good lighting
- Keep camera steady
- Capture entire page
- Use high resolution
- Ensure text readable

## Mobile Upload Tips

**Taking photos:**
1. Use back camera
2. Hold phone steady
3. Ensure good lighting
4. Capture full page
5. Review before uploading

**Uploading:**
- Use mobile browser
- Use WiFi for faster uploads
- Wait for completion

## Still Having Issues?

Contact support with:
- Screenshot of error
- File type and size
- Browser/device used
- What happens when you try

Email: support@ones.ai`,
    displayOrder: 2,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Browser Compatibility and Requirements',
    content: `# Browser Compatibility and Requirements

Ones AI works best with modern web browsers.

## Recommended Browsers

✅ **Fully Supported:**
- Google Chrome 90+
- Mozilla Firefox 88+
- Apple Safari 14+
- Microsoft Edge 90+

⚠️ **Not Supported:**
- Internet Explorer

## Checking Browser Version

### Chrome
Menu > Help > About Google Chrome

### Firefox
Menu > Help > About Firefox

### Safari
Safari > About Safari

### Edge
Menu > Help > About

## Updating Your Browser

Most browsers auto-update. Check version page to manually update.

## Required Features

Ones AI needs:
- JavaScript (required)
- Cookies (required)
- Local Storage (automatic)

## Recommended Settings

### Enable:
- JavaScript
- Cookies
- Pop-ups from ones.ai

### Disable (temporarily):
- Ad blockers
- Privacy extensions
- VPNs if causing issues

## Mobile Browser Support

### iOS
- Safari (full support)
- Chrome (full support)
- iOS 14+ recommended

### Android
- Chrome (full support)
- Firefox (full support)
- Android 10+ recommended

## Common Issues

### Site Not Loading
1. Clear cache/cookies
2. Disable extensions
3. Try incognito mode
4. Update browser
5. Try different browser

### Slow Performance
- Close unused tabs
- Clear cache
- Disable extensions
- Update browser
- Restart browser

## Screen Resolution

**Recommended:**
- Desktop: 1280x720+
- Mobile: 375x667+ (iPhone SE size+)

## Internet Connection

**Minimum:**
- 3 Mbps download
- 1 Mbps upload

**Recommended:**
- 10+ Mbps for file uploads

## Privacy & Tracking

**What we use:**
- Essential cookies only
- Session management
- No advertising trackers
- HIPAA-compliant

## Still Having Issues?

Contact support with:
- Browser name/version
- Operating system
- Screenshot
- Error messages

Email: support@ones.ai`,
    displayOrder: 3,
    isPublished: true
  },
  {
    category: 'Technical Support',
    title: 'Data Privacy and Account Security',
    content: `# Data Privacy and Account Security

Your health data is sensitive. Here's how we protect it.

## Our Privacy Commitments

### HIPAA Compliance
We maintain HIPAA-level standards for:
- Data encryption
- Access controls
- Audit logging
- Privacy practices

### What Data We Collect

**Health Information:**
- Health profile
- Lab results
- Medications and allergies
- Chat conversations
- Formula history

**Account Information:**
- Name and email
- Shipping address
- Phone number (optional)
- Payment methods (tokenized)

We NEVER sell your data.

## How We Protect Data

### Encryption
- In transit: 256-bit SSL/TLS
- At rest: AES-256
- Backups: Encrypted

### Access Controls
- Limited staff access
- Role-based permissions
- Audit logs
- Security training

### Infrastructure
- SOC 2 certified hosting
- Regular security audits
- Penetration testing
- 24/7 monitoring

## Your Privacy Rights

You can:
- Access your data
- Delete your account
- Export your information
- Correct inaccuracies

### Deleting Account

Settings > Account > Delete Account
**Warning:** Permanent and cannot be undone.

## Account Security

### Strong Password
- At least 12 characters
- Mix of letters, numbers, symbols
- Unique (not used elsewhere)

### Password Manager
Use 1Password, LastPass, etc.

### Enable 2FA (Coming Soon)
- Authenticator app
- Save backup codes
- More secure than SMS

### Security Tips
- Never share password
- Log out on shared devices
- Verify website URL (ones.ai)
- Keep browser updated

## Recognizing Phishing

**We will NEVER:**
- Email asking for password
- Request payment outside platform
- Send suspicious links
- Ask for card details via email

If suspicious, contact support@ones.ai

## Data Sharing

We share data only when:
- Required by law
- With your consent
- Service providers (under contract)

**Never shared with:**
- Marketing companies
- Data brokers
- Social media
- Insurance companies
- Employers

## Compliance

We maintain:
- SOC 2 Type II
- GDPR readiness
- CCPA compliance
- PCI-DSS for payments

## Reporting Security Issues

Email: security@ones.ai

Questions? Contact privacy@ones.ai

Your trust is our priority.`,
    displayOrder: 4,
    isPublished: true
  }
];

const faqData = [
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

async function seedData() {
  console.log('🌱 Starting support data seeding...');
  
  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.delete(faqItems);
    await db.delete(helpArticles);
    console.log('  ✓ Cleared existing help articles and FAQ items');
    
    // Seed help articles
    console.log('📚 Creating help articles...');
    for (const article of helpArticlesData) {
      await db.insert(helpArticles).values(article);
      console.log(`  ✓ Created: "${article.title}"`);
    }
    
    // Seed FAQ items
    console.log('❓ Creating FAQ items...');
    for (const faq of faqData) {
      await db.insert(faqItems).values(faq);
      console.log(`  ✓ Created: "${faq.question}"`);
    }
    
    console.log('✅ Support data seeding complete!');
    console.log(`   - ${helpArticlesData.length} help articles created`);
    console.log(`   - ${faqData.length} FAQ items created`);
    
  } catch (error) {
    console.error('❌ Error seeding support data:', error);
    throw error;
  }
}

// Run the seeding
seedData()
  .then(() => {
    console.log('✨ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
