import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initFirstLoadOptimizations } from "@/utils/first-load-optimizer";
import { initCriticalPerformance } from "@/utils/performance-critical";
import { initServerOptimizations } from "@/utils/server-optimization";
import { injectCriticalCSS, preloadCriticalFonts } from "@/utils/critical-css";
import { initJSOptimizations } from "@/utils/js-optimization";
import { initSafeCache, optimizeCDNImages, deferNonCriticalScripts } from "@/utils/safe-cache-strategy";
import { initImageOptimizations } from "@/utils/emergency-image-optimizer";
import { initAggressivePerformance, fixVehicleDetailLayoutShift, monitorCriticalMetrics } from "@/utils/critical-performance-aggressive";
import { initExtremeJSOptimization, monitorJSPerformance } from "@/utils/extreme-js-optimization";
import { setupConsoleFilter } from "@/utils/console-filter";

// Configurar filtro de consola para suprimir errores esperados
setupConsoleFilter();

// OPTIMIZACIONES SEGURAS - Sin interferencias JavaScript
// initExtremeJSOptimization(); // DESHABILITADO: Causaba errores JS
// initAggressivePerformance(); // DESHABILITADO: Preloads problemáticos
// fixVehicleDetailLayoutShift(); // DESHABILITADO: Potenciales errores
injectCriticalCSS();
preloadCriticalFonts();
initSafeCache(); // Cache seguro que NO afecta meta tags
initImageOptimizations(); // Optimizar imágenes CDN masivas
initJSOptimizations();
initCriticalPerformance();
initFirstLoadOptimizations();
initServerOptimizations();

// Monitor deshabilitado para evitar errores
// if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
//   monitorCriticalMetrics();
//   monitorJSPerformance();
// }

// Optimizaciones post-carga
document.addEventListener('DOMContentLoaded', () => {
  optimizeCDNImages();
  deferNonCriticalScripts();
});

createRoot(document.getElementById("root")!).render(<App />);