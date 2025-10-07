// Test directo para importación incremental optimizada
import { db } from './server/db.js';
import { importHistory } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testIncrementalImport() {
  try {
    console.log('🧪 INICIANDO PRUEBA DIRECTA DE IMPORTACIÓN INCREMENTAL OPTIMIZADA');
    
    // Crear registro de importación
    const [importRecord] = await db.insert(importHistory).values({
      type: 'parts',
      status: 'in_progress',
      isFullImport: false,
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      newItems: 0,
      updatedItems: 0,
      startTime: new Date(),
      details: { source: 'test-incremental', importType: 'incremental' },
      errors: []
    }).returning();

    console.log(`✅ Registro de importación creado: ID ${importRecord.id}`);

    // Importar y usar el servicio optimizado
    const { MetasyncOptimizedImportService } = await import('./server/api/metasync-optimized-import-service.js');
    const importService = new MetasyncOptimizedImportService();
    
    console.log('🔧 Iniciando importación INCREMENTAL usando servicio optimizado...');
    
    // Llamar directamente al método con fullImport=false para activar optimización
    await importService.importParts(importRecord.id, false);
    
    console.log('✅ Prueba de importación incremental completada');
    
  } catch (error) {
    console.error('❌ Error en prueba de importación:', error);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar prueba
testIncrementalImport();