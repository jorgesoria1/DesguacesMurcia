/**
 * Script para actualizar los contadores de piezas en vehículos
 * Se puede ejecutar manualmente o después de importaciones
 */

import { db } from './server/db.js';
import { vehicles, parts } from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function updateVehiclePartsCounters() {
  console.log('🔄 Iniciando actualización de contadores de piezas en vehículos...');
  
  try {
    // Actualizar contadores usando una consulta SQL optimizada
    const result = await db.execute(sql`
      UPDATE ${vehicles}
      SET 
        active_parts_count = COALESCE(active_count.count, 0),
        total_parts_count = COALESCE(total_count.count, 0),
        fecha_actualizacion = NOW()
      FROM (
        SELECT 
          ${parts.idVehiculo} as id_vehiculo,
          COUNT(*) as count
        FROM ${parts}
        WHERE ${parts.activo} = true
        GROUP BY ${parts.idVehiculo}
      ) as active_count
      FULL OUTER JOIN (
        SELECT 
          ${parts.idVehiculo} as id_vehiculo,
          COUNT(*) as count
        FROM ${parts}
        GROUP BY ${parts.idVehiculo}
      ) as total_count ON active_count.id_vehiculo = total_count.id_vehiculo
      WHERE 
        ${vehicles.idLocal} = COALESCE(active_count.id_vehiculo, total_count.id_vehiculo)
    `);
    
    console.log(`✅ Contadores de piezas actualizados en vehículos correctamente`);
    
    // Mostrar estadísticas
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN active_parts_count > 0 THEN 1 END) as vehicles_with_parts,
        SUM(active_parts_count) as total_active_parts,
        SUM(total_parts_count) as total_parts
      FROM ${vehicles}
    `);
    
    console.log('📊 Estadísticas:', stats.rows[0]);
    
  } catch (error) {
    console.error('❌ Error actualizando contadores de piezas:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateVehiclePartsCounters()
    .then(() => {
      console.log('🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error en el proceso:', error);
      process.exit(1);
    });
}

export { updateVehiclePartsCounters };