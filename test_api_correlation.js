const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service.ts');
const db = require('./server/db.ts');

async function testApiCorrelation() {
  console.log('🧪 TESTING API CORRELATION FOR PROCESSED VEHICLE PARTS');
  
  try {
    // Inicializar servicio de importación
    const importService = new MetasyncOptimizedImportService();
    
    // Crear registro de importación de prueba
    const importHistory = await db.schema.importHistory;
    const [testImport] = await db.db
      .insert(importHistory)
      .values({
        type: 'parts',
        status: 'pending',
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: []
      })
      .returning();
    
    console.log(`✅ Created test import ID: ${testImport.id}`);
    
    // Ejecutar una importación de piezas de prueba
    await importService.importParts(testImport.id);
    
    // Verificar resultados
    const [finalImport] = await db.db
      .select()
      .from(importHistory)
      .where(db.eq(importHistory.id, testImport.id));
    
    console.log('📊 RESULTADO DE LA PRUEBA:');
    console.log(`Status: ${finalImport.status}`);
    console.log(`Procesadas: ${finalImport.processedItems}`);
    console.log(`Nuevas: ${finalImport.newItems}`);
    console.log(`Actualizadas: ${finalImport.updatedItems}`);
    console.log(`Errores: ${finalImport.errors?.length || 0}`);
    
    // Verificar cuántas piezas procesadas tienen datos de vehículo
    const parts = await db.schema.parts;
    const processedPartsStats = await db.db
      .select({
        total: db.sql`COUNT(*)`,
        withVehicleData: db.sql`COUNT(CASE WHEN vehicle_marca IS NOT NULL AND vehicle_marca != '' THEN 1 END)`,
        withoutVehicleData: db.sql`COUNT(CASE WHEN vehicle_marca IS NULL OR vehicle_marca = '' THEN 1 END)`
      })
      .from(parts)
      .where(db.and(
        db.lt(parts.idVehiculo, 0),
        db.eq(parts.activo, true)
      ));
    
    const stats = processedPartsStats[0];
    const successRate = ((stats.withVehicleData / stats.total) * 100).toFixed(2);
    
    console.log('\n📈 ESTADÍSTICAS DESPUÉS DE LA PRUEBA:');
    console.log(`Total piezas procesadas: ${stats.total}`);
    console.log(`Con datos de vehículo: ${stats.withVehicleData}`);
    console.log(`Sin datos de vehículo: ${stats.withoutVehicleData}`);
    console.log(`Tasa de éxito: ${successRate}%`);
    
    if (parseFloat(successRate) > 50) {
      console.log('🎉 ¡ÉXITO! La correlación con el array API está funcionando');
    } else {
      console.log('⚠️ La correlación necesita más ajustes');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testApiCorrelation().catch(console.error);