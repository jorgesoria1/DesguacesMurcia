import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { vehicles, apiConfig } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function testSimpleVehicleImport() {
  try {
    console.log('🔧 Probando inserción simple de vehículo con Drizzle ORM...');

    // Probar primero la consulta de configuración que funciona en el servidor
    console.log('🔍 Probando consulta de configuración...');
    const configs = await db.select().from(apiConfig).limit(1);
    console.log('✅ Configuraciones encontradas:', configs.length);

    // Ahora probar inserción de vehículo simple
    console.log('💾 Probando inserción de vehículo...');
    
    const testVehicle = {
      idLocal: 999998,
      idEmpresa: 1236,
      marca: 'TEST',
      modelo: 'SIMPLE',
      version: 'V1',
      anyo: 2025,
      combustible: 'Test',
      descripcion: 'Vehículo de prueba simple',
      imagenes: ['test.jpg'],
      activo: true,
      sincronizado: true
    };

    // Intentar inserción con Drizzle ORM
    const [inserted] = await db.insert(vehicles).values(testVehicle).returning();
    console.log('✅ Vehículo insertado:', inserted);

    // Limpiar
    await db.delete(vehicles).where(eq(vehicles.idLocal, 999998));
    console.log('🧹 Vehículo de prueba eliminado');

    console.log('🎉 Test simple completado exitosamente');

  } catch (error) {
    console.error('❌ Error en test simple:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testSimpleVehicleImport();