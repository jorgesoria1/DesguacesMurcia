import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, useParams, Link } from "wouter";
import { setPartsTitle } from '@/utils/seo';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Search, 
  Grid, 
  List, 
  Table as TableIcon,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Car,
  Package,
  Fuel,
  Calendar,
  Eye,
  ImageIcon,
  Wrench
} from "lucide-react";
import PartCard from "@/components/PartCard";
import OptimizedImage from "@/components/OptimizedImage";
import { formatPrice } from "@/lib/utils";
import { createPartUrl, createPartsListUrl, parsePartsListUrl, PartFilters } from "@shared/utils";
import { getVehicleInfoFromPart, getVehicleLinkProps } from "@/lib/vehicleUtils";
import { scrollToTop } from "@/hooks/useScrollToTop";
import { useSessionSearchState } from "@/hooks/useSessionSearchState";
import AdvantagesSection from "@/components/AdvantagesSection";
import ContactBanner from "@/components/ContactBanner";

interface Part {
  id: number;
  refLocal: string;
  idEmpresa: number;
  codArticulo: string;
  refPrincipal: string;
  descripcionArticulo: string;
  descripcionFamilia?: string;
  codFamilia: string;
  precio: string | number;
  peso: number;
  vehicleId: number;
  imagenes?: string[];
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  vehicleMarca?: string;
  vehicleModelo?: string;
  vehicleAnyo?: number;
  vehicleCombustible?: string;
  vehicles?: Array<{
    id: number;
    marca: string;
    modelo: string;
    version?: string;
    anyo: number;
    combustible?: string;
  }>;
  marcaVehiculo?: string;
  modeloVehiculo?: string;
}

interface ApiResponse {
  data: Part[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const Parts: React.FC = () => {
  // SEO simple - solo título
  useEffect(() => {
    setPartsTitle();
  }, []);
  
  // Hook para navegación - exacto como Vehículos
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = useParams<{ brand?: string; model?: string; family?: string; year?: string; search?: string }>();
  
  // Hook de sesión para persistencia
  const { getInitialValues, updateSessionState } = useSessionSearchState();
  
  // Estados para filtros - inicializados con valores de sesión si existen
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuel, setFuel] = useState("");
  const [sort, setSort] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [family, setFamily] = useState(""); // Solo en Piezas
  
  // Bandera para controlar cuándo actualizar URL (evitar ciclos durante inicialización)
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Estados para vista y paginación - exacto como Vehículos
  const [viewType, setViewType] = useState<'grid' | 'list' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estados específicos de Piezas
  const [showAssociated, setShowAssociated] = useState(true);
  const [showProcessed, setShowProcessed] = useState(true);

  // Debounce solo para la API, no para la escritura
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Efecto para resetear página cuando cambian los filtros (sin actualizar URL)
  useEffect(() => {
    // Solo resetear página, no actualizar URL para mantener URLs limpias
    handlePageChange(1);
  }, [brand, model, year, fuel, family, sort, debouncedSearchTerm]);

  // Efecto para actualizar URL cuando cambien los filtros (solo después de inicialización)
  useEffect(() => {
    // Solo actualizar URL después de la inicialización
    if (isInitialized) {
      updateURL({
        brand: brand || undefined,
        model: model || undefined,
        family: family || undefined,
        year: year || undefined,
        fuel: fuel || undefined,
        search: debouncedSearchTerm || undefined,
        sort: sort !== 'newest' ? sort : undefined
      });
    }
  }, [brand, model, year, fuel, family, sort, debouncedSearchTerm, isInitialized]);

  // Inicializar filtros desde URL amigable al cargar el componente
  useEffect(() => {
    const initializeFromUrl = async () => {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      
      try {
        // Parsear la URL amigable para obtener filtros (ahora asíncrono)
        const urlFilters = await parsePartsListUrl(currentPath, currentSearch);
        
        // Obtener valores de sesión como fallback
        const sessionValues = getInitialValues(urlFilters);
        
        // Aplicar filtros combinando URL (prioridad) con sesión (fallback)
        // IMPORTANTE: Aplicar ANTES del redirect para que los valores estén disponibles
        console.log('🔍 PARTS INIT: URL Filters:', urlFilters);
        console.log('🔍 PARTS INIT: Session Values:', sessionValues);
        
        setBrand(urlFilters.brand ? urlFilters.brand.toUpperCase() : sessionValues.brand || "");
        setModel(urlFilters.model ? urlFilters.model.toUpperCase() : sessionValues.model || "");
        setFamily(urlFilters.family || sessionValues.family || "");
        setYear(urlFilters.year || sessionValues.year || "");
        setFuel(urlFilters.fuel || sessionValues.fuel || "");
        
        // IMPORTANTE: Priorizar término de búsqueda de URL
        const searchValue = urlFilters.search || sessionValues.searchTerm || "";
        setSearchTerm(searchValue);
        setDebouncedSearchTerm(searchValue); // Establecer también el debounced para búsqueda inmediata
        
        setSort(urlFilters.sort || "newest");
        
        console.log('✅ PARTS INIT: SearchTerm set to:', searchValue);
        
        // Si hay query parameters antiguos, convertir a URL amigable
        // DESPUÉS de aplicar los filtros para mantener la búsqueda
        if (currentSearch && currentPath === '/piezas') {
          const newUrl = createPartsListUrl(urlFilters);
          window.history.replaceState({}, '', newUrl);
        }
        
        // Marcar como inicializado para permitir actualizaciones automáticas de URL
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ PARTS: Error parsing URL filters:', error);
        // Fallback: inicializar solo con valores de sesión
        const sessionValues = getInitialValues();
        setBrand(sessionValues.brand || "");
        setModel(sessionValues.model || "");
        setFamily(sessionValues.family || "");
        setYear(sessionValues.year || "");
        setFuel(sessionValues.fuel || "");
        setSearchTerm(sessionValues.searchTerm || "");
        setIsInitialized(true);
      }
    };

    initializeFromUrl();
    
  }, []); // Solo ejecutar una vez al montar

  // Efecto para sincronizar cambios de filtros con sesión
  useEffect(() => {
    if (isInitialized) {
      const timer = setTimeout(() => {
        updateSessionState({
          brand: brand || "",
          model: model || "",
          family: family || "",
          year: year || "",
          fuel: fuel || "",
          searchTerm: searchTerm || ""
        });
      }, 300); // Debounce para no guardar en cada cambio

      return () => clearTimeout(timer);
    }
  }, [brand, model, family, year, fuel, searchTerm, isInitialized, updateSessionState]);

  // Efecto para detectar cambios en la URL y re-parsear filtros
  useEffect(() => {
    if (!isInitialized) return; // Solo después de la inicialización inicial

    const handleUrlChange = async () => {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      
      console.log('🔄 PARTS: URL changed, re-parsing:', { currentPath, currentSearch });
      
      try {
        // Re-parsear la URL para obtener nuevos filtros
        const urlFilters = await parsePartsListUrl(currentPath, currentSearch);
        
        console.log('🔗 PARTS: Re-parsed filters from URL:', urlFilters);
        
        // Aplicar filtros desde URL (sin usar sesión como fallback aquí)
        setBrand(urlFilters.brand ? urlFilters.brand.toUpperCase() : "");
        setModel(urlFilters.model ? urlFilters.model.toUpperCase() : "");
        setFamily(urlFilters.family || "");
        setYear(urlFilters.year || "");
        setFuel(urlFilters.fuel || "");
        setSearchTerm(urlFilters.search || "");
        setSort(urlFilters.sort || "newest");
        
      } catch (error) {
        console.error('❌ PARTS: Error re-parsing URL:', error);
      }
    };

    handleUrlChange();
    
  }, [location, isInitialized]); // Ejecutar cuando cambie la ubicación

  // Función para actualizar URL cuando cambien los filtros
  const updateURL = (newFilters: Partial<PartFilters>) => {
    // Combinar filtros actuales con nuevos
    const currentFilters: PartFilters = {
      brand: brand || undefined,
      model: model || undefined,
      family: family || undefined,
      year: year || undefined,
      fuel: fuel || undefined,
      search: searchTerm || undefined,
      sort: sort !== 'newest' ? sort : undefined
    };
    
    // Aplicar nuevos filtros
    const updatedFilters = { ...currentFilters, ...newFilters };
    
    // Limpiar valores vacíos y por defecto
    Object.keys(updatedFilters).forEach(key => {
      const value = updatedFilters[key as keyof PartFilters];
      if (!value || value === '' || value === 'all-brands' || value === 'all-models' || 
          value === 'all-families' || value === 'all-years' || value === 'all-fuels') {
        delete updatedFilters[key as keyof PartFilters];
      }
    });
    
    // Crear nueva URL
    const newUrl = createPartsListUrl(updatedFilters);
    
    console.log('📝 PARTS: Updating URL:', {
      currentFilters,
      newFilters,
      updatedFilters,
      newUrl
    });
    
    // Actualizar URL sin recargar página
    window.history.replaceState({}, '', newUrl);
  };

  // Función para cambiar página con scroll
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Usar función global de scroll
    scrollToTop(true);
  };

  // Hook para detectar móvil - incluye tablets (< 1024px)
  useEffect(() => {
    const checkMobile = () => {
      const mobileView = window.innerWidth < 1024; // Incluir tablets para menú móvil
      const deviceType = window.innerWidth < 768 ? 'móvil' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
      console.log('📱 Mobile detection (Parts):', { width: window.innerWidth, isMobile: mobileView, deviceType });
      setIsMobile(mobileView);
      // Forzar vista grid en móviles y tablets
      if (mobileView) {
        setViewType('grid');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounce solo para las llamadas API (500ms) pero searchTerm se actualiza inmediatamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Tiempo para evitar llamadas excesivas
    
    return () => clearTimeout(timer);
  }, [searchTerm]);


  // Consulta optimizada para obtener piezas (igual que vehículos)
  const { data, isLoading } = useQuery({
    queryKey: ['/api/optimized/parts', brand, model, year, fuel, family, sort, page, itemsPerPage, debouncedSearchTerm, showAssociated, showProcessed],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", itemsPerPage.toString());
      params.append("offset", ((page - 1) * itemsPerPage).toString());
      params.append("withPartCounts", "true");
      params.append("getTotalCount", "true");
      params.append("orden", sort);
      params.append("includeProcessed", "true");

      if (brand && brand !== "all-brands") params.append("marca", brand);
      if (model && model !== "all-models") params.append("modelo", model);
      if (year && year !== "all-years") params.append("anyo", year);
      if (fuel && fuel !== "all-fuels") params.append("combustible", fuel);
      if (family && family !== "") params.append("familia", family);
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);

      // Agregar parámetros de tipo de vehículo
      if (showAssociated && showProcessed) {
        // Mostrar ambos tipos - no agregamos parámetro especial
      } else if (showAssociated && !showProcessed) {
        params.append("vehicleType", "associated");
      } else if (!showAssociated && showProcessed) {
        params.append("vehicleType", "processed");
      } else {
        // No mostrar nada - esto no debería pasar normalmente
        params.append("vehicleType", "none");
      }

      const response = await fetch(`/api/search-parts?${params.toString()}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const allData = await response.json();
      return {
        data: allData.data || [],
        pagination: {
          total: allData.pagination?.total || 0,
          hasMore: ((page - 1) * itemsPerPage + itemsPerPage) < (allData.pagination?.total || 0)
        }
      };
    },
    staleTime: 300000, // 5 minutos - más tiempo de caché
    gcTime: 600000, // 10 minutos - mantener en memoria más tiempo
    refetchOnWindowFocus: false, // No refrescar al cambiar ventana
    retry: 1, // Solo reintentar una vez
  });

  // Consulta para obtener marcas y modelos
  const { data: brandsModelsData } = useQuery({
    queryKey: ['/api/parts/brands-models'],
    queryFn: async () => {
      const response = await fetch('/api/parts/brands-models');
      if (!response.ok) throw new Error('Error al cargar marcas y modelos');
      return await response.json();
    },
    staleTime: 600000, // 10 minutos - datos estáticos
    gcTime: 1800000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Consulta específica para años disponibles
  const { data: availableYearsData } = useQuery({
    queryKey: ['/api/parts-filter/years', brand, model],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brand && brand !== "all-brands") params.append("marca", brand);
      if (model && model !== "all-models") params.append("modelo", model);

      const response = await fetch(`/api/parts-filter/years?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar años');
      return await response.json();
    },
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Consulta específica para combustibles disponibles
  const { data: availableFuelsData } = useQuery({
    queryKey: ['/api/parts-filter/fuels', brand, model, year],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brand && brand !== "all-brands") params.append("marca", brand);
      if (model && model !== "all-models") params.append("modelo", model);
      if (year && year !== "all-years") params.append("anyo", year);

      const response = await fetch(`/api/parts-filter/fuels?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar combustibles');
      return await response.json();
    },
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Consulta específica para familias/categorías disponibles (filtrado secuencial)
  const { data: availableFamiliesData } = useQuery({
    queryKey: ['/api/parts-filter/families', brand, model, year, fuel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brand && brand !== "all-brands") params.append("marca", brand);
      if (model && model !== "all-models") params.append("modelo", model);
      if (year && year !== "all-years") params.append("anyo", year);
      if (fuel && fuel !== "all-fuels") params.append("combustible", fuel);

      const response = await fetch(`/api/parts-filter/families?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar categorías');
      return await response.json();
    },
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Obtener todas las marcas únicas
  const getAllBrands = () => {
    if (brandsModelsData?.brands) {
      return brandsModelsData.brands;
    }
    return [];
  };

  // Obtener modelos por marca
  const getModelsByBrand = () => {
    if (!brand) return [];
    if (brandsModelsData?.models && brandsModelsData.models[brand]) {
      return brandsModelsData.models[brand];
    }
    return [];
  };

  // Obtener años disponibles
  const getAvailableYears = () => {
    return availableYearsData || [];
  };

  // Obtener combustibles disponibles
  const getAvailableFuels = () => {
    return availableFuelsData || [];
  };

  // Obtener familias/categorías disponibles
  const getAvailableFamilies = () => {
    return availableFamiliesData || [];
  };

  const availableModels = getModelsByBrand();
  const parts = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm("");
    setBrand("");
    setModel("");
    setFamily("");
    setYear("");
    setFuel("");
    setPage(1);
    setShowAssociated(true);
    setShowProcessed(true);
    
    // No cambiar URL, solo resetear filtros internos
  };

  // Funciones para manejar cambios de filtros con filtrado secuencial
  const handleBrandChange = (newBrand: string) => {
    setBrand(newBrand);
    // Resetear filtros posteriores cuando cambia la marca
    setModel("");
    setYear("");
    setFuel("");
    setFamily(""); // Resetear categoría cuando cambia la marca
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    // Resetear filtros posteriores cuando cambia el modelo
    setYear("");
    setFuel("");
    setFamily(""); // Resetear categoría cuando cambia el modelo
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    // Resetear filtros posteriores cuando cambia el año
    setFuel("");
    setFamily(""); // Resetear categoría cuando cambia el año
  };

  const handleFuelChange = (newFuel: string) => {
    setFuel(newFuel);
    setFamily(""); // Resetear categoría cuando cambia el combustible
  };



  // Componente de filtros reutilizable
  const FiltersContent = () => (
    <>
      {/* Filtros en columna */}
      <div className="space-y-6">
        {/* Marca */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            <Car className="h-4 w-4 inline-block mr-2 text-blue-600" /> Marca
          </label>
          <Select value={brand === "" ? "__empty__" : brand} onValueChange={(value) => {
            const realValue = value === "__empty__" ? "" : value;
            handleBrandChange(realValue);
          }}>
            <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors">
              <SelectValue placeholder="Todas las marcas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Todas las marcas</SelectItem>
              {getAllBrands().map((marca: string) => (
                <SelectItem key={marca} value={marca}>
                  {marca}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            <Car className="h-4 w-4 inline-block mr-2 text-green-600" /> Modelo
          </label>
          <Select 
            value={model === "" ? "__empty__" : model} 
            onValueChange={(value) => {
              const realValue = value === "__empty__" ? "" : value;
              handleModelChange(realValue);
            }}
            disabled={!brand}
          >
            <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors">
              <SelectValue placeholder="Todos los modelos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Todos los modelos</SelectItem>
              {availableModels.map((modelo: string) => (
                <SelectItem key={modelo} value={modelo}>
                  {modelo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Año */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            <Calendar className="h-4 w-4 inline-block mr-2 text-purple-600" /> Año
          </label>
          <Select value={year === "" ? "__empty__" : year} onValueChange={(value) => {
            const realValue = value === "__empty__" ? "" : value;
            handleYearChange(realValue);
          }}>
            <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors">
              <SelectValue placeholder="Todos los años" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Todos los años</SelectItem>
              {getAvailableYears().map((y: number) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Combustible */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            <Fuel className="h-4 w-4 inline-block mr-2 text-orange-600" /> Combustible
          </label>
          <Select value={fuel === "" ? "__empty__" : fuel} onValueChange={(value) => {
            const realValue = value === "__empty__" ? "" : value;
            handleFuelChange(realValue);
          }}>
            <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Todos</SelectItem>
              {getAvailableFuels().map((combustible: string) => (
                <SelectItem key={combustible} value={combustible}>
                  {combustible}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría/Familia */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            <Package className="h-4 w-4 inline-block mr-2 text-red-600" /> Categoría
          </label>
          <Select value={family === "" ? "__empty__" : family} onValueChange={(value) => {
            const realValue = value === "__empty__" ? "" : value;
            setFamily(realValue);
          }}>
            <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">Todas las categorías</SelectItem>
              {getAvailableFamilies().map((categoria: string) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Opciones de visualización */}
      <div className="mt-6 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Opciones de visualización</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showAssociated" 
              checked={showAssociated} 
              onCheckedChange={(checked) => {
                setShowAssociated(Boolean(checked));
                setPage(1);
              }}
            />
            <label 
              htmlFor="showAssociated" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Vehículos Asociados
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showProcessed" 
              checked={showProcessed} 
              onCheckedChange={(checked) => {
                setShowProcessed(Boolean(checked));
                setPage(1);
              }}
            />
            <label 
              htmlFor="showProcessed" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Vehículos Procesados
            </label>
          </div>
        </div>
      </div>

      {/* Botón limpiar filtros */}
      <div className="mt-6 flex justify-center">
        <Button 
          onClick={clearFilters} 
          variant="outline" 
          className="px-6 py-2 border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all duration-200 rounded-lg"
        >
          <span className="flex items-center justify-center">
            ✕ Limpiar filtros
          </span>
        </Button>
      </div>

      {/* Estadísticas - Después del botón limpiar filtros */}
      <div className="mt-6 space-y-2">
        {totalCount > 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 w-full justify-center">
            {totalCount.toLocaleString()} piezas disponibles
          </Badge>
        )}
        
        {(brand || model || family || year || fuel || searchTerm) && (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 w-full justify-center">
            {[brand, model, family, year, fuel, searchTerm].filter(Boolean).length} filtros activos
          </Badge>
        )}
      </div>

      {/* Filtros activos */}
      {(brand || model || family || year || fuel) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700 block mb-2">Filtros activos:</span>
          <div className="flex flex-wrap gap-2">
            {brand && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Marca: {brand}</Badge>}
            {model && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Modelo: {model}</Badge>}
            {family && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Categoría: {family}</Badge>}
            {year && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Año: {year}</Badge>}
            {fuel && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Combustible: {fuel}</Badge>}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Botón flotante simple para móvil */}
      {isMobile && (
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="w-12 h-12 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-full shadow-lg flex items-center justify-center"
          style={{ 
            position: 'fixed', 
            bottom: 'max(24px, env(safe-area-inset-bottom))', 
            left: '24px', 
            zIndex: 2147483647,
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      )}

      {/* Sheet para filtros móviles */}
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filtros
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FiltersContent />
          </div>
        </SheetContent>
      </Sheet>

      <div className="max-w-[1400px] mx-auto px-6 py-8 relative">
      {/* Layout con barra lateral */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Barra lateral de filtros - oculta en móvil */}
        {!isMobile && (
          <div className="lg:w-64 flex-shrink-0">
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                </div>
                <FiltersContent />
                
                <AdvantagesSection />
                <ContactBanner />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Área principal de contenido */}
        <div className="flex-1">
          {/* Título dentro de la columna */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-montserrat font-semibold text-primary mt-6 mb-2">
              Catálogo de Piezas
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              Encuentra la pieza perfecta para tu vehículo en nuestro amplio catálogo
            </p>
            
            {/* Divisor decorativo */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-0.5 bg-gradient-to-r from-primary to-blue-800 rounded-full"></div>
              <div className="mx-4 text-primary text-lg">•</div>
              <div className="w-20 h-0.5 bg-gradient-to-l from-primary to-blue-800 rounded-full"></div>
            </div>
          </div>

          {/* Barra de búsqueda principal */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar código, familia, marca..."
                className="pl-10 pr-4 py-2 border-2 border-gray-200 focus:border-blue-500 focus:ring-0 rounded-lg transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Controles de vista y resultados */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-sm font-montserrat font-medium text-gray-600">
                {totalCount} piezas disponibles
              </h2>

              <div className="flex flex-nowrap items-center gap-2 sm:gap-4">
                {/* Elementos por página */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Mostrar:</span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 sm:w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ordenación */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Ordenar:</span>
                  <Select 
                    value={sort} 
                    onValueChange={(value) => {
                      setSort(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px] sm:w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Más recientes</SelectItem>
                      <SelectItem value="oldest">Más antiguos</SelectItem>
                      <SelectItem value="name_asc">Nombre A-Z</SelectItem>
                      <SelectItem value="name_desc">Nombre Z-A</SelectItem>
                      <SelectItem value="price_asc">Precio menor</SelectItem>
                      <SelectItem value="price_desc">Precio mayor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Controles de vista - ocultos en móviles */}
                {!isMobile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Vista:</span>
                    <div className="flex border rounded-lg">
                      <Button
                        variant={viewType === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewType('grid')}
                        className="rounded-r-none"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewType === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewType('list')}
                        className="rounded-none border-x-0"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewType === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewType('table')}
                        className="rounded-l-none"
                      >
                        <TableIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contenido principal */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Cargando piezas...</p>
                </div>
              </div>
            ) : parts.length === 0 ? (
              <Card className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron piezas
                </h3>
                <p className="text-muted-foreground mb-4">
                  Intenta ajustar los filtros o realizar una búsqueda diferente
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Limpiar filtros
                </Button>
              </Card>
            ) : (
              <>
                {/* Renderizar vista seleccionada */}
                {viewType === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parts.map((part, index) => (
                      <PartCard 
                        key={part.id} 
                        part={part} 
                        className="h-full"
                        gridIndex={index}
                      />
                    ))}
                  </div>
                ) : viewType === 'table' ? (
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Imagen</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Categoría</TableHead>
                              <TableHead>Referencia</TableHead>
                              <TableHead>Vehículo Compatible</TableHead>
                              <TableHead>Precio</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parts.map((part) => {
                              const vehicleInfo = getVehicleInfoFromPart(part);
                              const { vehicleText, shouldShowLink, linkTo, displayText } = getVehicleLinkProps(vehicleInfo, {
                                uppercase: true,
                                showId: true
                              });

                              return (
                                <TableRow key={part.id}>
                                  <TableCell>
                                    <div className="w-24 h-16 bg-gray-100 rounded flex items-center justify-center p-1">
                                      {part.imagenes && part.imagenes.length > 0 ? (
                                        <img 
                                          src={part.imagenes[0]} 
                                          alt={part.descripcionArticulo}
                                          className="w-full h-full object-cover rounded"
                                        />
                                      ) : (
                                        <ImageIcon className="h-8 w-8 text-gray-400" />
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <h3 className="font-medium text-sm">{part.descripcionArticulo}</h3>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                      {part.descripcionFamilia}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {part.refLocal || 'N/A'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-[150px]">
                                      {vehicleText ? (
                                        shouldShowLink && linkTo ? (
                                          <div className="space-y-1">
                                            <Link to={linkTo}>
                                              <span className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer text-xs block transition-colors">
                                                {displayText}
                                              </span>
                                            </Link>
                                          </div>
                                        ) : (
                                          <span className="font-medium text-xs">{displayText}</span>
                                        )
                                      ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {formatPrice(parseFloat(part.precio?.toString() || '0'))}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Link to={createPartUrl({
                                      id: part.id,
                                      descripcionArticulo: part.descripcionArticulo,
                                      vehicleMarca: part.vehicleMarca || '',
                                      vehicleModelo: part.vehicleModelo || ''
                                    })}>
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-1" />
                                        Ver
                                      </Button>
                                    </Link>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {parts.map((part) => {
                      const vehicleInfo = getVehicleInfoFromPart(part);
                      const { vehicleText, shouldShowLink, linkTo, displayText } = getVehicleLinkProps(vehicleInfo, {
                        includeYear: true
                      });

                      return (
                        <Card key={part.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <Link to={createPartUrl({
                                id: part.id,
                                descripcionArticulo: part.descripcionArticulo,
                                vehicleMarca: part.vehicleMarca || '',
                                vehicleModelo: part.vehicleModelo || ''
                              })}>
                                <div className="relative w-48 h-32 bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
                                  {part.imagenes && part.imagenes.length > 0 ? (
                                    <OptimizedImage
                                      src={part.imagenes[0]} 
                                      alt={part.descripcionArticulo}
                                      className="w-full h-full group-hover:scale-110 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-100">
                                      <ImageIcon className="h-16 w-16 text-gray-400" />
                                      <span className="sr-only">Imagen no disponible</span>
                                    </div>
                                  )}
                                </div>
                              </Link>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                  {part.descripcionArticulo}
                                </h3>
                                <p className="text-muted-foreground">
                                  {part.descripcionFamilia}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                  <Badge variant="secondary">
                                    {formatPrice(parseFloat(part.precio?.toString() || '0'))}
                                  </Badge>
                                  <Badge variant="outline">
                                    {part.refLocal || 'N/A'}
                                  </Badge>
                                </div>
                                {vehicleText && (
                                  <div className="mt-2">
                                    {shouldShowLink && linkTo ? (
                                      <Link to={linkTo}>
                                        <span className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer text-sm transition-colors">
                                          🚗 {displayText}
                                        </span>
                                      </Link>
                                    ) : (
                                      <span className="font-medium text-sm">🚗 {displayText}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Link to={createPartUrl({
                                  id: part.id,
                                  descripcionArticulo: part.descripcionArticulo,
                                  vehicleMarca: part.vehicleMarca || '',
                                  vehicleModelo: part.vehicleModelo || ''
                                })}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver detalles
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center pagination-container">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => page > 1 && handlePageChange(page - 1)}
                            className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-blue-900 hover:text-white"}
                            title="Página anterior"
                          />
                        </PaginationItem>
                        
                        {/* Páginas visibles */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNum)}
                                isActive={page === pageNum}
                                className="cursor-pointer hover:bg-blue-900 hover:text-white"
                                title={`Página ${pageNum}`}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => page < totalPages && handlePageChange(page + 1)}
                            className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-blue-900 hover:text-white"}
                            title="Página siguiente"
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Parts;