/**
 * Optimizaciones específicas para la primera carga de la aplicación
 */

// Cache de recursos críticos para evitar refetch
const criticalResourceCache = new Map<string, Promise<any>>();

// Preload crítico de datos de vehículos más visitados
export const preloadCriticalVehicleData = async () => {
  const vehicleIds = [134062, 134074, 134075]; // IDs más visitados
  
  vehicleIds.forEach(async (id) => {
    const cacheKey = `vehicle-detail-${id}`;
    if (!criticalResourceCache.has(cacheKey)) {
      const promise = fetch(`/api/vehicles/${id}`, {
        credentials: 'include',
        headers: { 'Cache-Control': 'max-age=1800' }
      });
      criticalResourceCache.set(cacheKey, promise);
    }
  });
};

// Optimizar conexiones TCP para CDNs críticos
export const warmupCriticalConnections = () => {
  const criticalDomains = [
    'https://cdn11.metasync.com',
    'https://images.unsplash.com',
    'https://fonts.googleapis.com'
  ];

  criticalDomains.forEach(domain => {
    // Crear imagen invisible para warming TCP connection
    const img = new Image();
    img.src = `${domain}/favicon.ico`;
    img.style.display = 'none';
    img.onerror = () => document.body.removeChild(img);
    img.onload = () => document.body.removeChild(img);
    document.body.appendChild(img);
  });
};

// Precarga inteligente de recursos en idle time
export const scheduleIdlePreloads = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadCriticalVehicleData();
      warmupCriticalConnections();
    });
  } else {
    // Fallback para navegadores sin requestIdleCallback
    setTimeout(() => {
      preloadCriticalVehicleData();
      warmupCriticalConnections();
    }, 1000);
  }
};

// Optimizar Service Worker para cache de primera carga
export const optimizeServiceWorkerCache = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'imports'
    }).catch(() => {
      // Service worker no disponible, continuar sin él
    });
  }
};

// Inicialización de optimizaciones de primera carga
export const initFirstLoadOptimizations = () => {
  // Ejecutar inmediatamente las optimizaciones críticas
  scheduleIdlePreloads();
  
  // Ejecutar cuando DOMContentLoaded esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeServiceWorkerCache();
    });
  } else {
    optimizeServiceWorkerCache();
  }
};