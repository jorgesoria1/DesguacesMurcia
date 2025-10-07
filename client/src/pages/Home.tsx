import React, { useEffect, useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { setHomeTitle } from '@/utils/seo';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { 
  Car, 
  Settings, 
  Wrench, 
  Battery, 
  Zap, 
  Lightbulb, 
  Gauge, 
  LucideIcon,
  SquareAsterisk,
  ChevronRight as ChevronRightIcon,
  ChevronLeft,
  Thermometer
} from 'lucide-react';
import HeroSection from '@/components/HeroSection';
import InfoSection from '@/components/InfoSection';
import GoogleReviewsSlider from '@/components/GoogleReviewsSlider';
import VehicleCard from '@/components/VehicleCard';
import PartCard from '@/components/PartCard';
import DynamicHomepageBlocks from '@/components/DynamicHomepageBlocks';

// Componente para cargar piezas por categoría
function CategoryPartsContent({ category }: { category: string }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: categoryParts, isLoading: isLoadingCategory, error: categoryError } = useQuery({
    queryKey: ['category-parts', category],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("familia", category);
      params.set("limit", "8");
      params.set("offset", "0");
      params.set("orden", "newest");

      const endpoint = `/api/search-parts?${params.toString()}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const parts = data?.data || [];
      
      return parts;
    },
    staleTime: 2400000,
    gcTime: 7200000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const parts = categoryParts || [];

  return (
    <div className="w-full">
      {isLoadingCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
              <div className="h-40 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : categoryError ? (
        <div className="text-center py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Error al cargar piezas
            </h3>
            <p className="text-red-700">
              No se pudieron cargar las piezas de {category}
            </p>
          </div>
        </div>
      ) : parts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {parts.map((part: any, index: number) => (
            <PartCard key={part.id || part.refLocal} part={part} gridIndex={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay piezas disponibles en {category}
            </h3>
            <p className="text-gray-600 mb-4">
              Esta categoría no tiene piezas disponibles en este momento.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Brand logos - using public path references to src/assets
const brandLogos = {
  audi: new URL('../assets/brands/real/audi-logo.svg', import.meta.url).href,
  bmw: new URL('../assets/brands/real/bmw-logo.svg', import.meta.url).href,
  mercedes: new URL('../assets/brands/real/mercedes-logo-new.svg', import.meta.url).href,
  volkswagen: new URL('../assets/brands/real/volkswagen-logo.svg', import.meta.url).href,
  toyota: new URL('../assets/brands/real/toyota-logo.svg', import.meta.url).href,
  renault: new URL('../assets/brands/real/renault-logo.svg', import.meta.url).href,
  seat: new URL('../assets/brands/real/seat-logo.svg', import.meta.url).href
};

export default function Home() {
  // SEO simple - solo título
  useEffect(() => {
    setHomeTitle();
  }, []);
  
  // Development mode check
  const isDevelopment = typeof window !== 'undefined';
  const debugTimestamp = Date.now();

  
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['optimized-vehicles'],
    queryFn: () => fetch('/api/optimized/vehicles?limit=10&withPartCounts=true&orden=fecha_desc').then(res => res.json()),
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos en memoria
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: categoriesData } = useQuery<string[]>({
    queryKey: ['/api/parts/families'],
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos en memoria
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch homepage blocks from CMS
  const { data: homepageBlocks, isLoading: isLoadingBlocks } = useQuery({
    queryKey: ['/api/cms/homepage-blocks'],
    queryFn: async () => {
      const response = await fetch('/api/cms/homepage-blocks');
      if (!response.ok) throw new Error('Error al cargar bloques');
      return response.json();
    },
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos en memoria
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const vehicles = vehiclesResponse?.data || [];
  const categories = categoriesData || [];

  // Cargar piezas usando el mismo endpoint que funciona en Parts.tsx
  const { data: partsData, isLoading: isLoadingParts, error: partsError } = useQuery({
    queryKey: ['parts-for-home'],
    queryFn: async () => {
      try {
        
        // Usar el mismo endpoint que funciona en Parts.tsx con parámetros optimizados
        const params = new URLSearchParams();
        params.set("activo", "true");
        params.set("limit", "50");
        params.set("offset", "0");
        params.set("getTotalCount", "true");
        params.set("orden", "newest");

        const endpoint = `/api/search-parts?${params.toString()}`;
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        const parts = data?.data || [];
        
        if (parts.length > 0) {
        }
        
        return parts;
      } catch (error) {
        throw error; // Permitir que React Query maneje el error
      }
    },
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos en memoria
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const allParts = partsData || [];

  // Función para obtener piezas por categoría usando el mismo endpoint que Parts.tsx
  const getPartsByCategory = async (category: string) => {
    try {

      
      // Usar el mismo endpoint que funciona en Parts.tsx
      const params = new URLSearchParams();
      params.set("familia", category);
      params.set("activo", "true");
      params.set("limit", "8");
      params.set("offset", "0");
      params.set("getTotalCount", "true");
      params.set("orden", "newest");

      const endpoint = `/api/search-parts?${params.toString()}`;

      
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const parts = data?.data || [];
      

      
      if (parts.length > 0) {

      }
      
      return parts;
    } catch (error) {
      return [];
    }
  };

  // Debug básico

  return (
    <>

      
      <HeroSection />

      {/* Vehicles Section */}
      <motion.section 
        className="py-8 bg-gradient-to-b from-primary/5 to-background w-full"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.1, margin: "-20% 0px -20% 0px" }}
      >
        <div className="w-full max-w-[1400px] mx-auto px-6">
          <div className="mb-4 text-center">
            <h2 className="text-3xl font-montserrat font-semibold text-primary mb-2">Catálogo de Vehículos</h2>
            <p className="text-sm text-gray-600">Encuentra las piezas que necesitas para tu vehículo</p>
          </div>
          <Carousel className="w-full max-w-7xl mx-auto px-4 sm:px-0">
            <CarouselContent>
              {vehicles && vehicles.length > 0 ? (
                // Ordenar por fecha de actualización descendente (más recientes primero)
                [...vehicles].sort((a, b) => {
                  // Primero intentar ordenar por fecha de actualización
                  if (a.fechaActualizacion && b.fechaActualizacion) {
                    return new Date(b.fechaActualizacion).getTime() - new Date(a.fechaActualizacion).getTime();
                  }
                  // Luego por fecha de creación si está disponible
                  if (a.fechaCreacion && b.fechaCreacion) {
                    return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
                  }
                  // Si no hay fechas, ordenar por ID (más alto = más nuevo)
                  return (b.id || 0) - (a.id || 0);
                }).map((vehicle: any) => (
                  <CarouselItem key={vehicle.id} className="md:basis-1/2 lg:basis-1/4">
                    <VehicleCard vehicle={vehicle} />
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="flex justify-center w-full">
                  <Card className="w-full p-6 text-center">
                    <CardContent>
                      <p className="text-muted-foreground">Cargando vehículos...</p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
          

        </div>
      </motion.section>

      {/* Homepage Service Blocks */}
      {homepageBlocks && !isLoadingBlocks && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, amount: 0.1, margin: "-20% 0px -20% 0px" }}
        >
          <DynamicHomepageBlocks blocks={homepageBlocks} />
        </motion.div>
      )}

      {/* Parts Section */}
      <section className="py-8 w-full">
        <div className="w-full max-w-[1400px] mx-auto px-6">
          <div className="mb-4 text-center">
            <h2 className="text-3xl font-montserrat font-semibold text-primary mb-2">Catálogo de Piezas</h2>
            <p className="text-sm text-gray-600">Todas las piezas que necesitas en un solo lugar</p>
          </div>

          {categories.length > 0 ? (
            <Tabs defaultValue="todas" className="w-full mx-auto">
              {/* Contenedor de tabs con navegación */}
              <div className="mb-4 w-full">
                <TabsList className="flex w-full overflow-x-auto py-3 justify-start px-2 md:px-0 scrollbar-hide bg-white border rounded-lg gap-2">
                  {/* Tab "Todas Las Piezas" */}
                  <TabsTrigger 
                    value="todas" 
                    className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-white hover:bg-gray-100"
                  >
                    Todas Las Piezas
                  </TabsTrigger>

                  {/* Tabs dinámicos basados en categorías reales */}
                  {categories.filter(cat => cat !== 'GENERICO' && cat !== 'GENÉRICO' && cat !== 'MOTOS').map((category) => {
                    // Formatear categoría: primera letra de cada palabra en mayúscula
                    const formattedCategory = category
                      .toLowerCase()
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    
                    return (
                      <TabsTrigger 
                        key={category}
                        value={category.toLowerCase().replace(/\s+/g, '-').replace(/[/]/g, '-')} 
                        className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap hover:bg-gray-100"
                      >
                        {formattedCategory}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Contenido para "Todas Las Piezas" */}
              <TabsContent value="todas">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {isLoadingParts ? (
                    [...Array(8)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                        <div className="h-40 bg-gray-200 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))
                  ) : partsError ? (
                    <div className="col-span-4 text-center py-8">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-red-900 mb-2">
                          Error al cargar piezas
                        </h3>
                        <p className="text-red-700 mb-4">
                          {partsError.message || 'Error desconocido al cargar las piezas'}
                        </p>
                        <Button 
                          onClick={() => window.location.reload()} 
                          variant="outline" 
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Recargar página
                        </Button>
                      </div>
                    </div>
                  ) : allParts && allParts.length > 0 ? (
                    allParts.slice(0, 8).map((part: any, index: number) => (
                      <PartCard key={part.id || part.refLocal} part={part} gridIndex={index} />
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-8">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No hay piezas disponibles
                        </h3>
                        <p className="text-gray-600 mb-4">
                          No se encontraron piezas para mostrar en este momento.
                        </p>
                        <Button 
                          onClick={() => window.location.reload()} 
                          variant="outline"
                        >
                          Recargar página
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                

              </TabsContent>

              {/* Contenido dinámico para cada categoría */}
              {categories.filter(cat => cat !== 'GENERICO' && cat !== 'GENÉRICO' && cat !== 'MOTOS').map((category) => {
                const tabValue = category.toLowerCase().replace(/\s+/g, '-').replace(/[/]/g, '-');
                
                return (
                  <TabsContent key={category} value={tabValue}>
                    <CategoryPartsContent category={category} />
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <div className="flex justify-center">
              <Card className="w-full max-w-md p-6 text-center">
                <CardContent>
                  <p className="text-muted-foreground">Cargando categorías de piezas...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Featured Brands Section */}
      <motion.section 
        className="py-8 bg-white w-full"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, amount: 0.1, margin: "-20% 0px -20% 0px" }}
      >
        <div className="w-full max-w-[1400px] mx-auto px-6">
          <Carousel className="w-full max-w-7xl mx-auto">
            <CarouselContent>
              {[
                { name: 'AUDI', logo: brandLogos.audi },
                { name: 'BMW', logo: brandLogos.bmw },
                { name: 'MERCEDES-BENZ', logo: brandLogos.mercedes },
                { name: 'VOLKSWAGEN', logo: brandLogos.volkswagen },
                { name: 'TOYOTA', logo: brandLogos.toyota },
                { name: 'RENAULT', logo: brandLogos.renault },
                { name: 'SEAT', logo: brandLogos.seat }
              ].map((brand) => (
                <CarouselItem key={brand.name} className="md:basis-1/4 lg:basis-1/4">
                  <Link 
                    href={`/piezas?marca=${encodeURIComponent(brand.name)}`}
                    className="flex items-center justify-center p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors h-full"
                  >
                    <div className="text-center">
                      <img 
                        src={brand.logo} 
                        alt={`${brand.name} logo`}
                        className="object-contain mx-auto mb-4 w-20 h-20"
                      />
                      <span className="font-medium text-sm">{brand.name}</span>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, amount: 0.1, margin: "-20% 0px -20% 0px" }}
      >
        <InfoSection />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.1, margin: "-20% 0px -20% 0px" }}
      >
        <GoogleReviewsSlider />
      </motion.div>
    </>
  );
}