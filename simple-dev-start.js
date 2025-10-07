#!/usr/bin/env node
/**
 * Simple development server starter
 * Directly executes tsx without complex process management
 */

import { spawn } from 'child_process';

console.log('🔧 Starting development server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || '5000');

// Set development environment
process.env.NODE_ENV = 'development';
const port = process.env.PORT || '5000';

// Start server directly
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: port
  },
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down');
  server.kill('SIGINT');
});