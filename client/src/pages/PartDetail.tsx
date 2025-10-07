import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { updatePageSEO, generatePartSEO } from '@/utils/dynamic-seo';

import { 
  Card,
  CardContent,
} from "@/components/ui/card";
import PartCard from "@/components/PartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, ArrowRight, ShoppingCart, Info, Phone, CheckCircle, Truck, Plus, Image as ImageIcon } from "lucide-react";
import { partsApi } from "@/lib/api";
import { formatPrice, formatDate, formatPriceBreakdown, formatWeight } from "@/lib/utils";
import { useCart } from "@/components/cart/CartContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { extractIdFromUrl, createVehicleUrl } from "@shared/utils";
import OptimizedImage from "@/components/OptimizedImage";
import VehicleThumbnail from "@/components/VehicleThumbnail";
import VehicleImage from "@/components/VehicleImage";
import ImageMagnifier from "@/components/ImageMagnifier";

const PartDetail: React.FC = () => {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || '0';
  const partId = extractIdFromUrl(`/piezas/${slug}`);
  const { addToCart, setIsCartOpen, clearCart, isLoading: isCartLoading } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll suave al cargar la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [partId]);

  // Estado para manejar independientemente los estados de carga
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  // Función para manejar la acción de añadir al carrito
  const handleAddToCart = async () => {
    try {
      if (!partData) return;

      // Activar solo el estado de carga de "Añadir al carrito"
      setIsAddingToCart(true);

      // Usar el sistema de carrito del contexto
      await addToCart(partId, 1, partData);

      // Mostrar toast de confirmación
      toast({
        title: "Producto añadido",
        description: "El producto se ha añadido al carrito correctamente",
      });

      // Abrir el carrito lateral automáticamente
      setIsCartOpen(true);
    } catch (error) {
      console.error("Error al añadir al carrito:", error);
      toast({
        title: "Error",
        description: "No se pudo añadir al carrito",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Obtener hooks de navegación
  const [location, setLocation] = useLocation();

  // Función para ir directamente a la página de checkout (comprar ahora)
  const handleBuyNow = async () => {
    try {
      setIsBuyingNow(true);

      // Limpiar el carrito actual
      clearCart();

      // Añadir la pieza al carrito SIN abrir la ventana del carrito
      await addToCart(partId, 1, partData, false);

      // Redirigir directamente a la página de checkout usando client-side navigation
      setLocation("/checkout");
    } catch (error) {
      console.error("Error al procesar la compra:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la compra",
        variant: "destructive",
      });
    } finally {
      setIsBuyingNow(false);
    }
  };

  // Obtener el parámetro filterBrand de la URL si existe
  const queryParams = new URLSearchParams(window.location.search);
  const filterBrand = queryParams.get('filterBrand');

  // Obtener detalles de la pieza y sus vehículos
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/parts/${partId}`, filterBrand],
    queryFn: () => partsApi.getPartById(partId, { filterBrand: filterBrand || undefined }),
    enabled: !isNaN(partId),
    staleTime: 300000, // 5 minutos
    gcTime: 900000, // 15 minutos
    refetchOnWindowFocus: false,
    retry: 2,
  });
  
  // SEO dinámico - actualizar meta tags
  useEffect(() => {
    if (data && !isLoading && data.descripcionArticulo) {
      const seoData = generatePartSEO(data);
      updatePageSEO(seoData);
    }
  }, [data, isLoading]);
  


  // Obtener otras piezas de los vehículos asociados
  const { data: relatedPartsData } = useQuery({
    queryKey: ["related-parts", data?.vehicles?.[0]?.id, partId],
    queryFn: async () => {
      if (!data?.vehicles?.[0]?.id) return null;

      const vehicleId = data.vehicles[0].id;
      const currentPartId = partId;
      console.log(`Obteniendo piezas relacionadas para vehículo ID: ${vehicleId}, excluyendo pieza ID: ${currentPartId}`);

      const response = await fetch(
        `/api/optimized/parts/related/${vehicleId}?excludePartId=${currentPartId}&limit=8`
      );

      if (!response.ok) {
        throw new Error("Error al obtener piezas relacionadas");
      }

      const result = await response.json();

      // Verificación adicional en el frontend para mayor seguridad
      const validParts = (result.data || []).filter((part: any) => {
        const precio = parseFloat(part.precio?.toString() || '0');
        return precio > 0;
      });

      if (validParts.length !== (result.data || []).length) {
        console.warn(`Se filtraron ${(result.data || []).length - validParts.length} piezas con precio inválido en el frontend`);
      }

      console.log(`Piezas relacionadas obtenidas: ${validParts.length} (todas con precio válido)`);

      return {
        parts: validParts,
        vehicleId: vehicleId
      };
    },
    enabled: !!data?.vehicles?.[0]?.id,
    staleTime: 180000, // 3 minutos para piezas relacionadas
    gcTime: 600000, // 10 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });



  if (isNaN(partId)) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-montserrat font-semibold mb-4">ID de pieza inválido</h1>
        <p className="mb-6">El ID proporcionado no es válido.</p>
        <Link to="/piezas">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a piezas
          </Button>
        </Link>
      </div>
    );
  }



  // Show loading state immediately
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Cargando detalles de la pieza...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-montserrat font-semibold mb-4">Error al cargar la pieza</h1>
        <p className="mb-6">No se pudo cargar la información de la pieza.</p>
        <Link to="/piezas">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a piezas
          </Button>
        </Link>
      </div>
    );
  }

  const partData = data;
  const vehicles = data.vehicles || [];


  return (
    <>
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Navegación de migas de pan */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm">
          <Link to="/" className="hover:text-primary">
            Inicio
          </Link>
          <span>/</span>
          <Link to="/piezas" className="hover:text-primary">
            Piezas
          </Link>
          <span>/</span>
          <span className="text-muted-foreground">{partData.descripcionArticulo}</span>
        </div>
      </div>

      {/* Encabezado de la pieza */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-montserrat font-semibold text-primary">
              {partData.descripcionArticulo}
            </h1>
            <Badge variant="outline" className="px-3 py-1 border-primary text-primary">
              Ref: {partData.refLocal || "N/A"}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-accent text-white">En stock</Badge>
            {partData.codArticulo && (
              <Badge variant="outline" className="px-3 py-1">Código: {partData.codArticulo}</Badge>
            )}
          </div>
        </div>
        <Link to="/piezas">
          <Button variant="outline" className="mt-4 md:mt-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a piezas
          </Button>
        </Link>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Imágenes */}
        <div className="lg:col-span-2">
          {partData.imagenes && partData.imagenes.length > 0 ? (
            <div className="space-y-4">
              <Carousel 
                className="w-full h-auto"
                data-carousel-container="true"
                opts={{
                  startIndex: selectedImage,
                  align: "start"
                }}
              >
                <CarouselContent className="-ml-0 h-auto">
                  {partData.imagenes.map((imagen: string, index: number) => (
                    <CarouselItem key={index} className="pl-0 h-auto">
                      <div className="overflow-hidden rounded-lg bg-gray-100">
                        <ImageMagnifier
                          src={imagen}
                          alt={`${partData.descripcionArticulo} - Imagen ${index + 1}`}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          magnifierSize={200}
                          zoomLevel={3}
                          style={{ 
                            width: '100%', 
                            height: 'auto',
                            maxHeight: 'none',
                            minHeight: 'auto',
                            margin: 0,
                            padding: 0,
                            display: 'block'
                          }}
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
                  {partData.imagenes.map((imagen: string, index: number) => (
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

          {/* Detalles de la pieza */}
          <div className="mt-8">
            

            <div className="mb-8">
              <Tabs defaultValue="specs" className="w-full">
                <TabsList className="mb-6 w-full justify-start overflow-x-auto h-[48px] px-4 scrollbar-hide border rounded-none bg-white">
                  <TabsTrigger 
                    value="specs" 
                    className="px-4 py-2 font-semibold rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary mx-1"
                  >
                    Ficha técnica
                  </TabsTrigger>
                  <TabsTrigger 
                    value="details"
                    className="px-4 py-2 font-semibold rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary mx-1"
                  >
                    Más información
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="specs">
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded p-3 border">
                        <span className="text-sm font-medium text-gray-600">Marca:</span>
                        <p className="text-lg font-semibold text-blue-700">
                          {partData.vehicleMarca || partData.marca || "No especificada"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <span className="text-sm font-medium text-gray-600">Modelo:</span>
                        <p className="text-lg font-semibold text-green-700">
                          {partData.vehicleModelo || partData.modelo || "No especificado"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <span className="text-sm font-medium text-gray-600">Versión:</span>
                        <p className="text-lg font-semibold text-purple-700">
                          {partData.vehicleVersion || partData.version || "No especificada"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <span className="text-sm font-medium text-gray-600">Año:</span>
                        <p className="text-lg font-semibold text-orange-700">
                          {partData.vehicleAnyo || partData.anyo || "No especificado"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <span className="text-sm font-medium text-gray-600">Combustible:</span>
                        <p className="text-lg font-semibold text-red-700">
                          {partData.vehicles?.[0]?.combustible || "No especificado"}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3 border">
                        <span className="text-sm font-medium text-gray-600">Familia:</span>
                        <p className="text-lg font-semibold text-indigo-700">
                          {partData.descripcionFamilia || "No especificada"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 bg-gray-50 p-2 rounded">
                      <span className="text-muted-foreground">Referencia:</span>
                      <span className="font-semibold">{partData.refLocal || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-2 bg-white p-2 rounded">
                      <span className="text-muted-foreground">Código:</span>
                      <span>{partData.codArticulo || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-2 bg-gray-50 p-2 rounded">
                      <span className="text-muted-foreground">Peso:</span>
                      <span>{formatWeight(partData.peso)}</span>
                    </div>


                  </div>
                </TabsContent>

                <TabsContent value="details">
                  <div className="space-y-4">
                    {/* Detalles técnicos de la pieza */}
                    <div className="space-y-1 mb-4">
                      <div className="grid grid-cols-2 even:bg-white odd:bg-gray-50 p-2">
                        <span className="text-muted-foreground">Referencia:</span>
                        <span className="font-semibold">{partData.refLocal || "N/A"}</span>
                      </div>
                      <div className="grid grid-cols-2 even:bg-white odd:bg-gray-50 p-2">
                        <span className="text-muted-foreground">Código:</span>
                        <span>{partData.codArticulo || "N/A"}</span>
                      </div>
                      {partData.refPrincipal && (
                        <div className="grid grid-cols-2 even:bg-white odd:bg-gray-50 p-2">
                          <span className="text-muted-foreground">Ref Principal:</span>
                          <span>{partData.refPrincipal}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 even:bg-white odd:bg-gray-50 p-2">
                        <span className="text-muted-foreground">Estado:</span>
                        <span>Disponible</span>
                      </div>
                      <div className="grid grid-cols-2 even:bg-white odd:bg-gray-50 p-2">
                        <span className="text-muted-foreground">Garantía:</span>
                        <span>3 meses</span>
                      </div>
                      <div className="grid grid-cols-2 even:bg-white odd:bg-gray-50 p-2">
                        <span className="text-muted-foreground">Actualizado:</span>
                        <span>16/05/2025</span>
                      </div>
                      <div className="grid grid-cols-2 even:bg-white odd:bg-gray-50 p-2">
                        <span className="text-muted-foreground">Código Versión:</span>
                        <span>{partData.cod_version_vehiculo || partData.rvCode || "N/A"}</span>
                      </div>
                    </div>
                      
                      {partData.descripcion && partData.descripcion !== "No hay descripción disponible" && partData.descripcion.trim() !== "" && (
                        <div>
                          <h4 className="font-semibold mb-2">Información de la pieza</h4>
                          <p>{partData.descripcion}</p>
                        </div>
                      )}
                      
                      {partData.observaciones && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">Observaciones</h4>
                          <p>{partData.observaciones}</p>
                        </div>
                      )}
                    </div>
                </TabsContent>
              </Tabs>
            </div>


            <Accordion type="single" collapsible className="mb-8">
              <AccordionItem value="compatibility">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <Info className="mr-2 h-4 w-4" />
                    Compatibilidad y garantía
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <p>
                      Esta pieza es compatible con el vehículo especificado. Antes de realizar su pedido, 
                      verifique que la referencia coincide con la que necesita o contáctenos para confirmar 
                      la compatibilidad con tu vehículo.
                    </p>
                    <p>
                      Todas nuestras piezas disponen de una garantía de 3 meses desde la fecha de compra. 
                      La garantía cubre defectos de fabricación y no se aplica a desgaste normal o instalación 
                      incorrecta.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="shipping">
                <AccordionTrigger>
                  <div className="flex items-center">
                    <Truck className="mr-2 h-4 w-4" />
                    Envío y devoluciones
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <p>
                      Realizamos envíos a toda España peninsular en 24-48 horas laborables. Para Baleares, 
                      Canarias, Ceuta y Melilla el plazo puede ser de 3-5 días laborables.
                    </p>
                    <p>
                      Las devoluciones son aceptadas durante los 14 días siguientes a la recepción, siempre que 
                      la pieza se encuentre en su estado original y no haya sido montada.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Panel de compra */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="mb-6">
              {(() => {
                const priceBreakdown = formatPriceBreakdown(partData.precio);
                return (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-3xl font-montserrat font-semibold text-red-800">
                        {priceBreakdown.totalPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        IVA incluido
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Precio sin IVA:</span>
                        <span className="font-medium">{priceBreakdown.basePrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA (21%):</span>
                        <span className="font-medium">{priceBreakdown.iva}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold text-primary">
                        <span>Total:</span>
                        <span>{priceBreakdown.totalPrice}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="flex items-center text-accent mt-2 mb-6">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">En stock</span>
              </div>

              <div className="space-y-4 mb-6">
                {/* Información de cantidad fija */}
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Cantidad:</span>
                  <div className="flex items-center px-4 py-2 border rounded-md">
                    <span className="text-center">1 unidad</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-primary hover:bg-secondary" 
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || isBuyingNow}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isAddingToCart ? 'Añadiendo...' : 'Añadir al carrito'}
                  {isAddingToCart && (
                    <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  )}
                </Button>

                <Button 
                  className="w-full bg-secondary hover:bg-blue-900 hover:text-white" 
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={isAddingToCart || isBuyingNow}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isBuyingNow ? 'Procesando...' : 'Comprar ahora'}
                  {isBuyingNow && (
                    <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  )}
                </Button>

                <Button variant="outline" className="w-full" size="lg">
                  <Phone className="mr-2 h-5 w-5" />
                  Llamar: 958 790 858
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-2 text-accent flex-shrink-0 mt-0.5" />
                <span>Garantía de calidad: todas nuestras piezas son verificadas y testadas</span>
              </div>
              <div className="flex items-start">
                <Truck className="h-5 w-5 mr-2 text-accent flex-shrink-0 mt-0.5" />
                <span>Envío rápido: 24/48h en península</span>
              </div>
              <div className="flex items-start">
                <Info className="h-5 w-5 mr-2 text-accent flex-shrink-0 mt-0.5" />
                <span>Soporte técnico: asesoramiento personalizado por teléfono</span>
              </div>
            </div>

            {/* Vehículo compatible */}
            {vehicles && vehicles.length > 0 && (
              <div className="mt-6 rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-800 text-white p-3">
                  <h3 className="font-semibold">Vehículo compatible</h3>
                </div>

                <div className="p-4">
                  {/* Imagen del vehículo */}
                  <div className="mb-3 bg-white border rounded-md p-2">
                    {vehicles[0].imagenes && vehicles[0].imagenes.length > 0 ? (
                      <OptimizedImage 
                        src={vehicles[0].imagenes[0]} 
                        alt={`${vehicles[0].marca} ${vehicles[0].modelo}`}
                        className="w-full h-48 object-cover"
                        priority={false} // Lazy loading para imágenes de vehículos compatibles
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Datos principales */}
                  <h4 className="font-semibold text-xs mb-2">{vehicles[0].marca} {vehicles[0].modelo} {vehicles[0].version}</h4>

                  <div className="space-y-1 text-xs mb-3">
                    <div><span className="font-medium">Marca:</span> {vehicles[0].marca}</div>
                    <div><span className="font-medium">Modelo:</span> {vehicles[0].modelo}</div>
                    <div><span className="font-medium">Versión:</span> {vehicles[0].version}</div>
                    <div><span className="font-medium">Motor:</span> {vehicles[0].potencia || "-"} CV</div>
                    <div><span className="font-medium">Año:</span> {vehicles[0].anyo}</div>
                  </div>

                  <Link 
                    to={vehicles[0]?.id ? createVehicleUrl({
                      id: vehicles[0].id,
                      marca: vehicles[0].marca,
                      modelo: vehicles[0].modelo,
                      anyo: vehicles[0].anyo ? Number(vehicles[0].anyo) : undefined
                    }) : '#'} 
                    className="w-full"
                    onClick={() => {
                      if (vehicles[0]?.id) {
                        console.log(`🔗 Navegando a vehículo completo ID: ${vehicles[0].id}`);
                        // Scroll to top for visual feedback
                        setTimeout(() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }, 100);
                      }
                    }}
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs text-black hover:text-black">
                      Ver vehículo completo
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-montserrat font-semibold mb-3">
                ¿Necesita ayuda?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Si tiene dudas sobre esta pieza o necesita asesoramiento técnico, 
                contacta con nuestro equipo especializado.
              </p>
              <Link to="/contacto">
                <Button className="w-full">
                  Formulario de contacto
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de piezas relacionadas */}
      {relatedPartsData?.parts && relatedPartsData.parts.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-montserrat font-semibold text-primary">
              Otras piezas disponibles para {data?.vehicles?.[0] ? 
                `${data.vehicles[0].marca} ${data.vehicles[0].modelo}${data.vehicles[0].version ? ` ${data.vehicles[0].version}` : ''}${data.vehicles[0].anyo ? ` (${data.vehicles[0].anyo})` : ''}` : 
                'este vehículo'}
            </h2>
            {relatedPartsData.vehicleId && (
              <Link 
                to={`/vehiculos/${relatedPartsData.vehicleId}`}
                onClick={() => {
                  // Scroll to top for visual feedback
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 100);
                }}
              >
                <Button variant="outline">
                  Ver todas las piezas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedPartsData.parts.slice(0, 8).map((relatedPart: any) => (
              <PartCard 
                key={relatedPart.id} 
                part={relatedPart} 
                className="h-full"
                hideVehicleLinks={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default PartDetail;