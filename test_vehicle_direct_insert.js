import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function testDirectVehicleInsert() {
  try {
    console.log('🔧 Probando inserción directa de vehículo en base de datos...');

    // Insertar un vehículo de prueba usando SQL directo
    const testVehicle = {
      id_local: 999999,
      id_empresa: 1236,
      marca: 'PRUEBA',
      modelo: 'TEST-MODEL',
      version: 'TEST-VERSION',
      anyo: 2020,
      combustible: 'Gasolina',
      descripcion: 'Vehículo de prueba',
      imagenes: JSON.stringify(['https://example.com/test.jpg']),
      activo: true,
      sincronizado: true
    };

    console.log('💾 Insertando vehículo de prueba:', testVehicle);

    const result = await db.execute(`
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
      RETURNING id, marca, modelo
    `, [
      testVehicle.id_local,
      testVehicle.id_empresa,
      testVehicle.marca,
      testVehicle.modelo,
      testVehicle.version,
      testVehicle.anyo,
      testVehicle.combustible,
      testVehicle.descripcion,
      testVehicle.imagenes,
      testVehicle.activo,
      testVehicle.sincronizado
    ]);

    console.log('✅ Vehículo insertado correctamente:', result.rows[0]);

    // Verificar que se insertó correctamente
    const verification = await db.execute(`
      SELECT id, id_local, marca, modelo, version, anyo, activo 
      FROM vehicles 
      WHERE id_local = $1
    `, [testVehicle.id_local]);

    console.log('🔍 Verificación de inserción:', verification.rows[0]);

    // Limpiar el vehículo de prueba
    await db.execute(`DELETE FROM vehicles WHERE id_local = $1`, [testVehicle.id_local]);
    console.log('🧹 Vehículo de prueba eliminado');

    console.log('🎉 Test de inserción directa completado exitosamente');

  } catch (error) {
    console.error('❌ Error en la inserción directa:', error);
  } finally {
    await pool.end();
  }
}

testDirectVehicleInsert().catch(console.error);