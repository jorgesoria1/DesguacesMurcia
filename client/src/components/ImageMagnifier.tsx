import React, { useState, useRef, MouseEvent } from 'react';
import { Search } from 'lucide-react';

interface ImageMagnifierProps {
  src: string;
  alt: string;
  className?: string;
  magnifierSize?: number;
  zoomLevel?: number;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
}

const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt,
  className = '',
  magnifierSize = 200,
  zoomLevel = 2.5,
  style,
  loading = 'lazy'
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseEnter = (e: MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { width, height } = img.getBoundingClientRect();
    setImgSize({ width, height });
    setShowMagnifier(true);
  };

  const handleMouseMove = (e: MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { top, left } = img.getBoundingClientRect();
    
    // Calcular posición del cursor relativa a la imagen
    const x = e.pageX - left - window.pageXOffset;
    const y = e.pageY - top - window.pageYOffset;
    
    setMagnifierPos({ x, y });
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  return (
    <div className={`relative group cursor-zoom-in ${className}`} style={style}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-auto object-contain rounded-lg bg-gray-100 transition-all duration-300"
        loading={loading}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onLoad={(e) => {
          const img = e.currentTarget;
          const { width, height } = img.getBoundingClientRect();
          setImgSize({ width, height });
        }}
      />
      
      {/* Icono de lupa en la esquina */}
      <div className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <Search className="w-4 h-4" />
      </div>

      {/* Lupa */}
      {showMagnifier && (
        <div
          className="absolute border-2 border-white shadow-xl rounded-full pointer-events-none z-50"
          style={{
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            top: `${magnifierPos.y - magnifierSize / 2}px`,
            left: `${magnifierPos.x - magnifierSize / 2}px`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${imgSize.width * zoomLevel}px ${imgSize.height * zoomLevel}px`,
            backgroundPositionX: `${-magnifierPos.x * zoomLevel + magnifierSize / 2}px`,
            backgroundPositionY: `${-magnifierPos.y * zoomLevel + magnifierSize / 2}px`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#f3f4f6'
          }}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;