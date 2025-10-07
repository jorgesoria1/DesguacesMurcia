#!/usr/bin/env node
/**
 * Deployment fix script
 * Production-ready server without any development references
 */

// Production environment setup
process.env.NODE_ENV = 'production';

console.log('Production deployment starting...');

// Build frontend if needed
import { execSync } from 'child_process';

try {
  // Build frontend assets
  console.log('Building frontend assets...');
  execSync('vite build --outDir dist/public', { stdio: 'inherit' });
  
  // Start production server
  console.log('Starting production server...');
  execSync('NODE_ENV=production tsx server/index.ts', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('Production deployment failed:', error.message);
  process.exit(1);
}