#!/usr/bin/env node

// Simple production server starter
process.env.NODE_ENV = 'production';

console.log('Starting production server...');

// Import and run the server
import('./server/index.js').catch(() => {
  // Fallback to TypeScript if JS doesn't exist
  import('tsx').then(tsx => {
    const { execSync } = require('child_process');
    execSync('tsx server/index.ts', { stdio: 'inherit' });
  });
});