/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * Este controlador ha sido reemplazado por metasync-optimized-routes.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-routes.ts + metasync-optimized-import-service.ts
 */

import { Request, Response } from 'express';
import { metasyncImportService } from './metasync-import-service';
import { db } from '../db';
import { importHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';

export const metasyncImportController = {
  /**
   * Inicia la importación de vehículos
   * POST /api/metasync-import/vehicles
   */
  async importVehicles(req: Request, res: Response) {
    try {
      const { fromDate, fullImport } = req.body;
      
      // Convertir fromDate si se proporciona
      const parsedFromDate = fromDate ? new Date(fromDate) : undefined;
      
      // Iniciar la importación
      const importId = await metasyncImportService.startImport('vehicles', parsedFromDate, fullImport);
      
      return res.status(200).json({
        success: true,
        message: 'Importación de vehículos iniciada correctamente',
        importId,
        details: {
          fromDate: parsedFromDate?.toISOString(),
          fullImport: fullImport
        }
      });
    } catch (error) {
      console.error('Error al iniciar importación de vehículos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar la importación de vehículos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Inicia la importación de piezas
   * POST /api/metasync-import/parts
   */
  async importParts(req: Request, res: Response) {
    try {
      const { fromDate, fullImport } = req.body;
      
      // Convertir fromDate si se proporciona
      const parsedFromDate = fromDate ? new Date(fromDate) : undefined;
      
      // Iniciar la importación
      const importId = await metasyncImportService.startImport('parts', parsedFromDate, fullImport);
      
      return res.status(200).json({
        success: true,
        message: 'Importación de piezas iniciada correctamente',
        importId,
        details: {
          fromDate: parsedFromDate?.toISOString(),
          fullImport: fullImport
        }
      });
    } catch (error) {
      console.error('Error al iniciar importación de piezas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar la importación de piezas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Obtiene el estado de una importación
   * GET /api/metasync-import/:id
   */
  async getImportStatus(req: Request, res: Response) {
    try {
      const importId = parseInt(req.params.id);
      
      if (isNaN(importId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de importación inválido'
        });
      }
      
      const [importRecord] = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId));
      
      if (!importRecord) {
        return res.status(404).json({
          success: false,
          message: 'Importación no encontrada'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: importRecord
      });
    } catch (error) {
      console.error('Error al obtener estado de importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el estado de la importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Cancela una importación en progreso
   * POST /api/metasync-import/:id/cancel
   */
  async cancelImport(req: Request, res: Response) {
    try {
      const importId = parseInt(req.params.id);
      
      if (isNaN(importId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de importación inválido'
        });
      }
      
      const [importRecord] = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId));
      
      if (!importRecord) {
        return res.status(404).json({
          success: false,
          message: 'Importación no encontrada'
        });
      }
      
      // Solo se pueden cancelar importaciones en progreso
      if (importRecord.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: `Solo se pueden cancelar importaciones en progreso. Estado actual: ${importRecord.status}`
        });
      }
      
      // Actualizar estado a cancelado
      await db
        .update(importHistory)
        .set({
          status: 'cancelled',
          endTime: new Date(),
          lastUpdated: new Date()
        })
        .where(eq(importHistory.id, importId));
      
      return res.status(200).json({
        success: true,
        message: 'Importación cancelada correctamente'
      });
    } catch (error) {
      console.error('Error al cancelar importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cancelar la importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Procesa las relaciones pendientes entre piezas y vehículos
   * POST /api/metasync-import/process-pending-relations
   */
  async processPendingRelations(req: Request, res: Response) {
    try {
      const result = await metasyncImportService.processPendingRelations();
      
      return res.status(200).json({
        success: true,
        message: `Se han resuelto ${result.resolved} relaciones pendientes`,
        data: result
      });
    } catch (error) {
      console.error('Error al procesar relaciones pendientes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar relaciones pendientes',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Actualiza el estado activo de todas las piezas
   * POST /api/metasync-import/update-parts-status
   */
  async updatePartsActiveStatus(req: Request, res: Response) {
    try {
      const result = await metasyncImportService.updatePartsActiveStatus();
      
      return res.status(200).json({
        success: true,
        message: `Se han activado ${result.activated} piezas y desactivado ${result.deactivated}`,
        data: result
      });
    } catch (error) {
      console.error('Error al actualizar estado de piezas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar estado de piezas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
};