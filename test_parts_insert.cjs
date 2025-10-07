const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');
const { db } = require('./server/db');
const { parts } = require('./shared/schema');

async function testPartsInsert() {
  console.log('=== TESTING PARTS INSERT ===');
  
  const service = new MetasyncOptimizedImportService();
  
  try {
    await service.configure();
    
    // Crear una pieza de prueba normalizada
    const testPart = {
      refLocal: -999999,
      idEmpresa: 1236,
      idVehiculo: 0,
      vehicleMarca: 'TEST',
      vehicleModelo: 'TEST',
      vehicleVersion: 'TEST',
      vehicleAnyo: 2020,
      combustible: 'Gasolina',
      codFamilia: 'TEST',
      descripcionFamilia: 'TEST',
      codArticulo: 'TEST',
      descripcionArticulo: 'Pieza de prueba',
      codVersionVehiculo: 'TEST',
      refPrincipal: 'TEST',
      anyoInicio: 2000,
      anyoFin: 2025,
      puertas: 5,
      rvCode: 'TEST',
      precio: '100',
      anyoStock: 2020,
      peso: '10',
      ubicacion: 1,
      observaciones: 'Prueba',
      reserva: 0,
      tipoMaterial: 1,
      imagenes: ['https://via.placeholder.com/150?text=Test'],
      activo: false,
      sincronizado: true,
      isPendingRelation: false
    };
    
    console.log('Pieza de prueba creada');
    console.log('Tipo de imagenes:', typeof testPart.imagenes, Array.isArray(testPart.imagenes));
    console.log('Tipo de activo:', typeof testPart.activo);
    console.log('Tipo de sincronizado:', typeof testPart.sincronizado);
    console.log('Tipo de isPendingRelation:', typeof testPart.isPendingRelation);
    
    // Intentar insertar en la base de datos
    console.log('Intentando insertar en la base de datos...');
    
    const result = await db
      .insert(parts)
      .values(testPart)
      .returning({ id: parts.id });
    
    console.log('✅ Inserción exitosa:', result);
    
    // Limpiar: eliminar la pieza de prueba
    const { eq } = require('drizzle-orm');
    await db
      .delete(parts)
      .where(eq(parts.refLocal, -999999));
    
    console.log('🧹 Pieza de prueba eliminada');
    
  } catch (error) {
    console.error('❌ Error en inserción:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testPartsInsert();