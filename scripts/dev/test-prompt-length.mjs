import { buildNutritionPlanPrompt } from './server/optimize-prompts.ts';

// Mock context
const mockContext = {
  user: {
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com'
  },
  healthProfile: {
    age: 35,
    sex: 'male',
    heightCm: 180,
    weightLbs: 180,
    exerciseDaysPerWeek: 4,
    medications: ['Vitamin D', 'Fish Oil']
  },
  activeFormula: {
    bases: [
      { ingredient: 'Adrenal Support', amount: 420, unit: 'mg' },
      { ingredient: 'Immune Support', amount: 350, unit: 'mg' }
    ],
    additions: [
      { ingredient: 'Ashwagandha', amount: 600, unit: 'mg' },
      { ingredient: 'Magnesium', amount: 400, unit: 'mg' }
    ]
  },
  labData: {
    summary: 'Cholesterol slightly elevated. Vitamin D low.',
    reports: []
  },
  preferences: {
    dietaryRestrictions: ['No dairy', 'Gluten-free'],
    goals: 'Build muscle and improve energy levels'
  }
};

const prompt = buildNutritionPlanPrompt(mockContext);

console.log('\n📏 PROMPT ANALYSIS');
console.log('==================');
console.log(`Total characters: ${prompt.length}`);
console.log(`Estimated tokens: ~${Math.ceil(prompt.length / 4)}`);
console.log(`Lines: ${prompt.split('\n').length}`);
console.log('\n📊 TOKEN BREAKDOWN (rough estimates):');
console.log(`  Input (prompt): ~${Math.ceil(prompt.length / 4)} tokens`);
console.log(`  Output needed for 7 days × 5 meals × ~100 tokens/meal: ~3,500 tokens`);
console.log(`  Total needed: ~${Math.ceil(prompt.length / 4) + 3500} tokens`);
console.log(`\n✅ Should fit in 12,000 token limit? ${Math.ceil(prompt.length / 4) + 3500 < 12000 ? 'YES' : 'NO'}`);

console.log('\n📄 PROMPT PREVIEW (first 1000 chars):');
console.log(prompt.substring(0, 1000));
console.log('\n...\n');
console.log('📄 PROMPT END (last 500 chars):');
console.log(prompt.substring(prompt.length - 500));
