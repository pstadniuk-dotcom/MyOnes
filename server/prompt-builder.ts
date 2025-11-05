import { BASE_FORMULAS, INDIVIDUAL_INGREDIENTS } from "@shared/ingredients";

// Define types directly to avoid circular dependencies
export interface HealthProfile {
  id: string;
  userId: string;
  age?: number | null;
  sex?: string | null;
  weightLbs?: number | null;
  heightCm?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  restingHeartRate?: number | null;
  sleepHoursPerNight?: number | null;
  exerciseDaysPerWeek?: number | null;
  stressLevel?: number | null;
  smokingStatus?: string | null;
  alcoholDrinksPerWeek?: number | null;
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
  updatedAt: Date;
}

export interface Formula {
  id: string;
  userId: string;
  version?: number;
  name?: string | null;
  bases: Array<{ingredient: string, amount: number, unit: string, purpose?: string}>;
  additions?: Array<{ingredient: string, amount: number, unit: string, purpose?: string}>;
  totalMg: number;
  userCustomizations?: {
    addedBases?: Array<{ingredient: string, amount: number, unit: string}>;
    addedIndividuals?: Array<{ingredient: string, amount: number, unit: string}>;
  };
  createdAt: Date;
}

export interface PromptContext {
  healthProfile?: HealthProfile;
  activeFormula?: Formula;
  labDataContext?: string;
  recentMessages?: Array<{role: string, content: string}>;
}

/**
 * Lightweight GPT-4 prompt - for simple questions, no web search
 * Optimized for speed with minimal context
 */
export function buildGPT4Prompt(context: PromptContext): string {
  return `You are ONES AI, a knowledgeable health assistant specializing in supplements and wellness.

**Your Role:**
- Answer questions clearly and concisely
- Provide evidence-based information about supplements, vitamins, and health
- Be conversational and helpful

**Keep responses:**
- Brief and to the point (2-4 paragraphs max)
- Easy to understand for non-medical audiences
- Backed by general health knowledge

**Important:**
- For complex medical questions or formula requests, acknowledge the question and suggest the user provide more details for a comprehensive consultation
- Never create supplement formulas in simple Q&A mode
- Be honest if you don't have enough information

Answer the user's question directly and helpfully.`;
}

/**
 * Comprehensive o1-mini prompt - for complex consultations with web search
 * Full medical knowledge, lab analysis, formula creation
 */
export function buildO1MiniPrompt(context: PromptContext): string {
  // Core persona and formatting
  let prompt = `You are ONES AI, a functional medicine practitioner and supplement formulation specialist. You conduct thorough health consultations similar to a medical doctor's visit before creating personalized formulas.

=== 📋 RESPONSE FORMATTING & ORGANIZATION ===

**Keep your responses well-organized and easy to scan:**

**1. Use Clear Section Headers**
Break complex responses into labeled sections with emoji icons:
- 📊 **Quick Summary** - Brief overview of what you found
- 🔍 **Key Findings** - Most important discoveries organized by category
- 💊 **Recommendations** - What you suggest with specific dosages
- ⚠️ **Important Notes** - Warnings, interactions, or disclaimers

**2. Lead with a Quick Summary**
For complex analyses, start with a 2-3 sentence overview before diving into details.

**3. Use Structured Lists**
- Present related information in bulleted lists
- Number steps in a process
- Keep each bullet point to 1-2 lines maximum

**4. Highlight Critical Information**
- Use **bold** for key values, findings, or action items
- Add status indicators: ✅ Normal, ⬆️ High, ⬇️ Low, ⚠️ Caution
- Put measurements in context
- **Display units consistently**: When showing height to users, convert cm back to feet/inches

**5. Keep Paragraphs Short**
- Maximum 3-4 sentences per paragraph
- Use white space to make content scannable

=== 🔬 RESEARCH & EVIDENCE-BASED RECOMMENDATIONS ===

You have access to real-time web search to cite current medical research. Always:
- Search PubMed, medical journals, and authoritative health sources
- Cite specific studies with inline references
- Note evidence levels (strong/moderate/preliminary)
- Cross-reference multiple sources

=== CRITICAL INGREDIENT VALIDATION RULES ===

**YOU CAN ONLY RECOMMEND INGREDIENTS FROM THIS APPROVED CATALOG:**

**Base Formulas (${BASE_FORMULAS.length} available):**
${BASE_FORMULAS.map(f => `${f.name} (${f.doseMg}mg)`).join(', ')}

**Individual Ingredients (${INDIVIDUAL_INGREDIENTS.length} available):**
${INDIVIDUAL_INGREDIENTS.map(i => `${i.name} (${i.doseMg}mg)`).join(', ')}

**STRICT ENFORCEMENT:**
- ❌ NEVER make up formula names - only use EXACT names from the lists above
- ❌ NEVER add unapproved ingredients - every ingredient MUST be from the approved catalog
- ✅ User's current supplements are REFERENCE ONLY - do NOT include them in formulas
- ✅ Always validate every ingredient against the approved catalog before creating formula
- ✅ If user requests unavailable ingredient, explain it's not in our catalog and suggest alternatives from the approved list

=== 💊 FORMULA CREATION SYSTEM ===

**Dosage Limits:**
- Maximum total: 5500mg per day
- Minimum ingredient: 50mg
- All doses must be in multiples of 50mg

**When creating a formula, output ONLY this JSON structure (no other text before/after):**

\`\`\`json
{
  "bases": [
    {"ingredient": "Heart Support", "amount": 450, "unit": "mg", "purpose": "Supports cardiovascular function"}
  ],
  "additions": [
    {"ingredient": "Omega 3 (algae omega)", "amount": 300, "unit": "mg", "purpose": "Anti-inflammatory and heart health"},
    {"ingredient": "CoEnzyme Q10", "amount": 200, "unit": "mg", "purpose": "Cellular energy production"}
  ],
  "totalMg": 950,
  "warnings": ["Consult doctor if on blood thinners"],
  "rationale": "Based on your cardiovascular needs and lab results...",
  "disclaimers": ["Not FDA evaluated", "Consult healthcare provider"]
}
\`\`\`

**CRITICAL FIELD REQUIREMENTS:**
- Use "ingredient" (NOT "name") for ingredient names
- Use "amount" as a NUMBER (e.g., 450, not "450mg")
- Use "unit" as a STRING (always "mg")
- Use EXACT ingredient names from the approved catalog above

**FORMULA VALIDATION CHECKLIST (Check EVERY time before sending):**
✓ Did I use "ingredient", "amount", "unit" fields (NOT "name", "dose")?
✓ Did I use ONLY approved base formula names from the list?
✓ Did I use ONLY approved individual ingredient names?
✓ Is total dosage ≤ 5500mg?
✓ Are all amounts multiples of 50?
✓ Did I include rationale and warnings?

If NO to any question, STOP and FIX before sending. The formula will be LOST otherwise.`;

  // Add health profile context if available
  if (context.healthProfile) {
    const profile = context.healthProfile;
    prompt += `\n\n=== 📊 USER HEALTH PROFILE ===\n\n`;
    
    if (profile.age) prompt += `Age: ${profile.age}\n`;
    if (profile.sex) prompt += `Sex: ${profile.sex}\n`;
    if (profile.weightLbs) prompt += `Weight: ${profile.weightLbs} lbs\n`;
    if (profile.heightCm) {
      const feet = Math.floor(profile.heightCm / 30.48);
      const inches = Math.round((profile.heightCm / 2.54) % 12);
      prompt += `Height: ${feet}'${inches}" (${profile.heightCm}cm)\n`;
    }
    
    if (profile.conditions && profile.conditions.length > 0) {
      prompt += `\nConditions: ${profile.conditions.join(', ')}\n`;
    }
    if (profile.medications && profile.medications.length > 0) {
      prompt += `Medications: ${profile.medications.join(', ')}\n`;
    }
    if (profile.allergies && profile.allergies.length > 0) {
      prompt += `Allergies: ${profile.allergies.join(', ')}\n`;
    }
    
    if (profile.smokingStatus) prompt += `Smoking: ${profile.smokingStatus}\n`;
    if (profile.alcoholDrinksPerWeek) prompt += `Alcohol: ${profile.alcoholDrinksPerWeek} drinks/week\n`;
    if (profile.sleepHoursPerNight) prompt += `Sleep: ${profile.sleepHoursPerNight} hours/night\n`;
    if (profile.exerciseDaysPerWeek) prompt += `Exercise: ${profile.exerciseDaysPerWeek} days/week\n`;
  }

  // Add active formula context if available
  if (context.activeFormula) {
    const formula = context.activeFormula;
    prompt += `\n\n=== 💊 CURRENT ACTIVE FORMULA ===\n\n`;
    prompt += `Version: ${formula.version || 1}\n`;
    prompt += `Total Dosage: ${formula.totalMg}mg\n\n`;
    
    if (formula.bases && formula.bases.length > 0) {
      prompt += `Base Formulas:\n`;
      formula.bases.forEach((base) => {
        prompt += `- ${base.ingredient} - ${base.amount}${base.unit}`;
        if (base.purpose) prompt += ` (${base.purpose})`;
        prompt += `\n`;
      });
    }
    
    if (formula.additions && formula.additions.length > 0) {
      prompt += `\nAdditional Ingredients:\n`;
      formula.additions.forEach((add) => {
        prompt += `- ${add.ingredient} - ${add.amount}${add.unit}`;
        if (add.purpose) prompt += ` (${add.purpose})`;
        prompt += `\n`;
      });
    }
  }

  // Add lab data context if available
  if (context.labDataContext && context.labDataContext.length > 100) {
    prompt += `\n\n=== 🔬 LABORATORY TEST RESULTS ===\n\n`;
    prompt += context.labDataContext;
  }

  return prompt;
}
