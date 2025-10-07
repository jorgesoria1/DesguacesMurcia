#!/usr/bin/env node
/**
 * Stable server launcher - prevents crashes during searches
 */

process.env.NODE_ENV = 'production';
const port = parseInt(process.env.PORT || '5000', 10);

console.log('🚀 Starting stable server...');

// Add error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit, just log
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log
});

// Start the server with tsx
const { spawn } = require('child_process');

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port
  },
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.on('exit', (code, signal) => {
  console.log(`Server process exited with code ${code} and signal ${signal}`);
  if (code !== 0) {
    console.log('Restarting server in 5 seconds...');
    setTimeout(() => {
      console.log('Restarting server...');
      // Restart this script
      const newServer = spawn(process.argv[0], [process.argv[1]], {
        detached: true,
        stdio: 'inherit'
      });
      newServer.unref();
      process.exit(0);
    }, 5000);
  }
});

console.log(`Server will be available on port ${port}`);