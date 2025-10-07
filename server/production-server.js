#!/usr/bin/env node
/**
 * Alternative production server entry point using tsx
 * This file can be used directly for production deployments
 */

import { spawn } from 'child_process';

console.log('🚀 Starting Production Server');
console.log('📍 Environment: Production Mode');
console.log('🔧 Using tsx for TypeScript execution');

// Ensure production environment
process.env.NODE_ENV = 'production';

// Start the server using tsx to handle TypeScript files
const server = spawn('npx', ['tsx', '--production', 'server/minimal-server.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'production'
  },
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Failed to start production server:', error);
  console.error('Error details:', error.message);
  process.exit(1);
});

server.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Production server shut down gracefully');
  } else {
    console.error(`❌ Production server exited with code ${code}`);
    process.exit(code);
  }
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  server.kill(signal);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('SIGTERM');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('SIGTERM');
});