#!/usr/bin/env node

// Minimal server for stable operation
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';
process.env.DISABLE_BACKGROUND_SERVICES = 'true';

console.log('🚀 Starting minimal stable server...');

import { spawn } from 'child_process';

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  env: process.env,
  stdio: 'inherit'
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  if (code !== 0) {
    console.log('Server crashed, exiting...');
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('Terminating server...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Terminating server...');
  serverProcess.kill('SIGINT');
});