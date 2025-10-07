#!/usr/bin/env node
/**
 * Production start script
 * Optimized for deployment environments
 * Uses tsx to run TypeScript files directly in production
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Set production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Starting production server...');
console.log('📝 Environment: PRODUCTION');

// Ensure dist directory exists
const distDir = './dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build frontend assets if they don't exist
const publicDir = './dist/public';
if (!fs.existsSync(publicDir)) {
  console.log('📦 Building frontend assets...');
  try {
    execSync('vite build --outDir dist/public', { stdio: 'inherit' });
    console.log('✅ Frontend assets built successfully');
  } catch (error) {
    console.error('❌ Frontend build failed:', error.message);
    console.log('⚠️ Continuing with server startup...');
  }
} else {
  console.log('✅ Frontend assets already exist');
}

// Start the server using tsx
console.log('🔄 Starting TypeScript server...');
try {
  execSync('tsx server/index.ts', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Production server startup failed:', error.message);
  process.exit(1);
}