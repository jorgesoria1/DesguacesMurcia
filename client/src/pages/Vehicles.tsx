import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, useParams, Link } from "wouter";
import { setVehiclesTitle } from '@/utils/seo';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  TableRow
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
  Grid3X3,
  List,
  Table2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Eye,
  Calendar,
  Fuel,
  Car,
  ImageIcon
} from "lucide-react";
import VehicleCard from "@/components/VehicleCard";
import OptimizedImage from "@/components/OptimizedImage";
import { Vehicle, vehiclesApi } from "@/lib/api";
import { cn, getFuelType } from "@/lib/utils";
import { createVehicleUrl, createVehiclesListUrl, parseVehiclesListUrl, VehicleFilters } from "@shared/utils";
import { scrollToTop } from "@/hooks/useScrollToTop";
import { useSessionSearchState } from "@/hooks/useSessionSearchState";
import AdvantagesSection from "@/components/AdvantagesSection";
import ContactBanner from "@/components/ContactBanner";

const Vehicles: React.FC = () => {
  // SEO simple - solo título
  useEffect(() => {
    setVehiclesTitle();
  }, []);
  
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = useParams<{ brand?: string; model?: string; year?: string; search?: string }>();

  // Hook de sesión para persistencia
  const { getInitialValues, updateSessionState } = useSessionSearchState();

  // Estados para los filtros - inicializados con valores de sesión si existen
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuel, setFuel] = useState("");
  const [power, setPower] = useState("");
  const [sort, setSort] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Bandera para controlar cuándo actualizar URL (evitar ciclos durante inicialización)
  const [isInitialized, setIsInitialized] = useState(false);

  // Estados para la vista y paginación
  const [viewType, setViewType] = useState<'grid' | 'list' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Función para cambiar página con scroll al inicio
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
      console.log('📱 Mobile detection (Vehicles):', { width: window.innerWidth, isMobile: mobileView, deviceType });
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

  // Debounce solo para la API, no para la escritura
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  
  // Debounce solo para las llamadas API (500ms) pero searchTerm se actualiza inmediatamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Tiempo para evitar llamadas excesivas
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Efecto para resetear página cuando cambian los filtros (sin actualizar URL)
  useEffect(() => {
    // Solo resetear página, no actualizar URL para mantener URLs limpias
    handlePageChange(1);
  }, [brand, model, year, fuel, power, sort, debouncedSearchTerm]);

  // Efecto para actualizar URL cuando cambien los filtros (solo después de inicialización)
  useEffect(() => {
    // Solo actualizar URL después de la inicialización
    if (isInitialized) {
      updateURL({
        brand: brand || undefined,
        model: model || undefined,
        year: year || undefined,
        fuel: fuel || undefined,
        power: power || undefined,
        search: debouncedSearchTerm || undefined,
        sort: sort !== 'newest' ? sort : undefined
      });
    }
  }, [brand, model, year, fuel, power, sort, debouncedSearchTerm, isInitialized]);

  // Inicializar filtros desde URL amigable al cargar el componente
  useEffect(() => {
    const initializeFromUrl = async () => {
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      
      try {
        // Parsear la URL amigable para obtener filtros (ahora asíncrono)
        const urlFilters = await parseVehiclesListUrl(currentPath, currentSearch);
        
        // Obtener valores de sesión como fallback
        const sessionValues = getInitialValues(urlFilters);
        
        console.log('🔗 VEHICLES: Initialization result:', {
          currentPath,
          currentSearch,
          urlFilters,
          sessionValues
        });
        
        // Si hay query parameters antiguos, convertir a URL amigable
        if (currentSearch && currentPath === '/vehiculos') {
          const newUrl = createVehiclesListUrl(urlFilters);
          console.log('🔀 VEHICLES: Redirecting from query params to friendly URL:', newUrl);
          window.history.replaceState({}, '', newUrl);
        }
        
        // Aplicar filtros combinando URL (prioridad) con sesión (fallback)
        setBrand(urlFilters.brand ? urlFilters.brand.toUpperCase() : sessionValues.brand || "");
        setModel(urlFilters.model ? urlFilters.model.toUpperCase() : sessionValues.model || "");
        setYear(urlFilters.year || sessionValues.year || "");
        setFuel(urlFilters.fuel || sessionValues.fuel || "");
        setPower(urlFilters.power || sessionValues.power || "");
        setSearchTerm(urlFilters.search || sessionValues.searchTerm || "");
        setSort(urlFilters.sort || "newest");
        
        // Marcar como inicializado para permitir actualizaciones automáticas de URL
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ VEHICLES: Error parsing URL filters:', error);
        // Fallback: inicializar solo con valores de sesión
        const sessionValues = getInitialValues();
        setBrand(sessionValues.brand || "");
        setModel(sessionValues.model || "");
        setYear(sessionValues.year || "");
        setFuel(sessionValues.fuel || "");
        setPower(sessionValues.power || "");
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
          year: year || "",
          fuel: fuel || "",
          power: power || "",
          searchTerm: searchTerm || ""
        });
      }, 300); // Debounce para no guardar en cada cambio

      return () => clearTimeout(timer);
    }
  }, [brand, model, year, fuel, power, searchTerm, isInitialized, updateSessionState]);

  // Función para actualizar URL cuando cambien los filtros
  const updateURL = (newFilters: Partial<VehicleFilters>) => {
    // Combinar filtros actuales con nuevos
    const currentFilters: VehicleFilters = {
      brand: brand || undefined,
      model: model || undefined,
      year: year || undefined,
      fuel: fuel || undefined,
      power: power || undefined,
      search: searchTerm || undefined,
      sort: sort !== 'newest' ? sort : undefined
    };
    
    // Aplicar nuevos filtros
    const updatedFilters = { ...currentFilters, ...newFilters };
    
    // Limpiar valores vacíos y por defecto
    Object.keys(updatedFilters).forEach(key => {
      const value = updatedFilters[key as keyof VehicleFilters];
      if (!value || value === '' || value === 'all-brands' || value === 'all-models' || 
          value === 'all-years' || value === 'all-fuels' || value === 'all-powers') {
        delete updatedFilters[key as keyof VehicleFilters];
      }
    });
    
    // Crear nueva URL
    const newUrl = createVehiclesListUrl(updatedFilters);
    
    console.log('📝 VEHICLES: Updating URL:', {
      currentFilters,
      newFilters,
      updatedFilters,
      newUrl
    });
    
    // Actualizar URL sin recargar página
    window.history.replaceState({}, '', newUrl);
  };

  // Consulta optimizada para obtener vehículos
  const { data, isLoading } = useQuery({
    queryKey: ['/api/optimized/vehicles', brand, model, year, fuel, power, sort, page, itemsPerPage, debouncedSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", itemsPerPage.toString());
      params.append("offset", ((page - 1) * itemsPerPage).toString());
      params.append("withPartCounts", "true");
      params.append("getTotalCount", "true");
      params.append("orden", sort);

      if (brand && brand !== "all-brands") params.append("marca", brand);
      if (model && model !== "all-models") params.append("modelo", model);
      if (year && year !== "all-years") params.append("anyo", year);
      if (fuel && fuel !== "all-fuels") params.append("combustible", fuel);
      if (power && power !== "all-powers") params.append("potencia", power);
      if (debouncedSearchTerm) params.append("search", debouncedSearchTerm);


      const response = await fetch(`/api/optimized/vehicles?${params.toString()}`);
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

  // Consulta para obtener marcas y modelos de vehículos
  const { data: brandsModelsData } = useQuery({
    queryKey: ['/api/vehicles-filter/brands-models'],
    queryFn: async () => {
      const response = await fetch('/api/vehicles-filter/brands-models');
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
    queryKey: ['/api/vehicles-filter/years', brand, model],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brand && brand !== "all-brands") params.append("marca", brand);
      if (model && model !== "all-models") params.append("modelo", model);

      const response = await fetch(`/api/vehicles-filter/years?${params.toString()}`);
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
    queryKey: ['/api/vehicles-filter/fuels', brand, model, year],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brand && brand !== "all-brands") params.append("marca", brand);
      if (model && model !== "all-models") params.append("modelo", model);
      if (year && year !== "all-years") params.append("anyo", year);

      const response = await fetch(`/api/vehicles-filter/fuels?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar combustibles');
      return await response.json();
    },
    staleTime: 600000, // 10 minutos
    gcTime: 1800000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Consulta para obtener todos los vehículos para filtros (solo para marcas/modelos) 
  const { data: allVehiclesData } = useQuery({
    queryKey: ['/api/vehicles/all'],
    queryFn: () => vehiclesApi.getVehicles({ limit: 50000 }),
    staleTime: 600000, // 10 minutos - datos de filtros
    gcTime: 1800000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Obtener todas las marcas únicas
  const getAllBrands = () => {
    if (brandsModelsData?.brands) {
      return brandsModelsData.brands;
    }
    if (!allVehiclesData?.data) return [];
    const brands = allVehiclesData.data
      .map((v: Vehicle) => v.marca)
      .filter((marca: string) => marca && marca.trim() !== '');
    return Array.from(new Set(brands)).sort();
  };

  // Obtener modelos por marca
  const getModelsByBrand = () => {
    if (!brand) return [];
    if (brandsModelsData?.models && brandsModelsData.models[brand]) {
      return brandsModelsData.models[brand];
    }
    if (!allVehiclesData?.data) return [];
    const filteredModels = allVehiclesData.data
      .filter((v: Vehicle) => v.marca === brand)
      .map((v: Vehicle) => v.modelo);
    return Array.from(new Set(filteredModels)).sort();
  };

  // Obtener años disponibles
  const getAvailableYears = () => {
    return availableYearsData || [];
  };

  // Obtener combustibles disponibles
  const getAvailableFuels = () => {
    return availableFuelsData || [];
  };

  const availableModels = getModelsByBrand();
  const vehicles = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Generar información SEO dinámicamente
  const generateSEOData = () => {
    const filters = [];
    if (brand) filters.push(brand);
    if (model) filters.push(model);
    if (year) filters.push(year);
    if (fuel) filters.push(fuel);
    
    const filterText = filters.length > 0 ? ` ${filters.join(' ')}` : '';
    const title = `Vehículos para Desguace${filterText} | Desguace Murcia`;
    const description = `Catálogo de ${totalCount.toLocaleString()} vehículos para desguace${filterText}. Encuentra piezas de tu coche. ✅ Stock actualizado ✅ Garantía 3 meses ✅ Envío península.`;
    const keywords = `vehículos desguace${filterText}, coches para piezas, desguace automóviles, ${brand || ''} ${model || ''} ${fuel || ''}`.toLowerCase();

    return {
      title,
      description,
      keywords
    };
  };

  const seoData = generateSEOData();

  // Funciones para manejar cambios de filtros con filtrado secuencial
  const handleBrandChange = (newBrand: string) => {
    console.log("🔄 Brand change:", { from: brand, to: newBrand });
    setBrand(newBrand);
    // Resetear filtros posteriores cuando cambia la marca
    setModel("");
    setYear("");
    setFuel("");
    
    // Actualizar URL
    updateURL({ 
      brand: newBrand === 'all-brands' ? undefined : newBrand,
      model: undefined,
      year: undefined,
      fuel: undefined
    });
  };

  const handleModelChange = (newModel: string) => {
    console.log("🔄 Model change:", { from: model, to: newModel });
    setModel(newModel);
    // Resetear filtros posteriores cuando cambia el modelo
    setYear("");
    setFuel("");
    
    // Actualizar URL
    updateURL({ 
      model: newModel === 'all-models' ? undefined : newModel,
      year: undefined,
      fuel: undefined
    });
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    // Resetear filtros posteriores cuando cambia el año
    setFuel("");
    
    // Actualizar URL
    updateURL({ 
      year: newYear === 'all-years' ? undefined : newYear,
      fuel: undefined
    });
  };

  const handleFuelChange = (newFuel: string) => {
    setFuel(newFuel);
    
    // Actualizar URL
    updateURL({ 
      fuel: newFuel === 'all-fuels' ? undefined : newFuel
    });
  };

  const handlePowerChange = (newPower: string) => {
    setPower(newPower);
    
    // Actualizar URL
    updateURL({ 
      power: newPower === 'all-powers' ? undefined : newPower
    });
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setBrand("");
    setModel("");
    setYear("");
    setFuel("");
    setPower("");
    setSearchTerm("");
    
    // Actualizar URL para limpiar todos los filtros
    updateURL({ 
      brand: undefined,
      model: undefined,
      year: undefined,
      fuel: undefined,
      power: undefined,
      search: undefined
    });
    
    handlePageChange(1);
  };

  // Componente FiltersContentMobile para compartir entre desktop y mobile
  const FiltersContentMobile = () => (
    <div className="space-y-6">
      {/* Marca */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">
          <Car className="h-4 w-4 inline-block mr-2 text-blue-600" /> Marca
        </label>
        <Select value={brand === "" ? "__empty__" : brand} onValueChange={(value) => {
          const realValue = value === "__empty__" ? "" : value;
          console.log("📱 Mobile brand change:", realValue);
          handleBrandChange(realValue);
        }}>
          <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors">
            <SelectValue placeholder="Todas las marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__empty__">Todas las marcas</SelectItem>
            {getAllBrands().map((marca: string) => (
              <SelectItem key={marca} value={marca}>{marca}</SelectItem>
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
            console.log("📱 Mobile model change:", realValue);
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
              <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
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

      {/* Potencia */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">
          <Car className="h-4 w-4 inline-block mr-2 text-red-600" /> Potencia (CV)
        </label>
        <Input
          type="number"
          placeholder="ej: 150"
          value={power}
          onChange={(e) => handlePowerChange(e.target.value)}
          className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors"
        />
      </div>

      {/* Botón limpiar filtros */}
      <div className="mt-6 flex justify-center">
        <Button 
          variant="outline" 
          onClick={clearFilters}
          className="w-full bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700"
        >
          Limpiar filtros
        </Button>
      </div>
    </div>
  );

  // Renderizar vista de grid (3 por fila)
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.map((vehicle: Vehicle, index: number) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} gridIndex={index} />
      ))}
    </div>
  );

  // Renderizar vista de lista
  const renderListView = () => (
    <div className="space-y-4">
      {vehicles.map((vehicle: Vehicle) => (
        <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Imagen del vehículo */}
              <Link to={createVehicleUrl({
                id: vehicle.id,
                marca: vehicle.marca,
                modelo: vehicle.modelo,
                anyo: vehicle.anyo
              })}>
                <div className="relative w-72 h-48 bg-gray-100 rounded-lg overflow-hidden group cursor-pointer flex-shrink-0">
                  {vehicle.imagenes && vehicle.imagenes.length > 0 ? (
                    <OptimizedImage
                      src={vehicle.imagenes[0]} 
                      alt={`${vehicle.marca} ${vehicle.modelo}`}
                      className="w-full h-full group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <ImageIcon className="h-24 w-24 text-gray-400" />
                      <span className="sr-only">Imagen no disponible</span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Información principal */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-xl mb-1">
                    {vehicle.marca} {vehicle.modelo}
                  </h3>
                </div>

                {/* Detalles técnicos en grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Año:</span>
                    <p className="font-semibold">{vehicle.anyo || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Combustible:</span>
                    <p className="font-semibold">{vehicle.combustible || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Potencia:</span>
                    <p className="font-semibold">{vehicle.potencia ? `${vehicle.potencia} CV` : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Versión:</span>
                    <p className="font-semibold">{vehicle.version || 'N/A'}</p>
                  </div>
                </div>

                {/* Información adicional */}
                {(vehicle.matricula || vehicle.bastidor || vehicle.color) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {vehicle.matricula && (
                      <div>
                        <span className="font-medium text-muted-foreground">Matrícula:</span>
                        <p className="font-semibold">{vehicle.matricula}</p>
                      </div>
                    )}
                    {vehicle.bastidor && (
                      <div>
                        <span className="font-medium text-muted-foreground">Bastidor:</span>
                        <p className="font-semibold text-xs">{vehicle.bastidor}</p>
                      </div>
                    )}
                    {vehicle.color && (
                      <div>
                        <span className="font-medium text-muted-foreground">Color:</span>
                        <p className="font-semibold">{vehicle.color}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Badges y estadísticas */}
                <div className="flex flex-wrap gap-2 items-center">
                  {vehicle.combustible && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Fuel className="h-3 w-3 mr-1" />
                      {vehicle.combustible === "Diesel" ? "Diésel" : 
                       vehicle.combustible === "Hibrido" ? "Híbrido" : 
                       vehicle.combustible === "Electrico" ? "Eléctrico" : vehicle.combustible}
                    </Badge>
                  )}

                  {vehicle.anyo && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Calendar className="h-3 w-3 mr-1" />
                      {vehicle.anyo}
                    </Badge>
                  )}

                  {(vehicle.activeParts || vehicle.active_parts_count) && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {vehicle.activeParts || vehicle.active_parts_count} piezas disponibles
                    </Badge>
                  )}

                  {vehicle.fechaActualizacion && (
                    <Badge variant="outline" className="text-xs">
                      Actualizado: {new Date(vehicle.fechaActualizacion).toLocaleDateString('es-ES')}
                    </Badge>
                  )}
                </div>

              </div>

              {/* Botón de acción */}
              <div className="text-right flex-shrink-0">
                <Link to={createVehicleUrl({
                  id: vehicle.id,
                  marca: vehicle.marca,
                  modelo: vehicle.modelo,
                  anyo: vehicle.anyo
                })}>
                  <Button variant="default" className="bg-secondary hover:bg-blue-900 hover:text-white">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver piezas
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Renderizar vista de tabla
  const renderTableView = () => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Combustible</TableHead>
              <TableHead>Motor</TableHead>
              <TableHead>Piezas</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle: Vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center p-2">
                    {vehicle.imagenes && vehicle.imagenes.length > 0 ? (
                      <img 
                        src={vehicle.imagenes[0]} 
                        alt={`${vehicle.marca} ${vehicle.modelo}`}
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Badge variant="outline">{vehicle.descripcion || "N/A"}</Badge>
                </TableCell>
                <TableCell className="font-medium">{vehicle.marca}</TableCell>
                <TableCell>{vehicle.modelo}</TableCell>
                <TableCell>{vehicle.anyo}</TableCell>
                <TableCell>{vehicle.combustible}</TableCell>
                <TableCell>
                  {vehicle.potencia ? (
                    <Badge variant="outline">{vehicle.potencia} CV</Badge>
                  ) : (
                    <Badge variant="outline">{vehicle.version || 'N/A'}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {(vehicle.activeParts || vehicle.active_parts_count) && (
                    <Badge variant="secondary">{vehicle.activeParts || vehicle.active_parts_count}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link to={createVehicleUrl({
                  id: vehicle.id,
                  marca: vehicle.marca,
                  modelo: vehicle.modelo,
                  anyo: vehicle.anyo
                })}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 relative">
        {/* Botón flotante simple para móvil */}
        {isMobile && (
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-[#1e3a8a] hover:bg-[#1e40af] text-white rounded-full shadow-lg flex items-center justify-center"
            style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 999999 }}
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
              <FiltersContentMobile />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Barra lateral de filtros - oculta en móvil */}
          {!isMobile && (
            <div className="lg:w-64 flex-shrink-0">
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                {/* Encabezado de filtros */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                </div>





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
                        <SelectItem key={marca} value={marca}>{marca}</SelectItem>
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
                        <SelectItem key={modelo} value={modelo}>{modelo}</SelectItem>
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
                          {getFuelType(combustible || '')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Potencia */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    <Car className="h-4 w-4 inline-block mr-2 text-red-600" /> Potencia (CV)
                  </label>
                  <Input
                    type="number"
                    placeholder="ej: 150"
                    value={power}
                    onChange={(e) => handlePowerChange(e.target.value)}
                    className="h-11 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg transition-colors"
                  />
                </div>
              </div>

              {/* Botón limpiar filtros mejorado */}
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
                    {totalCount.toLocaleString()} resultados
                  </Badge>
                )}
                
                {(brand || model || year || fuel || searchTerm) && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 w-full justify-center">
                    {[brand, model, year, fuel, searchTerm].filter(Boolean).length} filtros activos
                  </Badge>
                )}
              </div>

              {/* Filtros activos */}
              {(brand || model || year || fuel) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700 block mb-2">Filtros activos:</span>
                  <div className="flex flex-wrap gap-2">
                    {brand && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Marca: {brand}</Badge>}
                    {model && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Modelo: {model}</Badge>}
                    {year && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Año: {year}</Badge>}
                    {fuel && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Combustible: {fuel}</Badge>}
                  </div>
                </div>
              )}
              
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
                Catálogo de Vehículos
              </h1>
              <p className="text-sm text-gray-600 mb-4">
                Explora nuestro inventario completo de vehículos disponibles para recambios
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
                  placeholder="Buscar por ID, referencia, marca, modelo, año..."
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
            {totalCount} vehículos disponibles
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
                  <SelectItem value="9">9</SelectItem>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="96">96</SelectItem>
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
                  <SelectItem value="brand_asc">Marca A-Z</SelectItem>
                  <SelectItem value="brand_desc">Marca Z-A</SelectItem>
                  <SelectItem value="model_asc">Modelo A-Z</SelectItem>
                  <SelectItem value="model_desc">Modelo Z-A</SelectItem>
                  <SelectItem value="year_asc">Año ascendente</SelectItem>
                  <SelectItem value="year_desc">Año descendente</SelectItem>
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
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewType === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType('list')}
                    className="rounded-none border-x"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewType === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType('table')}
                    className="rounded-l-none"
                  >
                    <Table2 className="h-4 w-4" />
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
                  <p className="text-muted-foreground">Cargando vehículos...</p>
                </div>
              </div>
            ) : vehicles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No se encontraron vehículos con los filtros aplicados.</p>
                <Button onClick={clearFilters} variant="outline">
                  Limpiar filtros
                </Button>
              </Card>
            ) : (
              <>
                {/* Renderizar vista seleccionada */}
                {viewType === 'grid' && renderGridView()}
                {viewType === 'list' && renderListView()}
                {viewType === 'table' && renderTableView()}

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center pagination-container">
                    <Pagination>
                      <PaginationContent>
                        {/* Página anterior */}
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => page > 1 && handlePageChange(page - 1)}
                            className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-blue-900 hover:text-white"}
                            title="Página anterior"
                          />
                        </PaginationItem>

                        {/* Sistema de paginación avanzado */}
                        {(() => {
                          const showMaxPages = 7;
                          let pages = [];
                          let showFirstDots = false;
                          let showLastDots = false;
                          
                          if (totalPages <= showMaxPages) {
                            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                          } else {
                            if (page <= 4) {
                              pages = [1, 2, 3, 4, 5];
                              showLastDots = true;
                            } else if (page >= totalPages - 3) {
                              pages = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
                              showFirstDots = true;
                            } else {
                              pages = [page - 1, page, page + 1];
                              showFirstDots = true;
                              showLastDots = true;
                            }
                          }

                          return (
                            <>
                              {/* Primera página con puntos */}
                              {showFirstDots && (
                                <>
                                  <PaginationItem>
                                    <PaginationLink
                                      onClick={() => handlePageChange(1)}
                                      className="cursor-pointer hover:bg-blue-900 hover:text-white"
                                    >
                                      1
                                    </PaginationLink>
                                  </PaginationItem>
                                  <span className="px-2 flex items-center text-gray-500">...</span>
                                </>
                              )}
                              
                              {/* Páginas numeradas */}
                              {pages.map(pageNum => (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => handlePageChange(pageNum)}
                                    isActive={page === pageNum}
                                    className="cursor-pointer hover:bg-blue-900 hover:text-white"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              ))}
                              
                              {/* Última página con puntos */}
                              {showLastDots && (
                                <>
                                  <span className="px-2 flex items-center text-gray-500">...</span>
                                  <PaginationItem>
                                    <PaginationLink
                                      onClick={() => handlePageChange(totalPages)}
                                      className="cursor-pointer hover:bg-blue-900 hover:text-white"
                                    >
                                      {totalPages}
                                    </PaginationLink>
                                  </PaginationItem>
                                </>
                              )}
                            </>
                          );
                        })()}

                        {/* Página siguiente */}
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
  );
};

export default Vehicles;