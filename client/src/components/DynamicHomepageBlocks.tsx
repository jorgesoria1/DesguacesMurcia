import React from 'react';
import { 
  Tag, 
  Truck, 
  Shield, 
  Book, 
  CheckCircle, 
  Euro, 
  Headphones,
  Home
} from 'lucide-react';

interface HomepageBlock {
  id: number;
  blockType: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  image?: string;
  buttonText?: string;
  buttonUrl?: string;
  sortOrder: number;
}

interface DynamicHomepageBlocksProps {
  blocks: HomepageBlock[];
}

const getIconComponent = (iconName?: string) => {
  switch (iconName) {
    case 'tag':
      return Tag;
    case 'truck':
      return Truck;
    case 'shield':
      return Shield;
    case 'book':
      return Book;
    case 'check-circle':
      return CheckCircle;
    case 'euro':
      return Euro;
    case 'headphones':
      return Headphones;
    case 'home':
      return Home;
    default:
      return CheckCircle;
  }
};

const DynamicHomepageBlocks: React.FC<DynamicHomepageBlocksProps> = ({ blocks }) => {
  const featureBlocks = blocks.filter(block => block.blockType === 'feature');

  return (
    <>
      {/* Service Features Section */}
      {featureBlocks.length > 0 && (
        <section className="py-8 bg-white">
          <div className="w-full max-w-[95%] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {featureBlocks.map((block) => {
                const IconComponent = getIconComponent(block.icon);
                return (
                  <div 
                    key={block.id}
                    className="group bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-primary/20 hover:shadow-xl transition-all duration-300 relative overflow-hidden text-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-primary">{block.title}</h3>
                    {block.description && (
                      <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                        {block.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default DynamicHomepageBlocks;