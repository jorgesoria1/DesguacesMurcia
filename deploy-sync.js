#!/usr/bin/env node
/**
 * Deployment Sync Script
 * Copies built files from dist/public to server/public for deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔄 Starting deployment file sync...');

const distPublic = path.resolve(process.cwd(), 'dist', 'public');
const serverPublic = path.resolve(process.cwd(), 'server', 'public');

// Check if dist/public exists
if (!fs.existsSync(distPublic)) {
  console.error('❌ dist/public does not exist. Build may have failed.');
  process.exit(1);
}

// Create server/public if it doesn't exist
if (!fs.existsSync(serverPublic)) {
  console.log('📁 Creating server/public directory...');
  fs.mkdirSync(serverPublic, { recursive: true });
}

// Sync files using rsync or cp
try {
  console.log('📋 Copying files from dist/public to server/public...');
  execSync(`cp -r ${distPublic}/* ${serverPublic}/`, { stdio: 'inherit' });
  console.log('✅ Deployment sync completed successfully');
} catch (error) {
  console.error('❌ Error during file sync:', error.message);
  process.exit(1);
}
