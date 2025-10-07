/**
 * OPTIMIZACIONES CRÍTICAS AGRESIVAS - PAGESPEED 32/100 FIX
 * Target: Reducir Critical Chain 5,591ms → <2s
 */

// Preload crítico inmediato - antes que todo
const preloadCriticalResources = () => {
  const criticalResources = [
    // Solo fonts críticos en producción
    'https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2',
    'https://fonts.gstatic.com/s/opensans/v43/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-mu0SC55I.woff2'
  ];

  criticalResources.forEach(resource => {
    // Solo preload fonts, no JS de desarrollo
    if (resource.endsWith('.woff2')) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = resource;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
    }
  });
};

// DNS prefetch para dominios críticos
const prefetchCriticalDomains = () => {
  const domains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdn11.metasync.com',
    'https://js.stripe.com'
  ];

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });
};

// Critical CSS inline para eliminar render blocking
const injectCriticalCSSInline = () => {
  const criticalCSS = `
    /* Critical styles para eliminar FOUC - NO afectar header */
    .layout-stable {
      min-height: 100vh;
      contain: layout;
    }
    
    .vehicle-detail-container {
      contain: layout style;
      width: 100%;
    }
    
    /* Preservar dimensiones más grandes del header */
    header {
      contain: none !important;
    }
    
    .header-logo {
      width: auto !important;
      height: auto !important;
    }
    
    .image-container {
      aspect-ratio: 4/3;
      background: #f3f4f6;
      contain: layout size;
    }
    
    .main-image {
      width: 364px !important;
      height: 273px !important;
      object-fit: cover;
    }
    
    .thumb-image {
      width: 123px !important;
      height: 92px !important;
      object-fit: cover;
    }
    
    /* Skeleton crítico */
    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    /* Prevenir Layout Shift */
    .prevent-cls {
      min-width: 100%;
      min-height: 1px;
      contain: layout;
    }
    
    .carousel-container {
      contain: layout style paint;
      will-change: transform;
    }
  `;

  const style = document.createElement('style');
  style.textContent = criticalCSS;
  style.setAttribute('data-critical', 'true');
  document.head.insertBefore(style, document.head.firstChild);
};

// Defer non-critical scripts agresivamente
const deferNonCriticalScripts = () => {
  // Scripts que pueden cargar después
  const nonCriticalScripts = [
    'embla-carousel',
    'stripe',
    '@tanstack/react-query',
    'framer-motion'
  ];

  // Interceptar dynamic imports para hacerlos lazy
  const originalImport = (window as any).__vitePreload || (() => {});
  (window as any).__vitePreload = (deps: string[]) => {
    const criticalDeps = deps.filter(dep => 
      !nonCriticalScripts.some(script => dep.includes(script))
    );
    
    // Solo cargar críticos inmediatamente
    if (criticalDeps.length > 0) {
      return originalImport(criticalDeps);
    }
    
    // Non-críticos after idle
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(originalImport(deps)));
      } else {
        setTimeout(() => resolve(originalImport(deps)), 100);
      }
    });
  };
};

// Optimizar React rendering para primera carga
const optimizeReactRendering = () => {
  // Force React a usar batching para reducir reflows
  if ((window as any).React && (window as any).React.unstable_batchedUpdates) {
    const originalRender = (window as any).ReactDOM?.render;
    if (originalRender) {
      (window as any).ReactDOM.render = (element: any, container: any, callback?: any) => {
        return (window as any).React.unstable_batchedUpdates(() => {
          return originalRender(element, container, callback);
        });
      };
    }
  }
};

// Resource hints para próximos recursos
const addResourceHints = () => {
  // Preconnect a dominios críticos
  const preconnects = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdn11.metasync.com'
  ];

  preconnects.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    if (url.includes('fonts.gstatic.com')) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
};

// Service Worker para cache agresivo
const registerAggressiveServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-aggressive.js', {
      scope: '/',
      updateViaCache: 'none'
    }).catch(() => {
      // Fallback silencioso
    });
  }
};

// Inicializar todas las optimizaciones críticas
export const initAggressivePerformance = () => {
  console.log('🚀 Applying AGGRESSIVE performance optimizations for PageSpeed...');
  
  // Ejecutar inmediatamente - antes de cualquier render
  prefetchCriticalDomains();
  injectCriticalCSSInline();
  addResourceHints();
  
  // En el próximo tick
  setTimeout(() => {
    preloadCriticalResources();
    deferNonCriticalScripts();
    optimizeReactRendering();
    registerAggressiveServiceWorker();
  }, 0);
  
  console.log('✅ Aggressive performance optimizations applied');
};

// Optimizaciones específicas para VehicleDetail (Layout Shift fix)
export const fixVehicleDetailLayoutShift = () => {
  // Aplicar estabilidad de layout sin crear espacios visuales
  document.addEventListener('DOMContentLoaded', () => {
    const vehicleDetail = document.querySelector('[data-component-name="div"].flex.flex-col.md\\:flex-row');
    if (vehicleDetail) {
      const element = vehicleDetail as HTMLElement;
      element.style.contain = 'layout style';
      element.style.width = '100%';
      // Usar contain sin minHeight para evitar espacios extra
    }
  });
};

// Monitor de performance para debugging
export const monitorCriticalMetrics = () => {
  if ('PerformanceObserver' in window) {
    // Monitor LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        console.log('🎯 LCP:', entry.startTime, 'Element:', entry.element);
      });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Monitor Layout Shifts
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsScore = 0;
      entryList.getEntries().forEach((entry: any) => {
        clsScore += entry.value;
        console.log('⚠️ CLS:', entry.value, 'Total:', clsScore);
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
};