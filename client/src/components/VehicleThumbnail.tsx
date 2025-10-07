import React, { useState, useRef, useEffect } from 'react';

interface VehicleThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const VehicleThumbnail: React.FC<VehicleThumbnailProps> = ({
  src,
  alt,
  className = '',
  isSelected = false,
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer para lazy loading agresivo en thumbnails
  useEffect(() => {
    if (isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Cargar cuando estén cerca
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 cursor-pointer ${className}`}
        onClick={onClick}
      >
        <div className="text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden cursor-pointer transition-colors border-2 ${
        isSelected ? 'border-primary' : 'border-gray-200'
      } hover:border-primary ${className}`}
      onClick={onClick}
      ref={imgRef}
    >
      {/* Placeholder más pequeño para thumbnails */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {/* Imagen thumbnail con lazy loading agresivo */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          // Añadir dimensiones específicas para thumbnails
          width="96"
          height="96"
        />
      )}
    </div>
  );
};

export default VehicleThumbnail;