const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');

async function testOptimizedImport() {
  console.log('Iniciando test de importación optimizada...');
  
  const service = new MetasyncOptimizedImportService();
  
  try {
    // Probar importación de vehículos
    console.log('Probando importación de vehículos...');
    const vehicleImportId = await service.startImport('vehicles', undefined, false);
    console.log(`Importación de vehículos iniciada con ID: ${vehicleImportId}`);
    
    // Esperar un poco y probar importación de piezas
    setTimeout(async () => {
      console.log('Probando importación de piezas...');
      const partImportId = await service.startImport('parts', undefined, false);
      console.log(`Importación de piezas iniciada con ID: ${partImportId}`);
    }, 5000);
    
  } catch (error) {
    console.error('Error en test de importación:', error);
  }
}

testOptimizedImport();