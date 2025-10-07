// Filtro avanzado para suprimir errores de red del navegador

export function setupConsoleFilter() {
  if (typeof window !== 'undefined') {
    // Interceptar todos los tipos de errores de consola
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Lista completa de errores a suprimir
      const suppressedPatterns = [
        'Failed to load resource: the server responded with a status of 401',
        'Failed to load resource: the server responded with a status of 404',
        'favicon.ico',
        '/api/auth/me',
        'status of 401 ()',
        'status of 404 ()'
      ];
      
      const shouldSuppress = suppressedPatterns.some(pattern => 
        message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (!shouldSuppress) {
        originalError.apply(console, args);
      }
    };

    // Interceptar warnings también
    console.warn = (...args) => {
      const message = args.join(' ');
      const suppressedWarnings = ['favicon.ico', '401', '404'];
      
      const shouldSuppress = suppressedWarnings.some(pattern => 
        message.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (!shouldSuppress) {
        originalWarn.apply(console, args);
      }
    };

    // Interceptar fetch con mejor manejo de errores
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || '';
      
      // Para favicon.ico, usar una versión que no genere errores de consola
      if (url.includes('favicon.ico')) {
        try {
          const response = await originalFetch(...args);
          return response;
        } catch (error) {
          // Crear una respuesta mock para favicon que no genere errores
          return new Response('', { status: 204 });
        }
      }
      
      // Para /api/auth/me, manejar silenciosamente los 401
      if (url.includes('/api/auth/me')) {
        try {
          const response = await originalFetch(...args);
          return response;
        } catch (error) {
          // Retornar respuesta 401 sin error de consola
          return new Response('{"error":"Unauthorized"}', { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      return originalFetch(...args);
    };

    // Interceptar eventos de error de red globales
    window.addEventListener('error', (event) => {
      if (event.message && (
        event.message.includes('favicon.ico') ||
        event.message.includes('401') ||
        event.message.includes('404')
      )) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });

    // Interceptar eventos de recursos no cargados
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && (
        event.reason.message.includes('favicon.ico') ||
        event.reason.message.includes('401') ||
        event.reason.message.includes('404')
      )) {
        event.preventDefault();
        return false;
      }
    });
  }
}