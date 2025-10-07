/**
 * ESTRATEGIA DE CACHE SEGURA - NO AFECTA META TAGS DINÁMICOS
 * Solo cachea recursos estáticos para mejorar primera carga
 */

// Inicializar cache de recursos estáticos únicamente
export const initSafeCache = () => {
  // Preload recursos críticos estáticos
  preloadCriticalStatics();
  
  // HTTP cache headers para recursos estáticos
  optimizeStaticResourceCache();
  
  // Resource hints específicos
  addSafeResourceHints();
  
  console.log('Safe cache strategy initialized - Meta tags preserved');
};

// Preload solo recursos estáticos críticos
const preloadCriticalStatics = () => {
  const staticResources = [
    // Fonts disabled - using CSS @import instead
    // {
    //   href: 'https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2',
    //   as: 'font',
    //   type: 'font/woff2',
    //   crossorigin: 'anonymous'
    // },
    // Logo principal
    {
      href: '/desguacesmurcia1.png',
      as: 'image',
      fetchpriority: 'high'
    },
    // CSS eliminado para evitar warnings de preload
  ];
  
  staticResources.forEach(resource => {
    if (!document.querySelector(`link[href="${resource.href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      Object.assign(link, resource);
      document.head.appendChild(link);
    }
  });
};

// Cache de recursos estáticos con localStorage
const optimizeStaticResourceCache = () => {
  // Cache de configuraciones estáticas
  const staticConfigs = {
    fonts: {
      'Montserrat-400': '/fonts/montserrat-400.woff2',
      'Montserrat-600': '/fonts/montserrat-600.woff2'
    },
    cssVariables: {
      '--primary': 'hsl(var(--primary))',
      '--secondary': 'hsl(var(--secondary))'
    }
  };
  
  // Solo guardar configuraciones estáticas, no HTML
  try {
    localStorage.setItem('desguace-static-config', JSON.stringify(staticConfigs));
  } catch (e) {
    console.warn('LocalStorage not available for static cache');
  }
};

// DNS prefetch y preconnect seguros
const addSafeResourceHints = () => {
  const connections = [
    { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
    { rel: 'dns-prefetch', href: '//cdn11.metasync.com' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' }
  ];
  
  connections.forEach(conn => {
    if (!document.querySelector(`link[href="${conn.href}"]`)) {
      const link = document.createElement('link');
      Object.assign(link, conn);
      document.head.appendChild(link);
    }
  });
};

// Optimización de imágenes CDN con lazy loading inteligente
export const optimizeCDNImages = () => {
  const images = document.querySelectorAll('img[src*="metasync.com"]');
  
  images.forEach((img, index) => {
    const imgElement = img as HTMLImageElement;
    
    // Primera imagen: eager loading
    if (index === 0) {
      imgElement.loading = 'eager';
      imgElement.fetchPriority = 'high';
    } else {
      // Resto: lazy loading
      imgElement.loading = 'lazy';
    }
    
    // Añadir dimensiones si no las tiene (prevenir CLS)
    if (!imgElement.width && !imgElement.height) {
      imgElement.width = 364;
      imgElement.height = 273;
    }
  });
};

// Defer scripts no críticos
export const deferNonCriticalScripts = () => {
  const scripts = document.querySelectorAll('script[src]');
  
  scripts.forEach(script => {
    const src = script.getAttribute('src');
    
    // Defer scripts no críticos
    if (src && !isCriticalScript(src)) {
      script.setAttribute('defer', '');
    }
  });
};

// Identificar scripts críticos
const isCriticalScript = (src: string): boolean => {
  const criticalPatterns = [
    '/src/main.tsx',
    '/src/App.tsx',
    '/@vite/client',
    '/@react-refresh'
  ];
  
  return criticalPatterns.some(pattern => src.includes(pattern));
};

// Browser cache para assets estáticos
export const setBrowserCacheHeaders = () => {
  // Solo aplicable en server-side, aquí documentamos la estrategia
  const cacheStrategy = {
    'static-assets': 'Cache-Control: public, max-age=31536000, immutable',
    'fonts': 'Cache-Control: public, max-age=31536000, immutable',
    'images': 'Cache-Control: public, max-age=86400, stale-while-revalidate=3600',
    'html-pages': 'Cache-Control: no-cache' // IMPORTANTE: No cache HTML con meta tags
  };
  
  console.log('Browser cache strategy defined:', cacheStrategy);
  return cacheStrategy;
};