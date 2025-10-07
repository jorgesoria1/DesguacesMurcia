/**
 * Script para verificar el estado del scheduler de importaciones
 */

const checkSchedulerStatus = () => {
  console.log('=== DIAGNÓSTICO DEL SCHEDULER DE IMPORTACIONES ===\n');
  
  // 1. Verificar fecha/hora actual
  const now = new Date();
  console.log(`🕐 Fecha/Hora actual: ${now.toISOString()}`);
  console.log(`🕐 Fecha/Hora local: ${now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n`);
  
  // 2. Verificar variables de entorno
  console.log('🔧 Variables de entorno relevantes:');
  console.log(`   DISABLE_BACKGROUND_SERVICES: ${process.env.DISABLE_BACKGROUND_SERVICES || 'no definida'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'no definida'}\n`);
  
  // 3. Verificar si el scheduler está en el objeto global
  console.log('🤖 Estado del scheduler:');
  const scheduler = global.importScheduler;
  if (scheduler) {
    console.log(`   ✅ Scheduler encontrado en global`);
    console.log(`   ✅ Inicializado: ${scheduler.initialized || 'false'}`);
  } else {
    console.log(`   ❌ Scheduler NO encontrado en global`);
  }
  
  console.log('\n=== FIN DEL DIAGNÓSTICO ===');
};

// Ejecutar diagnóstico después de que el servidor haya iniciado
setTimeout(checkSchedulerStatus, 45000); // 45 segundos después del inicio

console.log('📋 Script de diagnóstico del scheduler cargado. Se ejecutará en 45 segundos...');