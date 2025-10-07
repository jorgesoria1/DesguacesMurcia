import React from 'react';

interface CentralBannerProps {
  imageSrc: string;
  alt: string;
  overlayIntensity?: 'light' | 'normal';
}

const CentralBanner: React.FC<CentralBannerProps> = ({ imageSrc, alt, overlayIntensity = 'normal' }) => {
  const overlayClasses = overlayIntensity === 'light' 
    ? "absolute inset-0 bg-gradient-to-r from-primary/8 via-primary/5 to-primary/2"
    : "absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5";

  return (
    <div className="relative w-full h-[200px] mb-6 overflow-hidden rounded-lg shadow-lg">
      <img 
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover"
      />
      {/* Overlay azul similar al hero */}
      <div className={overlayClasses}></div>
    </div>
  );
};

export default CentralBanner;