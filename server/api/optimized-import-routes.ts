import { Request, Response, Router } from 'express';
import { db } from '../db';
import { importHistory, apiConfig } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { optimizedVehicleImport } from '../services/optimized-vehicle-import';
import { optimizedPartsImport } from '../services/optimized-parts-import';

const router = Router();

/**
 * Endpoint optimizado para importación rápida de vehículos
 * Mejoras implementadas:
 * - Procesamiento por lotes más eficiente
 * - Operaciones de base de datos optimizadas con upserts
 * - Reducción de consultas individuales
 * - Mejor manejo de memoria
 * - Procesamiento paralelo controlado
 */
router.post('/vehicles/optimized', async (req: Request, res: Response) => {
  try {
    const { fullImport = true } = req.body;
    
    console.log(`🚀 Iniciando importación ${fullImport ? 'COMPLETA' : 'INCREMENTAL'} OPTIMIZADA de vehículos`);
    
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
        isFullImport: fullImport,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: fullImport ? 'complete-optimized' : 'incremental-optimized',
          source: 'optimized-vehicle-import',
          optimizations: [
            'batch-processing',
            'bulk-upserts',
            'reduced-queries',
            'parallel-processing'
          ]
        }
      })
      .returning();

    // Iniciar importación optimizada en segundo plano
    setTimeout(async () => {
      try {
        await optimizedVehicleImport.importVehiclesOptimized(importRecord.id, fullImport);
      } catch (error) {
        console.error('Error en importación optimizada de vehículos:', error);
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
      message: `Importación ${fullImport ? 'completa' : 'incremental'} optimizada de vehículos iniciada`,
      importId: importRecord.id,
      optimizations: [
        'Procesamiento por lotes mejorado (1000 vehículos por lote)',
        'Operaciones de base de datos bulk upsert',
        'Reducción de consultas individuales',
        'Mejor gestión de memoria',
        'Procesamiento paralelo controlado'
      ],
      estimatedSpeedImprovement: '3-5x más rápido que importación estándar'
    });

  } catch (error) {
    console.error('Error iniciando importación optimizada de vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación optimizada',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint optimizado para importación rápida de piezas
 * Mejoras implementadas:
 * - Procesamiento por lotes más eficiente
 * - Operaciones de base de datos optimizadas con upserts
 * - Asociación automática con vehículos
 * - Activación inteligente de piezas
 * - Mejor manejo de memoria
 */
router.post('/parts/optimized', async (req: Request, res: Response) => {
  try {
    const { fullImport = true } = req.body;
    
    console.log(`🔧 Iniciando importación ${fullImport ? 'COMPLETA' : 'INCREMENTAL'} OPTIMIZADA de piezas`);
    
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
        isFullImport: fullImport,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errors: [],
        details: { 
          importType: fullImport ? 'complete-optimized' : 'incremental-optimized',
          source: 'optimized-parts-import',
          optimizations: [
            'batch-processing',
            'bulk-upserts',
            'vehicle-association',
            'smart-activation',
            'reduced-queries'
          ]
        }
      })
      .returning();

    // Iniciar importación optimizada en segundo plano
    setTimeout(async () => {
      try {
        await optimizedPartsImport.importPartsOptimized(importRecord.id, fullImport);
      } catch (error) {
        console.error('Error en importación optimizada de piezas:', error);
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
      message: `Importación ${fullImport ? 'completa' : 'incremental'} optimizada de piezas iniciada`,
      importId: importRecord.id,
      optimizations: [
        'Procesamiento por lotes mejorado (1000 piezas por lote)',
        'Operaciones de base de datos bulk upsert',
        'Asociación automática con vehículos existentes',
        'Activación inteligente basada en relaciones válidas',
        'Reducción de consultas individuales',
        'Mejor gestión de memoria'
      ],
      estimatedSpeedImprovement: '3-5x más rápido que importación estándar'
    });

  } catch (error) {
    console.error('Error iniciando importación optimizada de piezas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación optimizada de piezas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint para obtener estadísticas de rendimiento de importaciones
 */
router.get('/performance-stats', async (req: Request, res: Response) => {
  try {
    // Obtener estadísticas de las últimas importaciones
    const recentImports = await db.select()
      .from(importHistory)
      .where(eq(importHistory.type, 'vehicles'))
      .orderBy(desc(importHistory.startTime))
      .limit(10);

    const stats = recentImports.map(imp => {
      const duration = imp.endTime && imp.startTime 
        ? (imp.endTime.getTime() - imp.startTime.getTime()) / 1000 
        : null;
      
      const speed = duration && imp.processedItems 
        ? Math.round(imp.processedItems / duration) 
        : null;

      const isOptimized = imp.details && 
        typeof imp.details === 'object' && 
        'source' in imp.details &&
        imp.details.source === 'optimized-vehicle-import';

      return {
        id: imp.id,
        type: isOptimized ? 'optimized' : 'standard',
        status: imp.status,
        duration: duration ? `${duration}s` : 'En progreso',
        processedItems: imp.processedItems,
        speed: speed ? `${speed} veh/s` : 'N/A',
        startTime: imp.startTime,
        isFullImport: imp.isFullImport
      };
    });

    // Calcular mejoras de rendimiento
    const optimizedStats = stats.filter(s => s.type === 'optimized' && s.speed !== 'N/A');
    const standardStats = stats.filter(s => s.type === 'standard' && s.speed !== 'N/A');

    let performanceImprovement = null;
    if (optimizedStats.length > 0 && standardStats.length > 0) {
      const avgOptimized = optimizedStats.reduce((sum, s) => 
        sum + parseInt(s.speed.split(' ')[0]), 0) / optimizedStats.length;
      const avgStandard = standardStats.reduce((sum, s) => 
        sum + parseInt(s.speed.split(' ')[0]), 0) / standardStats.length;
      
      performanceImprovement = avgOptimized / avgStandard;
    }

    res.json({
      success: true,
      recentImports: stats,
      performanceMetrics: {
        optimizedImports: optimizedStats.length,
        standardImports: standardStats.length,
        averageOptimizedSpeed: optimizedStats.length > 0 
          ? `${Math.round(optimizedStats.reduce((sum, s) => 
              sum + parseInt(s.speed.split(' ')[0]), 0) / optimizedStats.length)} veh/s`
          : 'N/A',
        averageStandardSpeed: standardStats.length > 0 
          ? `${Math.round(standardStats.reduce((sum, s) => 
              sum + parseInt(s.speed.split(' ')[0]), 0) / standardStats.length)} veh/s`
          : 'N/A',
        performanceImprovement: performanceImprovement 
          ? `${performanceImprovement.toFixed(1)}x más rápido`
          : 'Datos insuficientes'
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de rendimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export { router as optimizedImportRoutes };