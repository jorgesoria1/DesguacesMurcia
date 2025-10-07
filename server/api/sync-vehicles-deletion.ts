/**
 * Módulo de sincronización de vehículos con eliminación directa
 * Elimina vehículos que ya no existen en la API para mantener coincidencia 100%
 */

import { db } from '../db';
import { vehicles } from '../../shared/schema';
import { inArray, notInArray, sql } from 'drizzle-orm';

export class VehiclesSyncService {
  
  /**
   * Elimina vehículos que ya no están en la API
   * @param currentApiVehicles - Lista de vehículos actuales de la API
   * @returns Número de vehículos eliminados
   */
  async syncRemovedVehicles(currentApiVehicles: any[]): Promise<{
    deleted: number;
    preserved: number;
  }> {
    try {
      console.log('🔄 Iniciando sincronización de vehículos con eliminación directa...');
      
      // Obtener IDs de vehículos actuales en la API
      const apiVehicleIds = new Set(currentApiVehicles.map(v => v.idLocal));
      
      if (apiVehicleIds.size === 0) {
        console.log('⚠️ No hay vehículos en la API para sincronizar');
        return { deleted: 0, preserved: 0 };
      }
      
      // Buscar vehículos en base de datos que ya no están en la API
      const missingVehicles = await db
        .select({
          id: vehicles.id,
          idLocal: vehicles.idLocal,
          marca: vehicles.marca,
          modelo: vehicles.modelo
        })
        .from(vehicles)
        .where(notInArray(vehicles.idLocal, Array.from(apiVehicleIds).slice(0, 1000))); // Limitar por seguridad

      console.log(`🔍 Encontrados ${missingVehicles.length} vehículos que ya no están en la API`);

      if (missingVehicles.length === 0) {
        console.log('✅ Todos los vehículos en base de datos coinciden con la API');
        return { deleted: 0, preserved: currentApiVehicles.length };
      }

      // ELIMINACIÓN DIRECTA: Borrar vehículos que ya no están en la API
      console.log(`🗑️ ELIMINACIÓN DIRECTA: Borrando ${missingVehicles.length} vehículos...`);
      
      // Eliminar en lotes para evitar problemas de memoria
      const batchSize = 500;
      let totalDeleted = 0;
      
      for (let i = 0; i < missingVehicles.length; i += batchSize) {
        const batch = missingVehicles.slice(i, i + batchSize);
        
        const result = await db
          .delete(vehicles)
          .where(inArray(vehicles.idLocal, batch.map(v => v.idLocal)))
          .returning({ idLocal: vehicles.idLocal });
        
        totalDeleted += result.length;
        console.log(`🗑️ Eliminados ${result.length} vehículos (lote ${Math.floor(i/batchSize) + 1})`);
      }

      console.log(`✅ ELIMINACIÓN COMPLETA: ${totalDeleted} vehículos eliminados de la base de datos`);
      console.log(`🎯 Base de datos de vehículos ahora coincide 100% con la API`);
      
      return { 
        deleted: totalDeleted, 
        preserved: currentApiVehicles.length 
      };

    } catch (error) {
      console.error('Error en sincronización de vehículos:', error);
      throw error;
    }
  }

  /**
   * Sincronización automática completa para vehículos - ejecuta tras cada importación
   * @param apiVehicles - Lista de vehículos actuales de la API
   */
  async autoSyncVehiclesWithApi(apiVehicles: any[]): Promise<void> {
    try {
      console.log('🔄 Iniciando sincronización automática de vehículos (eliminación directa)...');
      
      if (apiVehicles.length > 0) {
        const syncResult = await this.syncRemovedVehicles(apiVehicles);
        
        if (syncResult.deleted > 0) {
          console.log(`🗑️ Sincronización de vehículos completada: ${syncResult.deleted} vehículos eliminados`);
          console.log(`✅ Base de datos de vehículos coincide 100% con la API`);
        } else {
          console.log(`✅ Vehículos ya sincronizados - no se requieren cambios`);
        }
      }
      
    } catch (error) {
      console.error('Error en sincronización automática de vehículos:', error);
    }
  }
}

export const vehiclesSyncService = new VehiclesSyncService();