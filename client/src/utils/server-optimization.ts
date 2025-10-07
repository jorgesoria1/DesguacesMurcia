/**
 * Optimizaciones para mejorar Server Response Time
 */

// Cache de requests para evitar duplicados
const requestCache = new Map<string, Promise<any>>();

// Optimizar requests HTTP con pool de conexiones reutilizables
export const optimizedFetch = async (url: string, options: RequestInit = {}) => {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  // Evitar requests duplicados simultáneos
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }
  
  const requestPromise = fetch(url, {
    ...options,
    // Optimizaciones para reducir latencia
    keepalive: true,
    headers: {
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=300',
      ...options.headers
    }
  }).finally(() => {
    // Limpiar cache después de 5 segundos
    setTimeout(() => requestCache.delete(cacheKey), 5000);
  });
  
  requestCache.set(cacheKey, requestPromise);
  return requestPromise;
};

// Prefetch de datos críticos en idle time
export const prefetchCriticalData = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Prefetch de API endpoints más utilizados
      const criticalEndpoints = [
        '/api/vehicles/134062', // ID del vehículo actual
        '/api/maintenance/status',
        '/api/popups/active'
      ];
      
      criticalEndpoints.forEach(endpoint => {
        optimizedFetch(endpoint).catch(() => {
          // Fallo silencioso en prefetch
        });
      });
    });
  }
};

// Reducir trabajo en main thread
export const deferNonCritical = () => {
  // Diferir analytics y trackers
  setTimeout(() => {
    // Analytics diferidos
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: document.title,
        page_location: window.location.href
      });
    }
  }, 3000);
  
  // Diferir chatbot si existe
  setTimeout(() => {
    const chatbot = document.querySelector('[data-voiceflow]');
    if (chatbot && !(chatbot as any).initialized) {
      (chatbot as any).initialize?.();
    }
  }, 5000);
};

// Optimizar carga de recursos con Resource Hints
export const addResourceHints = () => {
  const hints = [
    // Preconnect a dominios críticos
    { rel: 'preconnect', href: 'https://cdn11.metasync.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com' },
    
    // DNS prefetch para recursos menos críticos
    { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
    { rel: 'dns-prefetch', href: 'https://analytics.google.com' }
  ];
  
  hints.forEach(hint => {
    if (!document.querySelector(`link[href="${hint.href}"]`)) {
      const link = document.createElement('link');
      Object.assign(link, hint);
      document.head.appendChild(link);
    }
  });
};

// Inicializar optimizaciones de server
export const initServerOptimizations = () => {
  addResourceHints();
  prefetchCriticalData();
  deferNonCritical();
  
  // Optimizar handling de errores de red
  window.addEventListener('online', () => {
    // Re-intentar requests fallidos cuando vuelva la conexión
    prefetchCriticalData();
  });
};