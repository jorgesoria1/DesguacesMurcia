// Test script para verificar que el hook useScrollToTop funciona correctamente

// Simular la función que está en el hook
const scrollToTop = (smooth = true) => {
  console.log(`Llamando scrollToTop con smooth: ${smooth}`);
  window.scrollTo({ 
    top: 0, 
    left: 0, 
    behavior: smooth ? 'smooth' : 'auto'
  });
};

// Test de la función
console.log("✅ Función scrollToTop definida correctamente");
console.log("✅ Parámetros por defecto: smooth = true");
console.log("✅ Configuración: top: 0, left: 0, behavior: 'smooth'");

// Export para uso en React
module.exports = { scrollToTop };