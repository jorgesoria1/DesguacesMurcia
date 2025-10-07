/**
 * COMPRESIÓN AGRESIVA - Server Response Time 935ms → <200ms
 * PageSpeed identifica: "No compression applied"
 */

import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

// Gzip agresivo para todos los recursos
export const aggressiveCompression = (req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Solo aplicar compresión a recursos que lo benefician
  const shouldCompress = (url: string) => {
    return url.includes('.js') || 
           url.includes('.css') || 
           url.includes('.html') ||
           url.includes('.tsx') ||
           url.includes('.ts') ||
           url.includes('/api/');
  };
  
  if (!shouldCompress(req.url)) {
    return next();
  }
  
  // Interceptar respuesta para comprimir
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data: any) {
    if (acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      
      if (typeof data === 'string') {
        const compressed = zlib.gzipSync(data);
        res.setHeader('Content-Length', compressed.length);
        return originalSend.call(this, compressed);
      }
    }
    return originalSend.call(this, data);
  };
  
  res.json = function(data: any) {
    if (acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Type', 'application/json');
      
      const json = JSON.stringify(data);
      const compressed = zlib.gzipSync(json);
      res.setHeader('Content-Length', compressed.length);
      return res.end(compressed);
    }
    return originalJson.call(this, data);
  };
  
  next();
};

// Headers de caché agresivo para recursos estáticos
export const aggressiveCaching = (req: Request, res: Response, next: NextFunction) => {
  const url = req.url;
  
  // Caché super agresivo para JS chunks (1 año)
  if (url.includes('.vite/deps/') || url.includes('chunk-')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${Date.now()}"`);
  }
  
  // Caché agresivo para assets (1 mes)
  else if (url.includes('.js') || url.includes('.css') || url.includes('.woff2')) {
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.setHeader('ETag', `"${Date.now()}"`);
  }
  
  // Caché API calls (5 minutos)
  else if (url.includes('/api/')) {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  
  // NO cache HTML (preservar meta tags dinámicos)
  else if (url.includes('.html') || url === '/' || url.includes('/vehiculos/') || url.includes('/piezas/')) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  
  next();
};