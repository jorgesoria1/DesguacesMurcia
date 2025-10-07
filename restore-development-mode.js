#!/usr/bin/env node
/**
 * Restaurar modo desarrollo
 * Este script simula el modo desarrollo original usando npm run dev
 */

console.log('🔧 Restaurando modo desarrollo...');

// Configurar variables de entorno para desarrollo
process.env.NODE_ENV = 'development';
delete process.env.REPLIT_DEPLOYMENT;

console.log('🌟 Modo desarrollo activado:');
console.log('   - NODE_ENV:', process.env.NODE_ENV);
console.log('   - REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT || 'undefined');

// Importar y ejecutar desarrollo
try {
  console.log('🚀 Iniciando servidor de desarrollo...');
  await import('./development-config.js');
} catch (error) {
  console.error('❌ Error al iniciar desarrollo:', error);
  process.exit(1);
}