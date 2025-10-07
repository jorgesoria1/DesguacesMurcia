#!/usr/bin/env node
/**
 * Servidor estable sin servicios en segundo plano problemáticos
 */

process.env.NODE_ENV = 'production';
const port = parseInt(process.env.PORT || '5000', 10);

console.log('🚀 Starting stable server...');
console.log(`Port: ${port}`);

import { spawn } from 'child_process';

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,
    DISABLE_BACKGROUND_SERVICES: 'true'
  },
  stdio: 'inherit'
});

serverProcess.on('error', (error) => {
  console.error('❌ Server error:', error);
});

serverProcess.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  if (code !== 0) {
    console.log('Restarting in 3 seconds...');
    setTimeout(() => {
      console.log('🔄 Restarting server...');
      // Reiniciar el proceso
      require('child_process').spawn(process.argv[0], [__filename], {
        stdio: 'inherit',
        detached: false
      });
    }, 3000);
  }
});

// Capturar señales de terminación
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  serverProcess.kill('SIGINT');
});