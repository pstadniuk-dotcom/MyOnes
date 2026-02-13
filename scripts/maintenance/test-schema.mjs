import { insertHealthProfileSchema } from '../../shared/schema.js';

// Test with typical data from the client
const testData = {
  age: 35,
  sex: null,  // Client sends null when not selected
  weightLbs: null,
  heightCm: null,
  bloodPressureSystolic: null,
  bloodPressureDiastolic: null,
  restingHeartRate: null,
  sleepHoursPerNight: null,
  exerciseDaysPerWeek: null,
  stressLevel: null,
  smokingStatus: null,
  alcoholDrinksPerWeek: null,
  conditions: [],
  medications: [],
  allergies: [],
};

console.log('Testing insertHealthProfileSchema...');
const withUserId = { ...testData, userId: 'test-user-id' };
const result = insertHealthProfileSchema.safeParse(withUserId);

if (result.success) {
  console.log('✅ Schema validation passed!');
  console.log('Parsed data:', result.data);
} else {
  console.log('❌ Schema validation failed!');
  console.log('Errors:', JSON.stringify(result.error.errors, null, 2));
}

// Also test without userId (like the route does)
console.log('\nTesting without userId (as route does with omit)...');
const schemaWithoutUserId = insertHealthProfileSchema.omit({ userId: true });
const result2 = schemaWithoutUserId.safeParse(testData);

if (result2.success) {
  console.log('✅ Schema validation passed!');
  console.log('Parsed data:', result2.data);
} else {
  console.log('❌ Schema validation failed!');
  console.log('Errors:', JSON.stringify(result2.error.errors, null, 2));
}
