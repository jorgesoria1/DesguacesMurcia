import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Constante para el IVA en España (21%)
export const IVA_RATE = 0.21;

// Función para calcular el precio con IVA incluido
export function calculatePriceWithIVA(basePrice: number): number {
  return basePrice * (1 + IVA_RATE);
}

// Función para formatear precios en euros (ahora incluye IVA por defecto)
export function formatPrice(price: number | string | null | undefined, includeIVA: boolean = true): string {
  // Si el precio es null, undefined o vacío, retornar 0€
  if (price === null || price === undefined || price === '') {
    return '0,00 €';
  }

  let priceInEuros: number;

  // Convertir a número si es un string
  if (typeof price === 'string') {
    priceInEuros = parseFloat(price.replace(',', '.'));
  } else {
    priceInEuros = price;
  }

  // Verificar si el resultado es un número válido y positivo
  if (isNaN(priceInEuros) || priceInEuros < 0) {
    return '0,00 €';
  }

  // Aplicar IVA si está habilitado
  if (includeIVA) {
    priceInEuros = calculatePriceWithIVA(priceInEuros);
  }

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(priceInEuros);
}

// Función para formatear precio sin IVA (para mostrar desglose)
export function formatPriceWithoutIVA(price: number | string | null | undefined): string {
  return formatPrice(price, false);
}

// Función para formatear desglose completo de precio
export function formatPriceBreakdown(price: number | string | null | undefined): { 
  basePrice: string; 
  iva: string; 
  totalPrice: string; 
  basePriceNum: number;
  ivaNum: number;
  totalPriceNum: number;
} {
  if (price === null || price === undefined || price === '') {
    return {
      basePrice: '0,00 €',
      iva: '0,00 €',
      totalPrice: '0,00 €',
      basePriceNum: 0,
      ivaNum: 0,
      totalPriceNum: 0
    };
  }

  let basePriceNum: number;
  if (typeof price === 'string') {
    basePriceNum = parseFloat(price.replace(',', '.'));
  } else {
    basePriceNum = price;
  }

  if (isNaN(basePriceNum) || basePriceNum < 0) {
    return {
      basePrice: '0,00 €',
      iva: '0,00 €',
      totalPrice: '0,00 €',
      basePriceNum: 0,
      ivaNum: 0,
      totalPriceNum: 0
    };
  }

  const ivaNum = basePriceNum * IVA_RATE;
  const totalPriceNum = basePriceNum + ivaNum;

  return {
    basePrice: new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(basePriceNum),
    iva: new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(ivaNum),
    totalPrice: new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(totalPriceNum),
    basePriceNum,
    ivaNum,
    totalPriceNum
  };
}

// Función para formatear peso - los valores están almacenados con factor 100 (500 = 5kg)
export function formatWeight(weightInGrams: number | string | null | undefined): string {
  if (weightInGrams === null || weightInGrams === undefined || weightInGrams === '') {
    return 'N/A';
  }
  
  const storedValue = typeof weightInGrams === 'string' ? parseFloat(weightInGrams) : weightInGrams;
  
  if (isNaN(storedValue) || storedValue <= 0) {
    return 'N/A';
  }
  
  // Los valores están almacenados con factor 100 (500 representa 5kg)
  const kg = storedValue / 100;
  return `${kg.toFixed(2)} kg`;
}

// Función para formatear fechas en español
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
}

// Función para formatear fechas con hora en español
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

// Función para generar URL amigables (slugs)
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Función para truncar texto
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Función para obtener el tipo de combustible formateado
export function getFuelType(fuelType: string | null | undefined): string {
  // Verificación exhaustiva para evitar errores
  if (!fuelType || fuelType === null || fuelType === undefined || fuelType === '') {
    return 'N/A';
  }

  // Convertir a string y hacer trim para eliminar espacios
  const cleanFuelType = String(fuelType).trim();
  
  if (!cleanFuelType) {
    return 'N/A';
  }

  // Asegurar que tenemos un string válido antes de usar toLowerCase
  const normalizedFuelType = cleanFuelType.toLowerCase();

  const fuelTypes: Record<string, string> = {
    diesel: 'Diésel',
    gasolina: 'Gasolina',
    hibrido: 'Híbrido',
    electrico: 'Eléctrico',
    gas: 'Gas',
    'sin plomo 95': 'Gasolina Sin Plomo 95',
    'sin plomo 98': 'Gasolina Sin Plomo 98',
    'sin plomo 91': 'Gasolina Sin Plomo 91',
    'gas natural': 'Gas Natural',
    'gasolina/eléctrico (combinado)': 'Híbrido',
    'el': 'Eléctrico',
  };

  return fuelTypes[normalizedFuelType] || cleanFuelType;
}

// Función para formatear números con separador de miles
export function formatNumber(number: number): string {
  return new Intl.NumberFormat('es-ES').format(number);
}

// Función para calcular tiempo transcurrido en español
export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace unos segundos';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `hace ${diffInYears} ${diffInYears === 1 ? 'año' : 'años'}`;
}