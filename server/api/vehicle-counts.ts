import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { isAdmin, isAuthenticated } from '../auth';

const vehicleCountsRouter = Router();

// Endpoint para recalcular los contadores de piezas para todos los vehículos
vehicleCountsRouter.post('/recalculate', isAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log('Iniciando recálculo de contadores de piezas para vehículos...');
    
    // Actualizar el contador de piezas activas
    await db.execute(sql`
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
    
    console.log('Recálculo de contadores de piezas completado');
    
    return res.status(200).json({
      success: true,
      message: 'Contadores de piezas recalculados correctamente'
    });
  } catch (error) {
    console.error('Error al recalcular contadores de piezas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al recalcular contadores de piezas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default vehicleCountsRouter;