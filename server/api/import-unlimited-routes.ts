/**
 * Rutas de importación SIN LIMITACIONES ARTIFICIALES
 * Corrige todos los problemas identificados en la auditoría
 */

import { Request, Response, Router } from 'express';
import { db } from '../db';
import { importHistory, apiConfig } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { importUnlimited } from '../services/import-unlimited';

const router = Router();

/**
 * Inicia importación COMPLETA de vehículos (TODOS los disponibles)
 */
router.post('/vehicles/full', async (req: Request, res: Response) => {
  try {
    console.log('🚗 Iniciando importación COMPLETA de vehículos (sin límites)');
    
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuración de API no encontrada'
      });
    }

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
          importType: 'full_unlimited',
          source: 'metasync-unlimited'
        }
      })
      .returning();

    setTimeout(async () => {
      try {
        await importUnlimited.importAllVehicles(importRecord.id, true);
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
      message: 'Importación completa de vehículos iniciada (sin límites)',
      importId: importRecord.id
    });

  } catch (error) {
    console.error('Error iniciando importación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar importación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Inicia importación COMPLETA de piezas (TODAS las disponibles)
 */
router.post('/parts/full', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Iniciando importación COMPLETA de piezas (sin límites)');
    
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuración de API no encontrada'
      });
    }

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
          importType: 'full_unlimited',
          source: 'metasync-unlimited'
        }
      })
      .returning();

    setTimeout(async () => {
      try {
        await importUnlimited.importAllParts(importRecord.id, true);
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
      message: 'Importación completa de piezas iniciada (sin límites)',
      importId: importRecord.id
    });

  } catch (error) {
    console.error('Error iniciando importación:', error);
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
router.post('/all/full', async (req: Request, res: Response) => {
  try {
    console.log('🚗🔧 Iniciando importación COMPLETA de todo (sin límites)');
    
    const [config] = await db.select().from(apiConfig).where(eq(apiConfig.active, true)).limit(1);
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuración de API no encontrada'
      });
    }

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
          importType: 'full_unlimited',
          source: 'metasync-unlimited',
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
          importType: 'full_unlimited',
          source: 'metasync-unlimited',
          partOfFullImport: true
        }
      })
      .returning();

    setTimeout(async () => {
      try {
        console.log('Iniciando vehículos...');
        await importUnlimited.importAllVehicles(vehiclesImportRecord.id, true);
        
        console.log('Iniciando piezas...');
        await importUnlimited.importAllParts(partsImportRecord.id, true);
        
        console.log('Importación completa finalizada');
      } catch (error) {
        console.error('Error en importación completa:', error);
      }
    }, 100);

    res.json({
      success: true,
      message: 'Importación completa de todo iniciada (sin límites)',
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
 * Obtiene estadísticas completas del sistema
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const vehicleCount = await db.execute(sql`SELECT COUNT(*) as count FROM vehicles`);
    const partCount = await db.execute(sql`SELECT COUNT(*) as count FROM parts`);
    const activeVehicleCount = await db.execute(sql`SELECT COUNT(*) as count FROM vehicles WHERE activo = true`);
    const activePartCount = await db.execute(sql`SELECT COUNT(*) as count FROM parts WHERE activo = true`);

    const recentImports = await db
      .select()
      .from(importHistory)
      .orderBy(desc(importHistory.startTime))
      .limit(5);

    const stats = {
      vehicles: {
        total: Number(vehicleCount.rows[0].count) || 0,
        active: Number(activeVehicleCount.rows[0].count) || 0
      },
      parts: {
        total: Number(partCount.rows[0].count) || 0,
        active: Number(activePartCount.rows[0].count) || 0
      },
      imports: {
        recent: recentImports.length,
        lastImport: recentImports[0]?.startTime || null
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

export default router;