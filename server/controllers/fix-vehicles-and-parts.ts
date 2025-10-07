import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { vehicles, parts, vehicleParts } from '@shared/schema';

/**
 * Controlador para corregir los dos problemas:
 * 1. Actualizar contadores de piezas en vehículos
 * 2. Filtrar piezas con precio 0
 */
export async function fixVehiclesAndParts(req: Request, res: Response) {
  try {
    console.log('Iniciando corrección de vehículos y piezas...');
    
    // Paso 1: Asegurarse de que existan los campos necesarios
    try {
      await db.execute(sql`
        ALTER TABLE vehicles 
        ADD COLUMN IF NOT EXISTS active_parts_count integer DEFAULT 0 NOT NULL
      `);
      
      await db.execute(sql`
        ALTER TABLE vehicles 
        ADD COLUMN IF NOT EXISTS total_parts_count integer DEFAULT 0 NOT NULL
      `);
      
      console.log('Campos de conteo de piezas verificados en la tabla de vehículos');
    } catch (error) {
      console.warn('Error al verificar campos de conteo, posiblemente ya existen:', error);
    }

    // Paso 2: Actualizar los contadores de piezas activas (solo con precio > 0)
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
    
    // Paso 3: Actualizar el contador total de piezas
    const totalUpdateResult = await db.execute(sql`
      UPDATE vehicles v
      SET total_parts_count = (
        SELECT COUNT(*)
        FROM vehicle_parts vp
        JOIN parts p ON vp.part_id = p.id
        WHERE vp.vehicle_id = v.id
      )
    `);
    
    // Paso 4: Desactivar piezas con precio 0 o negativo
    const deactivateResult = await db.execute(sql`
      UPDATE parts
      SET activo = false
      WHERE CAST(precio AS DECIMAL) <= 0 OR precio IS NULL OR precio = '0' OR precio = '0.0' OR precio = '0.00'
    `);
    
    console.log(`Corrección completada: 
      - ${activeUpdateResult.rowCount} vehículos actualizados con conteo de piezas activas
      - ${totalUpdateResult.rowCount} vehículos actualizados con conteo total de piezas
      - ${deactivateResult.rowCount} piezas con precio 0 o nulo desactivadas`);
    
    return res.status(200).json({
      success: true,
      message: 'Corrección completada con éxito',
      result: {
        vehiclesWithActiveCountUpdated: Number(activeUpdateResult.rowCount) || 0,
        vehiclesWithTotalCountUpdated: Number(totalUpdateResult.rowCount) || 0,
        partsDeactivated: Number(deactivateResult.rowCount) || 0
      }
    });
  } catch (error) {
    console.error('Error al corregir vehículos y piezas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al corregir vehículos y piezas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}