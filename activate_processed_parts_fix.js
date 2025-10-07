const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { parts } = require('./shared/schema');
const { sql, eq, and, lt } = require('drizzle-orm');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});

const db = drizzle(pool);

async function activateProcessedParts() {
  console.log('🔧 Activando piezas de vehículos procesados con precio válido...');
  
  try {
    // Obtener conteo actual
    console.log('📊 Verificando estado actual...');
    const currentStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_processed,
        COUNT(CASE WHEN activo = true THEN 1 END) as currently_active,
        COUNT(CASE WHEN precio::numeric > 0 THEN 1 END) as with_valid_price
      FROM parts 
      WHERE id_vehiculo < 0
    `);
    
    console.log(`📈 Estado actual:
      - Total piezas procesadas: ${currentStats[0].total_processed}
      - Actualmente activas: ${currentStats[0].currently_active}
      - Con precio válido: ${currentStats[0].with_valid_price}`);
    
    // Activar piezas de vehículos procesados con precio válido
    console.log('🚀 Activando piezas de vehículos procesados con precio > 0...');
    
    const result = await db.execute(sql`
      UPDATE parts 
      SET 
        activo = true,
        fecha_actualizacion = NOW()
      WHERE 
        id_vehiculo < 0 
        AND precio::numeric > 0 
        AND activo = false
    `);
    
    console.log(`✅ ${result.rowCount} piezas de vehículos procesados activadas`);
    
    // Verificar resultado final
    const finalStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_processed,
        COUNT(CASE WHEN activo = true THEN 1 END) as now_active,
        COUNT(CASE WHEN activo = false THEN 1 END) as still_inactive
      FROM parts 
      WHERE id_vehiculo < 0
    `);
    
    console.log(`📊 Estado final:
      - Total piezas procesadas: ${finalStats[0].total_processed}
      - Ahora activas: ${finalStats[0].now_active}
      - Aún inactivas: ${finalStats[0].still_inactive}`);
    
    console.log('✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error activando piezas procesadas:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
activateProcessedParts()
  .then(() => {
    console.log('🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error ejecutando script:', error);
    process.exit(1);
  });