import { InsertPart, InsertVehiclePart, Part, Vehicle } from "../shared/schema";
import { storage } from "./storage";
import { metasyncApi } from "./api/metasync";

/**
 * Servicio para manejar la importación y sincronización de vehículos y piezas
 */
export class ImportService {
  /**
   * Importa un vehículo a la base de datos
   */
  async importVehicle(vehicleData: any): Promise<Vehicle> {
    try {
      // Buscar si ya existe un vehículo con el mismo ID local
      const existingVehicles = await storage.getVehicles({ idLocal: vehicleData.idLocal });

      let vehicle: Vehicle;
      
      if (existingVehicles.length > 0) {
        // Actualizar vehículo existente
        const updatedVehicle = await storage.updateVehicle(existingVehicles[0].id, vehicleData);
        console.log(`Vehículo actualizado: ID=${updatedVehicle?.id}, idLocal=${updatedVehicle?.idLocal}`);
        vehicle = updatedVehicle!;
      } else {
        // Crear nuevo vehículo
        vehicle = await storage.createVehicle(vehicleData);
        console.log(`Nuevo vehículo creado: ID=${vehicle.id}, idLocal=${vehicle.idLocal}`);
        
        // Buscar piezas pendientes para este nuevo vehículo
        await this.linkPendingPartsToVehicle(vehicle);
      }
      
      return vehicle;
    } catch (error) {
      console.error(`Error al importar vehículo: ${error}`);
      throw error;
    }
  }
  
  /**
   * Importa una pieza a la base de datos y la asocia con vehículos
   * Además, realiza automáticamente el matching con vehículos compatibles
   */
  async importPart(partData: InsertPart, idVehiculoOriginal?: number): Promise<Part> {
    try {
      // Buscar si ya existe una pieza con el mismo refLocal y idEmpresa
      const existingParts = await storage.getParts({ 
        refLocal: partData.refLocal, 
        idEmpresa: partData.idEmpresa
      });
      
      let part: Part;
      
      // Asegurar que los precios son números válidos y convertirlos a string
      // NOTA: Eliminamos la división por 100 que causaba que precios pequeños se redondearan a 0
      const precio = typeof partData.precio === 'string' 
          ? partData.precio 
          : String(partData.precio || 0);
      
      const sanitizedPartData = {
        ...partData,
        precio: precio
      };

      // Valor inicial para el campo activo (por defecto, desactivado)
      let isActive = false;

      // Verificar si el precio es cero o inválido - estas piezas NUNCA deben estar activas
      const isZeroPrice = this.isZeroPrice(precio);
      if (isZeroPrice) {
        console.log(`Pieza con precio cero detectada: refLocal=${partData.refLocal}, precio=${precio} - será desactivada`);
        sanitizedPartData.activo = false;
        isActive = false;
      }

      if (existingParts.length > 0) {
        // Actualizar pieza existente
        const updatedPart = await storage.updatePart(existingParts[0].id, sanitizedPartData);
        console.log(`Pieza actualizada: ID=${updatedPart?.id}, refLocal=${updatedPart?.refLocal}, precio=${updatedPart?.precio}, activo=${updatedPart?.activo}`);
        part = updatedPart!;
      } else {
        // Crear nueva pieza (inicialmente desactivada)
        sanitizedPartData.activo = false;
        part = await storage.createPart(sanitizedPartData);
        console.log(`Nueva pieza creada: ID=${part.id}, refLocal=${part.refLocal}, precio=${part.precio}, activo=${part.activo}`);
      }
      
      // Si se proporciona un ID de vehículo específico, asociar la pieza con él
      if (idVehiculoOriginal !== undefined) {
        await this.associatePartWithVehicle(part.id, idVehiculoOriginal);
        
        // Verificar si el vehículo existe para determinar si la pieza debe estar activa
        // PERO NUNCA activar piezas con precio cero
        const vehicleExists = await storage.getVehicles({ idLocal: idVehiculoOriginal });
        if (vehicleExists.length > 0 && !isZeroPrice) {
          isActive = true;
          console.log(`Pieza ID=${part.id} activada porque tiene un vehículo válido (ID=${idVehiculoOriginal})`);
        } else if (isZeroPrice) {
          console.log(`Pieza ID=${part.id} NO activada porque tiene precio cero (precio=${precio})`);
        }
      } 
      
      // Verificar si la pieza tiene campos de matching para realizar búsqueda automática
      const hasMatchingCriteria = part.rvCode || part.codVersion || 
                               part.anyoInicio || part.anyoFin || part.puertas;
      
      if (hasMatchingCriteria) {
        console.log(`Realizando matching automático para pieza ID=${part.id} con los campos disponibles`);
        
        // Usar ID negativo ficticio (-1) para indicar que es una búsqueda automática
        await this.findAndLinkVehicleByMatching(part.id, -1);
        
        // Verificar si se crearon relaciones para determinar si la pieza debe estar activa
        // PERO NUNCA activar piezas con precio cero
        const relations = await storage.getVehicleParts({ partId: part.id });
        const validRelations = relations.filter(rel => rel.vehicleId > 0);
        
        if (validRelations.length > 0 && !isZeroPrice) {
          isActive = true;
          console.log(`Pieza ID=${part.id} activada porque se encontraron ${validRelations.length} vehículos compatibles mediante matching automático`);
        } else if (isZeroPrice) {
          console.log(`Pieza ID=${part.id} NO activada porque tiene precio cero (precio=${precio}) aunque tenga ${validRelations.length} vehículos compatibles`);
        }
      }
      
      // Si es necesario, actualizar el estado activo de la pieza basado en las relaciones encontradas
      if (part.activo !== isActive) {
        await storage.updatePart(part.id, { activo: isActive });
      }
      
      return part;
    } catch (error) {
      console.error(`Error al importar pieza: ${error}`);
      throw error;
    }
  }
  
  /**
   * Asocia una pieza con un vehículo usando el ID original del vehículo
   */
  async associatePartWithVehicle(partId: number, idVehiculoOriginal: number): Promise<void> {
    try {
      // Buscar vehículo por su ID original
      const vehicles = await storage.getVehicles({ idLocal: idVehiculoOriginal });
      
      if (vehicles.length > 0) {
        // Si existe el vehículo, crear la relación
        const vehicle = vehicles[0];
        await this.createVehiclePartRelation(vehicle.id, partId, idVehiculoOriginal);
        console.log(`Relación creada entre vehículo ID=${vehicle.id} y pieza ID=${partId}`);
      } else {
        // Si no existe el vehículo, crear relación pendiente
        await this.createPendingRelation(partId, idVehiculoOriginal);
        console.log(`Relación pendiente creada para pieza ID=${partId} con vehículo original ID=${idVehiculoOriginal}`);
      }
    } catch (error) {
      console.error(`Error al asociar pieza con vehículo: ${error}`);
    }
  }
  
  /**
   * Intenta encontrar vehículos que coincidan con los criterios de una pieza
   * y crea las relaciones si los encuentra
   */
  private async findAndLinkVehicleByMatching(partId: number, idVehiculoOriginal: number): Promise<void> {
    try {
      // Obtener datos de la pieza
      const part = await storage.getPartById(partId);
      if (!part) {
        console.error(`No se encontró la pieza con ID ${partId}`);
        return;
      }
      
      // Extraer información para el matching
      const matchingInfo = this.extractMatchingInfo(part);
      
      // Si no tenemos suficiente información para matching, salir
      if (!matchingInfo.codVersion && !matchingInfo.anyoInicio && !matchingInfo.anyoFin && !matchingInfo.puertas && !matchingInfo.rvCode) {
        console.log(`No hay suficiente información para realizar matching automático para pieza ID=${partId}`);
        return;
      }
      
      // Obtener todos los vehículos (en una implementación real, usaríamos filtros más específicos)
      const allVehicles = await storage.getVehicles();
      
      // Filtrar vehículos que coincidan con los criterios
      let matchingVehicles: Vehicle[] = [];
      
      // Si tenemos un código RV específico, buscar por él primero
      if (matchingInfo.rvCode) {
        // En una base de datos real, haríamos una consulta específica por rvCode
        // Aquí simulamos la búsqueda en memoria
        const exactMatches = allVehicles.filter(v => {
          // Lógica de matching exacto por rvCode
          return v.modelo === matchingInfo.rvCode;
        });
        
        if (exactMatches.length > 0) {
          matchingVehicles = exactMatches;
        }
      }
      
      // Si no encontramos por rvCode, intentar con otros criterios
      if (matchingVehicles.length === 0) {
        matchingVehicles = allVehicles.filter(vehicle => {
          // Filtrar por version (usando LIKE con prefijo)
          if (matchingInfo.codVersion && vehicle.version) {
            if (!vehicle.version.startsWith(matchingInfo.codVersion)) {
              return false;
            }
          }
          
          // Filtrar por puertas si ambos tienen el dato
          if (matchingInfo.puertas !== undefined && vehicle.puertas) {
            if (matchingInfo.puertas !== vehicle.puertas) {
              return false;
            }
          }
          
          // Filtrar por rango de años
          if (matchingInfo.anyoInicio && matchingInfo.anyoFin && vehicle.anyo) {
            if (vehicle.anyo < matchingInfo.anyoInicio || vehicle.anyo > matchingInfo.anyoFin) {
              return false;
            }
          }
          
          // Si pasa todos los filtros, es un match
          return true;
        });
      }
      
      // Crear relaciones con los vehículos que coinciden
      if (matchingVehicles.length > 0) {
        console.log(`Se encontraron ${matchingVehicles.length} vehículos compatibles con la pieza ID=${partId}`);
        
        for (const vehicle of matchingVehicles) {
          await this.createVehiclePartRelation(vehicle.id, partId, idVehiculoOriginal);
        }
      } else {
        console.log(`No se encontraron vehículos compatibles para la pieza ID=${partId}`);
      }
      
    } catch (error) {
      console.error(`Error al buscar vehículos por matching: ${error}`);
    }
  }
  
  /**
   * Verifica si un precio es cero o inválido
   * @param precio - El precio a verificar (string o number)
   * @returns true si el precio es cero o inválido
   */
  private isZeroPrice(precio: string | number): boolean {
    if (precio === null || precio === undefined) return true;
    if (precio === '' || precio === '0' || precio === '0.0' || precio === '0.00' || precio === '0,00') return true;
    
    // Convertir a string y limpiar espacios
    const precioStr = String(precio).trim();
    if (precioStr === '' || precioStr === '0' || precioStr === '0.0' || precioStr === '0.00' || precioStr === '0,00') return true;
    
    // Intentar convertir a número
    try {
      const precioNum = parseFloat(precioStr.replace(',', '.'));
      return precioNum <= 0 || isNaN(precioNum);
    } catch (error) {
      return true; // Si no se puede convertir, considerarlo como precio inválido
    }
  }

  /**
   * Extrae información para matching de una pieza
   * Usa solo los campos: rvCode, codVersion, anyoInicio, anyoFin y puertas
   */
  private extractMatchingInfo(part: Part): {
    rvCode?: string;
    codVersion?: string;
    anyoInicio?: number;
    anyoFin?: number;
    puertas?: number;
  } {
    return {
      rvCode: part.rvCode || undefined,
      codVersion: part.codVersion || undefined,
      anyoInicio: part.anyoInicio || undefined,
      anyoFin: part.anyoFin || undefined,
      puertas: part.puertas !== null ? part.puertas : undefined
    };
  }
  
  /**
   * Crea una relación entre un vehículo y una pieza
   */
  private async createVehiclePartRelation(
    vehicleId: number, 
    partId: number,
    idVehiculoOriginal: number
  ): Promise<void> {
    try {
      // Verificar si ya existe la relación para evitar duplicados
      const existingRelations = await storage.getVehicleParts({ 
        vehicleId, 
        partId 
      });
      
      if (existingRelations.length === 0) {
        // Crear la relación si no existe
        const relation: InsertVehiclePart = {
          vehicleId,
          partId,
          idVehiculoOriginal
        };
        
        await storage.createVehiclePart(relation);
      }
    } catch (error) {
      console.error(`Error al crear relación vehículo-pieza: ${error}`);
    }
  }
  
  /**
   * Crea una relación pendiente para una pieza
   * Esto se utilizará cuando el vehículo aún no exista en la base de datos
   */
  private async createPendingRelation(partId: number, idVehiculoOriginal: number): Promise<void> {
    try {
      // ID del vehículo dummy que usamos para relaciones pendientes
      const DUMMY_VEHICLE_ID = 50956;
      
      const pendingRelation: InsertVehiclePart = {
        vehicleId: DUMMY_VEHICLE_ID, // Vehículo dummy para relaciones pendientes
        partId,
        idVehiculoOriginal
      };
      
      // Verificar si ya existe la relación pendiente
      const existingPendingRelations = await storage.getVehicleParts({
        partId,
        // En una BD real, podríamos añadir: where vehicleId = DUMMY_VEHICLE_ID AND idVehiculoOriginal = ...
      });
      
      // Verificar si la relación ya existe
      const alreadyExists = existingPendingRelations.some(
        rel => rel.vehicleId === DUMMY_VEHICLE_ID && rel.idVehiculoOriginal === idVehiculoOriginal
      );
      
      if (!alreadyExists) {
        await storage.createVehiclePart(pendingRelation);
        
        // Añadir una nota en las observaciones para facilitar la búsqueda después
        const part = await storage.getPartById(partId);
        if (part) {
          let observations = part.observaciones || "";
          if (!observations.includes(`Pendiente de relación con vehículo original ID=${idVehiculoOriginal}`)) {
            observations += `\nPendiente de relación con vehículo original ID=${idVehiculoOriginal}`;
            await storage.updatePart(partId, { observaciones: observations });
          }
        }
      }
    } catch (error) {
      console.error(`Error al crear relación pendiente: ${error}`);
    }
  }
  
  /**
   * Busca piezas pendientes para un vehículo recién creado y las actualiza
   */
  private async linkPendingPartsToVehicle(vehicle: Vehicle): Promise<void> {
    try {
      console.log(`Buscando piezas pendientes para vehículo: idLocal=${vehicle.idLocal}`);
      
      // Buscar piezas que tengan observaciones relacionadas con este vehículo
      const pendingPattern = `Pendiente de relación con vehículo original ID=${vehicle.idLocal}`;
      
      // En una base de datos real, usaríamos LIKE o expresiones regulares
      // Aquí lo simulamos buscando todas las piezas inactivas y filtrando después
      const allParts = await storage.getParts();
      const inactiveParts = allParts.filter(part => part.activo === false);
      
      const pendingParts = inactiveParts.filter(part => 
        part.observaciones && part.observaciones.includes(pendingPattern)
      );
      
      console.log(`Encontradas ${pendingParts.length} piezas pendientes para este vehículo`);
      
      // Crear relaciones para cada pieza pendiente y activarlas
      for (const part of pendingParts) {
        // Crear la relación real con el vehículo ahora existente
        await this.createVehiclePartRelation(vehicle.id, part.id, vehicle.idLocal);
        
        // Activar la pieza ya que ahora tiene un vehículo válido
        await storage.updatePart(part.id, { 
          activo: true,
          observaciones: `Relación creada con vehículo ID=${vehicle.id} (idLocal=${vehicle.idLocal})`
        });
        
        console.log(`Pieza ID=${part.id} activada y relacionada con vehículo ID=${vehicle.id}`);
      }
    } catch (error) {
      console.error(`Error al vincular piezas pendientes con vehículo: ${error}`);
    }
  }
  /**
   * Actualiza el estado activo de todas las piezas basado en sus relaciones con vehículos
   * Esta función se utiliza después de una importación completa para asegurar
   * que solo las piezas con relaciones válidas estén activas
   */
  async updateAllPartsActivationStatus(): Promise<{ activated: number, deactivated: number }> {
    try {
      console.log('Actualizando estado de activación de todas las piezas...');
      
      let activated = 0;
      let deactivated = 0;
      
      // Obtener todas las piezas
      const allParts = await storage.getParts();
      console.log(`Procesando ${allParts.length} piezas...`);
      
      for (const part of allParts) {
        // Verificar si la pieza tiene relaciones con vehículos
        const relations = await storage.getVehicleParts({ partId: part.id });
        
        // Una pieza solo debe estar activa si tiene al menos una relación con un vehículo real
        // (donde vehicleId > 0, es decir, no es una relación pendiente)
        // Y ADEMÁS no debe tener precio cero
        const validRelations = relations.filter(rel => rel.vehicleId > 0);
        const hasValidRelations = validRelations.length > 0;
        const hasZeroPrice = this.isZeroPrice(part.precio || '0');
        
        // Una pieza solo debe estar activa si tiene relaciones válidas Y no tiene precio cero
        const shouldBeActive = hasValidRelations && !hasZeroPrice;
        
        // Actualizar estado si es necesario
        if (part.activo !== shouldBeActive) {
          await storage.updatePart(part.id, { activo: shouldBeActive });
          
          if (shouldBeActive) {
            console.log(`Pieza ID=${part.id} activada porque tiene ${validRelations.length} relaciones válidas con vehículos y precio válido`);
            activated++;
          } else {
            if (hasZeroPrice) {
              console.log(`Pieza ID=${part.id} desactivada porque tiene precio cero (${part.precio})`);
            } else {
              console.log(`Pieza ID=${part.id} desactivada porque no tiene relaciones válidas con vehículos (${relations.length - validRelations.length} relaciones pendientes)`);
            }
            deactivated++;
          }
        }
      }
      
      console.log(`Proceso completado: ${activated} piezas activadas, ${deactivated} piezas desactivadas`);
      return { activated, deactivated };
    } catch (error) {
      console.error(`Error al actualizar estado de piezas: ${error}`);
      throw error;
    }
  }
}

// Exportar una instancia para uso en toda la aplicación
export const importService = new ImportService();