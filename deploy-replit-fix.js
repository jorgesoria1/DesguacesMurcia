#!/usr/bin/env node
/**
 * FIX ESPECÍFICO PARA DEPLOY DE REPLIT
 * Soluciona el error "Error de conexión al intentar iniciar sesión"
 */

console.log('🔧 APLICANDO FIX PARA DEPLOY DE REPLIT...');

// Configurar variables de entorno para deploy
process.env.NODE_ENV = 'production';
process.env.REPLIT_DEPLOY = 'true';

console.log('📋 Variables configuradas para deploy:', {
  NODE_ENV: process.env.NODE_ENV,
  REPLIT_DEPLOY: process.env.REPLIT_DEPLOY,
  SESSION_SECRET: process.env.SESSION_SECRET ? 'CONFIGURADA' : 'NO CONFIGURADA',
  DATABASE_URL: process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA'
});

// Iniciar servidor con configuración específica para Replit
import('./replit-deploy-config.js')
  .then(() => {
    console.log('✅ Servidor de deploy de Replit iniciado exitosamente');
  })
  .catch((error) => {
    console.error('❌ Error al iniciar servidor de deploy:', error);
    console.log('🔄 Intentando con configuración alternativa...');
    
    // Fallback a configuración mínima
    import('./production-config.js')
      .then(() => {
        console.log('✅ Servidor iniciado con configuración alternativa');
      })
      .catch((fallbackError) => {
        console.error('❌ Error en configuración alternativa:', fallbackError);
        process.exit(1);
      });
  });