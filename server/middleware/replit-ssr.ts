// Replit-optimized SSR middleware that works with Vite in development
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
    const htmlPath = join(process.cwd(), 'client/index.html');
    
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

// REPLIT SSR MIDDLEWARE - For ALL users on specific SEO URLs
export async function replitSSRMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only process specific SEO URLs that need dynamic meta tags
  const isPiezasUrl = req.url.startsWith('/piezas/');
  const hasIdAtEnd = /\d+$/.test(req.url);
  const isSpecificSEOUrl = isPiezasUrl && hasIdAtEnd;
  
  // Skip if not a specific SEO URL
  if (!isSpecificSEOUrl) {
    return next();
  }
  
  // Additional safety checks - skip Vite/development requests
  if (req.url.includes('/@') || 
      req.url.includes('.hot-update') ||
      req.url.includes('__vite') ||
      req.headers.accept?.includes('text/event-stream') ||
      req.headers.accept?.includes('application/json')) {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discordbot/i.test(userAgent);
  
  console.log(`🌐 Universal SSR - Processing ${req.url} for ${isBot ? 'bot' : 'user'}: ${userAgent.substring(0, 30)}`);
  
  // Store the original res.send for HTML modification
  const originalSend = res.send;
  
  // CRITICAL DECISION: For regular users, modify HTML after Vite processes it
  // For bots, serve static HTML with meta tags immediately
  if (!isBot) {
    console.log(`👤 User request - Will modify Vite HTML for: ${req.url}`);
    
    // Override res.send to intercept and modify the HTML
    res.send = function(data: any) {
      if (typeof data === 'string' && data.includes('<html') && data.includes('</html>')) {
        console.log(`🔧 Intercepting HTML response to inject meta tags for: ${req.url}`);
        
        // Get SEO data for this URL
        getSeoDataForUrl(req.url).then((seoData) => {
          if (seoData) {
            // Inject dynamic meta tags into Vite's HTML
            let modifiedHtml = data;
            
            // Replace title
            modifiedHtml = modifiedHtml.replace(
              /<title>([^<]*)<\/title>/, 
              `<title>${seoData.title}</title>`
            );
            
            // Replace description
            modifiedHtml = modifiedHtml.replace(
              /<meta name="description" content="([^"]*)"/, 
              `<meta name="description" content="${seoData.description}"`
            );
            
            // Update Open Graph and Twitter tags
            modifiedHtml = modifiedHtml.replace(
              /<meta property="og:title" content="([^"]*)"/, 
              `<meta property="og:title" content="${seoData.title}"`
            );
            
            modifiedHtml = modifiedHtml.replace(
              /<meta property="og:description" content="([^"]*)"/, 
              `<meta property="og:description" content="${seoData.description}"`
            );
            
            modifiedHtml = modifiedHtml.replace(
              /<meta name="twitter:title" content="([^"]*)"/, 
              `<meta name="twitter:title" content="${seoData.title}"`
            );
            
            modifiedHtml = modifiedHtml.replace(
              /<meta name="twitter:description" content="([^"]*)"/, 
              `<meta name="twitter:description" content="${seoData.description}"`
            );
            
            console.log(`✅ HTML modified with dynamic meta tags for user: ${seoData.title.substring(0, 50)}...`);
            originalSend.call(this, modifiedHtml);
          } else {
            originalSend.call(this, data);
          }
        }).catch(() => {
          originalSend.call(this, data);
        });
      } else {
        originalSend.call(this, data);
      }
    };
    
    return next();
  }

  try {
    let seoData = getCachedSeoData(req.url);
    
    if (!seoData) {
      // Extract part ID from URL (look for patterns like faro-derecho-lexus-rx-agl20-2173418)
      const matches = req.url.match(/(\d+)/g);
      const id = matches ? matches[matches.length - 1] : null; // Get the last number sequence
      
      if (id) {
        try {
          const part = await storage.getPartById(parseInt(id));
          
          if (part) {
            const title = `${part.descripcionArticulo} ${part.vehicleMarca} ${part.vehicleModelo} (${part.vehicleVersion || part.vehicleAnyo}) (OEM: ${part.codArticulo}) (Ref: ${part.refLocal})`;
            const description = `Compra ${part.descripcionArticulo} para ${part.vehicleMarca} ${part.vehicleModelo} ${part.vehicleVersion ? `(${part.vehicleVersion}) ` : ''}online en Desguace Murcia por ${part.precio}€. Garantía 3 meses y envío península.`;
            
            seoData = { title, description };
            console.log(`✅ Replit SSR - Generated meta for part ${id}: ${title.substring(0, 50)}...`);
          }
        } catch (error) {
          console.error(`❌ Replit SSR - Error fetching part ${id}:`, error);
        }
      }
      
      if (!seoData) {
        seoData = {
          title: 'Pieza de Repuesto - Desguace Murcia',
          description: 'Encuentra la pieza que necesitas en Desguace Murcia con garantía de 3 meses.'
        };
      }
      
      setCachedSeoData(req.url, seoData);
    }

    // Get base HTML template
    let html = getHtmlTemplate();
    
    // Replace meta tags preserving the exact format
    html = html.replace(
      /<title>([^<]*)<\/title>/, 
      `<title>${seoData.title}</title>`
    );
    
    html = html.replace(
      /<meta name="description" content="([^"]*)"/, 
      `<meta name="description" content="${seoData.description}"`
    );
    
    // Update Open Graph tags
    html = html.replace(
      /<meta property="og:title" content="([^"]*)"/, 
      `<meta property="og:title" content="${seoData.title}"`
    );
    
    html = html.replace(
      /<meta property="og:description" content="([^"]*)"/, 
      `<meta property="og:description" content="${seoData.description}"`
    );
    
    // Update Twitter Card tags
    html = html.replace(
      /<meta name="twitter:title" content="([^"]*)"/, 
      `<meta name="twitter:title" content="${seoData.title}"`
    );
    
    html = html.replace(
      /<meta name="twitter:description" content="([^"]*)"/, 
      `<meta name="twitter:description" content="${seoData.description}"`
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('❌ Replit SSR error:', error);
    next();
  }
}

// Helper function to get SEO data for a URL
async function getSeoDataForUrl(url: string): Promise<{title: string, description: string} | null> {
  try {
    // Extract part ID from URL
    const matches = url.match(/(\d+)/g);
    const id = matches ? matches[matches.length - 1] : null;
    
    if (id) {
      const part = await storage.getPartById(parseInt(id));
      
      if (part) {
        const title = `${part.descripcionArticulo} ${part.vehicleMarca} ${part.vehicleModelo} (${part.vehicleVersion || part.vehicleAnyo}) (OEM: ${part.codArticulo}) (Ref: ${part.refLocal})`;
        const description = `Compra ${part.descripcionArticulo} para ${part.vehicleMarca} ${part.vehicleModelo} ${part.vehicleVersion ? `(${part.vehicleVersion}) ` : ''}online en Desguace Murcia por ${part.precio}€. Garantía 3 meses y envío península.`;
        
        return { title, description };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting SEO data:', error);
    return null;
  }
}