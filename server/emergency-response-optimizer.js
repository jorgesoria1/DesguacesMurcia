/**
 * OPTIMIZADOR DE RESPUESTA DEL SERVIDOR - EMERGENCY FIX
 * Target: Reducir 756ms server response time identificado en PageSpeed
 */

const compression = require('compression');
const express = require('express');

// Middleware de compresión agresiva
const setupCompression = (app) => {
  app.use(compression({
    level: 6, // Nivel de compresión medio-alto
    threshold: 1024, // Comprimir archivos >1KB
    filter: (req, res) => {
      // No comprimir si el cliente no lo soporta
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // Comprimir todos los tipos de contenido compresibles
      return compression.filter(req, res);
    }
  }));
};

// Cache headers optimizados
const setCacheHeaders = (req, res, next) => {
  const url = req.url;
  
  // Assets estáticos - Cache largo
  if (url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': `"static-${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });
  }
  
  // HTML - NO CACHE para preservar meta tags dinámicos
  else if (url.match(/\.(html|htm)$/) || url.startsWith('/vehiculos/') || url.startsWith('/piezas/')) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
  
  // APIs - Cache corto
  else if (url.startsWith('/api/')) {
    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
    });
  }
  
  next();
};

// Preload hints en headers
const addPreloadHeaders = (req, res, next) => {
  // Solo para páginas HTML
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const preloadLinks = [
      '</desguacesmurcia1.png>; rel=preload; as=image',
      '<https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2>; rel=preload; as=font; type=font/woff2; crossorigin=anonymous',
      '</@vite/client>; rel=modulepreload'
    ];
    
    res.set('Link', preloadLinks.join(', '));
  }
  
  next();
};

// Early hints para conexiones críticas
const addEarlyHints = (req, res, next) => {
  // Solo para navegación inicial
  if (req.headers.accept && req.headers.accept.includes('text/html') && !req.headers.referer) {
    try {
      res.writeEarlyHints({
        link: [
          '<https://fonts.googleapis.com>; rel=preconnect',
          '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
          '<https://cdn11.metasync.com>; rel=dns-prefetch'
        ]
      });
    } catch (e) {
      // Early hints no soportado, continuar
    }
  }
  
  next();
};

// Optimización de respuestas JSON
const optimizeJSON = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(obj) {
    // Eliminar campos innecesarios en producción
    if (process.env.NODE_ENV === 'production' && obj && typeof obj === 'object') {
      const cleaned = JSON.parse(JSON.stringify(obj, (key, value) => {
        // Remover campos de debug
        if (key.startsWith('_debug') || key.startsWith('__')) {
          return undefined;
        }
        return value;
      }));
      
      return originalJson.call(this, cleaned);
    }
    
    return originalJson.call(this, obj);
  };
  
  next();
};

// Aplicar todas las optimizaciones
const applyEmergencyOptimizations = (app) => {
  console.log('🚀 Applying EMERGENCY server response optimizations...');
  
  // Orden crítico de middlewares
  app.use(addEarlyHints);
  app.use(setCacheHeaders);
  app.use(addPreloadHeaders);
  setupCompression(app);
  app.use(optimizeJSON);
  
  // Configuraciones del servidor Express
  app.set('trust proxy', true);
  app.set('x-powered-by', false);
  
  console.log('✅ Emergency server optimizations applied');
};

module.exports = {
  applyEmergencyOptimizations,
  setupCompression,
  setCacheHeaders,
  addPreloadHeaders,
  addEarlyHints,
  optimizeJSON
};