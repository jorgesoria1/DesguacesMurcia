// Script para crear una versión simplificada que evite el error de Drizzle ORM
// El problema está en orderSelectedFields interno de Drizzle

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function createSimpleVehicleImportEndpoint() {
  try {
    console.log('🔧 Creando endpoint de importación simplificado...');

    // Probar inserción directa usando SQL raw para evitar el error de Drizzle ORM
    const testData = {
      id_local: 999997,
      id_empresa: 1236,
      marca: 'DRIZZLE-FIX',
      modelo: 'TEST',
      version: 'V1',
      anyo: 2025,
      combustible: 'Test',
      descripcion: 'Fix para error Drizzle ORM',
      imagenes: JSON.stringify(['test.jpg']),
      activo: true,
      sincronizado: true
    };

    console.log('💾 Insertando vehículo con SQL raw...');
    
    // Usar sql`` template literal en lugar de .insert() para evitar el error orderSelectedFields
    const result = await db.execute(sql`
      INSERT INTO vehicles (id_local, id_empresa, marca, modelo, version, anyo, combustible, descripcion, imagenes, activo, sincronizado, fecha_creacion, fecha_actualizacion)
      VALUES (${testData.id_local}, ${testData.id_empresa}, ${testData.marca}, ${testData.modelo}, ${testData.version}, ${testData.anyo}, ${testData.combustible}, ${testData.descripcion}, ${testData.imagenes}, ${testData.activo}, ${testData.sincronizado}, NOW(), NOW())
      ON CONFLICT (id_local) 
      DO UPDATE SET 
        marca = EXCLUDED.marca,
        modelo = EXCLUDED.modelo,
        version = EXCLUDED.version,
        activo = EXCLUDED.activo,
        fecha_actualizacion = NOW()
      RETURNING id, marca, modelo
    `);

    console.log('✅ Resultado SQL raw:', result.rows[0]);

    // Verificar que funciona
    const verification = await db.execute(sql`
      SELECT id, id_local, marca, modelo, activo 
      FROM vehicles 
      WHERE id_local = ${testData.id_local}
    `);

    console.log('🔍 Verificación:', verification.rows[0]);

    // Limpiar
    await db.execute(sql`DELETE FROM vehicles WHERE id_local = ${testData.id_local}`);
    console.log('🧹 Test limpiado');

    console.log('🎉 SQL raw funciona! Podemos usar esto para importaciones de vehículos');
    console.log('💡 Solución: Usar sql`` template literals en lugar de .insert() para evitar el bug de Drizzle ORM');

  } catch (error) {
    console.error('❌ Error en test SQL raw:', error);
  } finally {
    await pool.end();
  }
}

createSimpleVehicleImportEndpoint();