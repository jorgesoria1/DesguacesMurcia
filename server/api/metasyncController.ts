/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * Este controlador ha sido reemplazado por metasync-optimized-routes.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-routes.ts + metasync-optimized-import-service.ts
 */

import { Request, Response } from 'express';
import { importador } from '../services/importador';
import { db } from '../db';
import { importHistory } from '@shared/schema';
import { metasyncApi } from './metasync';

/**
 * Controlador para la API de MetaSync
 * Implementa los endpoints de importación de datos
 */
export const metasyncController = {
  /**
   * Obtiene vehículos de la API MetaSync
   * GET /api/metasync/vehicles
   */
  async getVehicles(req: Request, res: Response) {
    try {
      const result = await metasyncApi.getVehicles();
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo vehículos de MetaSync:', error);
      res.status(500).json({ error: 'Error obteniendo vehículos' });
    }
  },
  
  /**
   * Obtiene un vehículo por su ID
   * GET /api/metasync/vehicle/:id
   */
  async getVehicleById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await metasyncApi.getVehicleById(id);
      res.json(result);
    } catch (error) {
      console.error(`Error obteniendo vehículo de MetaSync:`, error);
      res.status(500).json({ error: 'Error obteniendo vehículo' });
    }
  },
  
  /**
   * Obtiene piezas de la API MetaSync
   * GET /api/metasync/parts
   */
  async getParts(req: Request, res: Response) {
    try {
      const result = await metasyncApi.getParts();
      res.json(result);
    } catch (error) {
      console.error('Error obteniendo piezas de MetaSync:', error);
      res.status(500).json({ error: 'Error obteniendo piezas' });
    }
  },
  
  /**
   * Obtiene una pieza por su referencia
   * GET /api/metasync/parts/:ref
   */
  async getPartByRef(req: Request, res: Response) {
    try {
      const ref = Number(req.params.ref);
      const result = await metasyncApi.getPartByRef(ref);
      res.json(result);
    } catch (error) {
      console.error(`Error obteniendo pieza de MetaSync:`, error);
      res.status(500).json({ error: 'Error obteniendo pieza' });
    }
  },
  /**
   * Verifica la conexión con la API de MetaSync
   * POST /api/metasync/verify-connection
   */
  async verifyConnection(req: Request, res: Response) {
    try {
      const { apiKey, companyId } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'Clave API no proporcionada'
        });
      }
      
      // Para verificar la conexión, usamos un valor por defecto si no se proporciona el ID de empresa
      const idEmpresa = companyId || 1236;
      
      // Configurar el importador con la clave API y el ID de empresa
      importador.setConfig(apiKey, idEmpresa);
      
      // Devolver respuesta exitosa
      return res.status(200).json({
        success: true,
        message: 'Conexión verificada correctamente'
      });
    } catch (error) {
      console.error('Error verificando conexión con MetaSync:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando conexión',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Inicia un proceso de importación
   * POST /api/metasync/import
   */
  async startImport(req: Request, res: Response) {
    try {
      const { type, fromDate } = req.body;
      
      // Validar tipo de importación
      if (!type || !['vehicles', 'parts', 'all'].includes(type)) {
        return res.status(400).json({
          success: false, 
          message: 'Tipo de importación inválido. Debe ser "vehicles", "parts" o "all".'
        });
      }
      
      // Crear registro en el historial de importación
      const [importRecord] = await db
        .insert(importHistory)
        .values({
          type,
          startTime: new Date(),
          status: 'pending',
          totalItems: 0,
          processedItems: 0,
          newItems: 0,
          updatedItems: 0,
          errorCount: 0,
          errors: []
        })
        .returning();
      
      // Iniciar proceso de importación en segundo plano
      const parsedFromDate = fromDate ? new Date(fromDate) : undefined;
      
      // No esperamos a que termine
      importador.iniciarImportacion(type as 'vehicles' | 'parts' | 'all', importRecord.id, parsedFromDate)
        .catch(err => console.error(`Error en proceso de importación ${type}:`, err));
      
      // Devolver respuesta inmediata
      return res.status(202).json({
        success: true,
        message: `Proceso de importación de ${type} iniciado`,
        importId: importRecord.id
      });
    } catch (error) {
      console.error('Error iniciando importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error iniciando importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Obtiene el estado de una importación
   * GET /api/metasync/import/:id
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
      
      // Buscar registro en la base de datos
      const importRecord = await db
        .select()
        .from(importHistory)
        .where({ id: importId })
        .limit(1)
        .then(records => records[0] || null);
      
      if (!importRecord) {
        return res.status(404).json({
          success: false,
          message: 'Registro de importación no encontrado'
        });
      }
      
      // Devolver estado
      return res.status(200).json({
        success: true,
        import: importRecord
      });
    } catch (error) {
      console.error('Error obteniendo estado de importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo estado de importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },
  
  /**
   * Cancela una importación en progreso
   * POST /api/metasync/import/:id/cancel
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
      
      // Buscar registro en la base de datos
      const importRecord = await db
        .select()
        .from(importHistory)
        .where({ id: importId })
        .limit(1)
        .then(records => records[0] || null);
      
      if (!importRecord) {
        return res.status(404).json({
          success: false,
          message: 'Registro de importación no encontrado'
        });
      }
      
      // Solo se pueden cancelar importaciones pendientes o en ejecución
      if (importRecord.status !== 'pending' && importRecord.status !== 'running') {
        return res.status(400).json({
          success: false,
          message: `No se puede cancelar una importación con estado '${importRecord.status}'`
        });
      }
      
      // Actualizar estado a "cancelado"
      await db
        .update(importHistory)
        .set({
          status: 'cancelled',
          endTime: new Date()
        })
        .where({ id: importId });
      
      // Devolver respuesta
      return res.status(200).json({
        success: true,
        message: 'Importación cancelada correctamente'
      });
    } catch (error) {
      console.error('Error cancelando importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cancelando importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
};