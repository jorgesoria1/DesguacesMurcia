/**
 * Utilitarios para normalizar arrays antes de insertar en la base de datos
 * Evita errores del tipo "value.map is not a function"
 */

/**
 * Normaliza un campo que debería ser un array de strings
 * @param value El valor a normalizar
 * @returns Un array válido de strings
 */
export function normalizeStringArray(value: any): string[] {
  // Si ya es un array válido, devolverlo
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.trim() !== '');
  }
  
  // Si es un string, convertirlo a array
  if (typeof value === 'string' && value.trim() !== '') {
    // Si contiene comas, dividir por comas
    if (value.includes(',')) {
      return value.split(',').map(item => item.trim()).filter(item => item !== '');
    }
    return [value.trim()];
  }
  
  // Si es null, undefined o inválido, devolver array vacío
  return [];
}

/**
 * Normaliza específicamente el campo imagenes para vehículos y piezas
 * @param imagenes El valor del campo imagenes
 * @returns Un array válido de URLs de imágenes
 */
export function normalizeImagenesArray(imagenes: any): string[] {
  // OPTIMIZADO - Sin logs debug para performance
  const normalized = normalizeStringArray(imagenes);
  
  // Filtrar solo URLs válidas
  const validImages = normalized.filter(url => {
    if (!url) return false;
    const urlStr = String(url).trim();
    return urlStr.length > 0 && (
      urlStr.startsWith('http') || 
      urlStr.startsWith('//') || 
      urlStr.startsWith('/') || 
      urlStr.startsWith('data:image/') ||
      urlStr.includes('.')
    );
  });
  
  return validImages.length > 0 ? validImages : ["https://via.placeholder.com/150?text=Sin+Imagen"];
}

/**
 * Normaliza datos de vehículo antes de insertar en la base de datos
 * @param vehicleData Datos del vehículo
 * @returns Datos normalizados
 */
export function normalizeVehicleData(vehicleData: any): any {
  return {
    ...vehicleData,
    imagenes: normalizeImagenesArray(vehicleData.imagenes)
  };
}

/**
 * Normaliza datos de pieza antes de insertar en la base de datos
 * @param partData Datos de la pieza
 * @returns Datos normalizados
 */
export function normalizePartData(partData: any): any {
  // OPTIMIZADO - procesamiento directo sin logs debug
  return {
    ...partData,
    imagenes: normalizeImagenesArray(partData.imagenes)
  };
}