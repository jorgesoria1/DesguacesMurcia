/**
 * OPTIMIZACIÓN HTTP HEADERS PARA CACHE PRIMERA CARGA
 * Solo para recursos estáticos, NO páginas con meta tags dinámicos
 */

// Cache headers optimizados por tipo de recurso
export const getCacheHeaders = (resourceType: string) => {
  const headers: Record<string, string> = {};
  
  switch (resourceType) {
    case 'static-assets':
      // Imágenes, fonts, CSS, JS - Cache agresivo
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // 1 año
      headers['ETag'] = '"static-v1"';
      break;
      
    case 'fonts':
      // Web fonts - Cache muy largo
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      headers['Access-Control-Allow-Origin'] = '*';
      break;
      
    case 'cdn-images':
      // Imágenes CDN - Cache medio con revalidación
      headers['Cache-Control'] = 'public, max-age=86400, must-revalidate'; // 24h
      break;
      
    case 'api-data':
      // APIs con datos dinámicos - Cache corto
      headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=3600'; // 5min
      break;
      
    case 'no-cache':
      // Páginas con meta tags dinámicos - NO CACHE
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
      break;
  }
  
  return headers;
};

// Aplicar preload hints para primera carga
export const addResourceHints = () => {
  const criticalResources = [
    // Solo recursos estáticos, NO páginas HTML
    { href: '/desguacesmurcia1.png', as: 'image', type: 'image/png' },
    { href: 'https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
  ];
  
  criticalResources.forEach(resource => {
    if (!document.querySelector(`link[href="${resource.href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      Object.assign(link, resource);
      document.head.appendChild(link);
    }
  });
};