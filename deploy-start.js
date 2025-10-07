#!/usr/bin/env node
/**
 * Deployment Start Script
 * Simplified startup for Replit deployment without intermediate processes
 */

import { spawn } from 'child_process';

console.log('🚀 DEPLOYMENT: Starting production server directly');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.CLOUD_DEPLOYMENT = 'true';
process.env.PORT = process.env.PORT || '5000';

console.log('✅ Environment configured for deployment');
console.log('📍 Port:', process.env.PORT);

// Start production server directly with tsx
const server = spawn('npx', ['tsx', 'server/minimal-server.ts'], {
  env: process.env,
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  server.kill('SIGINT');
});
