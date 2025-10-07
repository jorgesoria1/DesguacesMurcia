import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { vehiclesApi, partsApi } from "@/lib/api";
import { useSessionSearchState } from "@/hooks/useSessionSearchState";
import { createPartsListUrl, type PartFilters } from "@shared/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const years = Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - i);

const audiLogo = '/assets/brands/real/audi-logo.svg';
const bmwLogo = '/assets/brands/real/bmw-logo.svg';
const mercedesLogo = '/assets/brands/real/mercedes-logo-new.svg';
const renaultLogo = '/assets/brands/real/renault-logo.svg';
const seatLogo = '/assets/brands/real/seat-logo.svg';
const toyotaLogo = '/assets/brands/real/toyota-logo.svg';
const volkswagenLogo = '/assets/brands/real/volkswagen-logo.svg';

import heroImage1 from '@assets/hero-1.png';
import heroImage2 from '@assets/hero-2.png';

// Array de imágenes para el carrusel del hero - 3 imágenes completas
const heroImages = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=700",
  heroImage1,
  heroImage2
];

const HeroSection: React.FC = () => {
  const [, setLocation] = useLocation();
  const { getInitialValues, updateSessionState } = useSessionSearchState();
  
  // Inicializar estados con valores de sesión si existen
  const initialValues = getInitialValues();
  const [brand, setBrand] = useState(initialValues.brand || "all-brands");
  const [model, setModel] = useState(initialValues.model || "all-models");
  const [familia, setFamilia] = useState(initialValues.family || "all-families");
  const [searchTerm, setSearchTerm] = useState(initialValues.searchTerm || "");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Query para obtener marcas y modelos desde la nueva API
  const { data: brandsModelsData, error: brandsError, isLoading: brandsLoading } = useQuery({
    queryKey: ["parts-brands-models"],
    queryFn: async () => {
      try {
        const result = await partsApi.getBrandsAndModels();
        return result;
      } catch (error) {
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 3
  });

  // Extraer marcas únicas
  const uniqueBrands = useMemo(() => {
    if (!brandsModelsData?.brands) return [];
    return brandsModelsData.brands.sort();
  }, [brandsModelsData]);

  // Obtener marcas y modelos desde las piezas para los filtros
  const { data: brandsModelsData2 } = useQuery({
    queryKey: ["parts-brands-models", brand, model],
    queryFn: () => fetch(`/api/parts/brands-models?marca=${brand || 'all-brands'}&modelo=${model || 'all-models'}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query para obtener las familias únicas
  const { data: familiesData } = useQuery({
    queryKey: ['/api/parts/families', brand, model],
    queryFn: async () => {
      try {
        // Construir parámetros para la consulta optimizada
        const params = new URLSearchParams();

        if (brand && brand !== "all-brands") {
          params.append("marca", brand);
        }

        if (model && model !== "all-models") {
          params.append("modelo", model);
        }


        // Usar la API optimizada de familias
        const url = `/api/optimized/parts/families?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const families = await response.json();

        // Si es un array de objetos con estructura {id, name, count}
        if (Array.isArray(families) && families.length > 0 && typeof families[0] === 'object' && families[0].name) {
          return families.map(f => f.name).sort();
        }

        // Si es un array de strings
        if (Array.isArray(families) && families.length > 0 && typeof families[0] === 'string') {
          return families.sort();
        }

        // Fallback a la API original si la optimizada falla
        const fallbackParams = new URLSearchParams();
        fallbackParams.append("limit", "2000");
        fallbackParams.append("activo", "true");

        if (brand && brand !== "all-brands") {
          fallbackParams.append("marca", brand);
        }

        if (model && model !== "all-models") {
          fallbackParams.append("modelo", model);
        }

        const fallbackResponse = await fetch(`/api/parts?${fallbackParams.toString()}`);
        const fallbackData = await fallbackResponse.json();

        // Filtrar valores únicos y ordenar
        return Array.from(new Set(fallbackData.data
          .map((part: any) => part.descripcionFamilia)
          .filter(Boolean)))
          .sort();
      } catch (error) {
        return [];
      }
    },
    // Aumentar stale time para evitar muchas peticiones
    staleTime: 30000
  });

  // Hook para cambiar automáticamente las imágenes del carrusel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % heroImages.length
      );
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  // Hook para sincronizar cambios de filtros con sesión
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSessionState({
        brand: brand !== "all-brands" ? brand : "",
        model: model !== "all-models" ? model : "",
        family: familia !== "all-families" ? familia : "",
        searchTerm: searchTerm.trim()
      });
    }, 300); // Debounce para no guardar en cada keystroke

    return () => clearTimeout(timer);
  }, [brand, model, familia, searchTerm, updateSessionState]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Guardar estado en sesión antes de navegar
    updateSessionState({
      brand: brand !== "all-brands" ? brand : "",
      model: model !== "all-models" ? model : "",
      family: familia !== "all-families" ? familia : "",
      searchTerm: searchTerm.trim()
    });

    // Construir filtros para crear URL amigable
    const filters: PartFilters = {};
    
    // IMPORTANTE: Añadir término de búsqueda PRIMERO
    if (searchTerm && searchTerm.trim() !== "") {
      filters.search = searchTerm.trim();
    }
    if (brand && brand !== "all-brands" && brand !== "") {
      filters.brand = brand;
    }
    if (model && model !== "all-models" && model !== "") {
      filters.model = model;
    }
    if (familia && familia !== "all-families" && familia !== "") {
      filters.family = familia;
    }

    // Crear URL amigable usando la función compartida
    const finalUrl = createPartsListUrl(filters);
    
    console.log('🔍 HERO: Navegando a piezas con filtros:', filters);
    console.log('🔗 HERO: URL final:', finalUrl);
    
    setLocation(finalUrl);
  };


  return (
    <section className="relative overflow-hidden">
      {/* Carrusel de imágenes de fondo */}
      <div className="relative min-h-[28rem] sm:min-h-[32rem] py-8 sm:py-12 md:py-20">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-center bg-cover transition-opacity duration-1000 ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ 
              backgroundImage: `url('${image}')`,
              backgroundPosition: "center center"
            }}
          />
        ))}
        

        {/* Indicadores de página */}
        <div className="absolute bottom-10 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-20 hidden sm:flex space-x-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentImageIndex 
                  ? "bg-white" 
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Gradiente */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/40 sm:from-primary/70 sm:to-primary/30 md:from-primary/60 md:to-primary/20"></div>

        {/* Contenido */}
        <div className="relative z-10 flex min-h-[28rem] sm:min-h-[32rem] items-center">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-xl lg:max-w-2xl">
              <h1 className="text-3xl md:text-3xl lg:text-4xl font-montserrat font-bold text-white mb-3 sm:mb-4 leading-tight text-center sm:text-left">
                Encuentra las piezas que necesitas
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-white mb-6 md:mb-8 leading-relaxed text-center sm:text-left">
                Miles de piezas originales de vehículos con garantía y al mejor precio
              </p>

              {/* Formulario de búsqueda */}
              <Card className="shadow-lg bg-white/75 backdrop-blur-sm">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
                    <div className="mb-3 sm:mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por descripción, referencia..."
                          className="pl-9 text-sm bg-white"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Marca de vehículo
                        </label>
                        <Select 
                          value={brand} 
                          onValueChange={(value) => {
                            if (value !== brand) {
                              setModel("");
                            }
                            setBrand(value);
                          }}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Todas las marcas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-brands">Todas las marcas</SelectItem>
                            {uniqueBrands.map(marca => (
                              <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Modelo de vehículo
                        </label>
                        <Select 
                          value={model} 
                          onValueChange={setModel}
                          disabled={!brand || brand === "all-brands"}
                        >
                          <SelectTrigger className="bg-white disabled:bg-white disabled:opacity-75">
                            <SelectValue placeholder="Todos los modelos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-models">Todos los modelos</SelectItem>
                            {brandsModelsData?.models && brandsModelsData.models[brand] ? (
                              brandsModelsData.models[brand].map(modelo => (
                                <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
                              ))
                            ) : (
                              <SelectItem disabled value="no-models">
                                No hay modelos disponibles
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-full sm:col-span-2 lg:col-span-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          Categoría de pieza
                        </label>
                        <Select 
                          value={familia} 
                          onValueChange={setFamilia}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Todas las categorías" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-families">Todas las categorías</SelectItem>
                            {familiesData && familiesData.length > 0 ? (
                              familiesData.map(familiaName => (
                                <SelectItem key={familiaName} value={familiaName}>
                                  {familiaName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                {brand || model ? "Cargando categorías..." : "Selecciona marca/modelo o busca directamente"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-secondary hover:bg-blue-900 hover:text-white text-white font-montserrat font-semibold py-2 sm:py-3 text-sm sm:text-base"
                    >
                      <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Buscar Piezas
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;