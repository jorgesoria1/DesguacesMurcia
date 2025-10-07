import { metasyncApi } from "./api/metasync";
import { db } from "./db";
import { importHistory, vehicles } from "../shared/schema";
import { eq } from "drizzle-orm";
import { procesarLoteVehiculos, procesarLotePiezas, procesarRelacionesPendientes } from "./importador-optimizado";

/**
 * Servicio mejorado para la importación y sincronización de vehículos y piezas
 * Utiliza el procesador optimizado para garantizar la integridad de los datos
 */
export class ImportServiceOptimizado {
  /**
   * Importa vehículos desde la API de MetaSync
   */
  async importarVehiculos(importId: number, fromDate?: Date): Promise<void> {
    console.log(`Iniciando importación optimizada de vehículos (ID: ${importId})${fromDate ? ' desde ' + fromDate.toISOString() : ''}`);
    
    try {
      // Inicializar contadores
      let totalItems = 0;
      let processedItems = 0;
      let newItems = 0;
      let updatedItems = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Actualizar estado de la importación
      await db.update(importHistory)
        .set({ status: 'running', processedItems, newItems, updatedItems, errorCount, errors: [] })
        .where(eq(importHistory.id, importId));
      
      // Obtener vehículos en lotes
      let lastId = 0;
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        try {
          // Obtener lote de vehículos
          const response = await metasyncApi.getVehicleChanges(fromDate || new Date('2000-01-01'), lastId, 100);
          
          console.log("Respuesta de API de vehículos:", JSON.stringify(response || {}));
          
          // Manejo mejorado para respuestas vacías pero válidas
          if (!response) {
            console.error("No se obtuvo respuesta de la API");
            errors.push("No se obtuvo respuesta de la API al obtener vehículos");
            errorCount++;
            break;
          }
          
          // Si la respuesta indica que no hay vehículos nuevos (pero es válida)
          if (response.Ok === "1" && (!response.vehiculos || !Array.isArray(response.vehiculos))) {
            console.log("Respuesta válida pero sin vehículos nuevos");
            hasMore = false; // Terminamos la importación
            break;
          }
          
          // Normalizar a array vacío si vehiculos es null pero la respuesta es válida
          const vehiculos = Array.isArray(response.vehiculos) ? response.vehiculos : [];
          
          // Si no hay vehículos pero la respuesta es válida, terminamos
          if (vehiculos.length === 0) {
            console.log("No hay más vehículos para importar");
            hasMore = false;
            break;
          }
          
          totalItems += vehiculos.length;
          
          // Procesar lote de vehículos
          if (vehiculos.length > 0) {
            console.log(`Procesando lote de ${vehiculos.length} vehículos...`);
            const isNewFormat = true; // Determinar formato basado en estructura
            
            // Usar el procesador optimizado
            const result = await procesarLoteVehiculos(vehiculos);
            
            // Actualizar contadores
            newItems += result.inserted;
            updatedItems += result.updated;
            processedItems += vehiculos.length;
            
            if (result.errors.length > 0) {
              errorCount += result.errors.length;
              errors.push(...result.errors);
            }
            
            // Actualizar estado de la importación
            await db.update(importHistories)
              .set({ 
                totalItems, 
                processedItems, 
                newItems, 
                updatedItems, 
                errorCount, 
                errors: errors.slice(0, 100) // Limitar tamaño de errores
              })
              .where(eq(importHistories.id, importId));
            
            // Actualizar paginación
            if (response.paginacion && response.paginacion.lastId) {
              lastId = response.paginacion.lastId;
              offset += vehiculos.length;
              
              // Si el lote está vacío o no tenemos más registros, terminar
              if (vehiculos.length === 0 || (response.paginacion.total && offset >= response.paginacion.total)) {
                hasMore = false;
              }
            } else {
              // Sin información de paginación, terminar
              hasMore = false;
            }
          } else {
            console.log("No hay más vehículos para procesar, finalizando paginación");
            hasMore = false;
          }
        } catch (error) {
          console.error("Error al obtener o procesar lote de vehículos:", error);
          errors.push(`Error al procesar lote de vehículos: ${error.message}`);
          errorCount++;
          
          // Actualizar estado con el error
          await db.update(importHistories)
            .set({ 
              totalItems, 
              processedItems, 
              newItems, 
              updatedItems, 
              errorCount, 
              errors: errors.slice(0, 100) // Limitar tamaño de errores
            })
            .where(eq(importHistories.id, importId));
          
          // Continuar con el siguiente lote a pesar del error
        }
      }
      
      // Procesar relaciones pendientes
      console.log("Procesando relaciones pendientes...");
      const pendingResult = await procesarRelacionesPendientes();
      console.log(`Encontradas ${pendingResult.actualizadas} relaciones pendientes para procesar después de importar vehículos`);
      
      // Actualizar estado final
      await db.update(importHistories)
        .set({ 
          status: 'completed',
          endTime: new Date(),
          totalItems, 
          processedItems, 
          newItems, 
          updatedItems, 
          errorCount, 
          errors: errors.slice(0, 100) // Limitar tamaño de errores
        })
        .where(eq(importHistories.id, importId));
      
      console.log(`Importación de vehículos completada. Total: ${totalItems}, Nuevos: ${newItems}, Actualizados: ${updatedItems}, Errores: ${errorCount}`);
    } catch (error) {
      console.error("Error global en importación de vehículos:", error);
      
      // Actualizar estado con error
      await db.update(importHistories)
        .set({ 
          status: 'failed',
          endTime: new Date(),
          errorCount: 1,
          errors: [`Error global: ${error.message}`]
        })
        .where(eq(importHistories.id, importId));
    }
  }
  
  /**
   * Importa piezas desde la API de MetaSync
   */
  async importarPiezas(importId: number, fromDate?: Date): Promise<void> {
    console.log(`Iniciando importación optimizada de piezas (ID: ${importId})${fromDate ? ' desde ' + fromDate.toISOString() : ''}`);
    
    try {
      // Inicializar contadores
      let totalItems = 0;
      let processedItems = 0;
      let newItems = 0;
      let updatedItems = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Actualizar estado de la importación
      await db.update(importHistory)
        .set({ status: 'running', processedItems, newItems, updatedItems, errorCount, errors: [] })
        .where(eq(importHistory.id, importId));
      
      // Obtener piezas en lotes
      let lastId = 0;
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        try {
          // Obtener lote de piezas
          const response = await metasyncApi.getParts(100, lastId);
          
          console.log("Respuesta de API de piezas:", JSON.stringify(response || {}));
          
          // Manejo mejorado para respuestas vacías pero válidas
          if (!response) {
            console.error("No se obtuvo respuesta de la API");
            errors.push("No se obtuvo respuesta de la API al obtener piezas");
            errorCount++;
            break;
          }
          
          // Si la respuesta indica que no hay piezas nuevas (pero es válida)
          if (response.Ok === "1" && (!response.piezas || !Array.isArray(response.piezas))) {
            console.log("Respuesta válida pero sin piezas nuevas");
            hasMore = false; // Terminamos la importación
            break;
          }
          
          // Normalizar a array vacío si piezas es null pero la respuesta es válida
          const piezas = Array.isArray(response.piezas) ? response.piezas : [];
          
          // Si no hay piezas pero la respuesta es válida, terminamos
          if (piezas.length === 0) {
            console.log("No hay más piezas para importar");
            hasMore = false;
            break;
          }
          
          totalItems += piezas.length;
          
          // Procesar lote de piezas
          if (piezas.length > 0) {
            console.log(`Procesando lote de ${piezas.length} piezas...`);
            const isNewFormat = true; // Determinar formato basado en estructura
            
            // Usar el procesador optimizado
            const result = await procesarLotePiezas(piezas);
            
            // Actualizar contadores
            newItems += result.inserted;
            updatedItems += result.updated;
            processedItems += piezas.length;
            
            if (result.errors.length > 0) {
              errorCount += result.errors.length;
              errors.push(...result.errors);
            }
            
            // Actualizar estado de la importación
            await db.update(importHistories)
              .set({ 
                totalItems, 
                processedItems, 
                newItems, 
                updatedItems, 
                errorCount, 
                errors: errors.slice(0, 100) // Limitar tamaño de errores
              })
              .where(eq(importHistories.id, importId));
            
            // Actualizar paginación
            if (response.paginacion && response.paginacion.lastId) {
              lastId = response.paginacion.lastId;
              offset += piezas.length;
              
              // Si el lote está vacío o no tenemos más registros, terminar
              if (piezas.length === 0 || (response.paginacion.total && offset >= response.paginacion.total)) {
                hasMore = false;
              }
            } else {
              // Sin información de paginación, terminar
              hasMore = false;
            }
          } else {
            console.log("No hay más piezas para procesar, finalizando paginación");
            hasMore = false;
          }
        } catch (error) {
          console.error("Error al obtener o procesar lote de piezas:", error);
          errors.push(`Error al procesar lote de piezas: ${error.message}`);
          errorCount++;
          
          // Actualizar estado con el error
          await db.update(importHistories)
            .set({ 
              totalItems, 
              processedItems, 
              newItems, 
              updatedItems, 
              errorCount, 
              errors: errors.slice(0, 100) // Limitar tamaño de errores
            })
            .where(eq(importHistories.id, importId));
          
          // Continuar con el siguiente lote a pesar del error
        }
      }
      
      // Procesar relaciones pendientes
      console.log("Procesando relaciones pendientes...");
      const pendingResult = await procesarRelacionesPendientes();
      console.log(`Encontradas ${pendingResult.actualizadas} relaciones pendientes para procesar después de importar piezas`);
      
      // Actualizar estado final
      await db.update(importHistories)
        .set({ 
          status: 'completed',
          endTime: new Date(),
          totalItems, 
          processedItems, 
          newItems, 
          updatedItems, 
          errorCount, 
          errors: errors.slice(0, 100) // Limitar tamaño de errores
        })
        .where(eq(importHistories.id, importId));
      
      console.log(`Importación de piezas completada. Total: ${totalItems}, Nuevos: ${newItems}, Actualizados: ${updatedItems}, Errores: ${errorCount}`);
    } catch (error) {
      console.error("Error global en importación de piezas:", error);
      
      // Actualizar estado con error
      await db.update(importHistories)
        .set({ 
          status: 'failed',
          endTime: new Date(),
          errorCount: 1,
          errors: [`Error global: ${error.message}`]
        })
        .where(eq(importHistories.id, importId));
    }
  }
  
  /**
   * Importa vehículos y piezas en una sola operación
   */
  async importarTodo(importId: number, fromDate?: Date): Promise<void> {
    console.log(`Iniciando importación completa optimizada (ID: ${importId})${fromDate ? ' desde ' + fromDate.toISOString() : ''}`);
    
    try {
      // Primero importar vehículos
      await this.importarVehiculos(importId, fromDate);
      
      // Luego importar piezas
      await this.importarPiezas(importId, fromDate);
      
      // Procesar relaciones pendientes una vez más
      console.log("Procesando relaciones pendientes finales...");
      const pendingResult = await procesarRelacionesPendientes();
      console.log(`Encontradas ${pendingResult.actualizadas} relaciones pendientes para procesar al final de la importación`);
      
      // Actualizar estado final
      await db.update(importHistories)
        .set({ 
          status: 'completed',
          endTime: new Date()
        })
        .where(eq(importHistories.id, importId));
      
      console.log(`Importación completa finalizada con éxito (ID: ${importId})`);
    } catch (error) {
      console.error("Error global en importación completa:", error);
      
      // Actualizar estado con error
      await db.update(importHistories)
        .set({ 
          status: 'failed',
          endTime: new Date(),
          errorCount: 1,
          errors: [`Error global: ${error.message}`]
        })
        .where(eq(importHistories.id, importId));
    }
  }
}

export const importServiceOptimizado = new ImportServiceOptimizado();