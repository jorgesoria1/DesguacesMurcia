#!/usr/bin/env node

/**
 * Script para verificar el estado de las importaciones programadas
 */

import axios from 'axios';

async function checkScheduledImports() {
  try {
    console.log('🔍 Verificando estado de importaciones programadas...');
    
    // Verificar endpoint de importación
    const response = await axios.get('http://localhost:5000/api/import-history?limit=5');
    const imports = response.data;
    
    console.log(`📊 Últimas ${imports.length} importaciones:`);
    imports.forEach((imp, index) => {
      const date = new Date(imp.createdAt).toLocaleString();
      console.log(`  ${index + 1}. ID ${imp.id} - ${imp.type} - ${imp.status} - ${date}`);
      if (imp.status === 'in_progress') {
        console.log(`     ⏳ Progreso: ${imp.progress}% - ${imp.processingItem || 'Procesando...'}`);
      }
    });
    
    // Verificar importaciones programadas
    const scheduleResponse = await axios.get('http://localhost:5000/api/import/schedules');
    const schedules = scheduleResponse.data;
    
    console.log(`\n📅 Programaciones activas: ${schedules.length}`);
    schedules.forEach((schedule, index) => {
      const nextRun = new Date(schedule.nextRun).toLocaleString();
      console.log(`  ${index + 1}. ID ${schedule.id} - ${schedule.type} (${schedule.frequency}) - Próxima: ${nextRun} - Activa: ${schedule.active}`);
    });
    
    // Verificar estado de sincronización
    const syncResponse = await axios.get('http://localhost:5000/api/metasync-optimized/sync-status');
    const syncData = syncResponse.data;
    
    console.log(`\n📊 Estado de sincronización:`);
    console.log(`  - Vehículos: ${syncData.dbCounts.vehicles} (${syncData.additionalInfo.vehiclesActive} activos)`);
    console.log(`  - Piezas: ${syncData.dbCounts.parts} (${syncData.additionalInfo.activeParts} activas)`);
    
    return {
      recentImports: imports.length,
      activeSchedules: schedules.filter(s => s.active).length,
      totalVehicles: syncData.dbCounts.vehicles,
      totalParts: syncData.dbCounts.parts
    };
    
  } catch (error) {
    console.error('❌ Error verificando importaciones:', error.message);
    return null;
  }
}

checkScheduledImports()
  .then((result) => {
    if (result) {
      console.log('\n✅ Verificación completada');
      console.log(`📈 Resumen: ${result.recentImports} importaciones recientes, ${result.activeSchedules} programaciones activas`);
    }
  })
  .catch(console.error);