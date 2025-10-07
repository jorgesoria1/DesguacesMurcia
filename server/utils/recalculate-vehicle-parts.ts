import { vehicles, parts, vehicleParts } from '@shared/schema';
import { db } from '../db';
import { eq, sql } from 'drizzle-orm';

/**
 * Recalcula y regenera las relaciones entre vehículos y piezas
 * basándose en los idVehiculo (idLocal) de las piezas
 */
export async function recalculateVehiclePartRelations(): Promise<{ created: number, removed: number }> {
  console.log('Iniciando recálculo de relaciones vehículo-pieza...');
  
  try {
    // Paso 1: Eliminar todas las relaciones actuales
    const deleteResult = await db.execute(sql`TRUNCATE TABLE vehicle_parts`);
    console.log('Relaciones anteriores eliminadas');
    
    // Paso 2: Regenerar las relaciones basándose en el idVehiculo de las piezas
    const result = await db.execute(sql`
      INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original, fecha_creacion)
      SELECT v.id, p.id, p.id_vehiculo, NOW()
      FROM vehicles v
      JOIN parts p ON v.id_local = p.id_vehiculo
      WHERE p.id_vehiculo > 0
    `);
    
    // Paso 3: Actualizar el campo activeParts en vehículos (conteo de piezas activas)
    await db.execute(sql`
      UPDATE vehicles v
      SET active_parts_count = (
        SELECT COUNT(*)
        FROM vehicle_parts vp
        JOIN parts p ON vp.part_id = p.id
        WHERE vp.vehicle_id = v.id AND p.activo = true
      )
    `);
    
    // Obtener recuento
    const createdCount = Number(result.rowCount) || 0;
    
    console.log(`Recálculo completado: ${createdCount} relaciones regeneradas`);
    
    return {
      created: createdCount,
      removed: Number(deleteResult.rowCount) || 0
    };
  } catch (error) {
    console.error('Error al recalcular relaciones vehículo-pieza:', error);
    throw error;
  }
}

/**
 * Actualiza los contadores de piezas en los vehículos
 */
export async function updateVehiclePartCounts(): Promise<{ updated: number }> {
  console.log('Actualizando contadores de piezas en vehículos...');
  
  try {
    // Actualizar el contador de piezas activas
    const result = await db.execute(sql`
      UPDATE vehicles v
      SET active_parts_count = (
        SELECT COUNT(*)
        FROM vehicle_parts vp
        JOIN parts p ON vp.part_id = p.id
        WHERE vp.vehicle_id = v.id AND p.activo = true
      )
    `);
    
    // Actualizar el contador total de piezas
    await db.execute(sql`
      UPDATE vehicles v
      SET total_parts_count = (
        SELECT COUNT(*)
        FROM vehicle_parts vp
        WHERE vp.vehicle_id = v.id
      )
    `);
    
    const updatedCount = Number(result.rowCount) || 0;
    console.log(`Contadores actualizados en ${updatedCount} vehículos`);
    
    return { updated: updatedCount };
  } catch (error) {
    console.error('Error al actualizar contadores de piezas:', error);
    throw error;
  }
}