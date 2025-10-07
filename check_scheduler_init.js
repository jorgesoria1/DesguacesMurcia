// Script para verificar si el scheduler se inicializó correctamente

import { storage } from './server/storage.js';

async function checkSchedulerInit() {
  console.log('🔍 Verificando inicialización del scheduler...');
  
  try {
    // Verificar si hay un scheduler global
    const hasGlobalScheduler = typeof global.importScheduler !== 'undefined';
    console.log(`Global scheduler disponible: ${hasGlobalScheduler}`);
    
    // Verificar programaciones en base de datos
    const schedules = await storage.getImportSchedules();
    console.log(`Programaciones encontradas: ${schedules.length}`);
    
    schedules.forEach(schedule => {
      const nextRun = new Date(schedule.nextRun);
      const now = new Date();
      const hoursUntil = Math.round((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10;
      
      console.log(`\n📋 Programación ID ${schedule.id}:`);
      console.log(`  Tipo: ${schedule.type} (${schedule.isFullImport ? 'Completa' : 'Incremental'})`);
      console.log(`  Activa: ${schedule.active}`);
      console.log(`  Próxima ejecución: ${nextRun.toLocaleString()}`);
      console.log(`  Tiempo restante: ${hoursUntil} horas`);
      console.log(`  Última ejecución: ${schedule.lastRun || 'Nunca'}`);
    });
    
    // Verificar proceso del servidor
    console.log('\n🔧 Información del proceso:');
    console.log(`  Tiempo activo: ${Math.round(process.uptime())} segundos`);
    console.log(`  Hora actual: ${new Date().toLocaleString()}`);
    
    return {
      hasGlobalScheduler,
      schedulesCount: schedules.length,
      uptime: process.uptime()
    };
    
  } catch (error) {
    console.error('❌ Error verificando scheduler:', error);
    throw error;
  }
}

// Ejecutar
checkSchedulerInit()
  .then((result) => {
    console.log('\n✅ Verificación completada:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });