import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { eq, desc, gt, and, sql, count } from 'drizzle-orm';
import { 
  importHistory, 
  apiConfig,
  syncControl,
  vehicles,
  parts,
  vehicleParts
} from '../../shared/schema.ts';

const router = Router();

// Función waitForImportCompletion eliminada - no es necesaria para el orden establecido

// Endpoint para obtener estado de sincronización
router.get('/sync-status', async (req: Request, res: Response) => {
  try {
    console.log('📊 Obteniendo estado de sincronización...');

    // Obtener estadísticas de importación de la base de datos
    const [vehiclesCountResult] = await db.select({ count: count() }).from(vehicles);
    const [partsCountResult] = await db.select({ count: count() }).from(parts);
    const [activeVehiclesCountResult] = await db.select({ count: count() }).from(vehicles).where(eq(vehicles.activo, true));
    const [activePartsCountResult] = await db.select({ count: count() }).from(parts).where(eq(parts.activo, true));

    // Obtener controles de sincronización activos usando SQL directo
    let vehiclesSync = null;
    let partsSync = null;
    
    try {
      const syncControlQuery = await db.select().from(syncControl).where(eq(syncControl.active, true));
      
      syncControlQuery.forEach((control: any) => {
        if (control.type === 'vehicles') {
          vehiclesSync = {
            type: control.type,
            lastSyncDate: control.lastSyncDate?.toISOString(),
            lastId: control.lastId || 0,
            recordsProcessed: control.recordsProcessed || 0,
            active: control.active,
            updatedAt: control.updatedAt?.toISOString()
          };
        } else if (control.type === 'parts') {
          partsSync = {
            type: control.type,
            lastSyncDate: control.lastSyncDate?.toISOString(),
            lastId: control.lastId || 0,
            recordsProcessed: control.recordsProcessed || 0,
            active: control.active,
            updatedAt: control.updatedAt?.toISOString()
          };
        }
      });
    } catch (syncError) {
      console.warn('⚠️ Error obteniendo sync_control:', syncError);
    }

    const response = {
      success: true,
      vehicles: vehiclesSync,
      parts: partsSync,
      dbCounts: {
        vehicles: Number(vehiclesCountResult?.count || 0),
        parts: Number(partsCountResult?.count || 0),
        vehiclesActive: Number(activeVehiclesCountResult?.count || 0),
        partsActive: Number(activePartsCountResult?.count || 0),
        lastUpdate: new Date().toISOString()
      }
    };

    console.log('✅ Estado de sincronización calculado:', {
      vehiclesTotal: response.dbCounts.vehicles,
      partsTotal: response.dbCounts.parts,
      hasVehiclesSync: !!vehiclesSync,
      hasPartsSync: !!partsSync
    });

    res.json(response);
  } catch (error) {
    console.error('❌ Error al obtener estado de sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      vehicles: null,
      parts: null,
      dbCounts: { vehicles: 0, parts: 0, vehiclesActive: 0, partsActive: 0 }
    });
  }
});

// Endpoint para importar vehículos usando servicio optimizado
router.post('/import/vehicles', async (req: Request, res: Response) => {
  try {
    console.log('🚗 Iniciando importación de vehículos...');

    // Obtener configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No hay configuración de API activa'
      });
    }

    // Crear registro de importación
    const isFullImport = req.body.fullImport === true;
    const [importRecord] = await db.insert(importHistory).values({
      type: 'vehicles',
      status: 'in_progress',
      isFullImport,
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      newItems: 0,
      updatedItems: 0,
      startTime: new Date(),
      details: { source: 'metasync-optimized', importType: isFullImport ? 'complete' : 'incremental' },
      errors: []
    }).returning();

    res.json({
      success: true,
      message: 'Importación de vehículos iniciada',
      importId: importRecord.id
    });

    // Iniciar importación en segundo plano usando MetasyncOptimizedImportService
    setTimeout(async () => {
      try {
        const { MetasyncOptimizedImportService } = await import('./metasync-optimized-import-service');
        const importService = new MetasyncOptimizedImportService();
        
        console.log(`🚗 Iniciando importación ${isFullImport ? 'COMPLETA' : 'INCREMENTAL'} de vehículos usando servicio optimizado...`);
        await importService.importVehicles(importRecord.id, isFullImport);
        
        console.log('✅ Importación de vehículos finalizada');
      } catch (error) {
        console.error('❌ Error en importación de vehículos:', error);
        
        // Actualizar estado como fallido
        await db
          .update(importHistory)
          .set({
            status: 'failed',
            progress: 0,
            endTime: new Date(),
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error iniciando importación de vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación de vehículos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para verificar estado de importación
router.get('/import/:id/status', async (req: Request, res: Response) => {
  try {
    const importId = parseInt(req.params.id);
    
    if (!importId || isNaN(importId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de importación inválido'
      });
    }

    const importRecord = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.id, importId))
      .limit(1);
    
    if (!importRecord) {
      return res.status(404).json({
        success: false,
        message: 'Importación no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: importRecord
    });
    
  } catch (error) {
    console.error('Error obteniendo estado de importación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado de importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para importar piezas usando servicio optimizado
router.post('/import/parts', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Iniciando importación ultra-optimizada de piezas...');

    // Obtener configuración de API
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'No hay configuración de API activa'
      });
    }

    // Crear registro de importación
    const isFullImport = req.body.forceFullImport === true;
    const [importRecord] = await db.insert(importHistory).values({
      type: 'parts',
      status: 'in_progress',
      is_full_import: isFullImport,
      progress: 0,
      total_items: 0,
      processed_items: 0,
      new_items: 0,
      updated_items: 0,
      start_time: new Date(),
      details: { source: 'metasync-optimized', importType: isFullImport ? 'complete' : 'incremental' },
      errors: []
    }).returning();

    res.json({
      success: true,
      message: `Importación ${isFullImport ? 'completa' : 'incremental'} de piezas iniciada`,
      importId: importRecord.id
    });

    // Iniciar importación en segundo plano usando MetasyncOptimizedImportService
    setTimeout(async () => {
      try {
        const { MetasyncOptimizedImportService } = await import('./metasync-optimized-import-service');
        const importService = new MetasyncOptimizedImportService();
        
        console.log(`🔧 Iniciando importación ${isFullImport ? 'COMPLETA' : 'INCREMENTAL'} de piezas usando servicio optimizado...`);
        await importService.importParts(importRecord.id, isFullImport);
        
        console.log('✅ Importación de piezas finalizada');
      } catch (error) {
        console.error('❌ Error en importación de piezas:', error);
        
        // Actualizar estado como fallido
        await db
          .update(importHistory)
          .set({
            status: 'failed',
            progress: 0,
            end_time: new Date(),
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, importRecord.id));
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error iniciando importación de piezas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación de piezas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para importación completa (mantener compatibilidad)
router.post('/import/full', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Importación completa - usando orden establecido...');

    const { MetasyncOptimizedImportService } = await import('./metasync-optimized-import-service');
    const importService = new MetasyncOptimizedImportService();

    // Iniciar importación de vehículos primero
    console.log('🚗 PASO 1: Iniciando importación de vehículos...');
    const vehicleImportId = await importService.startImport('vehicles', undefined, true);
    
    // Esperar un momento para que se inicie
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Iniciar importación de piezas después
    console.log('🔧 PASO 2: Iniciando importación de piezas...');
    const partsImportId = await importService.startImport('parts', undefined, true);

    res.json({
      success: true,
      message: 'Importación completa iniciada en orden establecido',
      vehicleImportId: vehicleImportId,
      partsImportId: partsImportId,
      details: {
        orderDescription: 'Ejecuta en orden establecido: 1) Vehículos → 2) Piezas',
        sequential: false,
        method: 'established_order'
      }
    });

  } catch (error) {
    console.error('❌ Error iniciando importación completa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación completa',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para iniciar importación completa simple (orden establecido)
router.post('/import/all', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Iniciando importación completa en orden establecido...');

    const { MetasyncOptimizedImportService } = await import('./metasync-optimized-import-service');
    const importService = new MetasyncOptimizedImportService();

    // Usar el orden simple establecido: incremental o completa
    const isFullImport = req.body.fullImport === true;
    
    // Crear registro maestro para rastrear la importación completa
    const [masterRecord] = await db.insert(importHistory).values({
      type: 'all',
      status: 'running',
      is_full_import: isFullImport,
      progress: 0,
      total_items: 0,
      processed_items: 0,
      new_items: 0,
      updated_items: 0,
      start_time: new Date(),
      processing_item: 'Iniciando importación secuencial...',
      details: { 
        source: 'metasync-optimized-sequential',
        importType: isFullImport ? 'complete' : 'incremental',
        phase: 'vehicles',
        childImportsType: isFullImport ? 'complete' : 'incremental'
      }
    }).returning();

    res.json({
      success: true,
      message: `Importación ${isFullImport ? 'completa' : 'incremental'} iniciada en orden secuencial`,
      importId: masterRecord.id,
      details: {
        orderDescription: 'Ejecuta orden secuencial: 1) Vehículos → 2) Piezas → 3) Sincronización',
        sequential: true,
        method: 'established_order'
      }
    });

    // Ejecutar importación secuencial en segundo plano
    setTimeout(async () => {
      try {
        console.log(`🚗 FASE 1: Iniciando importación ${isFullImport ? 'COMPLETA' : 'INCREMENTAL'} de vehículos...`);
        await db.update(importHistory)
          .set({ 
            processing_item: `Importando vehículos (${isFullImport ? 'completa' : 'incremental'})...`,
            details: { phase: 'vehicles', sequential: true, importType: isFullImport ? 'complete' : 'incremental' }
          })
          .where(eq(importHistory.id, masterRecord.id));

        const vehicleImportId = await importService.startImport('vehicles', undefined, isFullImport);
        console.log(`🚗 Vehículos ${isFullImport ? 'COMPLETOS' : 'INCREMENTALES'} iniciados con ID: ${vehicleImportId}`);
        
        // Esperar a que termine la importación de vehículos
        await waitForImportCompletion(vehicleImportId);
        console.log(`✅ Vehículos completados, procediendo con piezas...`);
        
        console.log(`🔧 FASE 2: Iniciando importación ${isFullImport ? 'COMPLETA' : 'INCREMENTAL'} de piezas...`);
        await db.update(importHistory)
          .set({ 
            processing_item: `Importando piezas (${isFullImport ? 'completa' : 'incremental'})...`,
            details: { phase: 'parts', sequential: true, importType: isFullImport ? 'complete' : 'incremental' }
          })
          .where(eq(importHistory.id, masterRecord.id));

        const partsImportId = await importService.startImport('parts', undefined, isFullImport);
        console.log(`🔧 Piezas ${isFullImport ? 'COMPLETAS' : 'INCREMENTALES'} iniciadas con ID: ${partsImportId}`);
        
        // Esperar a que termine la importación de piezas
        await waitForImportCompletion(partsImportId);
        console.log(`✅ Piezas completadas, procediendo con relaciones...`);
        
        console.log('🔗 FASE 3: Procesando relaciones pendientes...');
        await db.update(importHistory)
          .set({ 
            processing_item: 'Procesando relaciones vehículo-pieza...',
            details: { phase: 'relations', sequential: true }
          })
          .where(eq(importHistory.id, masterRecord.id));

        await importService.processPendingRelations();
        
        // Finalizar importación
        await db.update(importHistory)
          .set({
            status: 'completed',
            progress: 100,
            end_time: new Date(),
            processing_item: 'Importación secuencial completada',
            details: { phase: 'completed', sequential: true }
          })
          .where(eq(importHistory.id, masterRecord.id));

        console.log('✅ Importación secuencial completada exitosamente');

      } catch (error) {
        console.error('❌ Error en importación secuencial:', error);
        await db.update(importHistory)
          .set({
            status: 'failed',
            end_time: new Date(),
            processing_item: 'Error en importación secuencial',
            errors: [error instanceof Error ? error.message : 'Error desconocido']
          })
          .where(eq(importHistory.id, masterRecord.id));
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Error iniciando importación completa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación completa',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Función auxiliar para esperar la finalización de una importación
async function waitForImportCompletion(importId: number): Promise<void> {
  const maxWaitTime = 60 * 60 * 1000; // 60 minutos máximo
  const checkInterval = 5000; // Revisar cada 5 segundos
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const [importRecord] = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.id, importId))
      .limit(1);

    if (!importRecord) {
      throw new Error(`Importación ${importId} no encontrada`);
    }

    if (importRecord.status === 'completed') {
      console.log(`✅ Importación ${importId} completada`);
      return;
    }

    if (importRecord.status === 'failed' || importRecord.status === 'cancelled') {
      throw new Error(`Importación ${importId} falló con estado: ${importRecord.status}`);
    }

    // Esperar antes de la siguiente verificación
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Timeout esperando finalización de importación ${importId}`);
}

// Endpoints de control de importación
router.post('/import/:id/pause', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Pausa no implementada' });
});

router.post('/import/:id/resume', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Reanudación no implementada' });
});

router.post('/import/:id/cancel', async (req: Request, res: Response) => {
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

    // Solo se pueden cancelar importaciones en progreso, corriendo, procesando o pausadas
    if (!['in_progress', 'running', 'processing', 'pending', 'paused'].includes(importRecord.status)) {
      return res.status(400).json({
        success: false,
        message: `No se puede cancelar una importación con estado: ${importRecord.status}. Solo se pueden cancelar importaciones activas.`
      });
    }

    // Actualizar estado a cancelado
    await db
      .update(importHistory)
      .set({
        status: 'cancelled',
        end_time: new Date(),
        last_updated: new Date(),
        processing_item: 'Importación cancelada por el usuario'
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
});

export default router;