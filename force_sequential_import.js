import { MetasyncOptimizedImportService } from './server/api/metasync-optimized-import-service.js';

async function forceSequentialImport() {
  console.log('🔄 Iniciando importación secuencial forzada...');
  
  try {
    const importService = new MetasyncOptimizedImportService();
    
    console.log('📋 Paso 1: Iniciando importación de vehículos...');
    const vehicleImportId = await importService.startImport('vehicles', undefined, false);
    console.log(`✅ Importación de vehículos iniciada con ID: ${vehicleImportId}`);
    
    // Esperar unos segundos para que se inicie
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📋 Paso 2: Iniciando importación de piezas...');
    const partsImportId = await importService.startImport('parts', undefined, false);
    console.log(`✅ Importación de piezas iniciada con ID: ${partsImportId}`);
    
    console.log('🎯 Importación secuencial iniciada correctamente');
    console.log(`   - Vehículos: ID ${vehicleImportId}`);
    console.log(`   - Piezas: ID ${partsImportId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

forceSequentialImport();