import { useCallback, useEffect, useState } from 'react';

/**
 * Hook para gestionar la vista móvil y mantener el parámetro platform=mobile
 * en todas las navegaciones.
 */
export function useMobileView() {
  // Determinar si estamos en vista móvil al cargar
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  
  // Efecto para verificar si estamos en vista móvil
  useEffect(() => {
    const checkMobileView = () => {
      const currentUrl = window.location.href;
      setIsMobileView(currentUrl.includes('platform=mobile'));
    };
    
    // Verificar al inicio
    checkMobileView();
    
    // También verificar cuando cambia la URL (por navegación interna)
    window.addEventListener('popstate', checkMobileView);
    
    return () => {
      window.removeEventListener('popstate', checkMobileView);
    };
  }, []);
  
  // Función para añadir el parámetro mobile a las URLs
  const getMobileUrl = useCallback((url: string): string => {
    if (!isMobileView) return url;
    
    // Si la URL ya tiene parámetros, añadir platform=mobile
    if (url.includes('?')) {
      // Verificar si ya contiene el parámetro platform
      if (url.includes('platform=')) {
        return url.replace(/platform=[^&]+/, 'platform=mobile');
      }
      // Añadir como parámetro adicional
      return `${url}&platform=mobile`;
    }
    
    // Si la URL no tiene parámetros, añadir como primer parámetro
    return `${url}?platform=mobile`;
  }, [isMobileView]);

  return {
    isMobileView,
    getMobileUrl
  };
}