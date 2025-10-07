import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook que maneja el scroll al inicio de la página en cada navegación
 * Se activa automáticamente cuando cambia la ruta
 */
export const useScrollToTop = () => {
  const [location] = useLocation();

  useEffect(() => {
    // Pequeño delay para asegurar que el DOM se actualice
    setTimeout(() => {
      window.scrollTo({ 
        top: 0, 
        left: 0, 
        behavior: 'smooth' 
      });
    }, 10);
  }, [location]);
};

/**
 * Función utilitaria para scroll manual al inicio
 * Úsala en eventos específicos como cambio de página en paginación
 */
export const scrollToTop = (smooth: boolean = true) => {
  // Pequeño delay para asegurar que el DOM se actualice
  setTimeout(() => {
    window.scrollTo({ 
      top: 0, 
      left: 0, 
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, 10);
};