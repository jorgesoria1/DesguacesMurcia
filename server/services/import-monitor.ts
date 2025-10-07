import { importHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';

/**
 * Servicio de monitoreo para importaciones
 * Supervisa y corrige estados de importaciones bloqueadas
 */
export class ImportMonitorService {
  // Tiempo máximo en minutos que una importación puede estar en estado "running"
  private maxImportRuntime = 60; 
  private monitorIntervalId: NodeJS.Timeout | null = null;
  
  /**
   * Inicializa el monitor de importaciones
   */
  initialize() {
    console.log('Inicializando monitor de importaciones...');
    
    // Verificar importaciones bloqueadas al iniciar
    this.checkStuckImports();
    
    // Configurar verificación periódica (cada 10 minutos)
    this.monitorIntervalId = setInterval(() => {
      this.checkStuckImports();
    }, 10 * 60 * 1000);
    
    console.log('Monitor de importaciones iniciado. Verificación cada 10 minutos.');
    
    return this;
  }
  
  /**
   * Detiene el monitor de importaciones
   */
  stop() {
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
      console.log('Monitor de importaciones detenido.');
    }
  }
  
  /**
   * Verifica y corrige importaciones bloqueadas
   */
  async checkStuckImports() {
    try {
      console.log('Verificando importaciones bloqueadas...');
      
      // Calcular tiempo límite (60 minutos atrás)
      const timeThreshold = new Date();
      timeThreshold.setMinutes(timeThreshold.getMinutes() - this.maxImportRuntime);
      
      // Obtener importaciones en estado "in_progress"
      const runningImports = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.status, 'in_progress'));
      
      if (runningImports.length === 0) {
        console.log('No hay importaciones en ejecución.');
        return;
      }
      
      console.log(`Encontradas ${runningImports.length} importaciones en estado "running".`);
      
      // Filtrar importaciones que han excedido el tiempo máximo
      const stuckImports = runningImports.filter(imp => {
        const startTime = new Date(imp.start_time);
        return startTime < timeThreshold;
      });
      
      if (stuckImports.length === 0) {
        console.log('No hay importaciones bloqueadas.');
        return;
      }
      
      console.log(`Encontradas ${stuckImports.length} importaciones bloqueadas. Corrigiendo...`);
      
      // Corregir cada importación bloqueada
      for (const imp of stuckImports) {
        console.log(`Corrigiendo importación bloqueada ID=${imp.id}, tipo=${imp.type}, iniciada=${imp.start_time}`);
        
        await db
          .update(importHistory)
          .set({
            status: 'completed',
            end_time: new Date(),
            processing_item: 'Completada automáticamente por el monitor de importaciones tras 60 minutos en ejecución.'
          })
          .where(eq(importHistory.id, imp.id));
      }
      
      console.log(`${stuckImports.length} importaciones han sido corregidas.`);
    } catch (error) {
      console.error('Error al verificar importaciones bloqueadas:', error);
    }
  }
  
  /**
   * Marca manualmente una importación específica como completada
   */
  async markImportAsCompleted(importId: number) {
    try {
      // Verificar si la importación existe
      const [importRecord] = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId))
        .limit(1);
      
      if (!importRecord) {
        throw new Error(`Importación con ID ${importId} no encontrada`);
      }
      
      // Actualizar estado a completado
      await db
        .update(importHistory)
        .set({
          status: 'completed',
          endTime: new Date(),
          notes: (importRecord.notes || '') + ' Marcada como completada manualmente.'
        })
        .where(eq(importHistory.id, importId));
      
      console.log(`Importación ID=${importId} marcada como completada manualmente.`);
      
      return { success: true, importId };
    } catch (error) {
      console.error(`Error al marcar importación ${importId} como completada:`, error);
      throw error;
    }
  }
  
  /**
   * Añade un manejador de finalización a una importación
   * Esta función debe ser llamada cuando se inicia una importación
   * para garantizar que se complete correctamente incluso si hay errores
   */
  registerImportFinisher(importId: number, timeoutMinutes: number = 60) {
    console.log(`Registrando finalizador automático para importación ID=${importId} (timeout=${timeoutMinutes} min)`);
    
    // Programar una verificación y finalización después del tiempo especificado
    setTimeout(async () => {
      try {
        // Verificar si la importación sigue en estado running
        const [importRecord] = await db
          .select()
          .from(importHistory)
          .where(eq(importHistory.id, importId))
          .limit(1);
        
        if (!importRecord) {
          console.log(`Finalizador: Importación ID=${importId} no encontrada.`);
          return;
        }
        
        // Si la importación sigue en ejecución, marcarla como completada
        if (importRecord.status === 'running') {
          console.log(`Finalizador: Importación ID=${importId} sigue en progreso después de ${timeoutMinutes} minutos. Finalizando...`);
          
          await db
            .update(importHistory)
            .set({
              status: 'completed',
              endTime: new Date(),
              notes: (importRecord.notes || '') + ` Completada automáticamente por timeout (${timeoutMinutes} min).`
            })
            .where(eq(importHistory.id, importId));
            
          console.log(`Finalizador: Importación ID=${importId} marcada como completada.`);
        } else {
          console.log(`Finalizador: Importación ID=${importId} ya no está en progreso (estado=${importRecord.status}).`);
        }
      } catch (error) {
        console.error(`Error en finalizador automático para importación ${importId}:`, error);
      }
    }, timeoutMinutes * 60 * 1000);
  }
}

// Exportar instancia singleton
export const importMonitor = new ImportMonitorService();