#!/usr/bin/env node

/**
 * Production Starter - Directly runs the compiled production server
 * This file is specifically for Replit deployment where tsx should be available
 */

import { spawn } from 'child_process';

console.log('🚀 Starting Production Server');
console.log('📍 Environment: Production Mode');
console.log('🔧 Using tsx for TypeScript execution');

// Set production environment
process.env.NODE_ENV = 'production';

// Start the production server using tsx
const server = spawn('npx', ['tsx', 'server/minimal-server.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'production'
  },
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Failed to start production server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Production server exited with code ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.kill('SIGINT');
});

export default server;