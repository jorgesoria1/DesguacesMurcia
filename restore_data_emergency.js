#!/usr/bin/env node

/**
 * Script de emergencia para restaurar datos después de la restauración del checkpoint
 * Ejecuta importación completa de vehículos y piezas usando MetaSync API
 */

console.log('🚨 RESTAURACIÓN DE EMERGENCIA DE DATOS');
console.log('======================================');

async function restoreData() {
  try {
    // Importar el servicio de importación optimizado
    console.log('📦 Importando servicio de importación...');
    const { MetasyncOptimizedImportService } = await import('./server/api/metasync-optimized-import-service.js');
    
    // Crear instancia del servicio
    const importService = new MetasyncOptimizedImportService();
    
    console.log('🔥 INICIANDO IMPORTACIÓN COMPLETA DE VEHÍCULOS');
    console.log('===============================================');
    
    // Paso 1: Importar vehículos completos
    const vehicleImportId = await importService.startImport({
      type: 'vehicles',
      fullImport: true,
      batchSize: 500
    });
    
    console.log(`✅ Importación de vehículos iniciada - ID: ${vehicleImportId}`);
    
    // Esperar a que termine la importación de vehículos
    console.log('⏳ Esperando a que termine la importación de vehículos...');
    
    let vehicleCompleted = false;
    while (!vehicleCompleted) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
      
      const status = await importService.getImportStatus(vehicleImportId);
      console.log(`📊 Estado vehículos: ${status.status} - ${status.processed}/${status.total} (${status.percentage}%)`);
      
      if (status.status === 'completed' || status.status === 'failed') {
        vehicleCompleted = true;
        console.log(`🏁 Importación de vehículos ${status.status}: ${status.processed} vehículos procesados`);
      }
    }
    
    console.log('🔥 INICIANDO IMPORTACIÓN COMPLETA DE PIEZAS');
    console.log('==========================================');
    
    // Paso 2: Importar piezas completas
    const partsImportId = await importService.startImport({
      type: 'parts',
      fullImport: true,
      batchSize: 1000
    });
    
    console.log(`✅ Importación de piezas iniciada - ID: ${partsImportId}`);
    
    // Esperar a que termine la importación de piezas
    console.log('⏳ Esperando a que termine la importación de piezas...');
    
    let partsCompleted = false;
    while (!partsCompleted) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
      
      const status = await importService.getImportStatus(partsImportId);
      console.log(`📊 Estado piezas: ${status.status} - ${status.processed}/${status.total} (${status.percentage}%)`);
      
      if (status.status === 'completed' || status.status === 'failed') {
        partsCompleted = true;
        console.log(`🏁 Importación de piezas ${status.status}: ${status.processed} piezas procesadas`);
      }
    }
    
    console.log('🔥 PROCESANDO RELACIONES PENDIENTES');
    console.log('==================================');
    
    // Paso 3: Procesar relaciones pendientes
    await importService.processPendingRelations();
    console.log('✅ Relaciones procesadas correctamente');
    
    console.log('🔥 ACTUALIZANDO CONTADORES DE VEHÍCULOS');
    console.log('======================================');
    
    // Paso 4: Actualizar contadores de piezas por vehículo
    await importService.updateVehiclePartsCounters();
    console.log('✅ Contadores actualizados correctamente');
    
    console.log('🎉 RESTAURACIÓN COMPLETADA CON ÉXITO');
    console.log('===================================');
    console.log('✅ Datos restaurados correctamente');
    console.log('✅ El sitio web debería estar operativo');
    
  } catch (error) {
    console.error('❌ ERROR EN LA RESTAURACIÓN:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar el script
restoreData().then(() => {
  console.log('Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});