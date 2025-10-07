import { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { storage } from '../storage';

// Cache para evitar múltiples consultas de la misma pieza/vehículo
const seoCache = new Map<string, any>();
const cacheExpiry = 5 * 60 * 1000; // 5 minutos

// Función para extraer ID de la URL
function extractIdFromUrl(url: string): number {
  const match = url.match(/-(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

// Función para generar meta tags de piezas
async function generatePartSEOTags(partId: number) {
  try {
    const part = await storage.getPartById(partId);
    if (!part) return null;

    // Construir información del vehículo
    const vehicleInfo = part.vehicleMarca && part.vehicleModelo 
      ? `${part.vehicleMarca} ${part.vehicleModelo}` 
      : '';
    
    // Agregar versión si existe y no es genérica
    const version = part.vehicleVersion && 
                   part.vehicleVersion !== '*' && 
                   part.vehicleVersion !== 'N/A' && 
                   part.vehicleVersion.trim() !== '' 
                   ? ` ${part.vehicleVersion}` : '';

    // Construir referencia OEM si existe
    const oemRef = part.refPrincipal && 
                   part.refPrincipal !== 'N/A' && 
                   part.refPrincipal.trim() !== ''
                   ? ` (OEM: ${part.refPrincipal})` : '';
                   
    // Construir referencia interna
    const internalRef = part.refLocal ? ` (Ref: ${part.refLocal})` : '';

    // Construir título SEO personalizado
    const seoTitle = `${part.descripcionArticulo}${vehicleInfo ? ' ' + vehicleInfo : ''}${version}${oemRef}${internalRef}`;

    // Construir descripción SEO personalizada
    const seoDescription = `Compra ${part.descripcionArticulo}${vehicleInfo ? ' para ' + vehicleInfo + version : ''} online en Desguace Murcia por ${parseFloat(part.precio || '0')} €. Garantía 3 meses y envío península.`;

    return {
      title: seoTitle,
      description: seoDescription,
      price: part.precio,
      image: part.imagenes?.[0] || '/desguacesmurcia1.png',
      brand: part.vehicleMarca || 'Desguace Murcia',
      category: part.descripcionFamilia || 'Recambios de Automóvil'
    };
  } catch (error) {
    console.error('Error generando SEO para pieza:', error);
    return null;
  }
}

// Función para generar meta tags de vehículos
async function generateVehicleSEOTags(vehicleId: number) {
  try {
    const vehicle = await storage.getVehicleById(vehicleId);
    if (!vehicle) return null;

    // Construir título SEO para vehículo
    const seoTitle = `${vehicle.marca} ${vehicle.modelo} ${vehicle.anyo || ''}${vehicle.version ? ' ' + vehicle.version : ''} - Piezas y Recambios | Desguace Murcia`;

    // Construir descripción SEO para vehículo
    const seoDescription = `Encuentra piezas para ${vehicle.marca} ${vehicle.modelo} ${vehicle.anyo || ''}${vehicle.version ? ' ' + vehicle.version : ''} en Desguace Murcia. ${vehicle.active_parts_count || 0} piezas disponibles. Garantía 3 meses y envío península.`;

    return {
      title: seoTitle,
      description: seoDescription,
      image: vehicle.imagenes?.[0] || '/desguacesmurcia1.png',
      brand: vehicle.marca,
      category: 'Vehículos'
    };
  } catch (error) {
    console.error('Error generando SEO para vehículo:', error);
    return null;
  }
}

// Función para inyectar meta tags en el HTML
function injectSEOTags(html: string, seoData: any): string {
  const { title, description, price, image, brand, category } = seoData;

  // Reemplazar título
  html = html.replace(
    /<title>.*<\/title>/i,
    `<title>${title}</title>`
  );

  // Reemplazar descripción
  html = html.replace(
    /<meta name="description" content="[^"]*"/i,
    `<meta name="description" content="${description}"`
  );

  // Inyectar Open Graph y Twitter Card tags
  const ogTags = `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Desguace Murcia" />
    <meta property="og:locale" content="es_ES" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="${title}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />`;

  // Inyectar Schema.org JSON-LD para productos
  const schemaScript = price ? `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "${title}",
      "description": "${description}",
      "image": "${image}",
      "brand": {
        "@type": "Brand",
        "name": "${brand}"
      },
      "category": "${category}",
      "condition": "https://schema.org/UsedCondition",
      "offers": {
        "@type": "Offer",
        "price": "${price}",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
        "seller": {
          "@type": "Organization",
          "name": "Desguace Murcia S.L.",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Carretera Almuñecar, Km 1.5",
            "addressLocality": "Granada",
            "postalCode": "18640",
            "addressCountry": "ES"
          },
          "telephone": "958 790 858"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "592"
      },
      "warranty": "P3M"
    }
    </script>` : '';

  // Inyectar antes del </head>
  html = html.replace(
    /<\/head>/i,
    `${ogTags}${schemaScript}
    </head>`
  );

  return html;
}

// Middleware principal de SEO
export async function seoMiddleware(req: Request, res: Response, next: NextFunction) {
  const url = req.url;
  console.log(`🔍 SEO Middleware - Processing URL: ${url}`);
  
  // Solo procesar rutas HTML (no APIs ni assets)
  if (!url.match(/^\/piezas\/|^\/vehiculos\//)) {
    console.log(`⏭️ SEO Middleware - Skipping URL: ${url} (not a piece/vehicle route)`);
    return next();
  }

  console.log(`✅ SEO Middleware - Processing SEO for: ${url}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📁 HTML Path will be: ${process.env.NODE_ENV === 'production' ? 'server/public/index.html' : 'client/index.html'}`);

  try {
    // Verificar cache
    const cacheKey = url;
    const cached = seoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheExpiry) {
      return res.send(cached.html);
    }

    // Leer archivo HTML base - usar ruta correcta según entorno
    const htmlPath = process.env.NODE_ENV === 'production' 
      ? join(process.cwd(), 'server/public/index.html')
      : join(process.cwd(), 'client/index.html');
    
    let html;
    try {
      html = readFileSync(htmlPath, 'utf-8');
    } catch (error) {
      console.error(`Error leyendo HTML desde ${htmlPath}:`, error);
      return next();
    }

    let seoData = null;

    // Detectar tipo de página y generar SEO
    if (url.startsWith('/piezas/')) {
      const partId = extractIdFromUrl(url);
      if (partId > 0) {
        seoData = await generatePartSEOTags(partId);
      }
    } else if (url.startsWith('/vehiculos/')) {
      const vehicleId = extractIdFromUrl(url);
      if (vehicleId > 0) {
        seoData = await generateVehicleSEOTags(vehicleId);
      }
    }

    // Inyectar SEO si se generó
    if (seoData) {
      html = injectSEOTags(html, seoData);
      
      // Guardar en cache
      seoCache.set(cacheKey, {
        html,
        timestamp: Date.now()
      });
    }

    res.send(html);
  } catch (error) {
    console.error('Error en SEO middleware:', error);
    next();
  }
}

// Limpiar cache periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of seoCache.entries()) {
    if (now - value.timestamp > cacheExpiry) {
      seoCache.delete(key);
    }
  }
}, cacheExpiry);