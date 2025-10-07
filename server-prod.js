#!/usr/bin/env node
/**
 * Production server launcher
 * No development commands or references
 */

process.env.NODE_ENV = 'production';

import { execSync } from 'child_process';

console.log('Production server starting...');

try {
  execSync('tsx server/index.ts', { 
    stdio: 'inherit', 
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('Server failed:', error.message);
  process.exit(1);
}