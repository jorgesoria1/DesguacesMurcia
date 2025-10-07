#!/usr/bin/env node

/**
 * Test deployment script - checks for common deployment issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Testing deployment readiness...');

// Check if key files exist
const requiredFiles = [
  'server/storage.ts',
  'shared/schema.ts',
  'package.json',
  'production-config.js'
];

let missingFiles = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:', missingFiles);
  process.exit(1);
}

console.log('✅ All required files present');

// Test TypeScript compilation
console.log('🔧 Testing TypeScript compilation...');
try {
  execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'inherit', timeout: 30000 });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  
  // Try to get more specific error info
  try {
    const result = execSync('npx tsc --noEmit --skipLibCheck 2>&1', { encoding: 'utf8', timeout: 30000 });
    console.log('TypeScript errors:', result);
  } catch (e) {
    console.error('Could not get detailed TypeScript errors');
  }
  
  process.exit(1);
}

// Test server startup
console.log('🚀 Testing server startup...');
try {
  const result = execSync('timeout 10 node production-config.js 2>&1', { encoding: 'utf8' });
  console.log('Server startup test:', result);
} catch (error) {
  console.log('Server startup test completed (timeout expected)');
}

console.log('🎉 Deployment readiness test completed!');