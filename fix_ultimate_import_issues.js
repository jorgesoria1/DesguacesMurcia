import { MetasyncOptimizedImportService } from './server/api/metasync-optimized-import-service.js';
import { normalizeImagenesArray } from './server/utils/array-normalizer.js';
import { db } from './server/db.js';
import { vehicles, parts } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixUltimateImportIssues() {
  console.log('=== FIXING ULTIMATE IMPORT ISSUES ===');
  
  try {
    // 1. Probar inserción directa con datos normalizados
    console.log('\n1. Testing direct normalized insertion...');
    
    const testVehicle = {
      idLocal: -999998,
      idEmpresa: 1236,
      marca: 'TEST',
      modelo: 'MODEL',
      version: 'VERSION',
      anyo: 2020,
      descripcion: 'Test vehicle',
      combustible: 'Gasolina',
      bastidor: 'TEST123',
      matricula: 'TEST123',
      color: 'Rojo',
      kilometraje: 50000,
      potencia: 100,
      puertas: 5,
      // Problematic field: ensure it's a proper array
      imagenes: normalizeImagenesArray('img1.jpg,img2.jpg,img3.jpg'),
      activo: true,
      sincronizado: true
    };
    
    console.log('Vehicle test data:', {
      idLocal: testVehicle.idLocal,
      imagenes: testVehicle.imagenes,
      imagenesType: typeof testVehicle.imagenes,
      isArray: Array.isArray(testVehicle.imagenes)
    });
    
    try {
      await db.insert(vehicles).values(testVehicle);
      console.log('✅ Direct vehicle insertion successful');
    } catch (error) {
      console.error('❌ Direct vehicle insertion failed:', error.message);
      return;
    }
    
    // 2. Probar inserción directa de parte
    const testPart = {
      refLocal: -999998,
      idEmpresa: 1236,
      idVehiculo: 0,
      vehicleMarca: 'TEST',
      vehicleModelo: 'MODEL',
      vehicleVersion: 'VERSION',
      vehicleAnyo: 2020,
      combustible: 'Gasolina',
      codFamilia: 'TEST',
      descripcionFamilia: 'Test Family',
      codArticulo: 'TEST123',
      descripcionArticulo: 'Test Part',
      codVersionVehiculo: 'TEST',
      refPrincipal: 'TEST-REF',
      anyoInicio: 2000,
      anyoFin: 2025,
      puertas: 5,
      rvCode: 'TEST',
      precio: '100.50',
      anyoStock: 2020,
      peso: '10.5',
      ubicacion: 1,
      observaciones: 'Test observation',
      reserva: 0,
      tipoMaterial: 1,
      // Problematic field: ensure it's a proper array
      imagenes: normalizeImagenesArray('part1.jpg,part2.jpg'),
      activo: true,
      sincronizado: true,
      isPendingRelation: false
    };
    
    console.log('Part test data:', {
      refLocal: testPart.refLocal,
      imagenes: testPart.imagenes,
      imagenesType: typeof testPart.imagenes,
      isArray: Array.isArray(testPart.imagenes)
    });
    
    try {
      await db.insert(parts).values(testPart);
      console.log('✅ Direct part insertion successful');
    } catch (error) {
      console.error('❌ Direct part insertion failed:', error.message);
      return;
    }
    
    // 3. Limpiar datos de prueba
    await db.delete(vehicles).where(eq(vehicles.idLocal, -999998));
    await db.delete(parts).where(eq(parts.refLocal, -999998));
    
    // 4. Verificar que no hay datos corruptos en la base de datos
    console.log('\n2. Checking for corrupted data in database...');
    
    // Verificar vehículos con imagenes corruptas
    const vehiclesWithBadImages = await db.execute(`
      SELECT id, id_local, imagenes 
      FROM vehicles 
      WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
      LIMIT 10
    `);
    
    if (vehiclesWithBadImages.rows.length > 0) {
      console.log('⚠️ Found vehicles with corrupted images:', vehiclesWithBadImages.rows.length);
      for (const row of vehiclesWithBadImages.rows) {
        console.log(`- Vehicle ${row.id_local}: ${row.imagenes}`);
      }
    } else {
      console.log('✅ No vehicles with corrupted images found');
    }
    
    // Verificar piezas con imagenes corruptas
    const partsWithBadImages = await db.execute(`
      SELECT id, ref_local, imagenes 
      FROM parts 
      WHERE NOT (imagenes::text ~ '^\\[.*\\]$')
      LIMIT 10
    `);
    
    if (partsWithBadImages.rows.length > 0) {
      console.log('⚠️ Found parts with corrupted images:', partsWithBadImages.rows.length);
      for (const row of partsWithBadImages.rows) {
        console.log(`- Part ${row.ref_local}: ${row.imagenes}`);
      }
    } else {
      console.log('✅ No parts with corrupted images found');
    }
    
    // 5. Probar que el servicio puede configurarse correctamente
    console.log('\n3. Testing service configuration...');
    
    const service = new MetasyncOptimizedImportService();
    await service.configure();
    console.log('✅ Service configuration successful');
    
    console.log('\n4. Testing normalizer with problematic data...');
    
    // Probar diferentes tipos de datos problemáticos
    const problematicData = [
      null,
      undefined,
      '',
      'single-image.jpg',
      'img1.jpg,img2.jpg,img3.jpg',
      ['img1.jpg', 'img2.jpg'],
      { url: 'img.jpg' },
      123,
      true,
      ['img1.jpg', null, '', 'img2.jpg']
    ];
    
    for (const data of problematicData) {
      try {
        const normalized = normalizeImagenesArray(data);
        console.log(`✅ Normalized ${JSON.stringify(data)} -> ${JSON.stringify(normalized)}`);
      } catch (error) {
        console.error(`❌ Failed to normalize ${JSON.stringify(data)}: ${error.message}`);
      }
    }
    
    console.log('\n=== ALL TESTS COMPLETED ===');
    
  } catch (error) {
    console.error('Critical error during testing:', error);
    console.error('Error stack:', error.stack);
  }
}

fixUltimateImportIssues();