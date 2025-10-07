/**
 * Lazy Loading Components para reducir bundle inicial
 * Target: Reducir JavaScript no utilizado (4,647 KiB)
 */

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load componentes pesados no críticos
export const LazyCarousel = lazy(() => 
  import('@/components/ui/carousel').then(module => ({
    default: module.Carousel
  }))
);

export const LazyAccordion = lazy(() =>
  import('@/components/ui/accordion').then(module => ({
    default: module.Accordion
  }))
);

export const LazyDialog = lazy(() =>
  import('@/components/ui/dialog').then(module => ({
    default: module.Dialog
  }))
);

// Componentes de e-commerce no críticos con fallbacks seguros
export const LazyReviews = lazy(() =>
  Promise.resolve({
    default: () => <div>Reviews no disponibles</div>
  })
);

export const LazySimilarParts = lazy(() =>
  Promise.resolve({
    default: () => <div>Piezas similares no disponibles</div>
  })
);

// Wrapper con Suspense para mejor UX
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <Skeleton className="h-32 w-full" />
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Hook para carga condicional
export const useConditionalLoad = (shouldLoad: boolean) => {
  return shouldLoad;
};

// Componente optimizado para carousel
export const OptimizedCarousel: React.FC<{
  items: any[];
  className?: string;
}> = ({ items, className }) => {
  const shouldLoadCarousel = items.length > 1;
  
  if (!shouldLoadCarousel) {
    // Imagen simple si solo hay una
    return (
      <div className={className}>
        {items[0] && (
          <img 
            src={items[0]}
            alt="Imagen única"
            className="w-full h-auto"
            loading="lazy"
          />
        )}
      </div>
    );
  }
  
  return (
    <LazyWrapper fallback={<Skeleton className="h-64 w-full" />}>
      <LazyCarousel className={className}>
        {items.map((item, index) => (
          <div key={index}>
            <img 
              src={item}
              alt={`Imagen ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </LazyCarousel>
    </LazyWrapper>
  );
};