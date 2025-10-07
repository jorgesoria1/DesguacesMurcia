import { Plugin } from 'vite';
import { storage } from '../storage';

// Cache for SEO data
const seoDataCache = new Map<string, { data: any, timestamp: number }>();
const SEO_CACHE_TTL = 300000; // 5 minutes cache

interface SeoData {
  title: string;
  description: string;
}

async function getSeoDataForUrl(url: string): Promise<SeoData | null> {
  try {
    // Check cache first
    const cached = seoDataCache.get(url);
    if (cached && (Date.now() - cached.timestamp) < SEO_CACHE_TTL) {
      return cached.data;
    }

    // Check if it's a parts URL with ID
    if (url.startsWith('/piezas/') && /\d+$/.test(url)) {
      const matches = url.match(/(\d+)/g);
      const id = matches ? matches[matches.length - 1] : null;
      
      if (id) {
        const part = await storage.getPartById(parseInt(id));
        
        if (part) {
          const title = `${part.descripcionArticulo} ${part.vehicleMarca} ${part.vehicleModelo} (${part.vehicleVersion || part.vehicleAnyo}) (OEM: ${part.codArticulo}) (Ref: ${part.refLocal})`;
          const description = `Compra ${part.descripcionArticulo} para ${part.vehicleMarca} ${part.vehicleModelo} ${part.vehicleVersion ? `(${part.vehicleVersion}) ` : ''}online en Desguace Murcia por ${part.precio}€. Garantía 3 meses y envío península.`;
          
          const seoData = { title, description };
          
          // Cache the result
          seoDataCache.set(url, { data: seoData, timestamp: Date.now() });
          
          console.log(`✅ Universal Meta Plugin - Generated for part ${id}: ${title.substring(0, 50)}...`);
          return seoData;
        }
      }
    }
    
    // Add more URL patterns here if needed
    if (url.startsWith('/vehiculos/') && /\d+$/.test(url)) {
      // Handle vehicle URLs if needed
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting SEO data in plugin:', error);
    return null;
  }
}

// UNIVERSAL META TAGS VITE PLUGIN - Works for ALL users
export function universalMetaTagsPlugin(): Plugin {
  return {
    name: 'universal-meta-tags',
    configureServer(server) {
      server.middlewares.use('/', async (req, res, next) => {
        // Only process HTML requests
        if (!req.url || req.url.includes('.') || !req.headers.accept?.includes('html')) {
          return next();
        }
        
        console.log(`🌐 Universal Meta Plugin - Processing: ${req.url}`);
        next();
      });
    },
    transformIndexHtml: {
      enforce: 'pre',
      transform: async (html: string, context) => {
        const url = context.originalUrl || context.path || '/';
        
        console.log(`🔧 Universal Meta Plugin - TransformIndexHtml for: ${url}`);
        
        const seoData = await getSeoDataForUrl(url);
        
        if (seoData) {
          console.log(`✅ Universal Meta Plugin - Injecting meta tags: ${seoData.title.substring(0, 40)}...`);
          
          // Replace title
          html = html.replace(
            /<title>([^<]*)<\/title>/, 
            `<title>${seoData.title}</title>`
          );
          
          // Replace description
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
          
          console.log(`✅ Universal Meta Plugin - HTML transformed successfully`);
        } else {
          console.log(`ℹ️ Universal Meta Plugin - No SEO data for: ${url}`);
        }
        
        return html;
      }
    }
  };
}