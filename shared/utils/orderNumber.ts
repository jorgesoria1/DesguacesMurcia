/**
 * Utilidad para generar números de pedido únicos estilo PrestaShop
 */

/**
 * Genera un número de referencia único para pedidos
 * Formato: RNM + timestamp + número aleatorio de 4 dígitos
 * Ejemplo: RNM25070939521234
 */
export function generateOrderNumber(): string {
  const prefix = "RNM";
  
  // Obtener timestamp actual (últimos 10 dígitos para mantener longitud razonable)
  const timestamp = Date.now().toString().slice(-10);
  
  // Generar número aleatorio de 4 dígitos
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return `${prefix}${timestamp}${random}`;
}

/**
 * Valida si un número de pedido tiene el formato correcto
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  // Formato: RNM + 10 dígitos (timestamp) + 4 dígitos (random)
  const orderNumberRegex = /^RNM\d{14}$/;
  return orderNumberRegex.test(orderNumber);
}

/**
 * Extrae información del número de pedido
 */
export function parseOrderNumber(orderNumber: string): {
  prefix: string;
  timestamp: string;
  random: string;
  date: Date | null;
} | null {
  if (!isValidOrderNumber(orderNumber)) {
    return null;
  }
  
  const prefix = orderNumber.substring(0, 3); // RNM
  const timestamp = orderNumber.substring(3, 13); // 10 dígitos
  const random = orderNumber.substring(13, 17); // 4 dígitos
  
  // Reconstruir timestamp completo (añadir dígitos faltantes al principio)
  const fullTimestamp = timestamp.padStart(13, '1'); // Aproximación
  const date = new Date(parseInt(fullTimestamp));
  
  return {
    prefix,
    timestamp,
    random,
    date: isNaN(date.getTime()) ? null : date
  };
}