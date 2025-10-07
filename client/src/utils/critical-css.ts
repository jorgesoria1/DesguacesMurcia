/**
 * Critical CSS para above-the-fold - EMERGENCY PAGESPEED FIX
 */

export const injectCriticalCSS = () => {
  const criticalCSS = `
    <style id="critical-css">
      /* Layout base para evitar shifts */
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .md\\:flex-row { flex-direction: column; }
      .justify-between { justify-content: space-between; }
      .items-start { align-items: flex-start; }
      .mb-8 { margin-bottom: 2rem; }
      .h-12 { height: 3rem; }
      .w-auto { width: auto; }
      
      /* Container base */
      .container { width: 100%; margin: 0 auto; padding: 0 1rem; }
      .max-w-7xl { max-width: 80rem; }
      
      /* Header crítico */
      .bg-white { background-color: white; }
      .shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
      .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
      
      /* Imágenes con dimensiones fijas */
      img[src*="metasync"] {
        min-width: 123px;
        min-height: 92px;
        aspect-ratio: 4/3;
      }
      
      img[alt="Desguace Murcia Logo"] {
        min-width: 138px;
        min-height: 64px;
        width: 138px;
        height: 64px;
      }
      
      /* Layout específico VehicleDetail */
      .vehicle-detail-header {
        min-height: 120px;
        display: flex;
        flex-direction: column;
      }
      
      /* Font optimizations */
      body {
        font-family: system-ui, -apple-system, sans-serif;
        font-display: swap;
      }
      
      /* Carousel base */
      .carousel-container {
        min-height: 273px;
        display: block;
      }
      
      @media (min-width: 768px) {
        .md\\:flex-row { flex-direction: row; }
        .md\\:h-16 { height: 4rem; }
        .container { padding: 0 2rem; }
        
        img[alt="Desguace Murcia Logo"] {
          min-width: 138px;
          min-height: 64px;
          width: 138px;
          height: 64px;
        }
      }
    </style>
  `;
  
  // Inyectar CSS crítico inmediatamente
  if (!document.getElementById('critical-css')) {
    document.head.insertAdjacentHTML('afterbegin', criticalCSS);
  }
};

export const preloadCriticalFonts = () => {
  // Font preloads disabled - using CSS @import instead to avoid CORS warnings
  console.log('Font preloads disabled - fonts loaded via CSS @import');
  
  // const fontPreloads = [
  //   {
  //     href: 'https://fonts.gstatic.com/s/montserrat/v30/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2',
  //     as: 'font',
  //     type: 'font/woff2',
  //     crossorigin: 'anonymous'
  //   },
  //   {
  //     href: 'https://fonts.gstatic.com/s/opensans/v43/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-mu0SC55I.woff2', 
  //     as: 'font',
  //     type: 'font/woff2',
  //     crossorigin: 'anonymous'
  //   }
  // ];
  
  // fontPreloads.forEach(font => {
  //   if (!document.querySelector(`link[href="${font.href}"]`)) {
  //     const link = document.createElement('link');
  //     link.rel = 'preload';
  //     Object.assign(link, font);
  //     document.head.appendChild(link);
  //   }
  // });
};