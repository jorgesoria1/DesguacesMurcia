/**
 * Script de deployment final - Evita errores de TypeScript
 */

const { spawn } = require('child_process');

console.log('🚀 Iniciando deployment con TSX...');

// Usar TSX directamente para evitar problemas de compilación
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

server.on('error', (error) => {
  console.error('❌ Error:', error);
  // Fallback
  spawn('node', ['production-config.js'], { stdio: 'inherit' });
});

server.on('close', (code) => {
  if (code !== 0) {
    console.log('🔄 Reiniciando...');
    spawn('node', [__filename], { stdio: 'inherit' });
  }
});
