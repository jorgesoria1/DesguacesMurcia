import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle, 
  Truck, 
  EuroIcon, 
  Headphones, 
  Star, 
  Shield, 
  Clock, 
  Phone,
  Award,
  Settings,
  Users,
  Heart,
  ThumbsUp,
  Zap
} from "lucide-react";

import introduesguace from "@assets/introduesguace_1754119900576.png";

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  Truck,
  EuroIcon,
  Headphones,
  Star,
  Shield,
  Clock,
  Phone,
  Award,
  Settings,
  Users,
  Heart,
  ThumbsUp,
  Zap
};

interface HomepageBlock {
  id: number;
  blockType: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  image: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const InfoSection: React.FC = () => {
  const { data: blocks, isLoading } = useQuery<HomepageBlock[]>({
    queryKey: ['/api/cms/homepage-blocks'],
    queryFn: async () => {
      const response = await fetch('/api/cms/homepage-blocks');
      if (!response.ok) throw new Error('Error al cargar bloques');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">Cargando...</div>
        </div>
      </section>
    );
  }

  const titleBlock = blocks?.find(block => block.blockType === 'why_choose_us_title');
  const featureBlocks = blocks?.filter(block => block.blockType === 'why_choose_us' && block.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const imageBlock = blocks?.find(block => block.blockType === 'why_choose_us_image');

  const renderIcon = (iconName: string | null) => {
    if (!iconName || !iconMap[iconName]) {
      return <CheckCircle className="h-6 w-6" />; // Default fallback
    }
    
    const IconComponent = iconMap[iconName];
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <section className="py-8 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            {titleBlock && (
              <>
                <h2 className="text-3xl font-montserrat font-semibold text-primary mb-2 text-center">
                  {titleBlock.title}
                </h2>
                
                {/* Divisor decorativo - posicionado debajo del título */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-blue-800 rounded-full"></div>
                  <div className="mx-4 text-primary text-lg">•</div>
                  <div className="w-20 h-0.5 bg-gradient-to-l from-primary to-blue-800 rounded-full"></div>
                </div>
              </>
            )}
            <div className="space-y-6">
              {featureBlocks.map((block) => (
                <div key={block.id} className="flex">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
                    {renderIcon(block.icon)}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-montserrat font-semibold mb-2 text-primary">
                      {block.title}
                    </h3>
                    {block.description && (
                      <p className="text-gray-600">
                        {block.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="rounded-lg shadow-lg overflow-hidden">
              <img 
                src={introduesguace}
                alt="Desguace Murcia - Piezas y vehículos de desguace"
                className="w-full h-auto object-contain"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  // Fallback en caso de error de carga
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<div class="w-full h-64 bg-gray-200 flex items-center justify-center"><p class="text-gray-600">Imagen de introducción al desguace</p></div>';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoSection;
