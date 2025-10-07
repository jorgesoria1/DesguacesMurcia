#!/usr/bin/env node

// Completely stable server without any problematic background services
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';
process.env.DISABLE_BACKGROUND_SERVICES = 'true';

console.log('🚀 Starting completely stable server...');

import { spawn } from 'child_process';

// Start the server directly with TSX
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '5000',
    DISABLE_BACKGROUND_SERVICES: 'true'
  },
  stdio: 'inherit'
});

let restartCount = 0;
const maxRestarts = 3;

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  
  if (code !== 0 && restartCount < maxRestarts) {
    restartCount++;
    console.log(`Restart attempt ${restartCount}/${maxRestarts} in 2 seconds...`);
    
    setTimeout(() => {
      const newProcess = spawn('npx', ['tsx', 'server/index.ts'], {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '5000',
          DISABLE_BACKGROUND_SERVICES: 'true'
        },
        stdio: 'inherit'
      });
      
      newProcess.on('exit', serverProcess.listeners('exit')[0]);
    }, 2000);
  } else {
    console.log('Server stopped or max restarts reached');
    process.exit(code);
  }
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
});