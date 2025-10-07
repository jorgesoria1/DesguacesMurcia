/**
 * Utilidad para manejar métodos de pago y sus traducciones
 */

export function getPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "Sin especificar";
  
  const translations: { [key: string]: string } = {
    'stripe': 'Tarjeta de Crédito',
    'paypal': 'PayPal', 
    'bank_transfer': 'Transferencia Bancaria',
    'transferencia_bancaria': 'Transferencia Bancaria',
    'tarjeta_credito': 'Tarjeta de Crédito',
    'redsys': 'Redsys',
    'cash_on_delivery': 'Contrareembolso',
    'cash': 'Efectivo',
    'efectivo': 'Efectivo',
    'bizum': 'Bizum'
  };
  
  return translations[method] || method;
}

// Función de compatibilidad (alias)
export const translatePaymentMethod = getPaymentMethodLabel;