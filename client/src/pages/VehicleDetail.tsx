import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { updatePageSEO, generateVehicleSEO } from '@/utils/dynamic-seo';

import { 
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft,
  ArrowRight,
  Search,
  Grid,
  List,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { vehiclesApi } from "@/lib/api";
import { formatDate, getFuelType, formatPrice } from "@/lib/utils";
import PartCard from "@/components/PartCard";
import VehicleImage from "@/components/VehicleImage";
import VehicleThumbnail from "@/components/VehicleThumbnail";
import ImagePreloader from "@/components/ImagePreloader";
import ImageMagnifier from "@/components/ImageMagnifier";
import { Part } from "@/lib/api";
import { extractIdFromUrl } from "@shared/utils";

const VehicleDetail: React.FC = () => {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "0";
  const vehicleId = extractIdFromUrl(`/vehiculos/detalle/${slug}`);

  useEffect(() => {
    // Scroll suave al cargar la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [vehicleId]);
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Obtener detalles del vehículo y sus piezas (solo activas para páginas públicas)
  const { data, isLoading, error } = useQuery({
    queryKey: [`vehicle-detail-${vehicleId}`],
    queryFn: async () => {
      try {
        console.log(`🔍 Cargando detalles del vehículo ${vehicleId}...`);
        const result = await vehiclesApi.getVehicleById(vehicleId, { soloActivas: true });
        console.log(`✅ Detalles del vehículo cargados:`, result);
        return result;
      } catch (err) {
        console.error(`❌ Error cargando vehículo ${vehicleId}:`, err);
        // Si es un error 404, significa que el vehículo no existe
        if (err instanceof Error && err.message.includes('404')) {
          throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
        }
        throw err;
      }
    },
    enabled: !isNaN(vehicleId) && vehicleId > 0,
    retry: 2,
    staleTime: 1800000, // 30 minutos (optimización cache)
    gcTime: 3600000, // 1 hora (optimización cache)
    refetchOnWindowFocus: false,
  });
  
  // SEO dinámico - actualizar meta tags
  useEffect(() => {
    if (data?.vehicle && data.vehicle.marca && data.vehicle.modelo) {
      const seoData = generateVehicleSEO(data.vehicle);
      updatePageSEO(seoData);
    }
  }, [data?.vehicle]);

  // Preload de imagen crítica para LCP con early hints
  useEffect(() => {
    if (data?.vehicle?.imagenes && data.vehicle.imagenes.length > 0) {
      const firstImageUrl = data.vehicle.imagenes[0];
      if (firstImageUrl && !document.querySelector(`link[href="${firstImageUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = firstImageUrl;
        link.fetchPriority = 'high';
        link.crossOrigin = 'anonymous'; // Para CDN
        document.head.appendChild(link);
        
        console.log('🚀 Preloading critical LCP image:', firstImageUrl);
        
        // Early hint para el navegador
        if (navigator.sendBeacon) {
          const hint = `<${firstImageUrl}>; rel=preload; as=image`;
          document.dispatchEvent(new CustomEvent('earlyHint', { detail: hint }));
        }
      }
    }
  }, [data?.vehicle?.imagenes]);
  
  // Obtener categorías únicas de las piezas disponibles
  const uniqueCategories = useMemo(() => {
    if (!data?.parts || data.parts.length === 0) return [];
    
    // Extraer categorías únicas basadas en descripcionFamilia
    const categories = new Set<string>();
    data.parts.forEach(part => {
      if (part.descripcionFamilia) {
        categories.add(part.descripcionFamilia);
      }
    });
    
    return Array.from(categories);
  }, [data?.parts]);
  
  // Filtrar piezas basado en la búsqueda y agregar la información del vehículo a cada pieza
  const filteredParts = useMemo(() => {
    if (!data?.parts || data.parts.length === 0 || !data?.vehicle) return [];
    
    // Primero filtramos las piezas según la búsqueda
    let filteredParts = data.parts;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredParts = data.parts.filter(part => 
        part.descripcionArticulo.toLowerCase().includes(query) || 
        (part.descripcionFamilia && part.descripcionFamilia.toLowerCase().includes(query)) || 
        part.codArticulo.toLowerCase().includes(query) || 
        (part.refPrincipal && part.refPrincipal.toLowerCase().includes(query))
      );
    }
    
    // Ahora asignamos la información del vehículo a cada pieza
    return filteredParts.map(part => ({
      ...part,
      refLocal: part.refLocal.toString(),
      activo: part.activo ?? true, // Asegurar que activo esté definido
      vehicleId: data.vehicle.id,
      vehicleMarca: data.vehicle.marca,
      vehicleModelo: data.vehicle.modelo,
      vehicleVersion: data.vehicle.version || "",
      vehicleAnyo: data.vehicle.anyo,
      vehicleCombustible: data.vehicle.combustible,
      vehicleInfo: {
        id: data.vehicle.id,
        idLocal: data.vehicle.id, // Añadir idLocal requerido
        marca: data.vehicle.marca,
        modelo: data.vehicle.modelo,
        version: data.vehicle.version || "",
        anyo: data.vehicle.anyo,
        combustible: data.vehicle.combustible
      }
    } as Part));
  }, [data?.parts, data?.vehicle, searchQuery]);

  if (isNaN(vehicleId)) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-montserrat font-semibold mb-4">ID de vehículo inválido</h1>
        <p className="mb-6">El ID proporcionado no es válido.</p>
        <Link to="/vehiculos">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a vehículos
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Skeleton breadcrumbs */}
        <div className="mb-8">
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Skeleton header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8" style={{ minHeight: '120px' }}>
          <div>
            <Skeleton className="h-8 w-80 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-10 w-48 mt-4 md:mt-0" />
        </div>

        {/* Skeleton content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Skeleton image gallery */}
          <div className="space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <div className="flex space-x-2">
              {[1,2,3,4].map(i => (
                <Skeleton key={i} className="w-24 h-24 rounded-md" />
              ))}
            </div>
          </div>

          {/* Skeleton vehicle details */}
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>

        {/* Skeleton parts section */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("❌ Error en VehicleDetail:", error);
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-montserrat font-semibold mb-4">Error al cargar el vehículo</h1>
        <p className="mb-6">
          No se pudo cargar la información del vehículo. 
          {error instanceof Error ? ` Error: ${error.message}` : ''}
        </p>
        <Link to="/vehiculos">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a vehículos
          </Button>
        </Link>
      </div>
    );
  }

  if (!data || !data.vehicle) {
    if (!isLoading) {
      console.log("⚠️ No hay datos del vehículo, pero no está cargando");
      return (
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-montserrat font-semibold mb-4">Vehículo no encontrado</h1>
          <p className="mb-6">El vehículo con ID {vehicleId} no existe o no está disponible.</p>
          <Link to="/vehiculos">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a vehículos
            </Button>
          </Link>
        </div>
      );
    }
    return null; // Sigue cargando
  }

  const { vehicle, parts } = data;
  
  // Asegurar que vehicle.imagenes siempre sea un array
  if (vehicle && !Array.isArray(vehicle.imagenes)) {
    vehicle.imagenes = [];
  }



  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Preloader de imágenes para optimización */}
      {vehicle && vehicle.imagenes && (
        <ImagePreloader 
          images={vehicle.imagenes} 
          priority={1}
          delay={500}
        />
      )}
      {/* Navegación de migas de pan */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm">
          <Link to="/">
            <a className="hover:text-primary">Inicio</a>
          </Link>
          <span>/</span>
          <Link to="/vehiculos">
            <a className="hover:text-primary">Vehículos</a>
          </Link>
          <span>/</span>
          <span className="text-muted-foreground">
            {(() => {
              if (!vehicle) return 'Vehículo';
              
              // Si hay descripción y no es solo un número, usarla
              if (vehicle.descripcion && 
                  vehicle.descripcion.trim() !== '' && 
                  isNaN(Number(vehicle.descripcion.trim()))) {
                return vehicle.descripcion;
              }

              const parts = [];
              if (vehicle.marca && vehicle.marca !== 'N/A' && vehicle.marca.trim() !== '') {
                parts.push(vehicle.marca);
              }
              if (vehicle.modelo && vehicle.modelo !== 'N/A' && vehicle.modelo.trim() !== '') {
                parts.push(vehicle.modelo);
              }
              if (vehicle.version && vehicle.version !== 'N/A' && vehicle.version.trim() !== '') {
                parts.push(vehicle.version);
              }

              return parts.length > 0 ? parts.join(' ') : 'Vehículo';
            })()}
          </span>
        </div>
      </div>

      {/* Encabezado del vehículo */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 vehicle-detail-container prevent-cls">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-montserrat font-semibold text-primary">
              {(() => {
                if (!vehicle) return 'Vehículo';
                
                // Si hay descripción y no es solo un número, usarla
                if (vehicle.descripcion && 
                    vehicle.descripcion.trim() !== '' && 
                    isNaN(Number(vehicle.descripcion.trim()))) {
                  return vehicle.descripcion;
                }

                const parts = [];
                if (vehicle.marca && vehicle.marca !== 'N/A' && vehicle.marca.trim() !== '') {
                  parts.push(vehicle.marca);
                }
                if (vehicle.modelo && vehicle.modelo !== 'N/A' && vehicle.modelo.trim() !== '') {
                  parts.push(vehicle.modelo);
                }
                if (vehicle.version && vehicle.version !== 'N/A' && vehicle.version.trim() !== '') {
                  parts.push(vehicle.version);
                }
                if (vehicle.anyo && vehicle.anyo > 0) {
                  parts.push(vehicle.anyo.toString());
                }

                return parts.length > 0 ? parts.join(' ') : `Vehículo ${vehicle.id || 'Sin ID'}`;
              })()}
            </h1>
            <Badge variant="outline" className="border-primary text-primary">
              Ref: {vehicle?.descripcion || "N/A"}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-primary text-white">{getFuelType(vehicle?.combustible || '')}</Badge>
          </div>
        </div>
        <Link to="/vehiculos">
          <Button variant="outline" className="mt-4 md:mt-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a vehículos
          </Button>
        </Link>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Imágenes del vehículo */}
        <div className="lg:col-span-2">
          {vehicle && vehicle.imagenes && Array.isArray(vehicle.imagenes) && vehicle.imagenes.length > 0 ? (
            <div className="space-y-4">
              <Carousel 
                className="w-full"
                data-carousel-container="true"
                opts={{
                  startIndex: selectedImage,
                  align: "start"
                }}
              >
                <CarouselContent>
                  {(vehicle.imagenes || []).map((imagen, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
                        <ImageMagnifier
                          src={imagen}
                          alt={`${vehicle.descripcion || vehicle.marca + ' ' + vehicle.modelo} - Imagen ${index + 1}`}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          magnifierSize={200}
                          zoomLevel={3}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>

              <div className="overflow-x-auto pb-2">
                <div className="flex space-x-2">
                  {(vehicle.imagenes || []).map((imagen, index) => (
                    <VehicleThumbnail
                      key={index}
                      src={imagen}
                      alt={`Thumbnail ${index + 1}`}
                      className="flex-none w-24 h-24 rounded-md"
                      isSelected={selectedImage === index}
                      onClick={() => {
                        setSelectedImage(index);
                        const carousel = document.querySelector('[data-carousel-container="true"]');
                        if (carousel) {
                          const emblaApi = (carousel as any)._emblaRef?.current?.emblaApi;
                          if (emblaApi) {
                            emblaApi.scrollTo(index);
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-200 rounded-lg flex items-center justify-center aspect-[4/3]">
              <p className="text-gray-500">No hay imágenes disponibles</p>
            </div>
          )}
        </div>

        {/* Detalles del vehículo */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-montserrat font-semibold mb-4 text-primary">Detalles del vehículo</h2>
            
            <div className="space-y-0">
              <div className="grid grid-cols-2 bg-gray-50 px-3 py-2">
                <span className="text-muted-foreground">Referencia:</span>
                <span className="font-medium">{vehicle.descripcion || "N/A"}</span>
              </div>
              <div className="grid grid-cols-2 bg-white px-3 py-2">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-medium">{vehicle.id}</span>
              </div>
              <div className="grid grid-cols-2 bg-gray-50 px-3 py-2">
                <span className="text-muted-foreground">Marca:</span>
                <span className="font-medium">{vehicle.marca}</span>
              </div>
              <div className="grid grid-cols-2 bg-gray-50 px-3 py-2">
                <span className="text-muted-foreground">Modelo:</span>
                <span className="font-medium">{vehicle.modelo}</span>
              </div>
              <div className="grid grid-cols-2 bg-white px-3 py-2">
                <span className="text-muted-foreground">Versión:</span>
                <span className="font-medium">{vehicle.version || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2 bg-gray-50 px-3 py-2">
                <span className="text-muted-foreground">Año:</span>
                <span className="font-medium">{vehicle.anyo}</span>
              </div>
              <div className="grid grid-cols-2 bg-white px-3 py-2">
                <span className="text-muted-foreground">Combustible:</span>
                <span className="font-medium">{getFuelType(vehicle.combustible || '')}</span>
              </div>
              <div className="grid grid-cols-2 bg-gray-50 px-3 py-2">
                <span className="text-muted-foreground">Matrícula:</span>
                <span className="font-medium">{vehicle.matricula || "N/A"}</span>
              </div>
              <div className="grid grid-cols-2 bg-white px-3 py-2">
                <span className="text-muted-foreground">Bastidor:</span>
                <span className="font-medium">{vehicle.bastidor || "N/A"}</span>
              </div>
              <div className="grid grid-cols-2 bg-gray-50 px-3 py-2">
                <span className="text-muted-foreground">Kilometraje:</span>
                <span className="font-medium">{vehicle.kilometraje ? `${vehicle.kilometraje} km` : "N/A"}</span>
              </div>
              <div className="grid grid-cols-2 bg-white px-3 py-2">
                <span className="text-muted-foreground">Potencia:</span>
                <span className="font-medium">{vehicle.potencia ? `${vehicle.potencia} CV` : "N/A"}</span>
              </div>
              <div className="grid grid-cols-2 bg-gray-50 px-3 py-2">
                <span className="text-muted-foreground">Color:</span>
                <span className="font-medium">{vehicle.color || "N/A"}</span>
              </div>
              <div className="grid grid-cols-2 bg-white px-3 py-2">
                <span className="text-muted-foreground">Actualizado:</span>
                <span className="font-medium">{formatDate(vehicle.fechaActualizacion)}</span>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-montserrat font-semibold mb-2">Contacta con nosotros</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ¿Interesado en alguna pieza de este vehículo? Contacta con nuestro equipo para más información.
              </p>
              <div className="space-y-6">
                <Button className="w-full bg-primary hover:bg-secondary text-lg py-6">
                  Llamar: 958 790 858
                </Button>
                <Link to="/contacto" className="block">
                  <Button className="w-full bg-secondary hover:bg-blue-900 hover:text-white text-lg py-6">
                    Formulario de contacto
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Piezas disponibles */}
      <div className="mt-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-2xl font-montserrat font-semibold text-primary">
            Piezas disponibles ({parts?.length || 0} piezas)
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0 w-full md:w-auto">
            {/* Campo de búsqueda */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar piezas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
            
            {/* Botones de cambio de vista */}
            <div className="flex gap-2 ml-auto">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className="h-10 w-10"
                title="Vista en cuadrícula"
              >
                <Grid className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                className="h-10 w-10"
                title="Vista en lista"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="relative mb-6">
            <div className="relative flex items-center">
              <Button 
                variant="outline" 
                size="icon"
                className="absolute left-0 z-10 rounded-none h-[48px] px-3 border-y flex items-center justify-center top-0"
                onClick={() => {
                  const tabsList = document.querySelector('[role="tablist"]');
                  if (tabsList && tabsList instanceof HTMLElement) {
                    import('@/utils/browserCompatibility').then(({ safeScrollBy }) => {
                      safeScrollBy(tabsList, { left: -200, behavior: 'smooth' });
                    }).catch(error => console.warn('Error importing browser compatibility:', error));
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <TabsList className="mb-6 w-full justify-start overflow-x-auto h-[48px] px-12 scrollbar-hide border rounded-none bg-white">
                <TabsTrigger 
                  value="all" 
                  className="px-4 py-2 font-semibold rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary mx-1"
                >
                  Todas Las Piezas
                </TabsTrigger>
              {uniqueCategories.map((category, index) => {
                // Convertir la primera letra de cada palabra en mayúscula
                const capitalizedCategory = category
                  .toLowerCase()
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                return (
                  <TabsTrigger 
                    key={index} 
                    value={`category-${index}`}
                    className="px-4 py-2 font-semibold rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary mx-1"
                  >
                    {capitalizedCategory}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            <Button 
                variant="outline" 
                size="icon"
                className="absolute right-0 z-10 rounded-none h-[48px] px-3 border-y flex items-center justify-center top-0"
                onClick={() => {
                  const tabsList = document.querySelector('[role="tablist"]');
                  if (tabsList && tabsList instanceof HTMLElement) {
                    import('@/utils/browserCompatibility').then(({ safeScrollBy }) => {
                      safeScrollBy(tabsList, { left: 200, behavior: 'smooth' });
                    }).catch(error => console.warn('Error importing browser compatibility:', error));
                  }
                }}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <TabsContent value="all">
            {filteredParts && filteredParts.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredParts.map((part) => (
                    <PartCard 
                      key={part.id} 
                      part={part as any}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredParts.map((part) => (
                    <Card key={part.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-1/4 h-48 md:h-auto">
                          {part.imagenes && part.imagenes.length > 0 ? (
                            <img
                              src={part.imagenes[0]}
                              alt={part.descripcionArticulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gray-100">
                              <div className="p-6">
                                <Search className="h-16 w-16 text-gray-300" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-6 flex-1">
                          <div className="mb-4">
                            <h3 className="text-xl font-montserrat font-semibold mb-2 break-words">
                              {part.descripcionArticulo}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {part.descripcionFamilia || "Pieza de recambio"}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-700 mb-1">
                                <span className="font-medium">Referencia:</span> {part.refPrincipal || "N/A"}
                              </p>
                              <p className="text-sm text-gray-700 mb-1">
                                <span className="font-medium">Código:</span> {part.codArticulo || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-700 mb-1">
                                <span className="font-medium">Vehículo:</span> {vehicle.marca} {vehicle.modelo}
                              </p>
                              {/* No incluimos enlace al vehículo actual ya que ya estamos en su página */}
                              {part.vehicles && part.vehicles.length > 0 && part.vehicles[0].id !== vehicleId && (
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Compatible con:</span>{" "}
                                  <Link to={`/vehiculos/${part.vehicles[0].id}`} className="text-primary hover:underline">
                                    {part.vehicles[0].marca} {part.vehicles[0].modelo}
                                    {part.vehicles[0].version ? ` ${part.vehicles[0].version}` : ''}
                                    {part.vehicles[0].anyo ? ` (${part.vehicles[0].anyo})` : ''}
                                  </Link>
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-primary text-lg font-semibold">
                              {formatPrice(part.precio)}
                            </span>
                            <Link to={`/piezas/${part.id}`}>
                              <Button 
                                variant="default" 
                                className="bg-secondary hover:bg-blue-900 hover:text-white text-white"
                              >
                                Ver detalle
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-white border rounded-lg">
                <h3 className="text-xl font-montserrat font-semibold mb-2">No hay piezas disponibles</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "No se encontraron piezas que coincidan con tu búsqueda." : "Actualmente no hay piezas disponibles para este vehículo."}
                </p>
              </div>
            )}
          </TabsContent>
          
          {/* Contenido dinámico para cada categoría */}
          {uniqueCategories.map((category, index) => {
            // Filtrar por categoría y búsqueda
            const categoryFilteredParts = filteredParts.filter(p => p.descripcionFamilia === category);
            
            return (
              <TabsContent key={index} value={`category-${index}`}>
                {categoryFilteredParts.length > 0 ? (
                  viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {categoryFilteredParts.map((part) => (
                        <PartCard 
                          key={part.id} 
                          part={part as any}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categoryFilteredParts.map((part) => (
                        <Card key={part.id} className="overflow-hidden">
                          <div className="flex flex-col md:flex-row">
                            <div className="w-full md:w-1/4 h-48 md:h-auto">
                              {part.imagenes && part.imagenes.length > 0 ? (
                                <img
                                  src={part.imagenes[0]}
                                  alt={part.descripcionArticulo}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full bg-gray-100">
                                  <div className="p-6">
                                    <Search className="h-16 w-16 text-gray-300" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="p-6 flex-1">
                              <div className="mb-4">
                                <h3 className="text-xl font-montserrat font-semibold mb-2 break-words">
                                  {part.descripcionArticulo}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  {part.descripcionFamilia}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-700 mb-1">
                                    <span className="font-medium">Referencia:</span> {part.refPrincipal || "N/A"}
                                  </p>
                                  <p className="text-sm text-gray-700 mb-1">
                                    <span className="font-medium">Código:</span> {part.codArticulo || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-700 mb-1">
                                    <span className="font-medium">Marca:</span> {vehicle.marca || "N/A"}
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Modelo:</span> {vehicle.modelo || "N/A"}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-primary text-lg font-semibold">
                                  {formatPrice(part.precio)}
                                </span>
                                <Button 
                                  variant="default" 
                                  className="bg-secondary hover:bg-blue-900 hover:text-white text-white"
                                  onClick={() => window.location.href = `/piezas/${part.id}`}
                                >
                                  Ver detalle
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 bg-white border rounded-lg">
                    <p className="text-muted-foreground">
                      {searchQuery 
                        ? `No se encontraron piezas de ${category.toLowerCase()} que coincidan con tu búsqueda.` 
                        : `No hay piezas de ${category.toLowerCase()} disponibles para este vehículo.`
                      }
                    </p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default VehicleDetail;
