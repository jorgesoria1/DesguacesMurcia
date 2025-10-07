import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function testVehicleImport() {
  try {
    console.log('🔧 Probando importación directa de vehículos...');

    // Configuración directa
    const API_KEY = 'wYQo3uMCqJYXd9eFWnpSGW2qcKWHjAhAKvw2NNzMnE4KjrSKKW';
    const COMPANY_ID = 1236;
    const CHANNEL = 'web';

    // Crear headers de la petición
    const headers = {
      'apikey': API_KEY,
      'fecha': '2024-01-01',
      'lastid': '0',
      'offset': '50',
      'canal': CHANNEL,
      'idempresa': COMPANY_ID.toString()
    };

    console.log('📡 Haciendo petición a la API...');
    console.log('Headers:', headers);

    // Hacer petición fetch nativa
    const response = await fetch('https://api.metasync.es/RecuperarCambiosCanal', {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta recibida');

    // Analizar estructura de la respuesta
    console.log('📊 Estructura de respuesta:');
    console.log('- Claves principales:', Object.keys(data));

    // Buscar vehículos en diferentes ubicaciones posibles
    let vehicles = [];
    
    if (data.vehiculos && Array.isArray(data.vehiculos)) {
      vehicles = data.vehiculos;
      console.log('✅ Vehículos encontrados en data.vehiculos:', vehicles.length);
    } else if (data.vehicles && Array.isArray(data.vehicles)) {
      vehicles = data.vehicles;
      console.log('✅ Vehículos encontrados en data.vehicles:', vehicles.length);
    } else if (Array.isArray(data)) {
      vehicles = data;
      console.log('✅ Vehículos encontrados en root array:', vehicles.length);
    } else {
      console.log('❌ No se encontraron vehículos en la respuesta');
      console.log('Datos recibidos:', JSON.stringify(data).substring(0, 500));
    }

    if (vehicles.length > 0) {
      console.log('🚗 Primer vehículo de muestra:');
      console.log(JSON.stringify(vehicles[0], null, 2));
      
      console.log('📈 Total de vehículos recibidos:', vehicles.length);
      
      // Insertar directamente en la base de datos usando SQL raw
      console.log('💾 Insertando vehículos en la base de datos...');
      
      let insertedCount = 0;
      for (const vehicle of vehicles.slice(0, 5)) { // Solo los primeros 5 para test
        try {
          // Preparar datos del vehículo
          const vehicleData = {
            id_local: vehicle.id || vehicle.idLocal || 0,
            id_empresa: vehicle.idEmpresa || COMPANY_ID,
            marca: vehicle.marca || vehicle.nombreMarca || '',
            modelo: vehicle.modelo || vehicle.nombreModelo || '',
            version: vehicle.version || vehicle.nombreVersion || '',
            anyo: vehicle.anyo || vehicle.anyoVehiculo || 0,
            combustible: vehicle.combustible || '',
            descripcion: vehicle.descripcion || '',
            imagenes: JSON.stringify(vehicle.imagenes || []),
            activo: true,
            sincronizado: true
          };

          // Insertar usando SQL directo
          await db.execute(`
            INSERT INTO vehicles (id_local, id_empresa, marca, modelo, version, anyo, combustible, descripcion, imagenes, activo, sincronizado, fecha_creacion, fecha_actualizacion)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            ON CONFLICT (id_local) 
            DO UPDATE SET 
              marca = EXCLUDED.marca,
              modelo = EXCLUDED.modelo,
              version = EXCLUDED.version,
              anyo = EXCLUDED.anyo,
              combustible = EXCLUDED.combustible,
              descripcion = EXCLUDED.descripcion,
              imagenes = EXCLUDED.imagenes,
              activo = EXCLUDED.activo,
              sincronizado = EXCLUDED.sincronizado,
              fecha_actualizacion = NOW()
          `, [
            vehicleData.id_local,
            vehicleData.id_empresa,
            vehicleData.marca,
            vehicleData.modelo,
            vehicleData.version,
            vehicleData.anyo,
            vehicleData.combustible,
            vehicleData.descripcion,
            vehicleData.imagenes,
            vehicleData.activo,
            vehicleData.sincronizado
          ]);
          
          insertedCount++;
          console.log(`✅ Vehículo ${insertedCount}: ${vehicleData.marca} ${vehicleData.modelo} insertado`);
          
        } catch (error) {
          console.error(`❌ Error insertando vehículo:`, error.message);
        }
      }
      
      console.log(`🎉 Importación completada: ${insertedCount} vehículos procesados`);
      
    } else {
      console.log('❌ No hay vehículos para importar');
    }

  } catch (error) {
    console.error('❌ Error en la importación:', error);
  } finally {
    await pool.end();
  }
}

testVehicleImport().catch(console.error);