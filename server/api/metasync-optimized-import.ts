import { db } from '../db';
import { importHistory } from '@shared/schema';
import { startImportProcess } from '../import-process';

/**
 * Servicio para la gestión de importaciones optimizado
 * Proporciona funciones para iniciar y gestionar importaciones eficientes
 */
export const metasyncOptimizedImport = {
  /**
   * Inicia un proceso de importación
   * @param type Tipo de importación: 'vehicles', 'parts' o 'all'
   * @param fromDate Fecha opcional desde la que importar
   * @returns ID del registro de importación creado
   */
  async startImport(type: 'vehicles' | 'parts' | 'all', fromDate?: Date): Promise<number> {
    // Crear registro en el historial de importación
    const [importRecord] = await db
      .insert(importHistory)
      .values({
        type,
        startTime: new Date(),
        status: 'pending',
        totalItems: 0,
        processedItems: 0,
        newItems: 0,
        updatedItems: 0,
        errorCount: 0,
        errors: []
      })
      .returning();
    
    // Iniciar el proceso de importación en segundo plano
    // No esperamos a que termine para devolver la respuesta
    startImportProcess(importRecord.id, type, fromDate)
      .catch(err => console.error(`Error en proceso de importación ${type}:`, err));
    
    return importRecord.id;
  },
  
  /**
   * Cancela una importación en curso
   * @param importId ID de la importación a cancelar
   */
  async cancelImport(importId: number): Promise<void> {
    await db
      .update(importHistory)
      .set({
        status: 'cancelled',
        endTime: new Date(),
        details: {
          cancelledAt: new Date().toISOString(),
          message: 'Importación cancelada por el usuario'
        }
      })
      .where(sql => sql`${importHistory.id} = ${importId} AND ${importHistory.status} IN ('pending', 'running', 'in_progress')`);
  }
};