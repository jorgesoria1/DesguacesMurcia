/**
 * Optimizaciones críticas de performance para PageSpeed
 */

// Pre-cargar recursos críticos inmediatamente
export const preloadCriticalResources = () => {
  const criticalResources = [
    // Solo logo principal (preloads CSS eliminados para evitar warnings)
    { 
      href: '/desguacesmurcia1.png', 
      as: 'image',
      type: 'image/png'
    }
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

// Optimizar carga de fuentes con font-display
export const optimizeFontLoading = () => {
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Montserrat';
      font-display: swap;
      src: url('https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2') format('woff2');
      font-weight: 400;
      unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }
  `;
  document.head.appendChild(style);
};

// Reducir Layout Shift con placeholders
export const addImagePlaceholders = () => {
  const images = document.querySelectorAll('img:not([width]):not([height])');
  images.forEach((img: HTMLImageElement) => {
    if (img.src.includes('metasync.com')) {
      // Aplicar dimensiones por defecto para imágenes de vehículos
      img.width = 400;
      img.height = 300;
      img.style.aspectRatio = '4/3';
    } else if (img.alt?.includes('Logo')) {
      // Dimensiones para logos
      img.width = 106;
      img.height = 48;
    }
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
  });
};

// Debounce para scroll performance
export const createDebounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

// Inicializar optimizaciones críticas
export const initCriticalPerformance = () => {
  // Ejecutar inmediatamente
  preloadCriticalResources();
  
  // Ejecutar cuando DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeFontLoading();
      addImagePlaceholders();
    });
  } else {
    optimizeFontLoading();
    addImagePlaceholders();
  }
  
  // Observer para nuevas imágenes
  const imageObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            const newImages = node.querySelectorAll('img:not([width]):not([height])');
            newImages.forEach((img: HTMLImageElement) => {
              if (img.src.includes('metasync.com')) {
                img.width = 400;
                img.height = 300;
                img.style.aspectRatio = '4/3';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
              }
            });
          }
        });
      }
    });
  });
  
  imageObserver.observe(document.body, { childList: true, subtree: true });
};