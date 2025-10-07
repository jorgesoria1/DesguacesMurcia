import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean; // Para imágenes above-the-fold
  placeholder?: string; // Base64 blur placeholder
  gridIndex?: number; // Índice en grid para priorización automática
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackIcon,
  priority = false,
  placeholder,
  gridIndex
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Si es priority, cargar inmediatamente
  const imgRef = useRef<HTMLImageElement>(null);

  // Priorización automática: primeras 12 imágenes en grid tienen priority (página completa)
  const isAutoPriority = gridIndex !== undefined && gridIndex < 12;
  const finalPriority = priority || isAutoPriority;

  // Connection-aware loading: detectar velocidad de conexión
  const getConnectionType = () => {
    if (!navigator || !('connection' in navigator)) return 'unknown';
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  };

  const connectionType = getConnectionType();
  const isSlowConnection = connectionType === 'slow-2g' || connectionType === '2g';

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (finalPriority || isInView) return; // Skip si ya está visible o es priority

    // Ajustar rootMargin según conexión: más agresivo en conexiones rápidas
    const rootMargin = isSlowConnection ? '100px' : '250px';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin, // Cargar antes de entrar en vista según conexión
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [finalPriority, isInView, isSlowConnection]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  // Si hay error, mostrar fallback
  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        {fallbackIcon}
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {/* Placeholder blur effect */}
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}
      
      {/* Main image - solo cargar si está en vista o es priority */}
      {(isInView || finalPriority) && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={finalPriority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={finalPriority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {/* Loading skeleton si aún no carga */}
      {!isLoaded && !placeholder && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
    </div>
  );
};

export default OptimizedImage;