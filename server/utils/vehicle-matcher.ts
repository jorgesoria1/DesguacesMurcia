import { storage } from '../storage';
import { Vehicle, Part } from '@shared/schema';

/**
 * Función para encontrar vehículos que coincidan con los criterios de una pieza
 * Usa solo los campos: rvCode, codVersion, anyoInicio, anyoFin y puertas
 */
export async function findMatchingVehicle(
  rvCode?: string,
  codVersion?: string,
  anyoInicio?: number,
  anyoFin?: number,
  puertas?: number
): Promise<Vehicle | null> {
  try {
    console.log(`Buscando vehículo que coincida con: 
    rvCode=${rvCode}, 
    codVersion=${codVersion}, 
    anyoInicio=${anyoInicio}, 
    anyoFin=${anyoFin},
    puertas=${puertas}`);
    
    // Obtener todos los vehículos
    const allVehicles = await storage.getVehicles();
    
    // Aplicar filtros en memoria
    const matchingVehicles = allVehicles.filter(vehicle => {
      // Si se proporciona rvCode, debe ser una coincidencia exacta con idLocal
      if (rvCode && vehicle.idLocal !== null && vehicle.idLocal !== undefined) {
        // Convertir a string para comparación segura
        const vehicleIdLocal = vehicle.idLocal.toString();
        if (vehicleIdLocal !== rvCode) {
          return false;
        }
      }
      
      // Comparar versión (si está presente)
      if (codVersion && vehicle.version) {
        const versionVehicle = vehicle.version.toLowerCase().trim();
        const versionBusqueda = codVersion.toLowerCase().trim();
        
        // Comparación flexible (que comience con o contenga)
        if (!versionVehicle.startsWith(versionBusqueda) && !versionVehicle.includes(versionBusqueda)) {
          return false;
        }
      }
      
      // Filtrar por rango de años
      if (anyoInicio && vehicle.anyo) {
        if (vehicle.anyo < anyoInicio) {
          return false;
        }
      }
      
      if (anyoFin && vehicle.anyo) {
        if (vehicle.anyo > anyoFin) {
          return false;
        }
      }
      
      // Filtrar por número de puertas
      if (puertas !== undefined && vehicle.puertas !== null && vehicle.puertas !== undefined) {
        const puertasVehicle = parseInt(vehicle.puertas.toString());
        if (puertasVehicle !== puertas) {
          return false;
        }
      }
      
      // Si pasa todos los filtros, es una coincidencia
      return true;
    });
    
    if (matchingVehicles.length > 0) {
      // Ordenar por relevancia
      const sortedVehicles = matchingVehicles.sort((a, b) => {
        // Priorizar coincidencias exactas de rvCode
        if (rvCode) {
          return 0; // Ya se filtraron por exactitud
        }
        
        // Priorizar coincidencias exactas de versión
        if (codVersion && a.version && b.version) {
          const aExactVersion = a.version.toLowerCase() === codVersion.toLowerCase() ? 1 : 0;
          const bExactVersion = b.version.toLowerCase() === codVersion.toLowerCase() ? 1 : 0;
          
          if (aExactVersion !== bExactVersion) return bExactVersion - aExactVersion;
        }
        
        // Ordenar por año central del rango si está disponible
        if (anyoInicio && anyoFin && a.anyo && b.anyo) {
          const yearCenter = (anyoInicio + anyoFin) / 2;
          return Math.abs(a.anyo - yearCenter) - Math.abs(b.anyo - yearCenter);
        }
        
        return 0;
      });
      
      console.log(`Encontrados ${sortedVehicles.length} vehículos que coinciden. Seleccionado mejor match: ID=${sortedVehicles[0].id}, ${sortedVehicles[0].marca} ${sortedVehicles[0].modelo} ${sortedVehicles[0].version}`);
      return sortedVehicles[0];
    }
    
    console.log('No se encontraron coincidencias');
    return null;
  } catch (error) {
    console.error(`Error al buscar vehículo coincidente: ${error}`);
    return null;
  }
}

/**
 * Función para encontrar todos los vehículos que coincidan con los criterios
 * Útil para APIs y pruebas
 */
export async function findMatchingVehicles(
  rvCode?: string,
  codVersion?: string,
  anyoInicio?: number,
  anyoFin?: number,
  puertas?: number
): Promise<Vehicle[]> {
  try {
    console.log(`Buscando vehículos que coincidan con: 
    rvCode=${rvCode}, 
    codVersion=${codVersion}, 
    anyoInicio=${anyoInicio}, 
    anyoFin=${anyoFin},
    puertas=${puertas}`);
    
    // Obtener todos los vehículos
    const allVehicles = await storage.getVehicles();
    
    // Si no hay criterios, devolver lista vacía para evitar devolver todos los vehículos
    if (!rvCode && !codVersion && !anyoInicio && !anyoFin && puertas === undefined) {
      return [];
    }
    
    // Aplicar filtros en memoria
    const matchingVehicles = allVehicles.filter(vehicle => {
      // Si se proporciona rvCode, debe ser una coincidencia exacta con idLocal
      if (rvCode && vehicle.idLocal !== null && vehicle.idLocal !== undefined) {
        // Convertir a string para comparación segura
        const vehicleIdLocal = vehicle.idLocal.toString();
        if (vehicleIdLocal !== rvCode) {
          return false;
        }
      }
      
      // Comparar versión (si está presente)
      if (codVersion && vehicle.version) {
        const versionVehicle = vehicle.version.toLowerCase().trim();
        const versionBusqueda = codVersion.toLowerCase().trim();
        
        // Comparación que incluya el texto buscado
        if (!versionVehicle.includes(versionBusqueda)) {
          return false;
        }
      }
      
      // Filtrar por rango de años
      if (anyoInicio && vehicle.anyo) {
        if (vehicle.anyo < anyoInicio) {
          return false;
        }
      }
      
      if (anyoFin && vehicle.anyo) {
        if (vehicle.anyo > anyoFin) {
          return false;
        }
      }
      
      // Filtrar por número de puertas
      if (puertas !== undefined && vehicle.puertas !== null && vehicle.puertas !== undefined) {
        const puertasVehicle = parseInt(vehicle.puertas.toString());
        if (puertasVehicle !== puertas) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`Encontrados ${matchingVehicles.length} vehículos que coinciden con los criterios`);
    return matchingVehicles;
  } catch (error) {
    console.error(`Error al buscar vehículos coincidentes: ${error}`);
    return [];
  }
}

/**
 * Función para emparejar piezas con vehículos basado en los criterios compatibles
 * Toma una pieza y encuentra todos los vehículos que coinciden con sus parámetros
 */
export async function matchPartWithVehicles(part: Part): Promise<Vehicle[]> {
  try {
    console.log(`Emparejando pieza ID ${part.id} con vehículos compatibles`);
    
    // Extraer los criterios de matching de la pieza
    const { rvCode, codVersion, anyoInicio, anyoFin, puertas } = part;
    
    // Verificar si la pieza tiene datos válidos para el matching
    if (!rvCode && !codVersion && !anyoInicio && !anyoFin && puertas === undefined) {
      console.log('Pieza sin criterios suficientes para realizar matching');
      return [];
    }
    
    // Usar la función existente para buscar vehículos que coincidan
    const matchingVehicles = await findMatchingVehicles(
      rvCode, 
      codVersion, 
      anyoInicio || undefined, 
      anyoFin || undefined,
      puertas || undefined
    );
    
    console.log(`Se encontraron ${matchingVehicles.length} vehículos compatibles con la pieza ID ${part.id}`);
    return matchingVehicles;
  } catch (error) {
    console.error(`Error al emparejar pieza con vehículos: ${error}`);
    return [];
  }
}