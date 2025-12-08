#!/usr/bin/env node

/**
 * Test Railway deployment health
 * Usage: node test-deployment.mjs <railway-url>
 */

const RAILWAY_URL = process.argv[2];

if (!RAILWAY_URL) {
  console.error('❌ Usage: node test-deployment.mjs <railway-url>');
  console.error('   Example: node test-deployment.mjs https://myones-production.up.railway.app');
  process.exit(1);
}

console.log(`\n🔍 Testing Railway deployment: ${RAILWAY_URL}\n`);

const tests = [
  {
    name: 'Health check',
    path: '/',
    test: (status) => status === 200,
  },
  {
    name: 'API endpoint',
    path: '/api/health',
    test: (status) => status === 200 || status === 404, // 404 is ok if endpoint doesn't exist
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const url = `${RAILWAY_URL.replace(/\/$/, '')}${test.path}`;
    console.log(`Testing: ${test.name} (${url})`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (test.test(response.status)) {
      console.log(`✅ ${test.name}: OK (${response.status})`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED (${response.status})`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    failed++;
  }
  console.log('');
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 Railway deployment is working!\n');
  console.log('Next steps:');
  console.log('1. Deploy frontend to Vercel');
  console.log('2. Set VITE_API_BASE=' + RAILWAY_URL + ' in Vercel');
  console.log('3. Test end-to-end functionality\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Check the Railway logs for errors.\n');
  process.exit(1);
}
