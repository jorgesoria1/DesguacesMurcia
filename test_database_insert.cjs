const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');
const { db } = require('./server/db');
const { vehicles } = require('./shared/schema');

async function testDatabaseInsert() {
  console.log('=== TESTING DATABASE INSERT ===');
  
  const service = new MetasyncOptimizedImportService();
  
  try {
    await service.configure();
    
    // Crear un vehículo de prueba normalizado
    const testVehicle = {
      idLocal: -999999,
      idEmpresa: 1236,
      marca: 'TEST',
      modelo: 'TEST',
      version: 'TEST',
      anyo: 2020,
      descripcion: 'Vehículo de prueba',
      combustible: 'Gasolina',
      bastidor: 'TEST123',
      matricula: 'TEST-123',
      color: 'Rojo',
      kilometraje: 50000,
      potencia: 100,
      puertas: 5,
      imagenes: ['https://via.placeholder.com/150?text=Test'],
      activo: true,
      sincronizado: true
    };
    
    console.log('Vehículo de prueba:', JSON.stringify(testVehicle, null, 2));
    console.log('Tipo de imagenes:', typeof testVehicle.imagenes, Array.isArray(testVehicle.imagenes));
    
    // Intentar insertar en la base de datos
    console.log('Intentando insertar en la base de datos...');
    
    const result = await db
      .insert(vehicles)
      .values(testVehicle)
      .returning({ id: vehicles.id });
    
    console.log('✅ Inserción exitosa:', result);
    
    // Limpiar: eliminar el vehículo de prueba
    await db
      .delete(vehicles)
      .where(eq(vehicles.idLocal, -999999));
    
    console.log('🧹 Vehículo de prueba eliminado');
    
  } catch (error) {
    console.error('❌ Error en inserción:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testDatabaseInsert();