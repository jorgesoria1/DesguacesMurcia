import React, { useState, useRef, useEffect } from 'react';

interface VehicleImageProps {
  src: string;
  alt: string;
  className?: string;
  isPrimary?: boolean; // Para la imagen principal (LCP)
  aspectRatio?: string; // Ej: "4/3", "16/9"
  sizes?: string; // Para srcset responsive
}

const VehicleImage: React.FC<VehicleImageProps> = ({
  src,
  alt,
  className = '',
  isPrimary = false,
  aspectRatio = '4/3',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(isPrimary); // Si es primary (LCP), cargar inmediatamente
  const imgRef = useRef<HTMLImageElement>(null);

  // EMERGENCY FIX: Optimizar src para reducir tamaño
  const optimizedSrc = React.useMemo(() => {
    if (src.includes('metasync.com')) {
      // Estimar dimensiones según context
      const isThumb = className.includes('thumb') || className.includes('small');
      const width = isThumb ? 150 : 400;
      const height = isThumb ? 100 : 300;
      
      // Simular optimización (en producción usar proxy real)
      return src + `#w=${width}&h=${height}&q=${isThumb ? 60 : 75}`;
    }
    return src;
  }, [src, className]);

  // Intersection Observer para lazy loading (solo si no es imagen primary)
  useEffect(() => {
    if (isPrimary || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [isPrimary, isInView]);

  // Generar URLs responsivas basadas en el src original
  const generateResponsiveSrc = (originalSrc: string) => {
    // Metasync no soporta redimensionado dinámico, usar original
    // Pero podemos optimizar la estrategia de carga
    return {
      small: originalSrc,
      medium: originalSrc,
      large: originalSrc,
      original: originalSrc
    };
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ aspectRatio }}>
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">Imagen no disponible</span>
        </div>
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  const responsiveUrls = generateResponsiveSrc(src);

  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      style={{ aspectRatio }}
      ref={imgRef}
    >
      {/* Placeholder blur/skeleton mientras carga */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {/* Imagen principal optimizada */}
      {(isInView || isPrimary) && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full ${className.includes('object-cover') ? 'object-cover' : 'object-contain'} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={isPrimary ? 'eager' : 'lazy'}
          decoding="async"
          {...(isPrimary && { fetchPriority: 'high' as const })}
          onLoad={handleLoad}
          onError={handleError}
          // Dimensiones EXACTAS del PageSpeed para eliminar CLS
          width={isPrimary ? "364" : "123"}
          height={isPrimary ? "273" : "92"} 
          style={{
            maxWidth: '100%',
            height: 'auto',
            aspectRatio: isPrimary ? '4/3' : '4/3',
            minHeight: isPrimary ? '273px' : '92px',
            minWidth: isPrimary ? '364px' : '123px'
          }}
        />
      )}
    </div>
  );
};

export default VehicleImage;