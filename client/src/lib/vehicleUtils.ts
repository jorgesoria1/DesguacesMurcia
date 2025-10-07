/**
 * Utility functions for consistent vehicle information display and link generation
 */

export interface VehicleInfo {
  id?: number;
  marca?: string;
  modelo?: string;
  version?: string;
  anyo?: string | number;
  combustible?: string;
}

export interface PartWithVehicle {
  id: number;
  vehicleId?: number;
  idVehiculo?: number; // ID from API
  vehicleMarca?: string;
  vehicleModelo?: string;
  vehicleVersion?: string;
  vehicleAnyo?: string | number;
  vehicles?: VehicleInfo[];
  // Fallback fields
  marcaVehiculo?: string;
  modeloVehiculo?: string;
  versionVehiculo?: string;
  anyoVehiculo?: string | number;
}

/**
 * Extract consistent vehicle information from a part object
 */
export function getVehicleInfoFromPart(part: PartWithVehicle): VehicleInfo & { hasValidId: boolean } {
  // Priority 1: vehicles array (most reliable)
  if (part.vehicles && part.vehicles.length > 0) {
    const vehicle = part.vehicles[0];
    return {
      id: vehicle.id,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      version: vehicle.version || "",
      anyo: vehicle.anyo,
      combustible: vehicle.combustible,
      hasValidId: Boolean(vehicle.id)
    };
  }

  // Priority 2: vehicleId field (direct vehicle ID)
  if (part.vehicleId || part.vehicleMarca || part.vehicleModelo) {
    return {
      id: part.vehicleId,
      marca: part.vehicleMarca || "",
      modelo: part.vehicleModelo || "",
      version: part.vehicleVersion || "",
      anyo: part.vehicleAnyo,
      hasValidId: Boolean(part.vehicleId)
    };
  }

  // Priority 3: idVehiculo field (this is usually idLocal, need to resolve to main ID)
  // For now, we won't generate links for idVehiculo since it needs resolution
  if (part.idVehiculo && (part.vehicleMarca || part.vehicleModelo)) {
    return {
      id: undefined, // Don't use idVehiculo directly as it's not the main ID
      marca: part.vehicleMarca || "",
      modelo: part.vehicleModelo || "",
      version: part.vehicleVersion || "",
      anyo: part.vehicleAnyo,
      hasValidId: false // Set to false since we can't link directly
    };
  }

  // Priority 4: fallback fields
  return {
    id: undefined,
    marca: part.marcaVehiculo || "",
    modelo: part.modeloVehiculo || "",
    version: part.versionVehiculo || "",
    anyo: part.anyoVehiculo,
    hasValidId: false
  };
}

/**
 * Format vehicle text for display
 */
export function formatVehicleText(vehicleInfo: VehicleInfo, options: {
  includeYear?: boolean;
  uppercase?: boolean;
  includeId?: boolean;
} = {}): string {
  const { includeYear = false, uppercase = false, includeId = false } = options;
  
  const parts = [
    vehicleInfo.marca,
    vehicleInfo.modelo,
    vehicleInfo.version
  ].filter(Boolean);

  if (includeYear && vehicleInfo.anyo) {
    parts.push(`(${vehicleInfo.anyo})`);
  }

  if (includeId && vehicleInfo.id) {
    parts.push(`ID: ${vehicleInfo.id}`);
  }

  let text = parts.join(' ');
  return uppercase ? text.toUpperCase() : text;
}

/**
 * Check if vehicle has sufficient info for display
 */
export function hasVehicleInfo(vehicleInfo: VehicleInfo): boolean {
  return Boolean(vehicleInfo.marca || vehicleInfo.modelo);
}

/**
 * Generate consistent vehicle link props
 */
export function getVehicleLinkProps(vehicleInfo: VehicleInfo & { hasValidId: boolean }, options: {
  hideLinks?: boolean;
  contextVehicleId?: number;
  includeYear?: boolean;
  uppercase?: boolean;
  showId?: boolean;
} = {}) {
  const { hideLinks = false, contextVehicleId, includeYear = false, uppercase = false, showId = false } = options;
  
  const vehicleText = formatVehicleText(vehicleInfo, { includeYear, uppercase });
  const shouldShowLink = !hideLinks && vehicleInfo.hasValidId && vehicleInfo.id !== contextVehicleId;
  
  return {
    vehicleText,
    shouldShowLink,
    vehicleId: vehicleInfo.id,
    linkTo: vehicleInfo.id ? `/vehiculos/${vehicleInfo.id}` : undefined,
    displayText: showId && vehicleInfo.id ? `${vehicleText} (ID: ${vehicleInfo.id})` : vehicleText
  };
}