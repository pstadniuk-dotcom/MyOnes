#!/usr/bin/env node

/**
 * ONES AI - Deployment Readiness Checker
 * Validates that all required configuration is in place before deployment
 */

import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';

config({ path: './server/.env' });

console.log('\n🔍 ONES AI - Deployment Readiness Check\n');
console.log('=' .repeat(50) + '\n');

let errors = 0;
let warnings = 0;

// Helper functions
const checkEnvVar = (name, required = true, sensitive = false) => {
  const value = process.env[name];
  const status = value ? '✅' : (required ? '❌' : '⚠️ ');
  const display = value ? (sensitive ? '***' + value.slice(-4) : value.slice(0, 30) + '...') : 'NOT SET';
  
  if (!value && required) errors++;
  if (!value && !required) warnings++;
  
  console.log(`  ${status} ${name.padEnd(30)} ${display}`);
  return !!value;
};

const checkFile = (path, name) => {
  const exists = existsSync(path);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${name.padEnd(30)} ${path}`);
  if (!exists) errors++;
  return exists;
};

// 1. Environment Variables Check
console.log('📋 Environment Variables:\n');

console.log('  Database:');
checkEnvVar('DATABASE_URL', true, true);

console.log('\n  Authentication:');
checkEnvVar('JWT_SECRET', true, true);
checkEnvVar('SESSION_SECRET', true, true);

console.log('\n  AI Services:');
const hasOpenAI = checkEnvVar('OPENAI_API_KEY', false, true);
const hasAnthropic = checkEnvVar('ANTHROPIC_API_KEY', false, true);
if (!hasOpenAI && !hasAnthropic) {
  console.log('  ⚠️  Warning: No AI provider configured!');
  warnings++;
}

console.log('\n  Email Service:');
checkEnvVar('SENDGRID_API_KEY', false, true);

console.log('\n  SMS Service:');
checkEnvVar('TWILIO_ACCOUNT_SID', false, true);
checkEnvVar('TWILIO_AUTH_TOKEN', false, true);
checkEnvVar('TWILIO_FROM', false);

console.log('\n  Wearables OAuth:');
checkEnvVar('OURA_CLIENT_ID', false);
checkEnvVar('OURA_CLIENT_SECRET', false, true);
checkEnvVar('FITBIT_CLIENT_ID', false);
checkEnvVar('FITBIT_CLIENT_SECRET', false, true);

console.log('\n  Payment:');
checkEnvVar('STRIPE_SECRET_KEY', false, true);
checkEnvVar('STRIPE_WEBHOOK_SECRET', false, true);

// 2. File Structure Check
console.log('\n\n📁 Required Files:\n');

checkFile('./server/index.ts', 'Server entry point');
checkFile('./client/index.html', 'Client entry point');
checkFile('./shared/schema.ts', 'Database schema');
checkFile('./shared/ingredients.ts', 'Ingredient catalog');
checkFile('./package.json', 'Package manifest');
checkFile('./vercel.json', 'Vercel config');
checkFile('./drizzle.config.ts', 'Drizzle config');

// 3. Package.json Check
console.log('\n\n📦 Package Configuration:\n');

try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  
  const requiredScripts = ['dev', 'build', 'start', 'db:push'];
  requiredScripts.forEach(script => {
    const exists = !!pkg.scripts?.[script];
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} Script: ${script}`);
    if (!exists) errors++;
  });
  
  console.log('\n  Required Dependencies:');
  const requiredDeps = [
    'express',
    'react',
    'drizzle-orm',
    'pg',
    'openai',
    'zod'
  ];
  
  requiredDeps.forEach(dep => {
    const exists = !!pkg.dependencies?.[dep];
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${dep}`);
    if (!exists) errors++;
  });
  
} catch (error) {
  console.log('  ❌ Failed to parse package.json');
  errors++;
}

// 4. Database Connection Test
console.log('\n\n🗄️  Database Connection:\n');

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`  ✅ Database URL is valid`);
    console.log(`     Host: ${url.hostname}`);
    console.log(`     Database: ${url.pathname.slice(1)}`);
    console.log(`     SSL: ${url.searchParams.get('sslmode') || 'not specified'}`);
  } catch (error) {
    console.log(`  ❌ Invalid DATABASE_URL format`);
    errors++;
  }
} else {
  console.log(`  ❌ DATABASE_URL not set`);
  errors++;
}

// 5. Build Readiness
console.log('\n\n🏗️  Build Configuration:\n');

try {
  const vercelConfig = JSON.parse(readFileSync('./vercel.json', 'utf-8'));
  console.log(`  ✅ Vercel config valid`);
  console.log(`     Build: ${vercelConfig.buildCommand || 'default'}`);
  console.log(`     Output: ${vercelConfig.outputDirectory || 'default'}`);
} catch (error) {
  console.log(`  ⚠️  vercel.json may have issues`);
  warnings++;
}

// 6. Security Check
console.log('\n\n🔒 Security Check:\n');

const securityChecks = [
  {
    name: 'JWT_SECRET strength',
    check: () => (process.env.JWT_SECRET?.length || 0) >= 32,
    message: 'JWT_SECRET should be at least 32 characters'
  },
  {
    name: 'Database SSL enabled',
    check: () => process.env.DATABASE_URL?.includes('sslmode=require'),
    message: 'DATABASE_URL should include sslmode=require'
  },
  {
    name: '.env not in git',
    check: () => {
      try {
        const gitignore = readFileSync('./.gitignore', 'utf-8');
        return gitignore.includes('.env');
      } catch {
        return false;
      }
    },
    message: '.env should be in .gitignore'
  }
];

securityChecks.forEach(({ name, check, message }) => {
  const passed = check();
  const status = passed ? '✅' : '⚠️ ';
  console.log(`  ${status} ${name}`);
  if (!passed) {
    console.log(`     ${message}`);
    warnings++;
  }
});

// Final Summary
console.log('\n\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');

if (errors === 0 && warnings === 0) {
  console.log('  🎉 All checks passed! Ready to deploy.\n');
  console.log('  Next steps:');
  console.log('    1. Create Supabase project (if not done)');
  console.log('    2. Push schema: npm run db:push');
  console.log('    3. Deploy to Railway');
  console.log('    4. Deploy to Vercel');
  console.log('    5. Test end-to-end\n');
} else {
  if (errors > 0) {
    console.log(`  ❌ ${errors} critical error(s) found`);
  }
  if (warnings > 0) {
    console.log(`  ⚠️  ${warnings} warning(s) found`);
  }
  console.log('\n  Please fix the issues above before deploying.\n');
}

process.exit(errors > 0 ? 1 : 0);
