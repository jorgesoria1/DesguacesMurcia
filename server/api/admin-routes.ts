import { Express, Request, Response } from 'express';
import { isAdmin, isAuthenticated } from '../auth';
import { recalculateVehiclePartRelations, updateVehiclePartCounts } from '../utils/recalculate-vehicle-parts';
import { disableZeroPricePartsBatch } from "../utils/disable-zero-price-parts";
import { cleanupInvalidParts, auditActiveParts } from "../utils/cleanup-invalid-parts";

/**
 * Rutas de administración para mantenimiento y herramientas especiales
 */
export function registerAdminRoutes(app: Express) {
  // Proteger todas las rutas de admin
  const adminRouter = app.route('/api/admin');
  adminRouter.all('*', isAuthenticated, isAdmin);

  /**
   * Ruta para recalcular las relaciones entre vehículos y piezas
   * POST /api/admin/recalculate-vehicle-parts
   */
  app.post('/api/admin/recalculate-vehicle-parts', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Ejecutar el recálculo completo
      const result = await recalculateVehiclePartRelations();

      return res.status(200).json({
        success: true,
        message: `Relaciones vehículo-pieza recalculadas correctamente: ${result.created} creadas, ${result.removed} eliminadas`,
        data: result
      });
    } catch (error) {
      console.error('Error al recalcular relaciones vehículo-pieza:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al recalcular relaciones vehículo-pieza',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  /**
   * Ruta para actualizar solo los contadores de piezas en vehículos
   * POST /api/admin/update-vehicle-part-counts
   */
  app.post('/api/admin/update-vehicle-part-counts', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Actualizar solo los contadores
      const result = await updateVehiclePartCounts();

      return res.status(200).json({
        success: true,
        message: `Contadores actualizados en ${result.updated} vehículos`,
        data: result
      });
    } catch (error) {
      console.error('Error al actualizar contadores de piezas en vehículos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar contadores de piezas en vehículos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Limpiar piezas con precio inválido (nueva función mejorada)
  app.post("/api/admin/cleanup-invalid-parts", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("🔧 Iniciando limpieza de piezas con precio inválido...");

      // Primero hacer auditoría
      const auditBefore = await auditActiveParts();
      console.log(`📊 Estado antes: ${auditBefore.total} piezas activas (${auditBefore.withValidPrice} válidas, ${auditBefore.withInvalidPrice} inválidas)`);

      // Ejecutar limpieza
      const result = await cleanupInvalidParts();

      // Auditoría después
      const auditAfter = await auditActiveParts();
      console.log(`📊 Estado después: ${auditAfter.total} piezas activas (${auditAfter.withValidPrice} válidas, ${auditAfter.withInvalidPrice} inválidas)`);

      res.json({
        success: true,
        message: `Se han desactivado ${result.deactivated} piezas con precio inválido`,
        deactivated: result.deactivated,
        auditBefore,
        auditAfter,
        foundParts: result.found.slice(0, 10) // Solo primeras 10 para no sobrecargar
      });
    } catch (error) {
      console.error("❌ Error al limpiar piezas con precio inválido:", error);
      res.status(500).json({
        success: false,
        error: "Error al limpiar piezas con precio inválido"
      });
    }
  });

  // Endpoint para reinicializar el scheduler
  app.post("/api/admin/scheduler/reinitialize", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("🔧 Reinicializando scheduler desde API...");
      
      // Importar el scheduler
      const { simpleScheduler } = await import('../services/simple-scheduler');
      
      // Forzar reinicialización
      await simpleScheduler.forceReinitialize();
      
      // Asignar al objeto global para persistencia
      (global as any).importScheduler = simpleScheduler;
      
      res.json({
        success: true,
        message: "Scheduler reinicializado correctamente",
        initialized: simpleScheduler.initialized
      });
      
    } catch (error) {
      console.error("❌ Error reinicializando scheduler:", error);
      res.status(500).json({
        success: false,
        error: "Error al reinicializar el scheduler",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint para ejecutar importación inmediata
  app.post("/api/admin/scheduler/execute-immediate", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { type } = req.body;
      
      if (!type || !['vehicles', 'parts', 'all'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: "Tipo de importación inválido. Use: vehicles, parts, o all"
        });
      }
      
      console.log(`🚀 Ejecutando importación inmediata: ${type}`);
      
      // Obtener scheduler del global o importar
      let scheduler = (global as any).importScheduler;
      if (!scheduler) {
        const { simpleScheduler } = await import('../services/simple-scheduler');
        await simpleScheduler.forceReinitialize();
        scheduler = simpleScheduler;
        (global as any).importScheduler = scheduler;
      }
      
      // Ejecutar importación inmediata
      await scheduler.executeImmediate(type);
      
      res.json({
        success: true,
        message: `Importación ${type} ejecutada correctamente`
      });
      
    } catch (error) {
      console.error("❌ Error ejecutando importación inmediata:", error);
      res.status(500).json({
        success: false,
        error: "Error al ejecutar importación inmediata",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}