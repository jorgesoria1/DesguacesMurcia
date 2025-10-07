/**
 * OPTIMIZACIONES EXTREMAS JS - SCORE 32/100 PERSISTE
 * Target: Eliminar completamente el JavaScript blocking
 */

// Critical path inline - mover ANTES de cualquier script
export const inlineAbsoluteCriticalJS = () => {
  const criticalJS = `
    // Prevent layout shift inmediato - SIN afectar header
    document.documentElement.style.fontSize = '16px';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.fontFamily = 'Montserrat, sans-serif';
    
    // Skeleton crítico instantáneo
    const style = document.createElement('style');
    style.textContent = \`
      .layout-skeleton { 
        background: #f8f9fa !important; 
        min-height: 100vh !important;
        contain: layout !important;
      }
      .skeleton-pulse { 
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%) !important;
        background-size: 200% 100% !important;
        animation: skeleton-loading 1.5s infinite !important;
      }
      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .vehicle-container { contain: strict !important; }
      .image-placeholder { 
        width: 364px !important; 
        height: 273px !important; 
        background: #f3f4f6 !important;
        contain: size layout style paint !important;
      }
    \`;
    document.head.insertBefore(style, document.head.firstChild);
    
    // Force early font loading
    const preloadFont = (url, type = 'woff2') => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = \`font/\${type}\`;
      link.crossOrigin = 'anonymous';
      link.href = url;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
    };
    
    // Font preloads disabled - using CSS @import instead
    // preloadFont('https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2');
    // preloadFont('https://fonts.gstatic.com/s/opensans/v43/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-mu0SC55I.woff2');
  `;

  // Ejecutar inmediatamente - antes de cualquier otro script
  const script = document.createElement('script');
  script.textContent = criticalJS;
  script.async = false; // Bloquear hasta completar
  document.head.insertBefore(script, document.head.firstChild);
};

// Defer agresivo deshabilitado para evitar errores
export const deferAllNonCriticalScripts = () => {
  // Funcionalidad deshabilitada para prevenir interferencias con React
  console.log('Script deferring disabled for stability');
};

// Resource hints más agresivos
export const addAggressiveResourceHints = () => {
  const hints = [
    { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' },
    { rel: 'dns-prefetch', href: 'https://cdn11.metasync.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' }
  ];

  hints.forEach(hint => {
    const link = document.createElement('link');
    link.rel = hint.rel;
    link.href = hint.href;
    if (hint.crossOrigin) link.crossOrigin = hint.crossOrigin;
    if (hint.rel === 'modulepreload') link.fetchPriority = 'high';
    document.head.appendChild(link);
  });
};

// Bundle splitting deshabilitado para evitar errores
export const optimizeBundleSplitting = () => {
  // Funcionalidad deshabilitada para prevenir errores en producción
  console.log('Bundle splitting disabled for stability');
};

// Critical rendering path optimization
export const optimizeCriticalRenderingPath = () => {
  // Bloquear render hasta que critical CSS esté disponible
  const criticalCSS = document.querySelector('style[data-critical]');
  if (!criticalCSS) {
    // Inyetar CSS crítico si no existe
    const style = document.createElement('style');
    style.setAttribute('data-critical', 'true');
    style.textContent = `
      body { font-family: Montserrat, sans-serif !important; }
      .vehicle-detail-container { contain: layout style !important; }
      .layout-skeleton { background: #f8f9fa !important; min-height: 100vh !important; }
    `;
    document.head.insertBefore(style, document.head.firstChild);
  }
  
  // Force sync font loading para critical fonts
  const fontPromises = [
    new FontFace('Montserrat', 'url(https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2)'),
    new FontFace('OpenSans', 'url(https://fonts.gstatic.com/s/opensans/v43/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-mu0SC55I.woff2)')
  ].map(font => {
    document.fonts.add(font);
    return font.load();
  });
  
  Promise.all(fontPromises).then(() => {
    document.body.classList.add('fonts-loaded');
  });
};

// Optimización server response time
export const optimizeServerResponseTime = () => {
  // Precache de API calls críticos
  const criticalAPIs = [
    '/api/vehicles/',
    '/api/parts/',
    '/api/config/shipping'
  ];
  
  // Preload con fetch de alta prioridad
  criticalAPIs.forEach(api => {
    fetch(api, { 
      priority: 'high',
      credentials: 'include'
    } as any).catch(() => {}); // Silent fail
  });
};

// Inicializar optimizaciones extremas
export const initExtremeJSOptimization = () => {
  console.log('🚀 Applying EXTREME JavaScript optimizations...');
  
  // Aplicar inmediatamente - antes de cualquier otra carga
  inlineAbsoluteCriticalJS();
  addAggressiveResourceHints();
  deferAllNonCriticalScripts();
  optimizeBundleSplitting();
  optimizeCriticalRenderingPath();
  optimizeServerResponseTime();
  
  console.log('⚡ Extreme JS optimizations applied');
};

// Monitoring específico para JavaScript performance
export const monitorJSPerformance = () => {
  // Monitor de script loading time
  const scriptLoadTimes = new Map();
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1 && (node as Element).tagName === 'SCRIPT') {
          const script = node as HTMLScriptElement;
          const startTime = performance.now();
          
          script.addEventListener('load', () => {
            const loadTime = performance.now() - startTime;
            scriptLoadTimes.set(script.src || 'inline', loadTime);
            console.log(`📊 Script loaded: ${script.src || 'inline'} in ${loadTime.toFixed(2)}ms`);
          });
        }
      });
    });
  });
  
  observer.observe(document.head, { childList: true, subtree: true });
};