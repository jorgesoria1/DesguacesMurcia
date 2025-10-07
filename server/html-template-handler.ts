import fs from 'fs';
import path from 'path';
import { db } from './db';
import { parts, vehicles } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Cache del template HTML para mejor rendimiento
let htmlTemplate: string | null = null;
let templatePath: string;

// Determinar la ruta correcta del template según el entorno
if (process.env.NODE_ENV === 'production') {
  templatePath = path.resolve(process.cwd(), 'server/public/index.html');
} else {
  templatePath = path.resolve(process.cwd(), 'client/index.html');
}

// Función para cargar el template HTML
export function loadHtmlTemplate(): void {
  try {
    if (fs.existsSync(templatePath)) {
      htmlTemplate = fs.readFileSync(templatePath, 'utf8');
      console.log('📄 HTML template loaded:', templatePath);
    } else {
      console.error('❌ HTML template not found:', templatePath);
    }
  } catch (error) {
    console.error('❌ Error loading HTML template:', error);
  }
}

// Función para escapar HTML y prevenir XSS
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generar meta tags para piezas
export async function generatePartMetaTags(partId: number): Promise<{ html: string; metaTags: any } | null> {
  try {
    const part = await db.select().from(parts).where(eq(parts.id, partId)).limit(1);
    if (!part.length) return null;
    
    const p = part[0];
    const title = `${p.descripcionArticulo} ${p.vehicleMarca} ${p.vehicleModelo} ${p.vehicleVersion !== '*' ? p.vehicleVersion : ''} (OEM: ${p.refPrincipal}) (Ref: ${p.refLocal})`.trim();
    const description = `Compra ${p.descripcionArticulo} ${p.vehicleMarca} ${p.vehicleModelo} online en Desguace Murcia por ${p.precio}€. Garantía 3 meses y envío península.`;
    const price = p.precio;
    const image = p.imagenes && p.imagenes.length > 0 ? p.imagenes[0] : '/desguacesmurcia1.png';
    const url = `/piezas/${generateSlug(p)}`;
    
    // JSON-LD Schema
    const schemaOrg = {
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
    };
    
    const metaTags = {
      title: escapeHtml(title),
      description: escapeHtml(description),
      ogTitle: escapeHtml(title),
      ogDescription: escapeHtml(description),
      ogImage: escapeHtml(image),
      ogUrl: escapeHtml(url),
      schemaOrg: JSON.stringify(schemaOrg, null, 2)
    };
    
    return { html: generateHtmlWithMeta(metaTags), metaTags };
  } catch (error) {
    console.error('Error generating part meta tags:', error);
    return null;
  }
}

// Generar meta tags para vehículos
export async function generateVehicleMetaTags(vehicleId: number): Promise<{ html: string; metaTags: any } | null> {
  try {
    const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    if (!vehicle.length) return null;
    
    const v = vehicle[0];
    const title = `${v.marca} ${v.modelo} ${v.anyo || ''} ${v.version !== '*' ? v.version || '' : ''} - Piezas y Recambios | Desguace Murcia`.trim();
    const description = `Encuentra piezas para ${v.marca} ${v.modelo} ${v.anyo || ''} ${v.version !== '*' ? v.version || '' : ''} en Desguace Murcia. Garantía 3 meses y envío península.`.trim();
    const image = v.imagenes && v.imagenes.length > 0 ? v.imagenes[0] : '/desguacesmurcia1.png';
    const url = `/vehiculos/${generateVehicleSlug(v)}`;
    
    const metaTags = {
      title: escapeHtml(title),
      description: escapeHtml(description),
      ogTitle: escapeHtml(title),
      ogDescription: escapeHtml(description),
      ogImage: escapeHtml(image),
      ogUrl: escapeHtml(url),
      schemaOrg: ''
    };
    
    return { html: generateHtmlWithMeta(metaTags), metaTags };
  } catch (error) {
    console.error('Error generating vehicle meta tags:', error);
    return null;
  }
}

// Función para generar HTML con meta tags inyectados
function generateHtmlWithMeta(metaTags: any): string {
  if (!htmlTemplate) {
    loadHtmlTemplate();
    if (!htmlTemplate) {
      return generateFallbackHtml(metaTags);
    }
  }
  
  // Template string replacement - método más eficiente
  let html = htmlTemplate
    .replace(/<title>.*?<\/title>/i, `<title>${metaTags.title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${metaTags.description}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${metaTags.ogTitle}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${metaTags.ogDescription}"`)
    .replace(/<meta property="og:image" content=".*?"/, `<meta property="og:image" content="${metaTags.ogImage}"`)
    .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${metaTags.ogUrl}"`);
  
  // Inyectar Schema.org si existe
  if (metaTags.schemaOrg) {
    html = html.replace('</head>', `    <script type="application/ld+json">\n${metaTags.schemaOrg}\n    </script>\n  </head>`);
  }
  
  return html;
}

// HTML de respaldo si no se puede cargar el template
function generateFallbackHtml(metaTags: any): string {
  return `<!DOCTYPE html>
<html lang="es-ES">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${metaTags.title}</title>
    <meta name="description" content="${metaTags.description}" />
    <meta name="robots" content="index, follow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${metaTags.ogTitle}" />
    <meta property="og:description" content="${metaTags.ogDescription}" />
    <meta property="og:image" content="${metaTags.ogImage}" />
    <meta property="og:url" content="${metaTags.ogUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${metaTags.ogTitle}" />
    <meta name="twitter:description" content="${metaTags.ogDescription}" />
    <meta name="twitter:image" content="${metaTags.ogImage}" />
    ${metaTags.schemaOrg ? `<script type="application/ld+json">\n${metaTags.schemaOrg}\n</script>` : ''}
  </head>
  <body>
    <div id="root">
      <h1>${metaTags.title}</h1>
      <p>${metaTags.description}</p>
      <p>Esta página requiere JavaScript para funcionar completamente.</p>
    </div>
  </body>
</html>`;
}

// Generar slug para piezas
function generateSlug(part: any): string {
  const slug = `${part.descripcionArticulo}-${part.vehicleMarca}-${part.vehicleModelo}-${part.vehicleVersion !== '*' ? part.vehicleVersion : ''}-${part.id}`;
  return slug.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Generar slug para vehículos  
function generateVehicleSlug(vehicle: any): string {
  const slug = `${vehicle.marca}-${vehicle.modelo}-${vehicle.anyo || ''}-${vehicle.version !== '*' ? vehicle.version || '' : ''}-${vehicle.id}`;
  return slug.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Generar meta tags por defecto
export function generateDefaultMetaTags(): { html: string; metaTags: any } {
  const metaTags = {
    title: 'Desguace Murcia - Recambios de Automóvil',
    description: 'Desguace Murcia - Venta de recambios de automóvil usados. Encuentra piezas de calidad para tu vehículo al mejor precio.',
    ogTitle: 'Desguace Murcia - Recambios de Automóvil',
    ogDescription: 'Desguace Murcia - Venta de recambios de automóvil usados. Encuentra piezas de calidad para tu vehículo al mejor precio.',
    ogImage: '/desguacesmurcia1.png',
    ogUrl: '/',
    schemaOrg: ''
  };
  
  return { html: generateHtmlWithMeta(metaTags), metaTags };
}

// Inicializar el template al cargar el módulo
loadHtmlTemplate();