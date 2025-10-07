import { Router } from 'express';
import { db } from '../db';
import { importHistory } from '../../shared/schema';
import { normalizePartData, normalizeVehicleData } from '../utils/array-normalizer';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Endpoint para probar el sistema de importaciones de forma segura
 */
router.post('/test-import', async (req, res) => {
  console.log('🧪 Iniciando test de importación...');
  
  try {
    // Crear registro de importación de prueba
    const [importRecord] = await db.insert(importHistory).values({
      type: 'test',
      status: 'running',
      progress: 0,
      totalItems: 10,
      processedItems: 0,
      newItems: 0,
      updatedItems: 0,
      startTime: new Date(),
      details: { 
        testMode: true,
        source: 'manual-test'
      }
    }).returning();

    console.log('✅ Registro de importación creado:', importRecord.id);

    // Test del normalizador de arrays
    console.log('🔧 Probando normalizador de arrays...');
    
    const testCases = [
      { imagenes: ['http://example.com/img1.jpg', 'http://example.com/img2.jpg'] },
      { imagenes: 'http://example.com/single.jpg' },
      { imagenes: null },
      { imagenes: undefined },
      { imagenes: [] }
    ];

    const normalizationResults = testCases.map((testCase, index) => {
      const testData = {
        refLocal: 12345 + index,
        idEmpresa: 1236,
        codFamilia: 'TEST',
        descripcionFamilia: 'Test Family',
        codArticulo: `TEST00${index}`,
        descripcionArticulo: 'Test Article',
        precio: '10.00',
        peso: '100',
        imagenes: testCase.imagenes,
        activo: true,
        sincronizado: true,
        ultimaSincronizacion: new Date()
      };

      const normalized = normalizePartData(testData);
      return {
        input: testCase.imagenes,
        output: normalized.imagenes,
        isArray: Array.isArray(normalized.imagenes),
        success: Array.isArray(normalized.imagenes)
      };
    });

    console.log('📊 Resultados de normalización:', normalizationResults);

    // Simular procesamiento
    let progress = 0;
    const interval = setInterval(async () => {
      progress += 20;
      
      await db.update(importHistory)
        .set({
          progress,
          processedItems: Math.floor(progress / 10),
          processingItem: `Procesando item ${progress / 10}/10`
        })
        .where(eq(importHistory.id, importRecord.id));

      if (progress >= 100) {
        clearInterval(interval);
        
        // Completar importación
        await db.update(importHistory)
          .set({
            status: 'completed',
            progress: 100,
            processedItems: 10,
            endTime: new Date(),
            processingItem: 'Test completado'
          })
          .where(eq(importHistory.id, importRecord.id));

        console.log('✅ Test de importación completado');
      }
    }, 500);

    res.json({
      success: true,
      message: 'Test de importación iniciado',
      importId: importRecord.id,
      normalizationResults,
      allTestsPassed: normalizationResults.every(r => r.success)
    });

  } catch (error) {
    console.error('❌ Error en test de importación:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para verificar el estado del test
 */
router.get('/test-status/:importId', async (req, res) => {
  try {
    const importId = parseInt(req.params.importId);
    
    const [importRecord] = await db.select()
      .from(importHistory)
      .where(eq(importHistory.id, importId))
      .limit(1);

    if (!importRecord) {
      return res.status(404).json({
        success: false,
        error: 'Importación no encontrada'
      });
    }

    res.json({
      success: true,
      import: importRecord
    });

  } catch (error) {
    console.error('❌ Error al verificar estado:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as testImportRouter };