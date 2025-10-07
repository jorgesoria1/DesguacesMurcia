/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * Este controlador ha sido reemplazado por metasync-optimized-routes.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-routes.ts (endpoints directos)
 */

// @ts-nocheck
import { Request, Response } from 'express';
import { metasyncOptimizedImport } from './metasync-optimized-import-service';
import { db } from '../db';
import { importHistory, syncControl } from '@shared/schema';
import { eq, desc, sql, and, count as dbCount } from 'drizzle-orm';

/**
 * Controlador para el sistema de importación optimizado
 * Proporciona endpoints para gestionar importaciones masivas eficientes
 */
export const metasyncOptimizedController = {
  /**
   * Inicia una importación optimizada de vehículos
   * POST /api/metasync-optimized/import/vehicles
   */
  async importVehicles(req: Request, res: Response) {
    try {
      const { fromDate, fullImport } = req.body;

      // Verificar configuración antes de iniciar
      try {
        await metasyncOptimizedImport.configure();
      } catch (configError) {
        console.error('Error de configuración:', configError);
        return res.status(400).json({
          success: false,
          message: 'Error de configuración de API',
          error: configError instanceof Error ? configError.message : 'Configuración inválida',
          code: 'CONFIG_ERROR'
        });
      }

      // Convertir fromDate si se proporciona
      const parsedFromDate = fullImport ? new Date('1900-01-01') : (fromDate ? new Date(fromDate) : undefined);

      // Iniciar importación
      const importId = await metasyncOptimizedImport.startImport('vehicles', parsedFromDate, fullImport);

      return res.status(200).json({
        success: true,
        message: fullImport 
          ? 'Importación completa de vehículos iniciada correctamente'
          : 'Importación optimizada de vehículos iniciada correctamente',
        importId,
        details: {
          fullImport: !!fullImport,
          fromDate: parsedFromDate?.toISOString()
        }
      });
    } catch (error) {
      console.error('Error al iniciar importación de vehículos:', error);
      
      // Determinar el tipo de error y código de respuesta apropiado
      let statusCode = 500;
      let errorCode = 'UNKNOWN_ERROR';
      
      if (error instanceof Error) {
        if (error.message.includes('API Key')) {
          statusCode = 400;
          errorCode = 'API_KEY_ERROR';
        } else if (error.message.includes('configuración')) {
          statusCode = 400;
          errorCode = 'CONFIG_ERROR';
        }
      }
      
      return res.status(statusCode).json({
        success: false,
        message: 'Error al iniciar la importación de vehículos',
        error: error instanceof Error ? error.message : 'Error desconocido',
        code: errorCode
      });
    }
  },

  /**
   * Inicia una importación optimizada de piezas
   * POST /api/metasync-optimized/import/parts
   */
  async importParts(req: Request, res: Response) {
    try {
      const { fromDate, fullImport } = req.body;

      // Convertir fromDate si se proporciona
      const parsedFromDate = fullImport ? new Date('1900-01-01') : (fromDate ? new Date(fromDate) : undefined);

      // Iniciar importación
      const importId = await metasyncOptimizedImport.startImport('parts', parsedFromDate, fullImport);

      return res.status(200).json({
        success: true,
        message: fullImport 
          ? 'Importación completa de piezas iniciada correctamente'
          : 'Importación optimizada de piezas iniciada correctamente',
        importId,
        details: {
          fullImport: !!fullImport,
          fromDate: parsedFromDate?.toISOString()
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
   * Pausa una importación en curso
   * POST /api/metasync-optimized/import/:id/pause
   */
  async pauseImport(req: Request, res: Response) {
    try {
      const importId = parseInt(req.params.id);
      
      if (!importId || isNaN(importId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de importación inválido'
        });
      }

      // Verificar que la importación existe y está en progreso
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

      if (!['in_progress', 'running', 'processing'].includes(importRecord.status)) {
        return res.status(400).json({
          success: false,
          message: `No se puede pausar una importación con estado: ${importRecord.status}`
        });
      }

      // Actualizar estado a pausado con información adicional para la reanudación
      await db
        .update(importHistory)
        .set({
          status: 'paused',
          lastUpdated: new Date(),
          processingItem: 'Importación pausada por el usuario',
          details: {
            ...importRecord.details,
            pausedAt: new Date().toISOString(),
            lastProcessedId: importRecord.details?.lastId || 0,
            canResume: true
          }
        })
        .where(eq(importHistory.id, importId));

      console.log(`🛑 Importación ID=${importId} pausada correctamente`);

      return res.status(200).json({
        success: true,
        message: 'Importación pausada correctamente'
      });
    } catch (error) {
      console.error('Error al pausar importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al pausar la importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },

  /**
   * Reanuda una importación pausada
   * POST /api/metasync-optimized/import/:id/resume
   */
  async resumeImport(req: Request, res: Response) {
    try {
      const importId = parseInt(req.params.id);
      
      if (!importId || isNaN(importId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de importación inválido'
        });
      }

      // Actualizar estado a in_progress
      await db
        .update(importHistory)
        .set({
          status: 'in_progress',
          lastUpdated: new Date(),
          processingItem: 'Reanudando importación...'
        })
        .where(eq(importHistory.id, importId));

      // Obtener datos de la importación para reanudarla
      const [importRecord] = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId));

      if (importRecord) {
        // Reanudar el proceso según el tipo
        if (importRecord.type === 'vehicles') {
          setTimeout(() => metasyncOptimizedImport.importVehicles(importId), 100);
        } else if (importRecord.type === 'parts') {
          setTimeout(() => metasyncOptimizedImport.importParts(importId), 100);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Importación reanudada correctamente'
      });
    } catch (error) {
      console.error('Error al reanudar importación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al reanudar la importación',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },

  /**
   * Cancela una importación
   * POST /api/metasync-optimized/import/:id/cancel
   */
  async cancelImport(req: Request, res: Response) {
    try {
      const importId = parseInt(req.params.id);
      
      if (!importId || isNaN(importId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de importación inválido'
        });
      }

      await db
        .update(importHistory)
        .set({
          status: 'cancelled',
          endTime: new Date(),
          lastUpdated: new Date(),
          processingItem: 'Importación cancelada por el usuario'
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
   * Endpoint de diagnóstico para probar la recuperación y detección de piezas directamente
   * POST /api/metasync-optimized/test-parts-format
   */
  async testPartsFormat(req: Request, res: Response) {
    try {
      // Este endpoint realiza llamadas a la API de piezas para diagnóstico
      await metasyncOptimizedImport.configure();

      const { 
        lastId = 0, 
        fecha = new Date().toISOString(), 
        endpoints = [],
        baseUrls = [],
        customChannel = null,
        useParams = true  // Si es true, usará parámetros en la URL, si es false usará headers
      } = req.body;

      console.log(`Test diagnóstico de API con lastId=${lastId}, fecha=${fecha}`);

      // Obtener configuración actual de conexión para diagnóstico
      const connectionConfig = {
        apiUrl: metasyncOptimizedImport.apiUrl,
        channel: metasyncOptimizedImport.channel,
        companyId: metasyncOptimizedImport.companyId,
        // No devolver apiKey completa por seguridad
        apiKey: metasyncOptimizedImport.apiKey ? `${metasyncOptimizedImport.apiKey.substring(0, 5)}...` : 'No configurada'
      };

      // URLs base alternativas a probar
      const baseUrlsToTry = baseUrls.length > 0 ? baseUrls : [
        metasyncOptimizedImport.apiUrl,
        'https://apis.metasync.com/Almacen',
        'https://apis.metasync.com/api/Almacen',
        'https://apis.metasync.com'
      ];

      // Endpoints a probar en orden de prioridad
      const endpointsToTry = endpoints.length > 0 ? endpoints : [
        // Con canal codificado en URL
        `RecuperarCambiosCanal/${encodeURIComponent(customChannel || metasyncOptimizedImport.channel || '')}`,
        // Sin canal en URL
        'RecuperarCambiosCanal',
        'RecuperarCambios',
        'RecuperarPiezas',
        'Piezas',
        'api/Piezas',
        'GetPiezas'
      ];

      // Resultados de cada intento
      const combinedResults: Record<string, any> = {};
      let successfulConfig = null;
      let finalData = null;

      // Prueba exhaustiva de todas las combinaciones posibles
      for (const baseUrl of baseUrlsToTry) {
        for (const endpoint of endpointsToTry) {
          const configKey = `${baseUrl}/${endpoint}`;

          try {
            console.log(`Probando configuración: ${configKey}`);
            console.log(`useParams=${useParams}`);

            // Configurar temporalmente una URL base diferente para pruebas
            const originalUrl = metasyncOptimizedImport.apiUrl;
            metasyncOptimizedImport.apiUrl = baseUrl;

            // Parámetros para prueba
            const testParams = {
              fecha: fecha,
              lastId: lastId,
              offset: 10, // Offset pequeño para pruebas
              useParamsInUrl: useParams // Indica si usar parámetros en URL o en headers
            };

            // Si hay un canal personalizado, usarlo
            if (customChannel) {
              testParams.canal = customChannel;
            }

            // Realizar la prueba
            const data = await metasyncOptimizedImport.testFetchPartsFormat(endpoint, testParams);

            // Restaurar URL original
            metasyncOptimizedImport.apiUrl = originalUrl;

            combinedResults[configKey] = {
              success: true,
              formatDetected: data.formatDetected,
              totalParts: data.parts?.length || 0
            };

            successfulConfig = configKey;
            finalData = data;

            // Si encontramos piezas, podemos terminar
            if (data.parts?.length > 0) {
              console.log(`¡Éxito! Se encontraron ${data.parts.length} piezas con ${configKey}`);
              break;
            }
          } catch (error) {
            // Restaurar URL original en caso de error
            metasyncOptimizedImport.apiUrl = metasyncOptimizedImport.apiUrl;

            combinedResults[configKey] = {
              success: false,
              error: error instanceof Error ? error.message : 'Error desconocido'
            };
            console.log(`Error con ${configKey}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }

        // Si ya encontramos una configuración exitosa, no seguir probando
        if (successfulConfig && finalData && finalData.parts?.length > 0) {
          break;
        }
      }

      // Si tuvimos éxito con alguna configuración, devolver sus datos detallados
      if (successfulConfig && finalData) {
        // Analizar la configuración exitosa para recomendaciones
        const [url, path] = successfulConfig.split('/');
        const recommendedConfig = {
          baseUrl: url,
          endpoint: path,
          useParams: useParams,
          channel: customChannel || metasyncOptimizedImport.channel
        };

        return res.status(200).json({
          success: true,
          message: `Prueba de formato completada con éxito usando ${successfulConfig}`,
          formatInfo: finalData.formatInfo,
          sampleData: finalData.sampleData,
          detectedArrays: finalData.detectedArrays,
          formatDetected: finalData.formatDetected,
          totalParts: finalData.parts?.length || 0,
          configInfo: {
            successful: successfulConfig,
            recommended: recommendedConfig,
            allResults: combinedResults
          },
          currentConfig: connectionConfig
        });
      }

      // Si llegamos aquí, ninguna configuración funcionó, pero devolvemos la información de diagnóstico
      return res.status(500).json({
        success: false,
        message: 'No se pudo conectar con ninguna configuración de API',
        configAttempts: combinedResults,
        currentConfig: connectionConfig,
        suggestions: [
          "Verifique que la API key sea correcta y esté activa",
          "Pruebe con diferentes canales o sin especificar un canal",
          "Consulte la documentación oficial de la API para revisar los endpoints correctos",
          "Revise los registros de errores para más detalles sobre los problemas específicos",
          "Verifique si hay problemas de conectividad o firewalls bloqueando las peticiones",
          "Considere contactar al soporte técnico de MetaSync para verificar el acceso a la API"
        ]
      });
    } catch (error) {
      console.error('Error en prueba de formato de piezas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al probar formato de piezas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },

  /**
   * Inicia una importación completa (vehículos y piezas)
   * POST /api/metasync-optimized/import/all
   * 
   * Primero importa vehículos y luego piezas en secuencia para
   * garantizar que los vehículos estén disponibles para relacionar con piezas
   */
  async importAll(req: Request, res: Response) {
    try {
      const { fromDate, fullImport } = req.body;

      // Convertir fromDate si se proporciona
      const parsedFromDate = fullImport ? new Date('1900-01-01') : (fromDate ? new Date(fromDate) : undefined);

      // Iniciar importación de vehículos primero
      const vehiclesImportId = await metasyncOptimizedImport.startImport('vehicles', parsedFromDate, fullImport);

      // Esperar 5 segundos antes de iniciar la importación de piezas para evitar 
      // sobrecargar la API y asegurar que los vehículos ya se estén procesando
      setTimeout(async () => {
        try {
          // Iniciar importación de piezas
          const partsImportId = await metasyncOptimizedImport.startImport('parts', parsedFromDate, fullImport);

          console.log(`Importación ${fullImport ? 'COMPLETA' : 'incremental'} iniciada: vehículos ID=${vehiclesImportId}, piezas ID=${partsImportId}`);

          // Programar el procesamiento de relaciones pendientes para más adelante
          // Este paso es importante para vincular piezas con vehículos cuando termine todo
          setTimeout(async () => {
            try {
              console.log('Iniciando procesamiento de relaciones pendientes...');
              await metasyncOptimizedImport.processPendingRelations();
              console.log('Procesamiento de relaciones pendientes completado.');
            } catch (error) {
              console.error('Error al procesar relaciones pendientes:', error);
            }
          }, 300000); // 5 minutos después

        } catch (error) {
          console.error('Error al iniciar importación de piezas en secuencia:', error);
        }
      }, 5000);

      return res.status(200).json({
        success: true,
        message: fullImport 
          ? 'Importación COMPLETA iniciada correctamente. Vehículos en proceso, piezas en cola.'
          : 'Importación incremental iniciada correctamente. Vehículos en proceso, piezas en cola.',
        vehiclesImportId,
        details: {
          fullImport: !!fullImport,
          fromDate: parsedFromDate?.toISOString(),
          notes: 'La importación de piezas comenzará 5 segundos después. Las relaciones pendientes se procesarán automáticamente 5 minutos después.'
        }
      });
    } catch (error) {
      console.error('Error al iniciar importación completa:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar la importación completa',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },

  /**
   * Obtiene el estado de una importación
   * GET /api/metasync-optimized/import/:id
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
   * Obtiene el historial de importaciones
   * GET /api/metasync-optimized/import/history
   */
  async getImportHistory(req: Request, res: Response) {
    try {
      const { limit = 10, page = 1, type } = req.query;

      const parsedLimit = parseInt(limit as string);
      const parsedPage = parseInt(page as string);
      const offset = (parsedPage - 1) * parsedLimit;

      let query = db
        .select()
        .from(importHistory)
        .orderBy(desc(importHistory.id))
        .limit(parsedLimit)
        .offset(offset);

      // Filtrar por tipo si se especifica
      if (type) {
        query = query.where(eq(importHistory.type, type as string));
      }

      const history = await query;

      // Contar total para paginación
      const [result] = await db
        .select({ count: dbCount() })
        .from(importHistory)
        .where(type ? eq(importHistory.type, type as string) : undefined);

      const count = Number(result?.count || 0);

      return res.status(200).json({
        success: true,
        data: history,
        pagination: {
          total: count,
          limit: parsedLimit,
          page: parsedPage,
          pages: Math.ceil(count / parsedLimit)
        }
      });
    } catch (error) {
      console.error('Error al obtener historial de importaciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el historial de importaciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },

  /**
   * Cancela una importación en progreso
   * POST /api/metasync-optimized/import/:id/cancel
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
   * POST /api/metasync-optimized/process-pending-relations
   */
  async processPendingRelations(req: Request, res: Response) {
    try {
      const result = await metasyncOptimizedImport.processPendingRelations();

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
   * Obtiene el estado de sincronización
   * GET /api/metasync-optimized/sync-status
   */
  async getSyncStatus(req: Request, res: Response) {
    try {
      const syncStatus = await db
        .select()
        .from(syncControl)
        .where(eq(syncControl.active, true));

      return res.status(200).json({
        success: true,
        data: syncStatus
      });
    } catch (error) {
      console.error('Error al obtener estado de sincronización:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el estado de sincronización',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  },

  /**
   * Actualiza la fecha de sincronización
   * POST /api/metasync-optimized/sync-status/:type/update
   */
  async updateSyncDate(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { date } = req.body;

      if (!type || (type !== 'vehicles' && type !== 'parts')) {
        return res.status(400).json({
          success: false,
          message: 'Tipo inválido. Debe ser "vehicles" o "parts"'
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Fecha no proporcionada'
        });
      }

      const parsedDate = new Date(date);

      // Buscar registro de control
      const [control] = await db
        .select()
        .from(syncControl)
        .where(and(
          eq(syncControl.type, type),
          eq(syncControl.active, true)
        ));

      if (!control) {
        return res.status(404).json({
          success: false,
          message: `No se encontró configuración de sincronización para ${type}`
        });
      }

      // Actualizar fecha
      await db
        .update(syncControl)
        .set({
          lastSyncDate: parsedDate,
          lastId: 0, // Resetear lastId
          updatedAt: new Date()
        })
        .where(eq(syncControl.id, control.id));

      return res.status(200).json({
        success: true,
        message: `Fecha de sincronización para ${type} actualizada correctamente`
      });
    } catch (error) {
      console.error('Error al actualizar fecha de sincronización:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar fecha de sincronización',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
};