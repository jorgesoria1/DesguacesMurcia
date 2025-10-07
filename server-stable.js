#!/usr/bin/env node
/**
 * Ultra-stable server configuration to prevent crashes during search operations
 */

const { spawn } = require('child_process');
const path = require('path');

// Kill any existing processes first
try {
  require('child_process').execSync('pkill -f "tsx.*server" || true', { stdio: 'ignore' });
  require('child_process').execSync('pkill -f "node.*server" || true', { stdio: 'ignore' });
} catch (e) {
  // Ignore errors from pkill
}

console.log('🚀 Starting ultra-stable server...');

// Environment setup
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';

// Global error handlers to prevent any crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Global uncaught exception (server continuing):', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Global unhandled rejection (server continuing):', reason);
});

// Start the server with maximum stability
function startServer(retryCount = 0) {
  console.log(`📡 Starting server attempt ${retryCount + 1}...`);
  
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    env: process.env,
    stdio: 'pipe',
    detached: false
  });

  // Handle stdout
  server.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  // Handle stderr
  server.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ Server process error:', error.message);
  });

  // Handle server exit
  server.on('exit', (code, signal) => {
    console.log(`⚠️ Server exited with code ${code} and signal ${signal}`);
    
    // Only restart if it's an unexpected exit
    if (code !== 0 && code !== null && retryCount < 3) {
      console.log('🔄 Restarting server in 3 seconds...');
      setTimeout(() => {
        startServer(retryCount + 1);
      }, 3000);
    } else if (retryCount >= 3) {
      console.log('❌ Maximum restart attempts reached. Server stopped.');
      process.exit(1);
    }
  });

  return server;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();