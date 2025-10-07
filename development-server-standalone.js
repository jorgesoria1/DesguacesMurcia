#!/usr/bin/env node
/**
 * Servidor de desarrollo standalone
 * Este servidor fuerza el modo desarrollo sin modificar .replit
 */

// Forzar modo desarrollo
process.env.NODE_ENV = 'development';
delete process.env.REPLIT_DEPLOYMENT;
delete process.env.REPL_DEPLOYMENT;

console.log('🚀 INICIANDO SERVIDOR DE DESARROLLO');
console.log('📍 Entorno forzado a desarrollo');
console.log('   - NODE_ENV:', process.env.NODE_ENV);
console.log('   - Hot reload: ACTIVADO');
console.log('   - Build: EN VIVO (no pre-compilado)');
console.log('');

console.log('🔄 Las referencias del carrito aparecerán inmediatamente');
console.log('✨ Los cambios se reflejarán al instante');
console.log('');

// Importar configuración de desarrollo
try {
  await import('./development-config.js');
} catch (error) {
  console.error('❌ Error al iniciar servidor de desarrollo:', error);
  process.exit(1);
}