import { Request, Response } from 'express';
// import fetch from 'node-fetch'; // Comentado por error de tipo

// Proxy para optimizar imágenes del CDN Metasync
export const optimizeImageProxy = async (req: Request, res: Response) => {
  try {
    const { url, w = 400, h = 300, q = 75 } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL requerida' });
    }

    // Solo permitir URLs del CDN Metasync
    if (!url.includes('cdn11.metasync.com')) {
      return res.status(400).json({ error: 'URL no autorizada' });
    }

    // Caché headers para performance
    res.set({
      'Cache-Control': 'public, max-age=2592000, immutable', // 30 días
      'Content-Type': 'image/webp',
    });

    // Fetch la imagen original usando fetch nativo
    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'DesguaceMurcia-ImageOptimizer/1.0'
      }
    } as RequestInit);

    if (!imageResponse.ok) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    // Por ahora solo pasamos la imagen original debido a limitaciones del CDN
    // TODO: Implementar optimización real con Sharp cuando sea posible
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    res.setHeader('Content-Length', imageBuffer.length);
    res.end(imageBuffer);

  } catch (error) {
    console.error('Error en proxy de imagen:', error);
    res.status(500).json({ error: 'Error procesando imagen' });
  }
};

// Función para generar URL optimizada
export const generateOptimizedImageUrl = (originalUrl: string, width = 400, height = 300) => {
  if (!originalUrl || !originalUrl.includes('cdn11.metasync.com')) {
    return originalUrl;
  }
  
  // Por ahora devolvemos la URL original hasta implementar el proxy completo
  return originalUrl;
  
  // Futuro: return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}&w=${width}&h=${height}&q=75`;
};