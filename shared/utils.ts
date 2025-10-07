/**
 * Shared utility functions between client and server
 */

/**
 * Formats a price value for display
 */
export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice) || numPrice <= 0) {
    return 'Consultar precio';
  }
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numPrice);
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'Fecha no disponible';
  }
  
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);
}

/**
 * Creates a URL-friendly slug from text
 */
export function createSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates SEO-friendly URL for parts
 */
export function createPartUrl(part: {
  id: number;
  descripcionArticulo: string;
  vehicleMarca: string;
  vehicleModelo: string;
}): string {
  const slug = createSlug(`${part.descripcionArticulo} ${part.vehicleMarca} ${part.vehicleModelo}`);
  return `/piezas/detalle/${slug}-${part.id}`;
}

/**
 * Generates SEO-friendly URL for vehicles
 */
export function createVehicleUrl(vehicle: {
  id: number;
  marca: string;
  modelo: string;
  anyo?: number | null;
}): string {
  const yearPart = vehicle.anyo ? `-${vehicle.anyo}` : '';
  const slug = createSlug(`${vehicle.marca} ${vehicle.modelo}${yearPart}`);
  return `/vehiculos/detalle/${slug}-${vehicle.id}`;
}

/**
 * Extracts ID from SEO-friendly URL
 */
export function extractIdFromUrl(url: string): number | null {
  // Extract ID from URLs like /piezas/retrovisor-izquierdo-fiat-123 or /vehiculos/mercedes-benz-456
  const match = url.match(/-(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Converts URL model format to database format using intelligent search
 * Makes API call to find the best matching model in the database
 */
export async function findBestModelMatch(brand: string, urlModel: string): Promise<string | null> {
  if (!urlModel || !brand) return null;
  
  // Prepare search term by replacing hyphens with spaces
  const searchTerm = urlModel.replace(/-/g, ' ');
  
  try {
    const response = await fetch(`/api/vehicles-filter/find-model-match?marca=${encodeURIComponent(brand)}&termino=${encodeURIComponent(searchTerm)}`);
    
    if (!response.ok) {
      console.warn(`⚠️ Error en búsqueda inteligente de modelo: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.match && data.confidence > 20) {
      console.log(`✅ Coincidencia inteligente encontrada: "${urlModel}" → "${data.match}" (${data.confidence}%)`);
      return data.match;
    } else {
      console.log(`⚠️ No se encontró coincidencia para modelo "${urlModel}" en marca "${brand}"`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en búsqueda inteligente de modelo:', error);
    return null;
  }
}

/**
 * Converts URL model format to database format (LEGACY - for fallback only)
 * @deprecated Use findBestModelMatch instead for intelligent matching
 */
export function convertUrlModelToDatabase(urlModel: string): string {
  if (!urlModel) return '';
  
  // Convert to proper case first
  let model = urlModel.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  // Common vehicle model code patterns that should be in parentheses
  const codePatterns = [
    // BMW codes
    /\b(E\d+[A-Z]?)\b/gi,
    /\b(F\d+[A-Z]?)\b/gi,
    /\b(G\d+[A-Z]?)\b/gi,
    // Audi codes
    /\b(8X[A-Z0-9])\b/gi,
    /\b(8XA)\b/gi,
    /\b(8XF)\b/gi,
    /\b(8XK)\b/gi,
    /\b(8X1)\b/gi,
    /\b(GBH)\b/gi,
    /\b(GBA)\b/gi,
    // Generic patterns
    /\b([A-Z]\d+[A-Z]?)\b/gi,
    /\b([A-Z]{2,3}\d*)\b/gi,
  ];
  
  // Apply parentheses to recognized codes
  for (const pattern of codePatterns) {
    model = model.replace(pattern, '($1)');
  }
  
  // Clean up double parentheses
  model = model.replace(/\(\(([^)]+)\)\)/g, '($1)');
  
  return model.trim();
}

/**
 * Database fuel types (from logs) and their expected URL slugs
 */
const DB_FUELS = [
  '10', '25', 'B1', 'Diesel', 'Diésel', 'EL', 'Eléctrico',
  'Gas Líquido', 'Gas natural', 'Gasolina', 'Gasolina sin plomo (RON 95)',
  'Gasolina/Eléctrico (Combinado)', 'Gasolina/Gas liq. (Bivalente)',
  'Sin plomo 91', 'Sin plomo 95', 'Sin plomo 98'
];

/**
 * Known fuel types for URL parsing (automatically generated from database values)
 */
export const KNOWN_FUELS = DB_FUELS.map(fuel => createSlug(fuel))
  .filter((slug, index, arr) => arr.indexOf(slug) === index); // Remove duplicates

/**
 * Vehicle filters interface for URL management
 */
export interface VehicleFilters {
  brand?: string;
  model?: string;
  year?: string;
  fuel?: string;
  power?: string;
  search?: string;
  sort?: string;
}

/**
 * Part filters interface for URL management
 */
export interface PartFilters {
  brand?: string;
  model?: string;
  family?: string;
  year?: string;
  fuel?: string;
  search?: string;
  sort?: string;
}

/**
 * Creates friendly URL for vehicles list page with filters
 * Examples: 
 * - /vehiculos
 * - /vehiculos/toyota (brand only)
 * - /vehiculos/2015 (year only)
 * - /vehiculos/diesel (fuel only)
 * - /vehiculos/150cv (power only)
 * - /vehiculos/toyota/corolla
 * - /vehiculos/toyota/2015
 * - /vehiculos/toyota/corolla/2015/diesel/150cv
 * - /vehiculos/buscar/diesel
 */
export function createVehiclesListUrl(filters: VehicleFilters): string {
  const { brand, model, year, fuel, power, search, sort } = filters;
  
  // Base URL
  let url = '/vehiculos';
  
  // If there's a search term, create search URL
  if (search && search.trim()) {
    url += `/buscar/${createSlug(search.trim())}`;
  } else {
    // Build flexible URL with available filters in logical order
    const segments: string[] = [];
    
    // Add brand if available
    if (brand && brand !== 'all-brands') {
      segments.push(createSlug(brand));
    }
    
    // Add model if available (only if brand is also present)
    if (model && model !== 'all-models' && brand && brand !== 'all-brands') {
      segments.push(createSlug(model));
    }
    
    // Add year if available
    if (year && year !== 'all-years') {
      segments.push(year);
    }
    
    // Add fuel if available
    if (fuel && fuel !== 'all-fuels') {
      segments.push(createSlug(fuel));
    }
    
    // Add power if available
    if (power && power !== 'all-powers') {
      // Add 'cv' suffix to distinguish power from other numbers
      segments.push(`${power}cv`);
    }
    
    // Add segments to URL
    if (segments.length > 0) {
      url += `/${segments.join('/')}`;
    }
  }
  
  // Add query parameters only for sort (keep sort as query param for simplicity)
  const queryParams = new URLSearchParams();
  
  if (sort && sort !== 'newest') {
    queryParams.set('orden', sort);
  }
  
  // Append query string if there are parameters
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Parses friendly URL and extracts vehicle filters using intelligent matching
 * Examples:
 * - /vehiculos -> {}
 * - /vehiculos/toyota -> {brand: 'toyota'}
 * - /vehiculos/2015 -> {year: '2015'}
 * - /vehiculos/diesel -> {fuel: 'diesel'}
 * - /vehiculos/150cv -> {power: '150'}
 * - /vehiculos/toyota/corolla -> {brand: 'toyota', model: 'corolla'} (with intelligent model matching)
 * - /vehiculos/toyota/2015 -> {brand: 'toyota', year: '2015'}
 * - /vehiculos/toyota/corolla/2015/diesel/150cv -> {brand: 'toyota', model: 'corolla', year: '2015', fuel: 'diesel', power: '150'}
 * - /vehiculos/buscar/diesel -> {search: 'diesel'}
 */
export async function parseVehiclesListUrl(pathname: string, search: string = ''): Promise<VehicleFilters> {
  const filters: VehicleFilters = {};
  
  // Remove base path
  const path = pathname.replace('/vehiculos', '').replace(/^\//, '');
  
  if (!path) {
    // Just /vehiculos - no filters
    return parseQueryParams(search);
  }
  
  const segments = path.split('/').filter(Boolean);
  
  // Check if it's a search URL
  if (segments[0] === 'buscar' && segments[1]) {
    filters.search = segments[1].replace(/-/g, ' ');
    return { ...filters, ...parseQueryParams(search) };
  }
  
  // Parse segments using heuristics
  const unmatchedSegments: string[] = [];
  
  for (const segment of segments) {
    const decodedSegment = segment.replace(/-/g, ' ');
    
    // Check if it's a year (4 digits)
    if (/^\d{4}$/.test(segment)) {
      filters.year = segment;
      continue;
    }
    
    // Check if it's power (ends with 'cv')
    if (segment.endsWith('cv')) {
      const powerValue = segment.replace('cv', '');
      if (/^\d+$/.test(powerValue)) {
        filters.power = powerValue;
        continue;
      }
    }
    
    // Check if it's a known fuel type
    const sluggedSegment = createSlug(decodedSegment);
    if (KNOWN_FUELS.includes(sluggedSegment)) {
      filters.fuel = normalizeFuelType(decodedSegment);
      continue;
    }
    
    // Also check for exact slug match in known fuels
    if (KNOWN_FUELS.includes(segment)) {
      filters.fuel = normalizeFuelType(segment.replace(/-/g, ' '));
      continue;
    }
    
    // If none of the above, it's likely brand or model
    unmatchedSegments.push(decodedSegment);
  }
  
  // Assign unmatched segments as brand/model in order
  if (unmatchedSegments.length >= 1) {
    filters.brand = unmatchedSegments[0];
  }
  
  if (unmatchedSegments.length >= 2) {
    // Use intelligent model matching instead of fixed rules
    if (filters.brand) {
      const intelligentMatch = await findBestModelMatch(filters.brand, unmatchedSegments[1]);
      if (intelligentMatch) {
        filters.model = intelligentMatch;
        console.log(`🎯 URL parsing: "${unmatchedSegments[1]}" → "${intelligentMatch}"`);
      } else {
        // Fallback to legacy conversion if intelligent matching fails
        filters.model = convertUrlModelToDatabase(unmatchedSegments[1]);
        console.log(`⚠️ URL parsing: Using fallback conversion for "${unmatchedSegments[1]}" → "${filters.model}"`);
      }
    } else {
      // No brand available, use fallback
      filters.model = convertUrlModelToDatabase(unmatchedSegments[1]);
    }
  }
  
  // Merge with query parameters
  return { ...filters, ...parseQueryParams(search) };
}

/**
 * Synchronous version for cases where async is not possible
 * @deprecated Use the async version when possible for intelligent matching
 */
export function parseVehiclesListUrlSync(pathname: string, search: string = ''): VehicleFilters {
  const filters: VehicleFilters = {};
  
  // Remove base path
  const path = pathname.replace('/vehiculos', '').replace(/^\//, '');
  
  if (!path) {
    // Just /vehiculos - no filters
    return parseQueryParams(search);
  }
  
  const segments = path.split('/').filter(Boolean);
  
  // Check if it's a search URL
  if (segments[0] === 'buscar' && segments[1]) {
    filters.search = segments[1].replace(/-/g, ' ');
    return { ...filters, ...parseQueryParams(search) };
  }
  
  // Parse segments using heuristics
  const unmatchedSegments: string[] = [];
  
  for (const segment of segments) {
    const decodedSegment = segment.replace(/-/g, ' ');
    
    // Check if it's a year (4 digits)
    if (/^\d{4}$/.test(segment)) {
      filters.year = segment;
      continue;
    }
    
    // Check if it's power (ends with 'cv')
    if (segment.endsWith('cv')) {
      const powerValue = segment.replace('cv', '');
      if (/^\d+$/.test(powerValue)) {
        filters.power = powerValue;
        continue;
      }
    }
    
    // Check if it's a known fuel type
    const sluggedSegment = createSlug(decodedSegment);
    if (KNOWN_FUELS.includes(sluggedSegment)) {
      filters.fuel = normalizeFuelType(decodedSegment);
      continue;
    }
    
    // Also check for exact slug match in known fuels
    if (KNOWN_FUELS.includes(segment)) {
      filters.fuel = normalizeFuelType(segment.replace(/-/g, ' '));
      continue;
    }
    
    // If none of the above, it's likely brand or model
    unmatchedSegments.push(decodedSegment);
  }
  
  // Assign unmatched segments as brand/model in order
  if (unmatchedSegments.length >= 1) {
    filters.brand = unmatchedSegments[0];
  }
  
  if (unmatchedSegments.length >= 2) {
    // Use legacy conversion as fallback for sync version
    filters.model = convertUrlModelToDatabase(unmatchedSegments[1]);
  }
  
  // Merge with query parameters
  return { ...filters, ...parseQueryParams(search) };
}

/**
 * Normalizes family type from URL format to database format
 * Examples:
 * - 'suspension frenos' -> 'SUSPENSIÓN / FRENOS'
 * - 'motor admision escape' -> 'MOTOR / ADMISIÓN / ESCAPE'
 * - 'direccion transmision' -> 'DIRECCIÓN / TRANSMISIÓN'
 */
export function normalizeFamilyForDatabase(urlFamily: string): string {
  const familyMappings: { [key: string]: string } = {
    'accesorios': 'ACCESORIOS',
    'alumbrado': 'ALUMBRADO',
    'cambio embrague': 'CAMBIO / EMBRAGUE',
    'carroceria frontal': 'CARROCERÍA FRONTAL',
    'carroceria laterales': 'CARROCERÍA LATERALES',
    'carroceria trasera': 'CARROCERÍA TRASERA',
    'climatizacion': 'CLIMATIZACIÓN',
    'direccion transmision': 'DIRECCIÓN / TRANSMISIÓN',
    'electricidad': 'ELECTRICIDAD',
    'interior': 'INTERIOR',
    'motor admision escape': 'MOTOR / ADMISIÓN / ESCAPE',
    'motos': 'MOTOS',
    'suspension frenos': 'SUSPENSIÓN / FRENOS'
  };

  const lowerFamily = urlFamily.toLowerCase();
  
  // Check direct mappings first
  if (familyMappings[lowerFamily]) {
    return familyMappings[lowerFamily];
  }
  
  // Fallback: convert to uppercase
  return urlFamily.toUpperCase();
}

/**
 * Normalizes fuel type from URL format to database format
 * Examples:
 * - 'diesel' -> 'Diesel'
 * - 'sin plomo 95' -> 'Sin plomo 95'
 * - 'gasolina' -> 'Gasolina'
 */
function normalizeFuelType(urlFuel: string): string {
  // Convert to proper case for common fuel types
  const fuelMappings: { [key: string]: string } = {
    'diesel': 'Diesel',
    'diésel': 'Diésel',
    'sin plomo 91': 'Sin plomo 91',
    'sin plomo 95': 'Sin plomo 95',
    'sin plomo 98': 'Sin plomo 98',
    'gasolina': 'Gasolina',
    'gas natural': 'Gas natural',
    'gas líquido': 'Gas Líquido',
    'eléctrico': 'Eléctrico',
    'gasolina sin plomo (ron 95)': 'Gasolina sin plomo (RON 95)',
    'gasolina/eléctrico (combinado)': 'Gasolina/Eléctrico (Combinado)',
    'gasolina/gas liq. (bivalente)': 'Gasolina/Gas liq. (Bivalente)',
  };

  const lowerFuel = urlFuel.toLowerCase();
  
  // Check direct mappings first
  if (fuelMappings[lowerFuel]) {
    return fuelMappings[lowerFuel];
  }
  
  // Fallback: capitalize first letter of each word
  return urlFuel.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Helper function to parse query parameters into filters
 */
function parseQueryParams(search: string): VehicleFilters {
  const filters: VehicleFilters = {};
  const searchParams = new URLSearchParams(search);
  
  const fuel = searchParams.get('combustible');
  if (fuel) filters.fuel = normalizeFuelType(fuel);
  
  const power = searchParams.get('potencia');
  if (power) filters.power = power;
  
  const sort = searchParams.get('orden');
  if (sort) filters.sort = sort;
  
  // Handle old query parameter format for compatibility
  const brand = searchParams.get('marca');
  if (brand) filters.brand = brand;
  
  const model = searchParams.get('modelo');
  if (model) filters.model = model;
  
  const year = searchParams.get('anyo');
  if (year) filters.year = year;
  
  const searchTerm = searchParams.get('search');
  if (searchTerm) filters.search = searchTerm;
  
  return filters;
}

/**
 * Creates friendly URL for parts list page with filters
 * Examples: 
 * - /piezas
 * - /piezas/toyota (brand only)
 * - /piezas/2015 (year only)
 * - /piezas/diesel (fuel only)
 * - /piezas/motor (family only)
 * - /piezas/toyota/corolla
 * - /piezas/toyota/motor
 * - /piezas/toyota/corolla/motor
 * - /piezas/toyota/corolla/motor/2015/diesel
 * - /piezas/buscar/motor
 */
export function createPartsListUrl(filters: PartFilters): string {
  const { brand, model, family, year, fuel, search, sort } = filters;
  
  // Base URL
  let url = '/piezas';
  
  // If there's a search term, create search URL
  if (search && search.trim()) {
    url += `/buscar/${createSlug(search.trim())}`;
  } else {
    // Build flexible URL with available filters in logical order
    const segments: string[] = [];
    
    // Add brand if available
    if (brand && brand !== 'all-brands') {
      segments.push(createSlug(brand));
    }
    
    // Add model if available (only if brand is also present)
    if (model && model !== 'all-models' && brand && brand !== 'all-brands') {
      segments.push(createSlug(model));
    }
    
    // Add family if available
    if (family && family !== 'all-families') {
      segments.push(createSlug(family));
    }
    
    // Add year if available
    if (year && year !== 'all-years') {
      segments.push(year);
    }
    
    // Add fuel if available
    if (fuel && fuel !== 'all-fuels') {
      segments.push(createSlug(fuel));
    }
    
    // Add segments to URL
    if (segments.length > 0) {
      url += `/${segments.join('/')}`;
    }
  }
  
  // Add query parameters only for sort (keep sort as query param for simplicity)
  const queryParams = new URLSearchParams();
  
  if (sort && sort !== 'newest') {
    queryParams.set('orden', sort);
  }
  
  // Append query string if there are parameters
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Common part families/categories that are known - based on actual database families
 */
const KNOWN_FAMILIES = [
  // Main families from database (with their URL slugs)
  'accesorios',
  'alumbrado', 
  'cambio-embrague',
  'carroceria-frontal',
  'carroceria-laterales', 
  'carroceria-trasera',
  'climatizacion',
  'direccion-transmision',
  'electricidad',
  'interior',
  'motor-admision-escape',
  'motos',
  'suspension-frenos',
  
  // Legacy/alternative forms
  'motor', 'carroceria', 'suspension', 'frenos', 'direccion', 'transmision',
  'electrico', 'aire-acondicionado', 'escape', 'combustible',
  'refrigeracion', 'encendido', 'arranque', 'neumaticos', 'llantas', 'faros',
  'pilotos', 'retrovisores', 'parabrisas', 'cristales', 'tapicerias',
  'asientos', 'cinturones', 'airbag', 'instrumentos', 'radio', 'navegacion'
];

/**
 * Parses friendly URL and extracts part filters
 * Examples:
 * - /piezas -> {}
 * - /piezas/toyota -> {brand: 'toyota'}
 * - /piezas/2015 -> {year: '2015'}
 * - /piezas/diesel -> {fuel: 'diesel'}
 * - /piezas/motor -> {family: 'motor'}
 * - /piezas/toyota/corolla -> {brand: 'toyota', model: 'corolla'}
 * - /piezas/toyota/motor -> {brand: 'toyota', family: 'motor'}
 * - /piezas/toyota/corolla/motor -> {brand: 'toyota', model: 'corolla', family: 'motor'}
 * - /piezas/toyota/corolla/motor/2015/diesel -> {brand: 'toyota', model: 'corolla', family: 'motor', year: '2015', fuel: 'diesel'}
 * - /piezas/buscar/motor -> {search: 'motor'}
 */
export async function parsePartsListUrl(pathname: string, search: string = ''): Promise<PartFilters> {
  const filters: PartFilters = {};
  
  // Remove base path
  const path = pathname.replace('/piezas', '').replace(/^\//, '');
  
  if (!path) {
    // Just /piezas - no filters
    return parsePartsQueryParams(search);
  }
  
  const segments = path.split('/').filter(Boolean);
  
  // Check if it's a search URL
  if (segments[0] === 'buscar' && segments[1]) {
    filters.search = segments[1].replace(/-/g, ' ');
    console.log('🔍 PARSE URL: Found search term:', filters.search);
    return { ...filters, ...parsePartsQueryParams(search) };
  }
  
  // Parse segments using heuristics
  const unmatchedSegments: string[] = [];
  
  for (const segment of segments) {
    const decodedSegment = segment.replace(/-/g, ' ');
    
    // Check if it's a year (4 digits)
    if (/^\d{4}$/.test(segment)) {
      filters.year = segment;
      continue;
    }
    
    // Check if it's a known fuel type
    const sluggedSegment = createSlug(decodedSegment);
    if (KNOWN_FUELS.includes(sluggedSegment)) {
      filters.fuel = normalizeFuelType(decodedSegment);
      continue;
    }
    
    // Also check for exact slug match in known fuels
    if (KNOWN_FUELS.includes(segment)) {
      filters.fuel = normalizeFuelType(segment.replace(/-/g, ' '));
      continue;
    }
    
    // Check if it's a known family/category
    if (KNOWN_FAMILIES.includes(segment)) {
      // Normalize family to database format with proper spacing/characters
      filters.family = normalizeFamilyForDatabase(decodedSegment);
      continue;
    }
    
    // If none of the above, it's likely brand or model
    unmatchedSegments.push(decodedSegment);
  }
  
  // Assign unmatched segments as brand/model in order
  if (unmatchedSegments.length >= 1) {
    filters.brand = unmatchedSegments[0];
  }
  
  if (unmatchedSegments.length >= 2) {
    // Use intelligent model matching for parts as well
    if (filters.brand) {
      const intelligentMatch = await findBestModelMatch(filters.brand, unmatchedSegments[1]);
      if (intelligentMatch) {
        filters.model = intelligentMatch;
        console.log(`🎯 Parts URL parsing: "${unmatchedSegments[1]}" → "${intelligentMatch}"`);
      } else {
        // Fallback to legacy conversion if intelligent matching fails
        filters.model = convertUrlModelToDatabase(unmatchedSegments[1]);
        console.log(`⚠️ Parts URL parsing: Using fallback conversion for "${unmatchedSegments[1]}" → "${filters.model}"`);
      }
    } else {
      // No brand available, use fallback
      filters.model = convertUrlModelToDatabase(unmatchedSegments[1]);
    }
  }
  
  // Merge with query parameters
  return { ...filters, ...parsePartsQueryParams(search) };
}

/**
 * Helper function to parse query parameters into part filters
 */
function parsePartsQueryParams(search: string): PartFilters {
  const filters: PartFilters = {};
  const searchParams = new URLSearchParams(search);
  
  const fuel = searchParams.get('combustible');
  if (fuel) filters.fuel = normalizeFuelType(fuel);
  
  const sort = searchParams.get('orden');
  if (sort) filters.sort = sort;
  
  // Handle old query parameter format for compatibility
  const brand = searchParams.get('marca');
  if (brand) filters.brand = brand;
  
  const model = searchParams.get('modelo');
  if (model) filters.model = model;
  
  const year = searchParams.get('anyo');
  if (year) filters.year = year;
  
  const family = searchParams.get('familia');
  if (family) filters.family = family;
  
  const searchTerm = searchParams.get('search');
  if (searchTerm) filters.search = searchTerm;
  
  return filters;
}