
const { db } = require('./server/db');
const { importHistory } = require('./shared/schema');

async function testImport() {
  console.log('=== TEST DE IMPORTACIÓN MANUAL ===');
  
  try {
    // Crear un registro de importación de prueba
    const importRecord = await db.insert(importHistory).values({
      type: 'test',
      status: 'running',
      totalRecords: 0,
      processedRecords: 0,
      startTime: new Date(),
      progress: 0,
      fullImport: false,
      metadata: { test: true }
    }).returning();
    
    console.log('✅ Registro de importación creado:', importRecord[0].id);
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Actualizar a completado
    await db.update(importHistory)
      .set({
        status: 'completed',
        endTime: new Date(),
        progress: 100,
        totalRecords: 1,
        processedRecords: 1
      })
      .where(eq(importHistory.id, importRecord[0].id));
    
    console.log('✅ Importación test completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en importación test:', error.message);
  }
}

testImport().then(() => {
  console.log('🎉 Test finalizado');
  process.exit(0);
}).catch(err => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
