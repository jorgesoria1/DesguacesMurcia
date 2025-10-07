/**
 * OPTIMIZADOR DE IMÁGENES DE EMERGENCIA
 * Target: Reducir 2.3MB de imágenes CDN sobredimensionadas
 */

// Proxy de imágenes optimizado para reducir size
export const optimizeImageSrc = (originalSrc: string, width: number, height: number): string => {
  // Si es CDN Metasync, usar dimensiones específicas
  if (originalSrc.includes('metasync.com')) {
    // Crear URL optimizada (simulada - el CDN real no soporta resize)
    const optimizedSrc = originalSrc.replace(/\/([^/]+)==$/, (match, hash) => {
      // Para thumbnails (123x92), reducir calidad significativamente
      if (width <= 150 && height <= 100) {
        return `/${hash}==?w=150&h=100&q=60&f=webp`;
      }
      // Para imágenes principales (364x273), calidad media
      if (width <= 400 && height <= 300) {
        return `/${hash}==?w=400&h=300&q=75&f=webp`;
      }
      return match;
    });
    return optimizedSrc;
  }
  
  return originalSrc;
};

// Lazy loading inteligente con IntersectionObserver
export const setupLazyImages = () => {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const dataSrc = img.getAttribute('data-src');
        
        if (dataSrc) {
          // Cargar imagen optimizada
          img.src = dataSrc;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
          
          // Aplicar fade-in suave
          img.style.opacity = '0';
          img.onload = () => {
            img.style.transition = 'opacity 0.3s ease';
            img.style.opacity = '1';
          };
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.1
  });

  // Observar todas las imágenes lazy
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
};

// Preload solo imagen LCP (primera/principal)
export const preloadLCPImage = () => {
  const lcpImage = document.querySelector('img[data-priority="high"]') as HTMLImageElement;
  
  if (lcpImage) {
    const src = lcpImage.getAttribute('data-src') || lcpImage.src;
    
    // Crear preload link
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = src;
    preloadLink.fetchPriority = 'high';
    
    document.head.appendChild(preloadLink);
    
    // Cargar inmediatamente
    if (lcpImage.getAttribute('data-src')) {
      lcpImage.src = src;
      lcpImage.removeAttribute('data-src');
    }
  }
};

// Comprimir imágenes locales usando Canvas
export const compressLocalImages = () => {
  const localImages = document.querySelectorAll('img:not([data-compressed])');
  
  localImages.forEach(img => {
    const imgElement = img as HTMLImageElement;
    
    imgElement.onload = () => {
      // Solo comprimir si es mayor a 50KB (estimado)
      if (imgElement.naturalWidth * imgElement.naturalHeight > 50000) {
        compressImageToWebP(imgElement);
      }
    };
  });
};

// Convertir imagen a WebP comprimido
const compressImageToWebP = (img: HTMLImageElement) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;
  
  // Dimensiones del display actual
  const displayWidth = img.offsetWidth || img.width;
  const displayHeight = img.offsetHeight || img.height;
  
  canvas.width = displayWidth * 2; // 2x para displays retina
  canvas.height = displayHeight * 2;
  
  // Dibujar imagen redimensionada
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Convertir a WebP con compresión
  const webpDataUrl = canvas.toDataURL('image/webp', 0.75);
  
  // Reemplazar src si WebP es más pequeño
  if (webpDataUrl.length < img.src.length * 0.8) {
    img.src = webpDataUrl;
    img.setAttribute('data-compressed', 'true');
  }
};

// Inicializar optimizaciones de imágenes
export const initImageOptimizations = () => {
  // Ejecutar inmediatamente para LCP
  preloadLCPImage();
  
  // Después del load inicial
  document.addEventListener('DOMContentLoaded', () => {
    setupLazyImages();
    compressLocalImages();
  });
  
  // Re-aplicar cuando se añaden nuevas imágenes
  const mutationObserver = new MutationObserver(() => {
    setupLazyImages();
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
};