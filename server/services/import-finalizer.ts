import { importHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { disableZeroPricePartsBatch } from '../utils/disable-zero-price-parts';
import { importMonitor } from './import-monitor';

/**
 * Servicio para finalizar correctamente una importación, incluyendo 
 * la desactivación de piezas con precio cero y registro de finalización
 */
export class ImportFinalizerService {
  /**
   * Registra un finalizador para una importación y añade seguridad adicional
   * mediante registro en el monitor de importaciones
   */
  registerFinalizerForImport(importId: number, timeoutMinutes: number = 60) {
    // Registrar en el monitor de importaciones para la recuperación automática
    importMonitor.registerImportFinisher(importId, timeoutMinutes);
    
    // También programar una finalización controlada
    setTimeout(async () => {
      this.finalizeImport(importId);
    }, 5 * 60 * 1000); // Comprobar después de 5 minutos
  }
  
  /**
   * Finaliza una importación y ejecuta tareas post-importación
   */
  async finalizeImport(importId: number): Promise<boolean> {
    try {
      // Verificar si la importación sigue en curso
      const [importRecord] = await db
        .select()
        .from(importHistory)
        .where(eq(importHistory.id, importId));
      
      if (!importRecord) {
        console.log(`Finalización: Importación ID=${importId} no encontrada`);
        return false;
      }
      
      // Si ya no está en progreso, no hacer nada
      if (importRecord.status !== 'in_progress' && importRecord.status !== 'running') {
        console.log(`Finalización: Importación ID=${importId} ya no está en progreso (estado=${importRecord.status})`);
        return false;
      }
      
      console.log(`Finalizando importación ID=${importId}...`);
      
      // Marcar como completada
      await db
        .update(importHistory)
        .set({
          status: 'completed',
          endTime: new Date(),
          notes: (importRecord.notes || '') + ' Finalizada automáticamente.'
        })
        .where(eq(importHistory.id, importId));
      
      // NO ejecutar desactivación automática de piezas después de importaciones
      // Las piezas procesadas ya tienen la información correcta y no deben desactivarse
      console.log(`Importación ID=${importId} completada - manteniendo todas las piezas procesadas activas`);
      
      // Solo ejecutar limpieza en casos específicos si se detectan problemas graves
      // if (importRecord.type === 'parts' || importRecord.type === 'all') {
      //   console.log(`DESACTIVADO: No se ejecuta limpieza automática para preservar piezas procesadas válidas`);
      // }
      
      console.log(`Importación ID=${importId} finalizada correctamente`);
      return true;
      
    } catch (error) {
      console.error(`Error al finalizar importación ID=${importId}:`, error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const importFinalizer = new ImportFinalizerService();