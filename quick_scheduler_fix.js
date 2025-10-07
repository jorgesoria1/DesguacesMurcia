/**
 * Script rápido para inicializar el scheduler
 */

async function quickSchedulerFix() {
  try {
    console.log('🔧 Iniciando reparación rápida del scheduler...');
    
    // Esperar un poco para que el servidor termine de iniciarse
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Importar el scheduler usando CommonJS
    let simpleScheduler;
    try {
      const schedulerModule = require('./server/services/simple-scheduler.ts');
      simpleScheduler = schedulerModule.simpleScheduler;
    } catch (err) {
      console.log('Método directo no funciona, usando alternativo...');
      
      // Método alternativo - usar el sistema global si existe
      if (global.importScheduler) {
        simpleScheduler = global.importScheduler;
        console.log('✅ Scheduler encontrado en global');
      } else {
        console.log('❌ No se pudo acceder al scheduler directamente');
        return;
      }
    }
    
    if (simpleScheduler) {
      console.log('🔄 Forzando inicialización...');
      
      // Si no está inicializado, inicializarlo
      if (!simpleScheduler.initialized) {
        await simpleScheduler.initialize();
        console.log('✅ Scheduler inicializado');
      } else {
        console.log('✅ Scheduler ya estaba inicializado');
      }
      
      // Asignar al global
      global.importScheduler = simpleScheduler;
      console.log('✅ Scheduler asignado al objeto global');
      
      console.log('🎯 El scheduler está listo para la ejecución programada');
    }
    
  } catch (error) {
    console.error('❌ Error en reparación rápida:', error.message);
  }
}

// Ejecutar inmediatamente cuando el servidor termine de cargar
setTimeout(quickSchedulerFix, 45000); // 45 segundos después del inicio

console.log('⚡ Script de reparación rápida cargado. Se ejecutará en 45 segundos...');