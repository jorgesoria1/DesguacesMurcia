const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');
const { db } = require('./server/db');
const { vehicles, parts, importHistory } = require('./shared/schema');
const { eq } = require('drizzle-orm');

async function debugScheduledImport() {
  console.log('=== DEBUG SCHEDULED IMPORT ===');
  
  try {
    const service = new MetasyncOptimizedImportService();
    await service.configure();
    
    console.log('Service configured successfully');
    
    // Simular el proceso de importación programada
    console.log('\n--- Testing Vehicle Import ---');
    
    // Crear un importHistory record como lo hace el scheduler
    const [historyRecord] = await db
      .insert(importHistory)
      .values({
        type: 'vehicles',
        status: 'in_progress',
        isFullImport: true,
        processedItems: 0,
        totalItems: 0,
        errors: [],
        errorCount: 0,
        progress: 0,
        startedAt: new Date(),
        lastUpdated: new Date()
      })
      .returning();
    
    console.log('History record created:', historyRecord.id);
    
    // Mock data similar to what comes from API
    const mockVehicleData = {
      idLocal: -999999,
      idEmpresa: 1236,
      nombreMarca: 'TEST',
      nombreModelo: 'MODEL',
      nombreVersion: 'VERSION',
      anyoVehiculo: 2020,
      combustible: 'Gasolina',
      bastidor: 'TEST123',
      matricula: 'TEST123',
      color: 'Rojo',
      kilometraje: 50000,
      potenciaHP: 100,
      puertas: 5,
      UrlsImgs: 'https://example.com/image1.jpg,https://example.com/image2.jpg', // String con URLs separadas por comas
      fechaMod: '2025-07-17 10:00:00'
    };
    
    console.log('Mock vehicle data:', JSON.stringify(mockVehicleData, null, 2));
    
    // Intentar procesar un lote llamando al método privado
    try {
      // Crear un método de prueba para acceder al método privado
      console.log('Testing vehicle normalization...');
      const normalizedVehicle = await service.normalizeVehicle(mockVehicleData);
      console.log('Normalized vehicle:', normalizedVehicle);
      
      // Probar inserción directa
      const result = await service.processVehicleBatch([mockVehicleData]);
      console.log('Batch processing result:', result);
    } catch (error) {
      console.error('Error in batch processing:', error);
      console.error('Error stack:', error.stack);
    }
    
    // Limpiar
    await db.delete(importHistory).where(eq(importHistory.id, historyRecord.id));
    await db.delete(vehicles).where(eq(vehicles.idLocal, -999999));
    
    console.log('\n--- Testing Part Import ---');
    
    // Crear otro importHistory record para parts
    const [partHistoryRecord] = await db
      .insert(importHistory)
      .values({
        type: 'parts',
        status: 'in_progress',
        isFullImport: true,
        processedItems: 0,
        totalItems: 0,
        errors: [],
        errorCount: 0,
        progress: 0,
        startedAt: new Date(),
        lastUpdated: new Date()
      })
      .returning();
    
    console.log('Part history record created:', partHistoryRecord.id);
    
    // Mock part data
    const mockPartData = {
      refLocal: -999999,
      idEmpresa: 1236,
      idVehiculo: 12345,
      codFamilia: 'TEST',
      descripcionFamilia: 'Test Family',
      codArticulo: 'TEST123',
      descripcionArticulo: 'Test Part',
      refPrincipal: 'TEST-REF',
      anyoInicio: 2000,
      anyoFin: 2025,
      puertas: 5,
      precio: '100.50',
      peso: '10.5',
      ubicacion: 1,
      observaciones: 'Test observation',
      reserva: 0,
      tipoMaterial: 1,
      UrlsImgs: 'part1.jpg,part2.jpg', // String con imágenes separadas por comas
      fechaMod: '2025-07-17 10:00:00'
    };
    
    console.log('Mock part data:', JSON.stringify(mockPartData, null, 2));
    
    // Intentar procesar un lote de parts
    try {
      const result = await service.processBatchParts([mockPartData], partHistoryRecord.id);
      console.log('Part batch processing result:', result);
    } catch (error) {
      console.error('Error in part batch processing:', error);
      console.error('Error stack:', error.stack);
    }
    
    // Limpiar
    await db.delete(importHistory).where(eq(importHistory.id, partHistoryRecord.id));
    await db.delete(parts).where(eq(parts.refLocal, -999999));
    
  } catch (error) {
    console.error('General error:', error);
    console.error('Error stack:', error.stack);
  }
}

debugScheduledImport();