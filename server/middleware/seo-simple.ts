import { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { storage } from '../storage';

// Cache para el template HTML base
let htmlTemplateCache: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto cache

// Cache simple para datos SEO
const seoDataCache = new Map<string, { data: any, timestamp: number }>();
const SEO_CACHE_TTL = 300000; // 5 minutos cache

function getHtmlTemplate(): string {
  const now = Date.now();
  if (!htmlTemplateCache || (now - cacheTimestamp) > CACHE_TTL) {
    const htmlPath = process.env.NODE_ENV === 'production' 
      ? join(process.cwd(), 'server/public/index.html')
      : join(process.cwd(), 'client/index.html');
    
    try {
      htmlTemplateCache = readFileSync(htmlPath, 'utf-8');
      cacheTimestamp = now;
    } catch (error) {
      console.error(`Error reading HTML template:`, error);
      throw error;
    }
  }
  return htmlTemplateCache;
}

function getCachedSeoData(key: string): any | null {
  const cached = seoDataCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < SEO_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedSeoData(key: string, data: any): void {
  seoDataCache.set(key, { data, timestamp: Date.now() });
}

// SEO middleware - ACTIVADO PARA HTML SOURCE TAGS
export async function simpleSEOMiddleware(req: Request, res: Response, next: NextFunction) {
  // EARLY EXIT - Skip all non-HTML requests first - CRITICAL for Vite functionality
  if (req.url.includes('.') || req.url.startsWith('/api/') || 
      req.url.startsWith('/src/') || req.url.startsWith('/@') || 
      req.url.startsWith('/node_modules/') || req.url.includes('?import') ||
      req.url.includes('vite') || req.url.includes('hot-update') ||
      req.url.includes('__') || req.url.endsWith('.tsx') || req.url.endsWith('.ts') ||
      req.url.endsWith('.js') || req.url.endsWith('.css') || req.url.endsWith('.png') ||
      req.url.endsWith('.jpg') || req.url.endsWith('.ico') || req.url.endsWith('.svg')) {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp/i.test(userAgent);
  
  const isHomePage = req.url === '/' || req.url === '';
  const isSEOUrl = req.url.startsWith('/piezas/') || req.url.startsWith('/vehiculos/');
  const isListingPage = req.url === '/piezas' || req.url.startsWith('/piezas?') || req.url === '/vehiculos' || req.url.startsWith('/vehiculos?');
  const isStaticPage = req.url === '/contacto' || req.url === '/tasamos-tu-vehiculo';
  
  // CRITICAL FIX: Process specific SEO pages for ALL users to show meta tags in HTML source
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Process SEO pages for all users to ensure meta tags appear in HTML source
  // Only skip for development environment and non-SEO pages to prevent Vite interference
  
  // ORIGINAL WORKING CONFIG: Process SEO URLs for ALL users (bots + usuarios normales)
  // This was working perfectly yesterday
  const shouldProcess = isHomePage || isListingPage || isStaticPage || isSEOUrl;
  
  if (!shouldProcess) {
    return next();
  }
  
  // Process for ALL users on SEO URLs - this was working yesterday
  
  console.log(`🎯 SEO Middleware - Processing SEO page: ${req.url} (Bot: ${isBot}, Dev: ${isDevelopment})`);

  try {
    // Intentar obtener datos desde cache primero
    let seoData = getCachedSeoData(req.url);
    
    if (!seoData) {

      // Handle home page
      if (isHomePage) {
        seoData = {
          title: 'Desguace Murcia - Repuestos Originales Vehículos | Garantía 3 Meses',
          description: 'Encuentra repuestos originales para tu vehículo en Desguace Murcia. Más de 120.000 piezas disponibles con garantía de 3 meses. Envío península desde 4,99€.'
        };
      } else if (isListingPage) {
        // Handle listing pages (without specific ID)
        if (req.url.startsWith('/piezas')) {
          seoData = {
            title: 'Catálogo de Piezas y Repuestos de Vehículos | Desguace Murcia',
            description: 'Explora nuestro catálogo completo de más de 151.000 piezas y repuestos originales para vehículos. Encuentra la pieza que necesitas con garantía de 3 meses.'
          };
        } else if (req.url.startsWith('/vehiculos')) {
          seoData = {
            title: 'Catálogo de Vehículos Desguazados | Desguace Murcia', 
            description: 'Consulta nuestro inventario de vehículos desguazados de todas las marcas. Encuentra piezas disponibles para tu modelo con garantía de 3 meses.'
          };
        }
      } else if (isStaticPage) {
        // Handle static pages
        if (req.url === '/contacto') {
          seoData = {
            title: 'Contacto - Desguace Murcia | Teléfono 958 79 08 58',
            description: 'Contáctanos para consultas sobre repuestos y piezas de vehículos. Teléfono 958 79 08 58. Horario: Lun-Vie: de 8:00h. a 13:30h. y de 16:00h. a 17:30h. Murcia, España.'
          };
        } else if (req.url === '/tasamos-tu-vehiculo') {
          seoData = {
            title: 'Tasamos tu Vehículo - Venta de Coches | Desguace Murcia',
            description: 'Tasamos tu vehículo al mejor precio en Murcia. Valoración gratuita y pago inmediato. Compramos coches, furgonetas y motos en cualquier estado.'
          };
        }
      } else if (isSEOUrl) {
        // Extract ID from URL for individual items
        const match = req.url.match(/-?(\d+)$/);
        const id = match ? parseInt(match[1]) : 0;
        
        console.log(`🔍 SEO Middleware - Extracting ID from ${req.url}: ${id}`);
        
        if (!id || id <= 0) {
          console.log(`⚠️ SEO Middleware - No valid ID found in ${req.url}, passing to next middleware`);
          return next();
        }

        // Get data based on URL type
        if (req.url.startsWith('/piezas/')) {
          const part = await storage.getPartById(id);
          if (part) {
            const vehicleInfo = part.vehicleMarca && part.vehicleModelo 
              ? `${part.vehicleMarca} ${part.vehicleModelo}` 
              : '';
            const version = part.vehicleVersion && 
                           part.vehicleVersion !== '*' && 
                           part.vehicleVersion !== 'N/A' && 
                           part.vehicleVersion.trim() !== '' 
                           ? ` ${part.vehicleVersion}` : '';
            const oemRef = part.refPrincipal && 
                           part.refPrincipal !== 'N/A' && 
                           part.refPrincipal.trim() !== ''
                           ? ` (OEM: ${part.refPrincipal})` : '';
            const internalRef = part.refLocal ? ` (Ref: ${part.refLocal})` : '';

            seoData = {
              title: `${part.descripcionArticulo}${vehicleInfo ? ' ' + vehicleInfo : ''}${version}${oemRef}${internalRef}`,
              description: `Compra ${part.descripcionArticulo}${vehicleInfo ? ' para ' + vehicleInfo + version : ''} online en Desguace Murcia por ${parseFloat(part.precio || '0')}€. Garantía 3 meses y envío península.`
            };
          }
        } else if (req.url.startsWith('/vehiculos/')) {
          const vehicle = await storage.getVehicleById(id);
          if (vehicle) {
            seoData = {
              title: `${vehicle.marca} ${vehicle.modelo} ${vehicle.anyo || ''}${vehicle.version ? ' ' + vehicle.version : ''} - Piezas y Recambios | Desguace Murcia`,
              description: `Encuentra piezas para ${vehicle.marca} ${vehicle.modelo} ${vehicle.anyo || ''}${vehicle.version ? ' ' + vehicle.version : ''} en Desguace Murcia. ${vehicle.active_parts_count || 0} piezas disponibles. Garantía 3 meses y envío península.`
            };
          }
        }
      }
      
      // Cache the generated SEO data
      if (seoData) {
        setCachedSeoData(req.url, seoData);
      }
    }

    if (!seoData) {
      return next();
    }

    // Get cached HTML template
    let html;
    try {
      html = getHtmlTemplate();
    } catch (error) {
      return next();
    }
    
    // Get current domain for Open Graph URLs
    const currentDomain = process.env.NODE_ENV === 'production' 
      ? (process.env.CLOUD_DOMAIN || req.headers.host)
      : req.headers.host;
    
    // Set default values for fallback
    const defaultTitle = 'Desguace Murcia - Repuestos Originales Vehículos';
    const defaultDescription = 'Encuentra repuestos originales para tu vehículo en Desguace Murcia. Más de 120.000 piezas disponibles con garantía de 3 meses.';
    const defaultImage = 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=630&fit=crop';
    
    // Replace title and meta tags with actual content from HTML
    html = html.replace(/<title>.*?<\/title>/i, `<title>${seoData.title}</title>`);
    html = html.replace(/<meta name="description" content=".*?".*?>/i, 
      `<meta name="description" content="${seoData.description}" />`);
    html = html.replace(/<meta property="og:title" content=".*?".*?>/i, 
      `<meta property="og:title" content="${seoData.title}" />`);
    html = html.replace(/<meta property="og:description" content=".*?".*?>/i, 
      `<meta property="og:description" content="${seoData.description}" />`);
    html = html.replace(/<meta property="og:url" content=".*?".*?>/i, 
      `<meta property="og:url" content="https://${currentDomain}${req.url}" />`);
    html = html.replace(/<meta name="twitter:title" content=".*?".*?>/i, 
      `<meta name="twitter:title" content="${seoData.title}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?".*?>/i, 
      `<meta name="twitter:description" content="${seoData.description}" />`);
    
    // Always serve SEO HTML for specific pages, regardless of environment
    // This ensures meta tags appear in "View Page Source" for all users
    
    // Send SEO-optimized HTML immediately and stop further middleware processing
    console.log(`✅ SEO Middleware - Sending optimized HTML for: ${req.url}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    return res.send(html);

  } catch (error) {
    return next();
  }
}