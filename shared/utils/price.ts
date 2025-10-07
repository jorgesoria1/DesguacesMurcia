/**
 * Utilidades para formateo de precios
 */

/**
 * Formatea un precio para mostrar
 * @param price - Precio como string o number
 * @returns Precio formateado como string
 */
export function formatPrice(price: string | number): string {
  if (typeof price === 'string') {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0.00';
    return numPrice.toFixed(2);
  }
  if (typeof price === 'number') {
    return price.toFixed(2);
  }
  return '0.00';
}

/**
 * Convierte un precio a número
 * @param price - Precio como string o number
 * @returns Precio como number
 */
export function parsePrice(price: string | number): number {
  if (typeof price === 'string') {
    const numPrice = parseFloat(price);
    return isNaN(numPrice) ? 0 : numPrice;
  }
  if (typeof price === 'number') {
    return price;
  }
  return 0;
}