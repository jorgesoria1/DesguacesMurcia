/**
 * Servicio para asociar piezas existentes con vehículos
 * Procesa las piezas que ya están importadas pero sin información de vehículo
 */

import { db } from '../db.js';
import { parts, vehicles, vehicleParts } from '../../shared/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';

export class PartsVehicleMatcher {
  
  /**
   * Procesa todas las piezas existentes para asociarlas con vehículos
   */
  async processExistingParts(): Promise<void> {
    console.log('🔧 Iniciando procesamiento de piezas existentes...');
    
    try {
      // Obtener todas las piezas activas sin información de vehículo
      const partsWithoutVehicleInfo = await db
        .select({
          id: parts.id,
          refLocal: parts.refLocal,
          idVehiculo: parts.idVehiculo,
          vehicleMarca: parts.vehicleMarca,
          vehicleModelo: parts.vehicleModelo
        })
        .from(parts)
        .where(
          and(
            eq(parts.activo, true),
            sql`(${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '' OR ${parts.vehicleModelo} IS NULL OR ${parts.vehicleModelo} = '')`
          )
        );

      console.log(`📊 Encontradas ${partsWithoutVehicleInfo.length} piezas para procesar`);

      let processed = 0;
      let matched = 0;
      let relationsCreated = 0;

      // Procesar en lotes
      const batchSize = 100;
      for (let i = 0; i < partsWithoutVehicleInfo.length; i += batchSize) {
        const batch = partsWithoutVehicleInfo.slice(i, i + batchSize);
        
        for (const part of batch) {
          try {
            let vehicleMatched = false;
            
            // Intentar encontrar vehículo por idVehiculo
            if (part.idVehiculo && part.idVehiculo !== -1) {
              const vehicleInfo = await this.findVehicleByIdLocal(Math.abs(part.idVehiculo));
              if (vehicleInfo) {
                await this.updatePartWithVehicleInfo(part.id, vehicleInfo);
                await this.createVehiclePartRelation(vehicleInfo.id, part.id, part.idVehiculo);
                vehicleMatched = true;
                matched++;
                relationsCreated++;
              }
            }

            processed++;
            
            if (processed % 50 === 0) {
              console.log(`✅ Procesadas ${processed}/${partsWithoutVehicleInfo.length} piezas...`);
            }
            
          } catch (error) {
            console.error(`❌ Error procesando pieza ${part.refLocal}:`, error);
          }
        }

        // Pausa entre lotes
        if (i + batchSize < partsWithoutVehicleInfo.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`\n✅ Procesamiento completado:`);
      console.log(`   - Piezas procesadas: ${processed}`);
      console.log(`   - Piezas asociadas con vehículos: ${matched}`);
      console.log(`   - Relaciones creadas: ${relationsCreated}`);

      // Estadísticas finales
      await this.printFinalStats();

    } catch (error) {
      console.error('❌ Error en procesamiento de piezas:', error);
      throw error;
    }
  }

  /**
   * Busca un vehículo por su idLocal
   */
  private async findVehicleByIdLocal(idLocal: number) {
    const [vehicle] = await db
      .select({
        id: vehicles.id,
        idLocal: vehicles.idLocal,
        marca: vehicles.marca,
        modelo: vehicles.modelo,
        anyo: vehicles.anyo,
        combustible: vehicles.combustible
      })
      .from(vehicles)
      .where(eq(vehicles.idLocal, idLocal))
      .limit(1);

    return vehicle;
  }

  /**
   * Actualiza una pieza con información del vehículo
   */
  private async updatePartWithVehicleInfo(partId: number, vehicleInfo: any) {
    await db.update(parts)
      .set({
        vehicleMarca: vehicleInfo.marca || '',
        vehicleModelo: vehicleInfo.modelo || '',
        vehicleAnyo: vehicleInfo.anyo || 0,
        anyoInicio: vehicleInfo.anyo || 2000,
        anyoFin: vehicleInfo.anyo || 2050,
        combustible: vehicleInfo.combustible || '',
        relatedVehiclesCount: 1,
        isPendingRelation: false,
        
      })
      .where(eq(parts.id, partId));
  }

  /**
   * Crea una relación vehículo-pieza
   */
  private async createVehiclePartRelation(vehicleId: number, partId: number, idVehiculoOriginal: number) {
    try {
      // Verificar si la relación ya existe
      const [existingRelation] = await db
        .select({ id: vehicleParts.id })
        .from(vehicleParts)
        .where(and(
          eq(vehicleParts.vehicleId, vehicleId),
          eq(vehicleParts.partId, partId)
        ))
        .limit(1);

      if (!existingRelation) {
        await db.insert(vehicleParts).values({
          vehicleId: vehicleId,
          partId: partId,
          idVehiculoOriginal: idVehiculoOriginal || -1
        });
      }
    } catch (error) {
      console.error(`Error creando relación vehículo-pieza:`, error);
    }
  }

  /**
   * Muestra estadísticas finales
   */
  private async printFinalStats() {
    const [stats] = await db
      .select({
        totalParts: sql`COUNT(*)`,
        activeParts: sql`COUNT(CASE WHEN ${parts.activo} = true THEN 1 END)`,
        partsWithBrand: sql`COUNT(CASE WHEN ${parts.vehicleMarca} IS NOT NULL AND ${parts.vehicleMarca} != '' THEN 1 END)`,
        partsWithModel: sql`COUNT(CASE WHEN ${parts.vehicleModelo} IS NOT NULL AND ${parts.vehicleModelo} != '' THEN 1 END)`,
        partsWithPrice: sql`COUNT(CASE WHEN ${parts.precio} IS NOT NULL AND ${parts.precio} != '0' THEN 1 END)`
      })
      .from(parts);

    console.log(`\n📈 Estadísticas finales:`);
    console.log(`   - Total piezas: ${stats.totalParts}`);
    console.log(`   - Piezas activas: ${stats.activeParts}`);
    console.log(`   - Con marca de vehículo: ${stats.partsWithBrand}`);
    console.log(`   - Con modelo de vehículo: ${stats.partsWithModel}`);
    console.log(`   - Con precio válido: ${stats.partsWithPrice}`);

    const [relationStats] = await db
      .select({
        totalRelations: sql`COUNT(*)`
      })
      .from(vehicleParts);

    console.log(`   - Relaciones vehículo-pieza: ${relationStats.totalRelations}`);
  }
}

export const partsVehicleMatcher = new PartsVehicleMatcher();