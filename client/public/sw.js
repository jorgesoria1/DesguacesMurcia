/**
 * SERVICE WORKER AVANZADO - CACHE PRIMERA CARGA
 * Target: Mejorar FCP/LCP con cache agresivo
 */

const CACHE_NAME = 'desguacemurcia-v1.4';
const STATIC_CACHE = 'static-v1.4';
const DYNAMIC_CACHE = 'dynamic-v1.4';

// Recursos críticos para cachear inmediatamente
const CRITICAL_RESOURCES = [
  '/',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/components/Header.tsx',
  '/src/index.css',
  '/desguacesmurcia1.png',
  // CSS crítico
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2',
  // Chunks principales de Vite
  '/@vite/client',
  '/@react-refresh'
];

// Cache de imágenes CDN con estrategia específica
const CDN_IMAGES_PATTERN = /cdn11\.metasync\.com/;
const LOCAL_ASSETS_PATTERN = /\.(js|css|woff2|woff|png|jpg|jpeg|svg|webp)$/;

// Install - Cache recursos críticos
self.addEventListener('install', (event) => {
  console.log('SW: Installing v1.4 with critical cache...');
  // Forzar activación inmediata sin esperar
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache crítico sin fallos
      return Promise.allSettled(
        CRITICAL_RESOURCES.map(url => 
          cache.add(url).catch(err => {
            console.warn(`SW: Failed to cache ${url}:`, err);
            return null;
          })
        )
      );
    }).then(() => {
      console.log('SW: Critical resources cached');
      return self.skipWaiting();
    })
  );
});

// Activate - Limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('SW: Activating v1.4 - Chrome extension filter enabled...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Taking control');
      return self.clients.claim();
    })
  );
});

// Helper function para verificar si un request se puede cachear
function isCacheableRequest(request) {
  const url = new URL(request.url);
  const unsupportedSchemes = ['chrome-extension', 'moz-extension', 'safari-extension', 'extension'];
  return !unsupportedSchemes.includes(url.protocol.replace(':', ''));
}

// Fetch - Estrategias de cache optimizadas
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo interceptar GET requests y esquemas soportados
  if (request.method !== 'GET' || !isCacheableRequest(request)) return;
  
  // Estrategia para diferentes tipos de recursos
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@')) {
    // Módulos JS/CSS - Cache First con fallback
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    
  } else if (CDN_IMAGES_PATTERN.test(url.href)) {
    // Imágenes CDN - Cache con TTL largo
    event.respondWith(cacheWithFallback(request, DYNAMIC_CACHE, 86400000)); // 24h
    
  } else if (LOCAL_ASSETS_PATTERN.test(url.pathname)) {
    // Assets locales - Cache agresivo
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    
  } else if (url.pathname.startsWith('/vehiculos/') || url.pathname.startsWith('/piezas/')) {
    // PÁGINAS CON META TAGS DINÁMICOS - NO CACHEAR HTML
    // Solo pasar la request sin interceptar para preservar meta tags server-side
    return;
    
  } else if (url.pathname === '/' || url.pathname.startsWith('/api/')) {
    // Home y APIs - Network First con cache corto, sin cache de HTML con meta tags
    if (request.headers.get('accept')?.includes('text/html')) {
      return; // No cachear HTML que contiene meta tags
    }
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, 300000)); // 5min
  }
});

// CACHE FIRST - Para recursos estáticos
async function cacheFirst(request, cacheName) {
  try {
    // Verificar si es cacheable PRIMERO
    if (!isCacheableRequest(request)) {
      return fetch(request);
    }
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.warn('SW: Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// NETWORK FIRST - Para contenido dinámico
async function networkFirst(request, cacheName, maxAge = 300000) {
  try {
    // Verificar si es cacheable PRIMERO
    if (!isCacheableRequest(request)) {
      return fetch(request);
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      // Añadir timestamp para TTL
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      cache.put(request, new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      }));
    }
    return networkResponse;
    
  } catch (error) {
    console.warn('SW: Network first fallback to cache:', error);
    return await getCachedWithTTL(request, maxAge) || 
           new Response('Offline', { status: 503 });
  }
}

// STALE WHILE REVALIDATE - Balance cache/network
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || await fetchPromise;
}

// Cache con fallback y TTL
async function cacheWithFallback(request, cacheName, maxAge) {
  const cachedResponse = await getCachedWithTTL(request, maxAge);
  if (cachedResponse) return cachedResponse;
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      cache.put(request, new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers
      }));
    }
    return networkResponse;
  } catch (error) {
    return new Response('Image unavailable', { status: 404 });
  }
}

// Verificar TTL del cache
async function getCachedWithTTL(request, maxAge) {
  const cachedResponse = await caches.match(request);
  if (!cachedResponse) return null;
  
  const cachedAt = cachedResponse.headers.get('sw-cached-at');
  if (cachedAt && Date.now() - parseInt(cachedAt) > maxAge) {
    return null; // Cache expirado
  }
  
  return cachedResponse;
}