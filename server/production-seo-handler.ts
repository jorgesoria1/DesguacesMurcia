import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from './db';
import { parts, vehicles } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Cache del template HTML
let htmlTemplate: string | null = null;

// Función para cargar el template HTML según el entorno
function loadHtmlTemplate(): string {
  if (!htmlTemplate) {
    try {
      // Determinar la ruta correcta del template
      const templatePath = process.env.NODE_ENV === 'production' 
        ? path.resolve(process.cwd(), 'server/public/index.html')
        : path.resolve(process.cwd(), 'client/index.html');
      
      if (fs.existsSync(templatePath)) {
        htmlTemplate = fs.readFileSync(templatePath, 'utf8');
        console.log('📄 HTML template loaded from:', templatePath);
      } else {
        // Template de respaldo
        htmlTemplate = `<!DOCTYPE html>
<html lang="es-ES">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>__TITLE__</title>
    <meta name="description" content="__DESCRIPTION__" />
    <meta name="robots" content="index, follow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="__OG_TITLE__" />
    <meta property="og:description" content="__OG_DESCRIPTION__" />
    <meta property="og:image" content="__OG_IMAGE__" />
    <meta property="og:url" content="__OG_URL__" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="__OG_TITLE__" />
    <meta name="twitter:description" content="__OG_DESCRIPTION__" />
    <meta name="twitter:image" content="__OG_IMAGE__" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  </head>
  <body>
    <div id="root">
      <h1>__TITLE__</h1>
      <p>__DESCRIPTION__</p>
      <p>Esta página requiere JavaScript para funcionar completamente.</p>
    </div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;
        console.log('⚠️ Using fallback HTML template');
      }
    } catch (error) {
      console.error('❌ Error loading HTML template:', error);
      // Template mínimo de emergencia
      htmlTemplate = '<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Server Error</h1></body></html>';
    }
  }
  return htmlTemplate;
}

// Función para escapar HTML
function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generar HTML con meta tags dinámicos usando template replacement
function generateHtmlWithMeta(metaData: {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  schemaOrg?: string;
}): string {
  let html = loadHtmlTemplate();
  const timestamp = Date.now();
  
  // Template string replacement - método más eficiente que DOM parsing
  html = html
    .replace(/__TITLE__/g, escapeHtml(metaData.title))
    .replace(/__DESCRIPTION__/g, escapeHtml(metaData.description))
    .replace(/__OG_TITLE__/g, escapeHtml(metaData.ogTitle))
    .replace(/__OG_DESCRIPTION__/g, escapeHtml(metaData.ogDescription))
    .replace(/__OG_IMAGE__/g, escapeHtml(metaData.ogImage))
    .replace(/__OG_URL__/g, escapeHtml(metaData.ogUrl))
    // También reemplazar tags existentes si los hay
    .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(metaData.title)}</title>`)
    .replace(/<meta name="description" content=".*?"[^>]*>/i, `<meta name="description" content="${escapeHtml(metaData.description)}" />`)
    .replace(/<meta property="og:title" content=".*?"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(metaData.ogTitle)}" />`)
    .replace(/<meta property="og:description" content=".*?"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(metaData.ogDescription)}" />`)
    .replace(/<meta property="og:image" content=".*?"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(metaData.ogImage)}" />`)
    .replace(/<meta property="og:url" content=".*?"[^>]*>/i, `<meta property="og:url" content="${escapeHtml(metaData.ogUrl)}" />`);
  
  // Inyectar timestamp único y headers anti-cache
  html = html.replace('<meta name="viewport"', `<meta name="generator" content="Desguace-Murcia-SEO-${timestamp}">
    <meta name="cache-control" content="no-cache, no-store, must-revalidate">
    <meta name="pragma" content="no-cache">
    <meta name="expires" content="0">
    <meta name="viewport"`);
  
  // Inyectar Schema.org si existe
  if (metaData.schemaOrg) {
    html = html.replace('</head>', `    <script type="application/ld+json">${metaData.schemaOrg}</script>\n  </head>`);
  }
  
  // Agregar comentario anti-cache en el body
  html = html.replace('</body>', `    <!-- Safari Anti-Cache: ${timestamp} -->\n  </body>`);
  
  return html;
}

// Función para detectar si es un bot/crawler
function isCrawlerBot(userAgent: string): boolean {
  const botPatterns = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i, // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /whatsapp/i,
    /telegrambot/i,
    /twitterbot/i,
    /linkedinbot/i,
    /slackbot/i,
    /discordbot/i,
    /pinterest/i,
    /skypeuripreview/i,
    /applebot/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

// Handler para piezas
export async function handlePartSEO(req: express.Request, res: express.Response): Promise<void> {
  try {
    const slug = req.params.slug || req.params[0]; // Capturar slug o parámetro posicional
    let partId: number;
    const userAgent = req.get('User-Agent') || '';
    const isBot = isCrawlerBot(userAgent);
    const isDirectAccess = !req.get('Referer') || !req.get('Referer').includes(req.get('Host') || '');
    
    // Logging simplificado para producción
    console.log(`🔍 SEO Part Handler - Processing: ${slug}`);
    
    // Extraer ID de la URL
    if (!slug || slug === 'undefined') {
      console.log(`❌ SEO Part Handler - Slug is undefined or invalid`);
      return res.redirect('/');
    }
    
    if (/^\d+$/.test(slug)) {
      partId = parseInt(slug);
    } else if (typeof slug === 'string') {
      const match = slug.match(/-(\d+)$/);
      if (match) {
        partId = parseInt(match[1]);
      } else {
        return res.redirect('/');
      }
    } else {
      return res.redirect('/');
    }
    
    if (isNaN(partId)) {
      return res.redirect('/');
    }
    
    // Buscar pieza en BD
    const part = await db.select().from(parts).where(eq(parts.id, partId)).limit(1);
    if (!part.length) {
      return res.redirect('/');
    }
    
    const p = part[0];
    const title = `${p.descripcionArticulo} ${p.vehicleMarca} ${p.vehicleModelo} ${p.vehicleVersion !== '*' ? p.vehicleVersion : ''} (OEM: ${p.refPrincipal}) (Ref: ${p.refLocal})`.trim();
    const description = `Compra ${p.descripcionArticulo} ${p.vehicleMarca} ${p.vehicleModelo} online en Desguace Murcia por ${p.precio}€. Garantía 3 meses y envío península.`;
    const image = p.imagenes && p.imagenes.length > 0 ? p.imagenes[0] : `${req.protocol}://${req.get('host')}/desguacesmurcia1.png`;
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    
    // Schema.org JSON-LD
    const schemaOrg = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.descripcionArticulo,
      "description": description,
      "image": image,
      "brand": {
        "@type": "Brand",
        "name": p.vehicleMarca
      },
      "offers": {
        "@type": "Offer",
        "price": p.precio,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/UsedCondition",
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
          "telephone": "958 790 858",
          "email": "info@desguacemurcia.com"
        }
      },
      "warranty": {
        "@type": "WarrantyPromise",
        "durationOfWarranty": "P3M"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "592"
      }
    }, null, 2);
    
    const metaData = {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogImage: image,
      ogUrl: url,
      schemaOrg
    };
    
    // Generar HTML con meta tags
    const html = generateHtmlWithMeta(metaData);
    
    // Headers anti-cache específicos para Safari - FORZAR RECARGA COMPLETA
    const timestamp = Date.now();
    const etag = `"seo-part-${partId}-${timestamp}"`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
    res.setHeader('Vary', 'User-Agent, Accept-Encoding, Referer');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('X-Accel-Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.send(html);
    
  } catch (error) {
    console.error('Error in part SEO handler:', error);
    res.redirect('/');
  }
}

// Handler para vehículos
export async function handleVehicleSEO(req: express.Request, res: express.Response): Promise<void> {
  try {
    const slug = req.params.slug;
    let vehicleId: number;
    const userAgent = req.get('User-Agent') || '';
    
    // Logging simplificado para producción
    console.log(`🚗 SEO Vehicle Handler - Processing: ${slug}`);
    
    // Extraer ID de la URL
    if (/^\d+$/.test(slug)) {
      vehicleId = parseInt(slug);
    } else if (typeof slug === 'string') {
      const match = slug.match(/-(\d+)$/);
      if (match) {
        vehicleId = parseInt(match[1]);
      } else {
        return res.redirect('/');
      }
    } else {
      return res.redirect('/');
    }
    
    if (isNaN(vehicleId)) {
      return res.redirect('/');
    }
    
    // Buscar vehículo en BD
    const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    if (!vehicle.length) {
      return res.redirect('/');
    }
    
    const v = vehicle[0];
    const title = `${v.marca} ${v.modelo} ${v.anyo || ''} ${v.version !== '*' ? v.version || '' : ''} - Piezas y Recambios | Desguace Murcia`.trim();
    const description = `Encuentra piezas para ${v.marca} ${v.modelo} ${v.anyo || ''} ${v.version !== '*' ? v.version || '' : ''} en Desguace Murcia. Garantía 3 meses y envío península.`.trim();
    const image = v.imagenes && v.imagenes.length > 0 ? v.imagenes[0] : `${req.protocol}://${req.get('host')}/desguacesmurcia1.png`;
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    
    const metaData = {
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogImage: image,
      ogUrl: url
    };
    
    // Generar HTML con meta tags
    const html = generateHtmlWithMeta(metaData);
    
    // Headers anti-cache específicos para Safari - FORZAR RECARGA COMPLETA
    const timestamp = Date.now();
    const etag = `"seo-vehicle-${vehicleId}-${timestamp}"`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
    res.setHeader('Vary', 'User-Agent, Accept-Encoding, Referer');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('X-Accel-Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.send(html);
    
  } catch (error) {
    console.error('Error in vehicle SEO handler:', error);
    res.redirect('/');
  }
}

// Handler por defecto
export function handleDefaultSEO(req: express.Request, res: express.Response): void {
  try {
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    
    const metaData = {
      title: 'Desguace Murcia - Recambios de Automóvil',
      description: 'Desguace Murcia - Venta de recambios de automóvil usados. Encuentra piezas de calidad para tu vehículo al mejor precio.',
      ogTitle: 'Desguace Murcia - Recambios de Automóvil',
      ogDescription: 'Desguace Murcia - Venta de recambios de automóvil usados. Encuentra piezas de calidad para tu vehículo al mejor precio.',
      ogImage: `${req.protocol}://${req.get('host')}/desguacesmurcia1.png`,
      ogUrl: url
    };
    
    const html = generateHtmlWithMeta(metaData);
    
    // Headers anti-cache específicos para Safari - FORZAR RECARGA COMPLETA
    const timestamp = Date.now();
    const etag = `"seo-default-${timestamp}"`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
    res.setHeader('Vary', 'User-Agent, Accept-Encoding, Referer');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('X-Accel-Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.send(html);
    
  } catch (error) {
    console.error('Error in default SEO handler:', error);
    res.status(500).send('Server Error');
  }
}

// Middleware universal para SEO - funciona tanto para crawlers como navegadores normales
export function universalSEOMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  // Solo aplicar a rutas de piezas y vehículos
  if (!req.path.startsWith('/piezas/') && !req.path.startsWith('/vehiculos/')) {
    return next();
  }
  
  // Aplicar SEO universalmente (no solo para bots)
  console.log(`🔍 SEO Handler: Processing ${req.path}`);
  
  if (req.path.startsWith('/piezas/')) {
    handlePartSEO(req, res);
  } else if (req.path.startsWith('/vehiculos/')) {
    handleVehicleSEO(req, res);
  } else {
    next();
  }
}

export { isCrawlerBot };