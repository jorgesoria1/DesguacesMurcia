import { useEffect } from 'react';

interface ImagePreloaderProps {
  images: string[];
  priority?: number; // Número de imágenes a precargar con prioridad
  delay?: number; // Retraso en ms antes de precargar imágenes no críticas
}

const ImagePreloader: React.FC<ImagePreloaderProps> = ({
  images,
  priority = 1,
  delay = 1000
}) => {
  useEffect(() => {
    if (!images || images.length === 0) return;

    // Precargar imágenes prioritarias inmediatamente
    const priorityImages = images.slice(0, priority);
    priorityImages.forEach((src, index) => {
      if (src && !document.querySelector(`link[href="${src}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        if (index === 0) link.fetchPriority = 'high';
        document.head.appendChild(link);
      }
    });

    // Precargar imágenes secundarias con retraso
    if (images.length > priority) {
      const timer = setTimeout(() => {
        const secondaryImages = images.slice(priority);
        secondaryImages.forEach((src) => {
          if (src && !document.querySelector(`link[href="${src}"]`)) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
          }
        });
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [images, priority, delay]);

  return null; // Este componente no renderiza nada
};

export default ImagePreloader;