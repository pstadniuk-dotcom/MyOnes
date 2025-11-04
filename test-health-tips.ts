// Quick test to verify AI-generated health tips work
import { generatePersonalizedReminderMessage, generatePersonalizedTip } from './server/healthTips';

async function testHealthTips() {
  console.log('🧪 Testing AI-Generated Health Tips System\n');
  console.log('=' .repeat(60));
  
  // Test 1: Formula with Magnesium and Omega-3
  console.log('\n📋 Test 1: User with Magnesium + Omega-3 Formula');
  console.log('-'.repeat(60));
  const formula1 = [
    { ingredient: 'Magnesium', amount: 400, unit: 'mg' },
    { ingredient: 'Omega-3', amount: 1000, unit: 'mg' },
    { ingredient: 'Vitamin D3', amount: 2000, unit: 'IU' }
  ];
  
  const morningTip1 = await generatePersonalizedTip(formula1, 'morning');
  console.log('🌅 Morning Tip:', morningTip1);
  
  const eveningTip1 = await generatePersonalizedTip(formula1, 'evening');
  console.log('🌙 Evening Tip:', eveningTip1);
  
  // Test 2: Formula with B-Complex and Iron
  console.log('\n\n📋 Test 2: User with B-Complex + Iron Formula');
  console.log('-'.repeat(60));
  const formula2 = [
    { ingredient: 'B-Complex', amount: 100, unit: 'mg' },
    { ingredient: 'Iron', amount: 18, unit: 'mg' },
    { ingredient: 'Vitamin C', amount: 500, unit: 'mg' }
  ];
  
  const morningTip2 = await generatePersonalizedTip(formula2, 'morning');
  console.log('🌅 Morning Tip:', morningTip2);
  
  const eveningTip2 = await generatePersonalizedTip(formula2, 'evening');
  console.log('🌙 Evening Tip:', eveningTip2);
  
  // Test 3: Complete reminder message (breakfast)
  console.log('\n\n📋 Test 3: Full Breakfast Reminder Message');
  console.log('-'.repeat(60));
  const breakfastMessage = await generatePersonalizedReminderMessage(
    3, // 3 capsules
    'breakfast',
    formula1
  );
  console.log('📱 SMS Message:');
  console.log(breakfastMessage);
  
  // Test 4: Complete reminder message (dinner)
  console.log('\n\n📋 Test 4: Full Dinner Reminder Message');
  console.log('-'.repeat(60));
  const dinnerMessage = await generatePersonalizedReminderMessage(
    3, // 3 capsules
    'dinner',
    formula2
  );
  console.log('📱 SMS Message:');
  console.log(dinnerMessage);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
}

testHealthTips().catch(console.error);
