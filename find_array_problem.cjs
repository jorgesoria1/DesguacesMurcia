const { MetasyncOptimizedImportService } = require('./server/api/metasync-optimized-import-service');
const { db } = require('./server/db');
const { vehicles, parts } = require('./shared/schema');

async function findArrayProblem() {
  console.log('=== FINDING ARRAY PROBLEM ===');
  
  const service = new MetasyncOptimizedImportService();
  
  try {
    await service.configure();
    
    // Test vehículos
    console.log('\n--- Testing VEHICLES ---');
    const testVehicle = {
      idLocal: -888888,
      idEmpresa: 1236,
      marca: 'TEST',
      modelo: 'TEST',
      version: 'TEST',
      anyo: 2020,
      descripcion: 'Test vehicle',
      combustible: 'Gasolina',
      bastidor: 'TEST',
      matricula: 'TEST',
      color: 'Rojo',
      kilometraje: 50000,
      potencia: 100,
      puertas: 5,
      imagenes: ['https://test.com/image.jpg'],
      activo: true,
      sincronizado: true
    };
    
    console.log('Vehicle imagenes type:', typeof testVehicle.imagenes, Array.isArray(testVehicle.imagenes));
    console.log('Vehicle imagenes content:', testVehicle.imagenes);
    
    // Verificar cada campo del vehículo
    for (const [key, value] of Object.entries(testVehicle)) {
      console.log(`${key}: ${typeof value} ${Array.isArray(value) ? '(array)' : ''}`);
    }
    
    try {
      console.log('Trying to insert vehicle...');
      await db.insert(vehicles).values(testVehicle);
      console.log('✅ Vehicle insert successful');
    } catch (error) {
      console.error('❌ Vehicle insert failed:', error.message);
    }
    
    // Test piezas
    console.log('\n--- Testing PARTS ---');
    const testPart = {
      refLocal: -888888,
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
      descripcionArticulo: 'Test part',
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
      observaciones: 'Test',
      reserva: 0,
      tipoMaterial: 1,
      imagenes: ['https://test.com/image.jpg'],
      activo: true,
      sincronizado: true,
      isPendingRelation: false
    };
    
    console.log('Part imagenes type:', typeof testPart.imagenes, Array.isArray(testPart.imagenes));
    console.log('Part imagenes content:', testPart.imagenes);
    
    // Verificar cada campo de la pieza
    for (const [key, value] of Object.entries(testPart)) {
      console.log(`${key}: ${typeof value} ${Array.isArray(value) ? '(array)' : ''}`);
    }
    
    try {
      console.log('Trying to insert part...');
      await db.insert(parts).values(testPart);
      console.log('✅ Part insert successful');
    } catch (error) {
      console.error('❌ Part insert failed:', error.message);
    }
    
    // Test problemáticos
    console.log('\n--- Testing PROBLEMATIC VALUES ---');
    
    // Test con imagenes = null
    const testVehicleNull = { ...testVehicle, idLocal: -888889, imagenes: null };
    console.log('Testing vehicle with imagenes = null');
    try {
      await db.insert(vehicles).values(testVehicleNull);
      console.log('✅ Vehicle with null imagenes successful');
    } catch (error) {
      console.error('❌ Vehicle with null imagenes failed:', error.message);
    }
    
    // Test con imagenes = undefined
    const testVehicleUndefined = { ...testVehicle, idLocal: -888890, imagenes: undefined };
    console.log('Testing vehicle with imagenes = undefined');
    try {
      await db.insert(vehicles).values(testVehicleUndefined);
      console.log('✅ Vehicle with undefined imagenes successful');
    } catch (error) {
      console.error('❌ Vehicle with undefined imagenes failed:', error.message);
    }
    
    // Test con imagenes = string (no array)
    const testVehicleString = { ...testVehicle, idLocal: -888891, imagenes: 'https://test.com/image.jpg' };
    console.log('Testing vehicle with imagenes = string');
    try {
      await db.insert(vehicles).values(testVehicleString);
      console.log('✅ Vehicle with string imagenes successful');
    } catch (error) {
      console.error('❌ Vehicle with string imagenes failed:', error.message);
    }
    
    // Limpiar
    const { eq } = require('drizzle-orm');
    await db.delete(vehicles).where(eq(vehicles.idLocal, -888888));
    await db.delete(parts).where(eq(parts.refLocal, -888888));
    
  } catch (error) {
    console.error('General error:', error);
  }
}

findArrayProblem();