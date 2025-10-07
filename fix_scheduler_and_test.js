/**
 * Script para reinicializar el scheduler y ejecutar una importación de prueba
 */

async function fixSchedulerAndTest() {
  try {
    console.log('🔧 Iniciando reparación del scheduler...\n');
    
    // 1. Importar el scheduler
    const { simpleScheduler } = await import('./server/services/simple-scheduler.js');
    
    console.log('📋 Estado actual del scheduler:');
    console.log(`   - Inicializado: ${simpleScheduler.initialized}`);
    
    // 2. Forzar reinicialización
    console.log('\n🔄 Reinicializando scheduler...');
    await simpleScheduler.forceReinitialize();
    
    // 3. Asignar al objeto global para persistencia
    global.importScheduler = simpleScheduler;
    console.log('✅ Scheduler asignado al objeto global');
    
    // 4. Ejecutar importación de prueba inmediata
    console.log('\n🚀 Ejecutando importación de prueba...');
    console.log('Tipo: vehicles (más rápida para prueba)');
    
    await simpleScheduler.executeImmediate('vehicles');
    
    console.log('\n✅ Prueba completada exitosamente');
    console.log('📅 El scheduler ahora está funcionando y programado');
    
  } catch (error) {
    console.error('\n❌ Error durante la reparación:', error);
    console.error('Detalles:', error.message);
  }
}

// Ejecutar después de que el servidor esté completamente iniciado
setTimeout(fixSchedulerAndTest, 50000); // 50 segundos

console.log('🔧 Script de reparación del scheduler cargado. Se ejecutará en 50 segundos...');