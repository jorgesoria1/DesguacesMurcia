import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { vehicles, parts, vehicleParts } from '@shared/schema';

/**
 * Recalcula las relaciones entre vehículos y piezas
 * y actualiza los contadores de piezas en vehículos
 */
export async function recalculateVehicleParts(req: Request, res: Response) {
  try {
    console.log('Iniciando recálculo de relaciones vehículo-pieza...');
    
    // Paso 1: Limpiar todas las relaciones existentes
    console.log('Eliminando relaciones existentes...');
    await db.execute(sql`TRUNCATE TABLE vehicle_parts`);
    
    // Paso 2: Regenerar relaciones basándose en idVehiculo de piezas
    console.log('Regenerando relaciones desde piezas a vehículos...');
    const insertResult = await db.execute(sql`
      INSERT INTO vehicle_parts (vehicle_id, part_id, id_vehiculo_original, fecha_creacion)
      SELECT v.id, p.id, p.id_vehiculo, NOW()
      FROM vehicles v
      JOIN parts p ON v.id_local = p.id_vehiculo
      WHERE p.id_vehiculo > 0
    `);
    
    const createdCount = Number(insertResult.rowCount) || 0;
    console.log(`Creadas ${createdCount} relaciones vehículo-pieza`);
    
    // Paso 3: Actualizar contadores en vehículos
    console.log('Actualizando contadores de piezas en vehículos...');
    
    // Creamos los campos en la tabla de vehículos si no existen
    try {
      // Añadir campo active_parts_count si no existe
      await db.execute(sql`
        ALTER TABLE vehicles 
        ADD COLUMN IF NOT EXISTS active_parts_count integer DEFAULT 0 NOT NULL
      `);
      
      // Añadir campo total_parts_count si no existe
      await db.execute(sql`
        ALTER TABLE vehicles 
        ADD COLUMN IF NOT EXISTS total_parts_count integer DEFAULT 0 NOT NULL
      `);
      
      console.log('Campos de conteo de piezas añadidos a la tabla de vehículos');
    } catch (error) {
      console.warn('Error al crear campos de conteo, posiblemente ya existen:', error);
    }

    // Actualizamos el contador de piezas activas y con precio mayor a 0
    const activeUpdateResult = await db.execute(sql`
      UPDATE vehicles v
      SET active_parts_count = (
        SELECT COUNT(*)
        FROM vehicle_parts vp
        JOIN parts p ON vp.part_id = p.id
        WHERE vp.vehicle_id = v.id 
          AND p.activo = true
          AND CAST(p.precio AS DECIMAL) > 0
      )
    `);
    
    // Actualizamos el contador total de piezas
    const totalUpdateResult = await db.execute(sql`
      UPDATE vehicles v
      SET total_parts_count = (
        SELECT COUNT(*)
        FROM vehicle_parts vp
        WHERE vp.vehicle_id = v.id
      )
    `);
    
    console.log(`Recálculo completado con éxito`);
    
    return res.status(200).json({
      success: true,
      message: 'Relaciones vehículo-pieza recalculadas correctamente',
      result: {
        relationsCreated: createdCount,
        vehiclesUpdated: Number(activeUpdateResult.rowCount) || 0
      }
    });
  } catch (error) {
    console.error('Error al recalcular relaciones vehículo-pieza:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al recalcular relaciones vehículo-pieza',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}