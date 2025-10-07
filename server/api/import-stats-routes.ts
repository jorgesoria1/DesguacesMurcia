
import { Router, Request, Response } from "express";
import { db } from "../db";
import { importHistory, importSchedule } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { isAdmin, isAuthenticated } from "../auth";

const router = Router();

// Proteger todas las rutas
router.use(isAuthenticated);
router.use(isAdmin);

// Obtener estadísticas de importación
router.get('/stats', async (req: Request, res: Response) => {
  try {
    console.log('📊 Obteniendo estadísticas de importación...');
    // Estadísticas generales
    const totalImports = await db
      .select({ count: sql`count(*)` })
      .from(importHistory);

    const successfulImports = await db
      .select({ count: sql`count(*)` })
      .from(importHistory)
      .where(eq(importHistory.status, 'completed'));

    const lastImport = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.endTime))
      .limit(1);

    const nextScheduled = await db
      .select()
      .from(importSchedule)
      .where(eq(importSchedule.active, true))
      .orderBy(importSchedule.nextRun)
      .limit(1);

    // Estadísticas por tipo
    const vehiclesStats = await db
      .select({
        totalItems: sql`sum(${importHistory.totalItems})`,
        newItems: sql`sum(${importHistory.newItems})`,
        updatedItems: sql`sum(${importHistory.updatedItems})`
      })
      .from(importHistory)
      .where(eq(importHistory.type, 'vehicles'));

    const partsStats = await db
      .select({
        totalItems: sql`sum(${importHistory.totalItems})`,
        newItems: sql`sum(${importHistory.newItems})`,
        updatedItems: sql`sum(${importHistory.updatedItems})`
      })
      .from(importHistory)
      .where(eq(importHistory.type, 'parts'));

    const stats = {
      totalImports: Number(totalImports[0]?.count || 0),
      successfulImports: Number(successfulImports[0]?.count || 0),
      successRate: totalImports[0]?.count 
        ? Math.round((Number(successfulImports[0]?.count) / Number(totalImports[0]?.count)) * 100)
        : 0,
      lastImport: lastImport[0]?.endTime,
      nextScheduled: nextScheduled[0]?.nextRun,
      vehicles: {
        totalItems: Number(vehiclesStats[0]?.totalItems || 0),
        newItems: Number(vehiclesStats[0]?.newItems || 0),
        updatedItems: Number(vehiclesStats[0]?.updatedItems || 0)
      },
      parts: {
        totalItems: Number(partsStats[0]?.totalItems || 0),
        newItems: Number(partsStats[0]?.newItems || 0),
        updatedItems: Number(partsStats[0]?.updatedItems || 0)
      }
    };

    console.log('📊 Estadísticas calculadas:', {
      totalImports: stats.totalImports,
      successRate: stats.successRate,
      vehiclesTotal: stats.vehicles.totalItems,
      partsTotal: stats.parts.totalItems
    });
    
    // Añadir headers de cache para optimizar
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
    res.json(stats);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de importación'
    });
  }
});

// Obtener historial completo de importaciones (MEJORADO)
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    console.log('📋 Obteniendo historial de importaciones completo...');
    
    const history = await db
      .select({
        id: importHistory.id,
        type: importHistory.type,
        status: importHistory.status,
        isFullImport: importHistory.isFullImport,
        startTime: importHistory.startTime,
        endTime: importHistory.endTime,
        totalItems: importHistory.totalItems,
        processedItems: importHistory.processedItems,
        newItems: importHistory.newItems,
        updatedItems: importHistory.updatedItems,
        errors: importHistory.errors,
        errorCount: importHistory.errorCount,
        processingItem: importHistory.processingItem,
        progress: importHistory.progress,
        details: importHistory.details
      })
      .from(importHistory)
      .orderBy(desc(importHistory.startTime))
      .limit(limit)
      .offset(offset);

    // Formatear datos para mejor visualización
    const formattedHistory = history.map(item => {
      // Calcular duración si está disponible
      let duration = null;
      if (item.startTime && item.endTime) {
        duration = Math.round((item.endTime.getTime() - item.startTime.getTime()) / 60000);
      }

      // Determinar nombre del tipo
      let typeName = 'Desconocido';
      switch (item.type) {
        case 'vehicles':
          typeName = 'Vehículos';
          break;
        case 'parts':
          typeName = 'Piezas';
          break;
        case 'all':
          typeName = 'Vehículos y Piezas';
          break;
      }

      // Determinar nombre del estado
      let statusName = 'Desconocido';
      switch (item.status?.toLowerCase()) {
        case 'completed':
          statusName = 'Completado';
          break;
        case 'failed':
          statusName = 'Fallido';
          break;
        case 'partial':
          statusName = 'Parcial';
          break;
        case 'in_progress':
        case 'processing':
        case 'running':
          statusName = 'En progreso';
          break;
        case 'pending':
          statusName = 'Pendiente';
          break;
        case 'cancelled':
          statusName = 'Cancelado';
          break;
        case 'paused':
          statusName = 'Pausado';
          break;
      }

      return {
        ...item,
        typeName,
        statusName,
        duration,
        importMode: item.isFullImport ? 'Completa' : 'Parcial',
        canResume: ['failed', 'partial', 'paused'].includes(item.status || ''),
        canCancel: ['in_progress', 'processing', 'running', 'pending'].includes(item.status || ''),
        canPause: ['in_progress', 'processing', 'running'].includes(item.status || '')
      };
    });

    console.log(`📋 Devolviendo ${formattedHistory.length} registros de historial`);
    res.json(formattedHistory);

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de importaciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Controlar importación (pausar, reanudar, cancelar)
router.post('/:id/:action', async (req: Request, res: Response) => {
  try {
    const importId = parseInt(req.params.id);
    const action = req.params.action;

    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Acción no válida'
      });
    }

    // Verificar que la importación existe
    const [importRecord] = await db
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

    // Validar transiciones de estado
    if (action === 'pause' && !['in_progress', 'running', 'processing'].includes(importRecord.status)) {
      return res.status(400).json({
        success: false,
        message: `No se puede pausar una importación con estado: ${importRecord.status}`
      });
    }

    if (action === 'resume' && importRecord.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: `No se puede reanudar una importación con estado: ${importRecord.status}`
      });
    }

    if (action === 'cancel' && !['in_progress', 'running', 'processing', 'pending', 'paused'].includes(importRecord.status)) {
      return res.status(400).json({
        success: false,
        message: `No se puede cancelar una importación con estado: ${importRecord.status}`
      });
    }

    const statusMap = {
      pause: 'paused',
      resume: 'in_progress',
      cancel: 'cancelled'
    };

    const updateData: any = {
      status: statusMap[action as keyof typeof statusMap],
      lastUpdated: new Date(),
    };

    if (action === 'cancel') {
      updateData.endTime = new Date();
      updateData.processingItem = 'Importación cancelada por el usuario';
    } else if (action === 'pause') {
      updateData.processingItem = 'Importación pausada por el usuario';
      updateData.details = {
        ...(importRecord.details || {}),
        pausedAt: new Date().toISOString(),
        canResume: true
      };
    } else if (action === 'resume') {
      updateData.processingItem = 'Reanudando importación...';
    }

    await db
      .update(importHistory)
      .set(updateData)
      .where(eq(importHistory.id, importId));

    console.log(`🔄 Importación ID=${importId} ${action === 'pause' ? 'pausada' : action === 'resume' ? 'reanudada' : 'cancelada'}`);

    res.json({
      success: true,
      message: `Importación ${action === 'pause' ? 'pausada' : action === 'resume' ? 'reanudada' : 'cancelada'} correctamente`
    });
  } catch (error) {
    console.error(`Error al ${req.params.action} importación:`, error);
    res.status(500).json({
      success: false,
      message: `Error al ${req.params.action} la importación`,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Eliminar todo el historial de importaciones
router.delete('/clear-all', async (req: Request, res: Response) => {
  try {
    console.log('🗑️ Solicitud para eliminar todo el historial de importaciones');
    
    // Primero verificar si hay importaciones realmente en progreso (no canceladas ni completadas)
    const activeImports = await db
      .select()
      .from(importHistory)
      .where(sql`${importHistory.status} IN ('in_progress', 'running', 'processing')`);

    if (activeImports.length > 0) {
      console.log(`❌ No se puede eliminar: ${activeImports.length} importaciones en progreso`);
      console.log('Estados encontrados:', activeImports.map(i => `${i.id}: ${i.status}`));
      return res.status(400).json({
        success: false,
        message: `No se pueden eliminar las importaciones mientras hay ${activeImports.length} en progreso. Cancela las importaciones activas primero.`
      });
    }

    // Eliminar todos los registros de historial
    const deletedCount = await db
      .delete(importHistory)
      .returning({ id: importHistory.id });

    console.log(`✅ Eliminados ${deletedCount.length} registros del historial de importaciones`);

    res.status(200).json({
      success: true,
      message: `Se eliminaron ${deletedCount.length} registros del historial de importaciones`,
      deletedCount: deletedCount.length
    });
  } catch (error) {
    console.error('❌ Error al eliminar todo el historial de importaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el historial de importaciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Eliminar importación del historial
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const importId = parseInt(req.params.id);
    console.log(`🗑️ Solicitud de eliminación para ID: ${importId}`);

    if (isNaN(importId)) {
      console.log('❌ ID inválido:', req.params.id);
      return res.status(400).json({
        success: false,
        message: 'ID de importación inválido'
      });
    }

    // Verificar que la importación existe
    const [importRecord] = await db
      .select()
      .from(importHistory)
      .where(eq(importHistory.id, importId))
      .limit(1);

    if (!importRecord) {
      console.log(`❌ Importación no encontrada: ${importId}`);
      return res.status(404).json({
        success: false,
        message: 'Importación no encontrada'
      });
    }

    console.log(`📋 Importación encontrada: ${importRecord.id} - ${importRecord.status}`);

    // No permitir eliminar importaciones en progreso
    if (['in_progress', 'running', 'processing', 'pending'].includes(importRecord.status)) {
      console.log(`❌ No se puede eliminar importación en progreso: ${importRecord.status}`);
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar una importación con estado: ${importRecord.status}. Cancela la importación primero.`
      });
    }

    // Eliminar la importación
    const result = await db
      .delete(importHistory)
      .where(eq(importHistory.id, importId))
      .returning({ id: importHistory.id });

    if (result.length === 0) {
      console.log(`❌ No se pudo eliminar la importación ID=${importId}`);
      return res.status(404).json({
        success: false,
        message: 'No se pudo eliminar la importación'
      });
    }

    console.log(`✅ Importación ID=${importId} eliminada del historial correctamente`);

    res.status(200).json({
      success: true,
      message: 'Importación eliminada del historial correctamente',
      deletedId: importId
    });
  } catch (error) {
    console.error('❌ Error al eliminar importación del historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la importación del historial',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Limpiar estadísticas de importación
router.delete('/history/stats', async (req: Request, res: Response) => {
  try {
    // Resetear contadores de estadísticas sin eliminar historial
    await db
      .update(importHistory)
      .set({
        newItems: 0,
        updatedItems: 0,
        processedItems: 0,
        totalItems: 0
      });

    console.log('📊 Estadísticas de importación reiniciadas');

    res.json({
      success: true,
      message: 'Estadísticas de importación reiniciadas correctamente'
    });
  } catch (error) {
    console.error('Error al limpiar estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar las estadísticas de importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Actualizar contadores de piezas en vehículos
router.post('/update-vehicle-counters', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Actualizando contadores de piezas en vehículos...');
    
    const { MetasyncOptimizedImportService } = await import('../api/metasync-optimized-import-service');
    const service = new MetasyncOptimizedImportService();
    
    await service.updateVehiclePartsCounters();
    
    console.log('✅ Contadores actualizados correctamente');
    
    res.json({
      success: true,
      message: 'Contadores de piezas actualizados correctamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando contadores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar contadores de piezas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Sincronizar piezas vendidas (ocultar del catálogo) - PROCESO INDEPENDIENTE
router.post('/sync-sold-parts', async (req: Request, res: Response) => {
  try {
    console.log('🔄 INICIANDO SINCRONIZACIÓN INDEPENDIENTE DE PIEZAS VENDIDAS...');
    
    const { MetasyncOptimizedImportService } = await import('../api/metasync-optimized-import-service');
    
    // CRÍTICO: Crear y configurar servicio ANTES del setTimeout para garantizar configuración
    console.log('🔧 Creando y configurando servicio...');
    const service = new MetasyncOptimizedImportService();
    await service.configure();
    console.log('✅ Servicio configurado con API Key');
    
    // Crear un registro de importación para rastrear el proceso
    const importRecord = await db.insert(importHistory).values({
      type: 'sync-sold-parts',
      status: 'in_progress',
      isFullImport: false,
      startTime: new Date(),
      totalItems: 0,
      processedItems: 0,
      newItems: 0,
      updatedItems: 0,
      errorCount: 0,
      errors: [],
      processingItem: 'Obteniendo piezas actuales del API...'
    }).returning();

    const importId = importRecord[0].id;
    
    // Ejecutar SOLO sincronización de piezas vendidas en segundo plano
    // El servicio ya está configurado y puede usarse directamente
    setTimeout(async () => {
      try {
        
        console.log('🔍 Paso 1: Obteniendo lista completa de piezas del API...');
        
        // Actualizar estado
        await db.update(importHistory)
          .set({ 
            processingItem: 'Obteniendo lista completa de piezas del API...',
            progress: 10
          })
          .where(eq(importHistory.id, importId));
        
        // Obtener todas las piezas actuales del API (con función corregida)
        const allApiParts = await service.getAllCurrentApiParts();
        
        console.log(`📊 Obtenidas ${allApiParts.length} piezas del API`);
        
        // Actualizar estado
        await db.update(importHistory)
          .set({ 
            totalItems: allApiParts.length,
            processingItem: 'Comparando con base de datos local...',
            progress: 50
          })
          .where(eq(importHistory.id, importId));
        
        if (allApiParts.length === 0) {
          throw new Error('No se pudieron obtener piezas del API');
        }
        
        console.log('🔍 Paso 2: Sincronizando con base de datos local (modo híbrido)...');
        
        // Ejecutar sincronización en modo híbrido
        const syncResult = await service.syncRemovedParts(allApiParts, 'hibrido');
        
        console.log('✅ SINCRONIZACIÓN COMPLETADA:');
        console.log(`   - ${syncResult.marked} piezas marcadas como no disponibles en API`);
        console.log(`   - ${syncResult.preserved} piezas preservadas para historial`);
        
        // Actualizar registro como completado
        await db.update(importHistory)
          .set({
            status: 'completed',
            endTime: new Date(),
            processedItems: syncResult.marked + syncResult.preserved,
            updatedItems: syncResult.marked,
            processingItem: 'Completado',
            progress: 100
          })
          .where(eq(importHistory.id, importId));
          
      } catch (error) {
        console.error('❌ Error en sincronización independiente:', error);
        
        // Actualizar registro como fallido
        await db.update(importHistory)
          .set({
            status: 'failed',
            endTime: new Date(),
            errors: [error instanceof Error ? error.message : String(error)],
            errorCount: 1,
            processingItem: 'Error en sincronización'
          })
          .where(eq(importHistory.id, importId));
      }
    }, 100);
    
    res.json({
      success: true,
      message: 'Sincronización independiente de piezas vendidas iniciada',
      importId: importId,
      note: 'Este proceso solo sincroniza piezas vendidas sin importar nuevos datos'
    });
  } catch (error) {
    console.error('❌ Error iniciando sincronización de piezas vendidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sincronización de piezas vendidas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener programaciones de importación
router.get('/schedules', async (req: Request, res: Response) => {
  try {
    console.log('📅 Obteniendo programaciones de importación...');
    
    const schedules = await db
      .select()
      .from(importSchedule)
      .orderBy(importSchedule.id);

    console.log(`📅 Encontradas ${schedules.length} programaciones`);
    res.json(schedules);
  } catch (error) {
    console.error('❌ Error obteniendo programaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener programaciones de importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Crear nueva programación de importación
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    console.log('📅 Creando nueva programación de importación...');
    
    const { type, frequency, active = true, startTime = '02:00', isFullImport = false } = req.body;
    
    if (!type || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'Tipo y frecuencia son requeridos'
      });
    }

    if (!['vehicles', 'parts', 'all', 'orders'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de importación no válido'
      });
    }

    if (!['1h', '6h', '12h', '24h', '7d'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: 'Frecuencia no válida'
      });
    }

    // Validar formato de hora de inicio (HH:MM)
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de hora de inicio inválido. Use HH:MM (00:00 - 23:59)'
      });
    }

    // Verificar si ya existe una programación del mismo tipo
    const existingSchedule = await db
      .select()
      .from(importSchedule)
      .where(eq(importSchedule.type, type))
      .limit(1);

    if (existingSchedule.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una programación para el tipo ${type}. Actualiza la existente en lugar de crear una nueva.`
      });
    }

    // Calcular próxima ejecución basada en startTime (horario español)
    const now = new Date();
    const nextRun = new Date(now);
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Convertir hora española a UTC para almacenar en la base de datos
    // España está UTC+2, así que restamos 2 horas para obtener UTC
    const utcHours = (hours - 2 + 24) % 24;
    nextRun.setHours(utcHours, minutes, 0, 0);
    
    // Si la hora ya pasó hoy, programar para mañana
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    // Crear la programación
    const [newSchedule] = await db
      .insert(importSchedule)
      .values({
        type,
        frequency,
        active,
        startTime,
        isFullImport,
        nextRun,
        options: {}
      })
      .returning();

    console.log(`📅 Nueva programación creada: ${type} cada ${frequency} a las ${startTime}`);
    
    // Notificar al scheduler para que programe la nueva tarea
    try {
      const scheduler = (global as any).importScheduler;
      if (scheduler && newSchedule.active) {
        scheduler.addSchedule(newSchedule);
        console.log(`✅ Programación ID=${newSchedule.id} agregada al scheduler`);
      } else if (!scheduler) {
        console.warn('⚠️ Scheduler no disponible, la programación se cargará al reiniciar el servidor');
      }
    } catch (error) {
      console.error('❌ Error al notificar al scheduler:', error);
    }
    
    res.json({
      success: true,
      message: 'Programación creada correctamente',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('❌ Error creando programación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear programación de importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Actualizar programación existente
router.put('/schedule/:id', async (req: Request, res: Response) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const { frequency, active, isFullImport, days } = req.body;
    
    if (isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de programación inválido'
      });
    }

    console.log(`📅 Actualizando programación ID=${scheduleId}...`);

    // Verificar que la programación existe
    const [existingSchedule] = await db
      .select()
      .from(importSchedule)
      .where(eq(importSchedule.id, scheduleId))
      .limit(1);

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada'
      });
    }

    // Preparar datos de actualización
    const updateData: any = {};
    
    if (frequency !== undefined) {
      if (!['1h', '6h', '12h', '24h', '7d'].includes(frequency)) {
        return res.status(400).json({
          success: false,
          message: 'Frecuencia no válida'
        });
      }
      updateData.frequency = frequency;
    }
    
    if (active !== undefined) {
      updateData.active = active;
    }
    
    if (isFullImport !== undefined) {
      updateData.isFullImport = isFullImport;
    }
    
    if (days !== undefined) {
      updateData.days = days;
    }

    // Agregar soporte para startTime
    const { startTime } = req.body;
    if (startTime !== undefined) {
      const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de hora de inicio inválido. Use HH:MM (00:00 - 23:59)'
        });
      }
      updateData.startTime = startTime;
    }

    // Recalcular nextRun si cambiaron frequency o startTime
    if (frequency !== undefined || startTime !== undefined) {
      const now = new Date();
      const nextRun = new Date(now);
      const finalStartTime = startTime || existingSchedule.startTime;
      
      if (finalStartTime) {
        const [hours, minutes] = finalStartTime.split(':').map(Number);
        
        // Convertir hora española a UTC para almacenar en la base de datos
        // España está UTC+2, así que restamos 2 horas para obtener UTC
        const utcHours = (hours - 2 + 24) % 24;
        nextRun.setHours(utcHours, minutes, 0, 0);
        
        // Si la hora ya pasó hoy, programar para mañana
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
      } else {
        // Fallback si no hay startTime
        nextRun.setTime(now.getTime() + 5 * 60 * 1000);
      }
      
      updateData.nextRun = nextRun;
    }

    // Actualizar la programación
    const [updatedSchedule] = await db
      .update(importSchedule)
      .set(updateData)
      .where(eq(importSchedule.id, scheduleId))
      .returning();

    console.log(`📅 Programación actualizada: ${updatedSchedule.type} - ${updatedSchedule.frequency} - ${updatedSchedule.active ? 'activa' : 'inactiva'} - ${updatedSchedule.isFullImport ? 'completa' : 'incremental'}`);
    
    res.json({
      success: true,
      message: 'Programación actualizada correctamente',
      schedule: updatedSchedule
    });
  } catch (error) {
    console.error('❌ Error actualizando programación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar programación de importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Eliminar programación
router.delete('/schedule/:id', async (req: Request, res: Response) => {
  try {
    const scheduleId = parseInt(req.params.id);
    
    if (isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de programación inválido'
      });
    }

    console.log(`📅 Eliminando programación ID=${scheduleId}...`);

    // Verificar que la programación existe
    const [existingSchedule] = await db
      .select()
      .from(importSchedule)
      .where(eq(importSchedule.id, scheduleId))
      .limit(1);

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada'
      });
    }

    // Eliminar la programación
    await db
      .delete(importSchedule)
      .where(eq(importSchedule.id, scheduleId));

    console.log(`📅 Programación eliminada: ${existingSchedule.type}`);
    
    res.json({
      success: true,
      message: 'Programación eliminada correctamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando programación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar programación de importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
