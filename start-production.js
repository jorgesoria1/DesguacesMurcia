#!/usr/bin/env node
/**
 * Servidor de producción simplificado para Replit
 * Arranca la aplicación correctamente con compatibilidad de deploy
 */

process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || 5000;

console.log('🚀 Iniciando Desguaces Murcia...');

// Usar tsx para ejecutar TypeScript directamente
const { spawn } = require('child_process');

const server = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: { 
    ...process.env, 
    NODE_ENV: 'production',
    PORT: process.env.PORT || 5000
  }
});

server.on('error', (error) => {
  console.error('❌ Error iniciando servidor:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Servidor terminado con código: ${code}`);
  process.exit(code);
});

// Manejar señales para cierre limpio
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Cerrando servidor...');
  server.kill('SIGTERM');
});