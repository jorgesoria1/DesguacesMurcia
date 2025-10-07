/**
 * SERVICE WORKER AGRESIVO - PAGESPEED OPTIMIZATION
 * Target: Cache crítico inmediato para recursos JavaScript
 */

const CACHE_VERSION = 'v2-aggressive';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const FONT_CACHE = `fonts-${CACHE_VERSION}`;
const JS_CACHE = `js-${CACHE_VERSION}`;

// Recursos críticos para cache inmediato
const CRITICAL_ASSETS = [
  // JS críticos identificados en PageSpeed
  '/@fs/home/runner/workspace/node_modules/.vite/deps/chunk-RPCDYKBN.js',
  '/@fs/home/runner/workspace/node_modules/.vite/deps/react-dom_client.js',
  '/@fs/home/runner/workspace/node_modules/.vite/deps/react.js',
  '/@fs/home/runner/workspace/node_modules/.vite/deps/wouter.js',
  
  // CSS crítico
  '/src/index.css',
  
  // Assets locales
  '/desguacesmurcia1.png'
];

// Fonts críticas
const CRITICAL_FONTS = [
  'https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2',
  'https://fonts.gstatic.com/s/opensans/v43/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-mu0SC55I.woff2'
];

// Install - cache crítico inmediato
self.addEventListener('install', (event) => {
  console.log('🚀 SW: Installing aggressive cache...');
  
  event.waitUntil(
    Promise.all([
      // Cache assets críticos
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(CRITICAL_ASSETS.map(url => new Request(url, { 
          mode: 'cors',
          credentials: 'same-origin'
        })));
      }).catch(err => console.warn('SW: Failed to cache static assets:', err)),
      
      // Cache fonts críticas
      caches.open(FONT_CACHE).then(cache => {
        return cache.addAll(CRITICAL_FONTS.map(url => new Request(url, {
          mode: 'cors',
          credentials: 'omit'
        })));
      }).catch(err => console.warn('SW: Failed to cache fonts:', err))
    ]).then(() => {
      console.log('✅ SW: Aggressive cache installed');
      self.skipWaiting(); // Activar inmediatamente
    })
  );
});

// Activate - limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => 
            cacheName.includes('static-') || 
            cacheName.includes('fonts-') || 
            cacheName.includes('js-')
          )
          .filter(cacheName => 
            cacheName !== STATIC_CACHE && 
            cacheName !== FONT_CACHE && 
            cacheName !== JS_CACHE
          )
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('✅ SW: Old caches cleaned');
      return self.clients.claim(); // Tomar control inmediato
    })
  );
});

// Fetch - estrategia agresiva de cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo interceptar requests del mismo origen y assets críticos
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) {
    return;
  }
  
  // NO cachear HTML para preservar meta tags dinámicos
  if (event.request.mode === 'navigate' || 
      url.pathname.startsWith('/vehiculos/') || 
      url.pathname.startsWith('/piezas/')) {
    return;
  }
  
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Estrategia por tipo de recurso
    if (url.pathname.endsWith('.woff2') || url.hostname.includes('fonts.g')) {
      return handleFontRequest(request);
    }
    
    if (url.pathname.endsWith('.js') || url.pathname.includes('.vite/deps/')) {
      return handleJSRequest(request);
    }
    
    if (url.pathname.endsWith('.css') || 
        url.pathname.endsWith('.png') || 
        url.pathname.endsWith('.jpg')) {
      return handleStaticRequest(request);
    }
    
    // Default: network first
    return fetch(request);
    
  } catch (error) {
    console.warn('SW: Fetch failed:', error);
    return fetch(request);
  }
}

// Cache first para fonts (nunca cambian)
async function handleFontRequest(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cached; // Fallback a cache aunque sea viejo
  }
}

// Cache first para JS críticos
async function handleJSRequest(request) {
  const cache = await caches.open(JS_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok && response.headers.get('content-type')?.includes('javascript')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cached;
  }
}

// Stale while revalidate para assets estáticos
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  
  // Devolver cache inmediatamente si existe
  if (cached) {
    // Background update
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(() => {});
    
    return cached;
  }
  
  // Si no está en cache, fetch y cache
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}