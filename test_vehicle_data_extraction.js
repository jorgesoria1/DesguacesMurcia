// Script para ejecutar la corrección automática de datos de vehículos procesados
import { MetasyncOptimizedImportService } from './server/api/metasync-optimized-import-service.js';

async function testVehicleDataExtraction() {
  console.log('🔧 Ejecutando corrección automática de datos de vehículos procesados...\n');

  try {
    const importService = new MetasyncOptimizedImportService();
    
    // Ejecutar el método de corrección
    const updatedCount = await importService.updateProcessedVehicleData();
    
    console.log(`\n✅ Corrección completada. ${updatedCount} piezas actualizadas con datos de vehículo.`);
    
  } catch (error) {
    console.error('❌ Error ejecutando corrección:', error.message);
  }
  
  process.exit(0);
}

testVehicleDataExtraction();