/**
 * Rutas de importación corregidas - Elimina limitaciones de 1000 registros
 * y corrige todos los problemas identificados
 */

import { Request, Response, Router } from 'express';
import { db } from '../db';
import { importHistory, apiConfig } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { importServiceFixed } from '../services/import-service-fixed';

const router = Router();

/**
 * Inicia importación COMPLETA de vehículos (sin límites)
 */
router.post('/import/vehicles/full', async (req: Request, res: Response) => {
  try {
    console.log('🚗 Iniciando importación COMPLETA de vehículos (sin límites)');
    
    // Verificar configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró configuración de API activa'
      });
    }

    // Crear registro de importación
    const [importRecord] = await db.insert(importHistory)
      .values({
        type: 'vehicles',
        status: 'pending',
        isFullImport: true,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: 'full',
          source: 'metasync-fixed'
        }
      })
      .returning();

    // Iniciar importación en segundo plano
    setTimeout(async () => {
      try {
        await importServiceFixed.importVehicles(importRecord.id, true);
      } catch (error) {
        console.error('Error en importación completa de vehículos:', error);
        await db.update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 100);

    res.json({
      success: true,
      message: 'Importación completa de vehículos iniciada',
      importId: importRecord.id
    });

  } catch (error) {
    console.error('Error iniciando importación completa de vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Inicia importación PARCIAL de vehículos (desde fecha)
 */
router.post('/import/vehicles/partial', async (req: Request, res: Response) => {
  try {
    const { fromDate } = req.body;
    console.log('🚗 Iniciando importación PARCIAL de vehículos desde:', fromDate);
    
    // Verificar configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró configuración de API activa'
      });
    }

    // Crear registro de importación
    const [importRecord] = await db.insert(importHistory)
      .values({
        type: 'vehicles',
        status: 'pending',
        isFullImport: false,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: 'partial',
          fromDate: fromDate,
          source: 'metasync-fixed'
        }
      })
      .returning();

    // Iniciar importación en segundo plano
    setTimeout(async () => {
      try {
        const dateFrom = fromDate ? new Date(fromDate) : undefined;
        await importServiceFixed.importVehicles(importRecord.id, false, dateFrom);
      } catch (error) {
        console.error('Error en importación parcial de vehículos:', error);
        await db.update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 100);

    res.json({
      success: true,
      message: 'Importación parcial de vehículos iniciada',
      importId: importRecord.id
    });

  } catch (error) {
    console.error('Error iniciando importación parcial de vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Inicia importación COMPLETA de piezas (sin límites)
 */
router.post('/import/parts/full', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Iniciando importación COMPLETA de piezas (sin límites)');
    
    // Verificar configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró configuración de API activa'
      });
    }

    // Crear registro de importación
    const [importRecord] = await db.insert(importHistory)
      .values({
        type: 'parts',
        status: 'pending',
        isFullImport: true,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: 'full',
          source: 'metasync-fixed'
        }
      })
      .returning();

    // Iniciar importación en segundo plano
    setTimeout(async () => {
      try {
        await importServiceFixed.importParts(importRecord.id, true);
      } catch (error) {
        console.error('Error en importación completa de piezas:', error);
        await db.update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 100);

    res.json({
      success: true,
      message: 'Importación completa de piezas iniciada',
      importId: importRecord.id
    });

  } catch (error) {
    console.error('Error iniciando importación completa de piezas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Inicia importación PARCIAL de piezas (desde fecha)
 */
router.post('/import/parts/partial', async (req: Request, res: Response) => {
  try {
    const { fromDate } = req.body;
    console.log('🔧 Iniciando importación PARCIAL de piezas desde:', fromDate);
    
    // Verificar configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró configuración de API activa'
      });
    }

    // Crear registro de importación
    const [importRecord] = await db.insert(importHistory)
      .values({
        type: 'parts',
        status: 'pending',
        isFullImport: false,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: 'partial',
          fromDate: fromDate,
          source: 'metasync-fixed'
        }
      })
      .returning();

    // Iniciar importación en segundo plano
    setTimeout(async () => {
      try {
        const dateFrom = fromDate ? new Date(fromDate) : undefined;
        await importServiceFixed.importParts(importRecord.id, false, dateFrom);
      } catch (error) {
        console.error('Error en importación parcial de piezas:', error);
        await db.update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 100);

    res.json({
      success: true,
      message: 'Importación parcial de piezas iniciada',
      importId: importRecord.id
    });

  } catch (error) {
    console.error('Error iniciando importación parcial de piezas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Inicia importación COMPLETA de todo (vehículos + piezas)
 */
router.post('/import/all/full', async (req: Request, res: Response) => {
  try {
    console.log('🚗🔧 Iniciando importación COMPLETA de vehículos y piezas');
    
    // Verificar configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró configuración de API activa'
      });
    }

    // Crear registros de importación separados
    const [vehiclesImportRecord] = await db.insert(importHistory)
      .values({
        type: 'vehicles',
        status: 'pending',
        isFullImport: true,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: 'full',
          source: 'metasync-fixed',
          partOfFullImport: true
        }
      })
      .returning();

    const [partsImportRecord] = await db.insert(importHistory)
      .values({
        type: 'parts',
        status: 'pending',
        isFullImport: true,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: 'full',
          source: 'metasync-fixed',
          partOfFullImport: true
        }
      })
      .returning();

    // Iniciar importaciones en secuencia (vehículos primero, luego piezas)
    setTimeout(async () => {
      try {
        // Primero vehículos
        console.log('📋 Iniciando vehículos en importación completa...');
        await importServiceFixed.importVehicles(vehiclesImportRecord.id, true);
        
        // Luego piezas
        console.log('📋 Iniciando piezas en importación completa...');
        await importServiceFixed.importParts(partsImportRecord.id, true);
        
        console.log('✅ Importación completa de todo finalizada');
      } catch (error) {
        console.error('Error en importación completa:', error);
      }
    }, 100);

    res.json({
      success: true,
      message: 'Importación completa de vehículos y piezas iniciada',
      vehiclesImportId: vehiclesImportRecord.id,
      partsImportId: partsImportRecord.id
    });

  } catch (error) {
    console.error('Error iniciando importación completa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación completa',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Obtiene el historial de importaciones mejorado
 */
router.get('/import/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.startTime))
      .limit(limit)
      .offset(offset);

    // Formatear datos para mejor visualización
    const formattedHistory = history.map(item => ({
      ...item,
      typeName: item.type === 'vehicles' ? 'Vehículos' : 
                item.type === 'parts' ? 'Piezas' : 'Vehículos y Piezas',
      statusName: getStatusName(item.status),
      duration: item.endTime && item.startTime ? 
        Math.round((item.endTime.getTime() - item.startTime.getTime()) / 60000) : null,
      isVisible: true // Forzar visibilidad
    }));

    res.json(formattedHistory);

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Cancela una importación en progreso
 */
router.post('/import/:id/cancel', async (req: Request, res: Response) => {
  try {
    const importId = parseInt(req.params.id);
    
    await db.update(importHistory)
      .set({
        status: 'cancelled',
        endTime: new Date(),
        processingItem: 'Importación cancelada por el usuario'
      })
      .where(eq(importHistory.id, importId));

    res.json({
      success: true,
      message: 'Importación cancelada correctamente'
    });

  } catch (error) {
    console.error('Error cancelando importación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Helper para nombres de estado
function getStatusName(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed': return 'Completado';
    case 'failed': return 'Fallido';
    case 'partial': return 'Parcial';
    case 'in_progress': return 'En progreso';
    case 'pending': return 'Pendiente';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
}

export default router;