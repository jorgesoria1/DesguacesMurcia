/**
 * Servicio para actualizar las piezas existentes con información de vehículos
 * Corrige el problema donde las piezas no tienen la información del vehículo asociado
 */

import { db } from '../db';
import { parts, vehicles } from '@shared/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

export class PartsVehicleUpdater {
  
  /**
   * Actualiza todas las piezas activas para incluir información del vehículo asociado
   */
  async updatePartsWithVehicleInfo(): Promise<{ updated: number; errors: string[] }> {
    console.log('🔧 Iniciando actualización de piezas con información de vehículos...');
    
    let updated = 0;
    const errors: string[] = [];
    
    try {
      // Obtener todas las piezas activas que no tienen información de vehículo
      const partsWithoutVehicleInfo = await db
        .select({
          id: parts.id,
          refLocal: parts.refLocal,
          idVehiculo: parts.idVehiculo,
          vehicleMarca: parts.vehicleMarca,
          vehicleModelo: parts.vehicleModelo,
          descripcionArticulo: parts.descripcionArticulo,
          activo: parts.activo
        })
        .from(parts)
        .where(
          and(
            eq(parts.activo, true),
            sql`(${parts.vehicleMarca} IS NULL OR ${parts.vehicleMarca} = '' OR ${parts.vehicleModelo} IS NULL OR ${parts.vehicleModelo} = '')`
          )
        );

      console.log(`📊 Encontradas ${partsWithoutVehicleInfo.length} piezas activas sin información de vehículo`);

      for (const part of partsWithoutVehicleInfo) {
        try {
          let vehicleFound = false;
          
          // ESTRATEGIA 1: Para piezas con ID positivo - buscar vehículo en la base de datos
          if (part.idVehiculo > 0) {
            const vehicleResults = await db
              .select()
              .from(vehicles)
              .where(eq(vehicles.idLocal, part.idVehiculo));

            if (vehicleResults.length > 0) {
              const vehicle = vehicleResults[0];
              
              await db
                .update(parts)
                .set({
                  vehicleMarca: vehicle.marca,
                  vehicleModelo: vehicle.modelo,
                  vehicleVersion: vehicle.version,
                  vehicleAnyo: vehicle.anyo,
                  combustible: vehicle.combustible
                })
                .where(eq(parts.id, part.id));

              updated++;
              vehicleFound = true;
            }
          }
          
          // ESTRATEGIA 2: Para piezas con ID negativo O sin vehículo encontrado - usar pattern matching
          if (!vehicleFound) {
            const brandModelInfo = this.extractVehicleInfoFromDescription(part.descripcionArticulo);
            
            if (brandModelInfo.brand) {
              await db
                .update(parts)
                .set({
                  vehicleMarca: brandModelInfo.brand,
                  vehicleModelo: brandModelInfo.model || ''
                })
                .where(eq(parts.id, part.id));

              updated++;
              console.log(`🔧 Pattern matching exitoso para pieza ${part.refLocal}: ${brandModelInfo.brand} ${brandModelInfo.model || ''}`);
            }
          }
          
          if (updated % 100 === 0) {
            console.log(`✅ Actualizadas ${updated} piezas...`);
          }
        } catch (partError) {
          const errorMsg = `Error actualizando pieza ${part.refLocal}: ${partError instanceof Error ? partError.message : String(partError)}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Actualización completada: ${updated} piezas actualizadas`);
      
      return { updated, errors };
    } catch (error) {
      console.error('Error general en actualización de piezas:', error);
      errors.push(error instanceof Error ? error.message : String(error));
      return { updated, errors };
    }
  }

  // Método para extraer información de vehículo desde la descripción de la pieza
  private extractVehicleInfoFromDescription(description: string | null): { brand: string | null; model: string | null } {
    if (!description) return { brand: null, model: null };

    const upperDesc = description.toUpperCase();
    
    // Patrones de marcas conocidas
    const brandPatterns = {
      'VOLKSWAGEN': /VOLKSWAGEN|VW\s/,
      'AUDI': /AUDI/,
      'BMW': /BMW/,
      'MERCEDES': /MERCEDES|BENZ/,
      'FORD': /FORD/,
      'RENAULT': /RENAULT/,
      'PEUGEOT': /PEUGEOT/,
      'CITROEN': /CITROEN|CITROËN/,
      'OPEL': /OPEL/,
      'SEAT': /SEAT/,
      'SKODA': /SKODA|ŠKODA/,
      'FIAT': /FIAT/,
      'ALFA ROMEO': /ALFA\s*ROMEO/,
      'TOYOTA': /TOYOTA/,
      'NISSAN': /NISSAN/,
      'HONDA': /HONDA/,
      'MAZDA': /MAZDA/,
      'HYUNDAI': /HYUNDAI/,
      'KIA': /KIA/,
      'CHEVROLET': /CHEVROLET/,
      'DODGE': /DODGE/
    };

    for (const [brand, pattern] of Object.entries(brandPatterns)) {
      if (pattern.test(upperDesc)) {
        // Intentar extraer modelo removiendo la marca de la descripción
        let model = null;
        const brandRemovedDesc = description.replace(new RegExp(brand, 'gi'), '').trim();
        const words = brandRemovedDesc.split(/\s+/).filter(word => word.length > 2);
        if (words.length > 0) {
          model = words.slice(0, 2).join(' '); // Tomar las primeras 2 palabras como modelo
        }
        
        return { brand, model };
      }
    }

    return { brand: null, model: null };
  }

  /**
   * Ejecuta la actualización completa - método principal
   */
  async executeFullUpdate(): Promise<{ updated: number; resolved: number; errors: string[] }> {
    console.log('🚀 Iniciando actualización completa de información de vehículos...');
    
    try {
      // Ejecutar actualización principal con pattern matching
      const updateResult = await this.updatePartsWithVehicleInfo();
      
      // Ejecutar procesamiento de piezas pendientes
      const pendingResult = await this.updatePendingPartsWithVehicleInfo();
      
      console.log('✅ Actualización completa finalizada');
      console.log(`📊 Resumen: ${updateResult.updated} piezas actualizadas, ${pendingResult.resolved} pendientes resueltas`);
      
      return {
        updated: updateResult.updated,
        resolved: pendingResult.resolved,
        errors: [...updateResult.errors, ...pendingResult.errors]
      };
    } catch (error) {
      console.error('Error en actualización completa:', error);
      throw error;
    }
  }

  /**
   * Actualiza específicamente las piezas pendientes cuando se resuelven las relaciones
   */
  async updatePendingPartsWithVehicleInfo(): Promise<{ resolved: number; errors: string[] }> {
    console.log('🔄 Procesando piezas pendientes con información de vehículos...');
    
    let resolved = 0;
    const errors: string[] = [];
    
    try {
      // Obtener piezas marcadas como pendientes
      const pendingParts = await db
        .select()
        .from(parts)
        .where(eq(parts.isPendingRelation, true));

      console.log(`📋 Encontradas ${pendingParts.length} piezas pendientes`);

      for (const part of pendingParts) {
        try {
          // Verificar si el vehículo existe ahora
          const vehicleResults = await db
            .select()
            .from(vehicles)
            .where(eq(vehicles.idLocal, part.idVehiculo));

          if (vehicleResults.length > 0) {
            const vehicle = vehicleResults[0];
            
            // Verificar si el precio es válido
            const hasValidPrice = this.isValidPrice(part.precio || '0');
            
            // Actualizar la pieza con información del vehículo y activarla si tiene precio válido
            await db
              .update(parts)
              .set({
                activo: hasValidPrice,
                isPendingRelation: false,
                vehicleMarca: vehicle.marca,
                vehicleModelo: vehicle.modelo,
                vehicleVersion: vehicle.version,
                vehicleAnyo: vehicle.anyo,
                combustible: vehicle.combustible,
                
              })
              .where(eq(parts.id, part.id));

            resolved++;
            
            console.log(`✅ Pieza resuelta: ${part.refLocal} -> ${vehicle.marca} ${vehicle.modelo} (activa: ${hasValidPrice})`);
          }
        } catch (partError) {
          const errorMsg = `Error procesando pieza pendiente ${part.refLocal}: ${partError instanceof Error ? partError.message : String(partError)}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Procesamiento de pendientes completado: ${resolved} piezas resueltas`);
      
      return { resolved, errors };
    } catch (error) {
      console.error('Error procesando piezas pendientes:', error);
      errors.push(error instanceof Error ? error.message : String(error));
      return { resolved, errors };
    }
  }

  /**
   * Verifica si un precio es válido (mayor a 0)
   */
  private isValidPrice(precio: string | number): boolean {
    if (precio === null || precio === undefined) return false;
    
    const precioStr = String(precio).trim();
    
    if (precioStr === '' || precioStr === '0' || precioStr === '0.0' || 
        precioStr === '0.00' || precioStr === '0,00') {
      return false;
    }
    
    try {
      const precioNum = parseFloat(precioStr.replace(',', '.'));
      return !isNaN(precioNum) && precioNum > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Método principal para ejecutar toda la actualización
   */
  async executeFullUpdate(): Promise<void> {
    console.log('🚀 Iniciando actualización completa de piezas con información de vehículos...');
    
    try {
      // Paso 1: Actualizar piezas activas sin información de vehículo
      const { updated, errors: updateErrors } = await this.updatePartsWithVehicleInfo();
      
      // Paso 2: Procesar piezas pendientes
      const { resolved, errors: resolveErrors } = await this.updatePendingPartsWithVehicleInfo();
      
      const totalErrors = [...updateErrors, ...resolveErrors];
      
      console.log(`✅ Actualización completa finalizada:`);
      console.log(`   - Piezas actualizadas: ${updated}`);
      console.log(`   - Piezas pendientes resueltas: ${resolved}`);
      console.log(`   - Errores: ${totalErrors.length}`);
      
      if (totalErrors.length > 0) {
        console.log('❌ Errores encontrados:');
        totalErrors.forEach(error => console.log(`   - ${error}`));
      }
      
    } catch (error) {
      console.error('❌ Error en actualización completa:', error);
      throw error;
    }
  }
}