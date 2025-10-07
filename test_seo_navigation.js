// Test de navegación SEO client-side
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('🚀 Iniciando test SEO client-side...');
    
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Escuchar logs de la consola
    page.on('console', msg => {
      if (msg.text().includes('MAIN SEO')) {
        console.log('📋 Console Log:', msg.text());
      }
    });
    
    console.log('📍 Navegando a página de pieza...');
    await page.goto('http://localhost:5000/piezas/bomba-direccion-peugeot-306-35-pt-s1011993-629055', {
      waitUntil: 'networkidle0'
    });
    
    // Esperar a que el JavaScript se ejecute
    await page.waitForTimeout(3000);
    
    // Obtener el título actualizado
    const title = await page.title();
    console.log('📄 Título de la página:', title);
    
    // Verificar si el título cambió
    if (title.includes('BOMBA DIRECCION')) {
      console.log('✅ SEO client-side FUNCIONANDO - Título actualizado correctamente');
    } else {
      console.log('❌ SEO client-side NO funcionando - Título no actualizado');
      console.log('   Título esperado: BOMBA DIRECCION...');
      console.log('   Título actual:', title);
    }
    
    // Obtener meta description
    const metaDescription = await page.$eval('meta[name="description"]', el => el.content);
    console.log('📝 Meta description:', metaDescription);
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();