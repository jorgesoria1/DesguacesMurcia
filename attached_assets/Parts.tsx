import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import PaginationControls from "@/components/PaginationControls";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Search, 
  Grid, 
  List, 
  Table2, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight, 
  SlidersHorizontal,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import PartCard from "@/components/PartCard";
import { Part, partsApi, vehiclesApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const Parts: React.FC = () => {
  const [, setLocation] = useLocation();
  const search = useSearch();

  // Obtener parámetros de la URL
  const searchParams = new URLSearchParams(search);
  const initialVehicleId = searchParams.get("vehicleId") ? parseInt(searchParams.get("vehicleId")!) : undefined;
  const initialBrand = searchParams.get("marca") || "";
  const initialModel = searchParams.get("modelo") || "";
  const initialFamilia = searchParams.get("familia") || "";
  const initialSearch = searchParams.get("search") || "";
  const initialSort = searchParams.get("orden") || "newest"; // Obtener orden de la URL o usar "newest" por defecto

  // Estados para los filtros
  const [vehicleId, setVehicleId] = useState<number | undefined>(initialVehicleId);
  const [brand, setBrand] = useState(initialBrand);
  const [model, setModel] = useState(initialModel);
  const [familia, setFamilia] = useState(initialFamilia);
  // Asegurar que sort tenga un valor predeterminado correcto para ordenación
  const [sort, setSort] = useState(initialSort || "newest");
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Estado para el tipo de vista (grid, list, table)
  const [viewType, setViewType] = useState<'grid' | 'list' | 'table'>('grid');

  // Estado para controlar la visibilidad de los filtros en móvil
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Hook para detectar si estamos en versión móvil
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Comprobar al inicio
    checkMobile();

    // Configurar listener para cambios de tamaño
    window.addEventListener('resize', checkMobile);

    // Limpiar al desmontar
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Estados para la paginación infinita
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12); // Default to 12 items per page
  const offset = (page - 1) * limit;
  const [hasMore, setHasMore] = useState(true);
  const [items, setItems] = useState<Part[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Estado para controlar si estamos usando la búsqueda nativa o la API optimizada
  const isSearchActive = searchTerm && searchTerm.trim() !== '';
  
  // Estado para controlar si es primera carga (optimización)
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Consulta optimizada para obtener piezas con filtros
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [isSearchActive ? '/api/native-search' : '/api/optimized/parts', brand, model, familia, sort, offset, limit, searchTerm, page, vehicleId],
    staleTime: 180000, // Cache durante 3 minutos para mejorar rendimiento
    // Deshabilitar automáticamente la refetching para evitar llamadas innecesarias
    refetchOnWindowFocus: false,
    refetchOnMount: !isFirstLoad, // No hacer refetch en el primer montaje, solo en navegaciones posteriores
    queryFn: async () => {
      try {
        // Si hay búsqueda activa, usar la API de búsqueda nativa
        if (isSearchActive) {
          console.log(`Utilizando búsqueda nativa para: "${searchTerm}"`);
          
          // Construir parámetros para la búsqueda nativa
          const searchParams = new URLSearchParams();
          searchParams.append("q", searchTerm);
          searchParams.append("limit", limit.toString());
          searchParams.append("offset", offset.toString());
          searchParams.append("activo", "true");
          
          const url = `/api/native-search?${searchParams.toString()}`;
          console.log("URL de búsqueda nativa:", url);
          
          const response = await fetch(url, {
            credentials: 'include',
          });
          
          if (!response.ok) {
            throw new Error(`Error en búsqueda nativa: ${response.statusText}`);
          }
          
          const searchData = await response.json();
          console.log(`Búsqueda nativa de "${searchTerm}" encontró ${searchData.pagination?.total || 0} resultados`);
          
          return searchData;
        } else {
          // Usar la API optimizada para casos sin búsqueda
          // Construir parámetros para la consulta optimizada
          const params = new URLSearchParams();
          params.append("limit", limit.toString());
          params.append("offset", offset.toString());
          params.append("activo", "true");
          params.append("getTotalCount", "true");
          params.append("orden", sort);
          
          // Añadir filtros de vehículo si están presentes
          if (brand && brand !== "all-brands") {
            params.append("marca", brand);
          }
          
          if (model && model !== "all-models") {
            params.append("modelo", model);
          }
          
          // Añadir filtro de familia si está presente
          if (familia && familia !== "all-families") {
            params.append("familia", familia);
          }
          
          // Añadir vehicleId si está presente
          if (vehicleId) {
            params.append("vehicleId", vehicleId.toString());
          }

          try {
            // Utilizamos la ruta optimizada
            const url = `/api/optimized/parts?${params.toString()}`;
            console.log(`Consultando API optimizada: ${url}`);
            
            const response = await fetch(url, {
              credentials: 'include',
            });

            if (!response.ok) {
              throw new Error(`Error al cargar piezas: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Registro de logs solo en desarrollo
            if (process.env.NODE_ENV !== 'production') {
              console.log('Piezas recibidas del servidor:', data.data.length);
              console.log('Total de piezas según el servidor:', data.pagination?.total || 0);
            }
            
            // Usamos directamente los datos del servidor
            const paginatedData = data.data;
            let total = data.pagination?.total || 0;
            
            // Si estamos buscando, mostramos información adicional en consola
            if (searchTerm && searchTerm.trim() !== '') {
              console.log(`Resultados encontrados para búsqueda "${searchTerm}": ${total}`);
            }
            
            return {
              data: paginatedData,
              pagination: {
                total,
                hasMore: offset + limit < total
              }
            };
          } catch (error) {
            console.error("Error al usar la ruta optimizada:", error);
            
            // Fallback a la ruta tradicional
            console.log("Usando fallback a ruta tradicional de piezas");
            
            const apiParams: any = {
              limit,
              offset,
              activo: true,
              getTotalCount: true
            };
            
            if (brand && brand !== "all-brands") apiParams.marca = brand;
            if (model && model !== "all-models") apiParams.modelo = model;
            if (familia && familia !== "all-families") apiParams.familia = familia;
            if (searchTerm) apiParams.search = searchTerm;
            if (vehicleId) apiParams.vehicleId = vehicleId;
            
            const queryParams = new URLSearchParams();
            Object.keys(apiParams).forEach(key => {
              if (apiParams[key] !== undefined) {
                queryParams.append(key, apiParams[key]);
              }
            });
            
            const url = `/api/parts?${queryParams.toString()}`;
            const response = await fetch(url, {
              credentials: 'include',
            });
            
            if (!response.ok) {
              throw new Error(`Error en API tradicional: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            let filteredData = [...responseData.data];
            
            // Aplicar filtro de búsqueda si existe
            if (searchTerm.trim()) {
              const searchLower = searchTerm.trim().toLowerCase();
              filteredData = filteredData.filter(part => 
                part.descripcionArticulo?.toLowerCase().includes(searchLower) ||
                part.descripcionFamilia?.toLowerCase().includes(searchLower) ||
                part.refPrincipal?.toLowerCase().includes(searchLower) ||
                part.codArticulo?.toLowerCase().includes(searchLower)
              );
            }
            
            const total = filteredData.length;
            
            return {
              data: filteredData,
              pagination: {
                total,
                hasMore: offset + limit < total
              }
            };
          }
        }
      } catch (error) {
        console.error("Error general en búsqueda de piezas:", error);
        return {
          data: [],
          pagination: {
            total: 0,
            hasMore: false
          }
        };
      }
    }
  });

  // Efecto para actualizar los items cuando cambian los datos
  useEffect(() => {
    if (data) {
      // Procesamos los datos para asegurar que todos los campos necesarios estén presentes
      // Uso de memo para procesar los datos solo cuando son diferentes
      const processedItems = data.data.map(item => ({
        ...item,
        // Asegurar que el precio esté disponible
        precio: item.precio || item.precioVenta || 0,
        // Si no hay imágenes, proporcionar un array vacío
        imagenes: item.imagenes || [],
        // Asegurar que descripcionArticulo existe
        descripcionArticulo: item.descripcionArticulo || "Pieza de recambio",
        // Asegurar que otros campos críticos existen
        descripcionFamilia: item.descripcionFamilia || "",
        vehicleMarca: item.vehicleMarca || (item.vehicles && item.vehicles[0]?.marca) || "",
        vehicleModelo: item.vehicleModelo || (item.vehicles && item.vehicles[0]?.modelo) || ""
      }));
      
      console.log("Items procesados para mostrar:", processedItems.length);
      setItems(processedItems);
      setHasMore(data.pagination.hasMore);
      
      // Marcar que ya no es la primera carga
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
      
      // Scroll al inicio cuando cambia la página
      window.scrollTo(0, 0);
    }
  }, [data, page, isFirstLoad]);

  // Función para cargar más resultados manteniendo la posición del scroll
  const containerRef = useRef<HTMLDivElement>(null);

  // Usando memoización para evitar recrear la función en cada renderizado
  const handleLoadMore = React.useCallback(() => {
    if (hasMore && !isFetching) {
      const currentPosition = window.scrollY;

      setPage(prev => prev + 1);

      // Mantener la posición del scroll después de que se actualicen los datos
      requestAnimationFrame(() => {
        window.scrollTo(0, currentPosition);
      });
    }
  }, [hasMore, isFetching]);

  // Consulta para obtener todos los vehículos (usado para filtros)
  const { data: allVehiclesData } = useQuery({
    queryKey: ['/api/vehicles/all'],
    queryFn: async () => {
      const response = await vehiclesApi.getVehicles({ limit: 2000, activo: true });
      return response;
    },
    // Optimizaciones para reducir carga inicial
    staleTime: 300000, // 5 minutos de caché para vehículos
    refetchOnWindowFocus: false,
    refetchOnMount: !isFirstLoad // Solo refetch en navegaciones posteriores
  });

  // Consulta para obtener categorías de piezas (familias)
  const { data: familiesData, isLoading: isLoadingFamilies } = useQuery({
    queryKey: ['/api/parts/families', brand, model, familia],
    queryFn: async () => {
      console.log("Consultando familias con filtros:", {
        marca: brand !== "all-brands" ? brand : "all-brands",
        modelo: model !== "all-models" ? model : "all-models",
        familia: familia !== "all-families" ? familia : "all-families"
      });
      
      try {
        // Si hay marca seleccionada, usamos la API optimizada para obtener familias
        if (brand && brand !== "all-brands") {
          const params = new URLSearchParams();
          
          if (brand) params.append("marca", brand);
          if (model && model !== "all-models") params.append("modelo", model);
          
          // Reducir el límite para mejorar rendimiento pero manteniendo funcionalidad
          const url = `/api/parts?${params.toString()}&limit=500&activo=true`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error("Error al cargar familias");
          }
          
          const data = await response.json();
          
          // Extraer familias únicas de las piezas devueltas
          const familias = Array.from(new Set(data.data
            .map((p: any) => p.descripcionFamilia)
            .filter(Boolean)))
            .sort();
            
          // Si tenemos una categoria seleccionada que no está en los resultados,
          // debemos incluirla en el listado para que aparezca seleccionada
          if (familia && familia !== "all-families" && !familias.includes(familia)) {
            console.log(`Añadiendo familia seleccionada (${familia}) al listado disponible`);
            familias.push(familia);
            familias.sort();
          }
            
          return { familias };
        } else {
          // Cargar las categorías reales desde la base de datos
          const response = await fetch("/api/parts/families");
          const data = await response.json();
          
          // Extraer los nombres de las familias del resultado
          const familias = data.map((f: any) => f.name);
          
          // Asegurarse de que la familia seleccionada esté en la lista
          if (familia && familia !== "all-families" && !familias.includes(familia)) {
            console.log(`Añadiendo familia seleccionada (${familia}) al listado disponible`);
            familias.push(familia);
            familias.sort();
          }
          
          return { familias };
        }
      } catch (error) {
        console.error("Error al cargar familias:", error);
        
        // En caso de error, asegurarse de incluir al menos la familia seleccionada
        if (familia && familia !== "all-families") {
          return { familias: [familia] };
        }
        
        return { familias: [] };
      }
    },
    staleTime: 30000 // Cache por 30 segundos
  });

  // Extraer marcas únicas de los vehículos
  const uniqueBrands = React.useMemo(() => {
    if (!allVehiclesData?.data) return [];

    const brands = allVehiclesData.data.map(v => v.marca);
    return Array.from(new Set(brands)).sort();
  }, [allVehiclesData]);

  // Obtener modelos según la marca seleccionada (usando memoización)
  const availableModels = React.useMemo(() => {
    if (!allVehiclesData?.data) return [];
    if (!brand || brand === "all-brands") return [];

    const filteredModels = allVehiclesData.data
      .filter(v => v.marca === brand)
      .map(v => v.modelo);

    return Array.from(new Set(filteredModels)).sort();
  }, [allVehiclesData, brand]);

  // Obtener familias disponibles (usando memoización)
  const familias = React.useMemo(() => {
    return familiesData?.familias || [];
  }, [familiesData]);

  // Efecto para aplicar filtros automáticamente cuando cambian
  // Usando debounce para evitar múltiples actualizaciones de URL
  useEffect(() => {
    // Solo actualizar URL si algún filtro está realmente cambiado
    if (!isFirstLoad) {
      const searchParams = new URLSearchParams();
      if (searchTerm && searchTerm.trim()) searchParams.set("search", searchTerm.trim());
      if (vehicleId) searchParams.set("vehicleId", vehicleId.toString());
      if (brand && brand !== "all-brands") searchParams.set("marca", brand);
      if (model && model !== "all-models") searchParams.set("modelo", model);
      if (familia && familia !== "all-families") searchParams.set("familia", familia);
      if (sort) searchParams.set("orden", sort);
  
      // Evitar actualizar URL si no hay cambios reales
      const newUrl = `/parts?${searchParams.toString()}`;
      if (window.location.pathname + window.location.search !== newUrl) {
        setLocation(newUrl);
        setPage(1);
      }
    }
  }, [brand, model, familia, searchTerm, vehicleId, sort, isFirstLoad]);

  // Función para limpiar filtros
  const clearFilters = () => {
    setVehicleId(undefined);
    setBrand("");
    setModel("");
    setFamilia("");
    setLocation("/parts");
    setPage(1);
  };

  // Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-montserrat font-bold mb-2">Catálogo de Piezas</h1>
        <p className="text-muted-foreground">
          Explore nuestra amplia selección de piezas de recambio para todo tipo de vehículos
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            {/* Barra de búsqueda siempre visible */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descripción, referencia..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Botón para mostrar/ocultar filtros en móvil */}
            {isMobile && (
              <Button 
                variant="outline" 
                className="w-full mb-4 flex items-center justify-between"
                onClick={() => setFiltersVisible(!filtersVisible)}
              >
                <span className="flex items-center">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  {filtersVisible ? "Ocultar filtros" : "Mostrar filtros"}
                </span>
                {filtersVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}

            {/* Contenido de filtros - colapsable en móvil */}
            <Collapsible open={isMobile ? filtersVisible : true}>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Marca de vehículo</label>
                    <Select 
                      value={brand} 
                      onValueChange={(value) => {
                        // Resetear el modelo si cambia la marca
                        if (value !== brand) {
                          setModel("");
                        }

                        // Actualizar el estado de la marca
                        setBrand(value);

                        // Construir parámetros de búsqueda
                        const searchParams = new URLSearchParams(search);
                        if (value && value !== "all-brands") {
                          searchParams.set("marca", value);
                        } else {
                          searchParams.delete("marca");
                        }

                        // Eliminar el modelo si cambiamos de marca
                        searchParams.delete("modelo");

                        if (familia && familia !== "all-families") {
                          searchParams.set("familia", familia);
                        }

                        // Para depuración
                        console.log("Aplicando filtro de marca:", value);

                        // Actualizar URL
                        setLocation(`/parts?${searchParams.toString()}`);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
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
                    <label className="block text-sm font-medium mb-1">Modelo de vehículo</label>
                    <Select 
                      value={model} 
                      onValueChange={(value) => {
                        // Actualizar el estado del modelo
                        setModel(value);

                        // Construir parámetros de búsqueda preservando los existentes
                        const searchParams = new URLSearchParams(search);

                        // Manejar el valor del modelo
                        if (value && value !== "all-models") {
                          searchParams.set("modelo", value);
                        } else {
                          searchParams.delete("modelo");
                        }

                        // Para depuración
                        console.log("Aplicando filtro de modelo:", value);

                        // Actualizar URL
                        setLocation(`/parts?${searchParams.toString()}`);
                        setPage(1);
                      }}
                      disabled={!brand || brand === "all-brands"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los modelos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-models">Todos los modelos</SelectItem>
                        {availableModels.length > 0 ? (
                          availableModels.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))
                        ) : (
                          brand && brand !== "all-brands" && (
                            <div className="p-2 text-sm text-muted-foreground">
                              No hay modelos disponibles para esta marca
                            </div>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Categoría de pieza</label>
                      <Select 
                        value={familia || "all-families"} 
                        onValueChange={(value) => {
                          // Actualizar el estado de la familia
                          setFamilia(value);

                          // Construir parámetros de búsqueda preservando los existentes
                          const searchParams = new URLSearchParams(search);

                          // Manejar el valor de familia
                          if (value && value !== "all-families") {
                            searchParams.set("familia", value);
                          } else {
                            searchParams.delete("familia");
                          }

                          // Para depuración
                          console.log("Aplicando filtro de familia:", value);

                          // Actualizar URL
                          setLocation(`/parts?${searchParams.toString()}`);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="relative">
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-families">Todas las categorías</SelectItem>
                          {familias && familias.length > 0 ? (
                            familias.map((familiaItem) => (
                              <SelectItem key={familiaItem} value={familiaItem}>{familiaItem}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              No hay categorías disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="default" 
                      onClick={clearFilters}
                      className="h-10 bg-primary text-white hover:bg-primary/90"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Mostrar filtros activos */}
            {(vehicleId || brand || model || familia) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm font-medium">Filtros activos:</span>
                {vehicleId && (
                  <Badge variant="outline" className="bg-gray-100">
                    Vehículo: ID {vehicleId}
                  </Badge>
                )}
                {brand && brand !== "all-brands" && (
                  <Badge variant="outline" className="bg-gray-100">
                    Marca: {brand}
                  </Badge>
                )}
                {model && model !== "all-models" && (
                  <Badge variant="outline" className="bg-gray-100">
                    Modelo: {model}
                  </Badge>
                )}
                {familia && familia !== "all-families" && (
                  <Badge variant="outline" className="bg-gray-100">
                    Categoría: {familia}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-xl font-montserrat font-semibold flex items-center">
            Piezas disponibles
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {!isLoading && (
                brand || model || familia ? (
                  <>{data?.pagination?.total || 0} resultados filtrados</>
                ) : (
                  <>{data?.pagination?.total || 0} resultados totales</>
                )
              )}
            </span>
          </h2>

          {/* Controles de vista y ordenación */}
          <div className="flex items-center gap-4">
            <Select 
              value={sort} 
              onValueChange={(value) => {
                console.log("Cambiando ordenación a:", value);
                setSort(value);
                setPage(1);
                // Resetear a la primera página para que cargue correctamente
                setItems([]);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="price-asc">Precio ascendente</SelectItem>
                <SelectItem value="price-desc">Precio descendente</SelectItem>
                <SelectItem value="a-z">A-Z</SelectItem>
                <SelectItem value="z-a">Z-A</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                setPage(1);
                setLimit(parseInt(value));
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Por página" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="12">12 por página</SelectItem>
                  <SelectItem value="24">24 por página</SelectItem>
                  <SelectItem value="48">48 por página</SelectItem>
                  <SelectItem value="96">96 por página</SelectItem>
                </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1 hidden sm:inline">Vista:</span>
              <div className="bg-muted rounded-md flex p-1">
                <Button
                  variant={viewType === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setViewType('grid');
                    if (viewType === 'table') setLimit(16);
                  }}
                  title="Vista de cuadrícula"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewType === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setViewType('list');
                    if (viewType === 'table') setLimit(16);
                  }}
                  title="Vista de lista"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewType === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setViewType('table');
                    setLimit(20);
                  }}
                  title="Vista de tabla"
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal - Estados de carga y resultados */}
      <div>
        {/* Estado de carga */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                <div className="h-40 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sin resultados */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-12 bg-white border rounded-lg">
            <p className="text-xl font-semibold mb-4">No se encontraron piezas</p>
            <p className="text-muted-foreground mb-6">
              Intente con otros filtros o elimine algunos para obtener más resultados
            </p>
            <Button 
              onClick={clearFilters} 
              className="bg-primary text-white hover:bg-primary/90"
            >
              Limpiar todos los filtros
            </Button>
          </div>
        )}

        {/* Vista de cuadrícula */}
        {!isLoading && items.length > 0 && viewType === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {items.map((part) => (
              <PartCard key={part.id} part={part} />
            ))}
          </div>
        )}

        {/* Vista de lista */}
        {!isLoading && items.length > 0 && viewType === 'list' && (
          <div className="space-y-4 mb-10">
            {items.map((part) => (
              <Card key={part.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-56 h-56 relative p-4 bg-gray-100">
                      {part.imagenes && part.imagenes.length > 0 ? (
                        <img
                          src={part.imagenes[0]}
                          alt={part.descripcionArticulo || "Pieza"}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <span className="text-gray-400">Sin imagen</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1">
                      <div className="flex flex-col h-full justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {part.descripcionArticulo || "Pieza sin descripción"}
                          </h3>

                          <div className="text-sm mb-2">
                            <span className="text-muted-foreground">Familia:</span>{" "}
                            <Badge variant="outline">{part.descripcionFamilia || "Sin clasificar"}</Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
                            <div>
                              <span className="font-medium">Ref. Principal:</span>{" "}
                              {part.refPrincipal || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Código:</span>{" "}
                              {part.codArticulo || "N/A"}
                            </div>
                            {part.anyoStock && (
                              <div>
                                <span className="font-medium">Año de stock:</span>{" "}
                                {part.anyoStock}
                              </div>
                            )}
                            {part.ubicacion && (
                              <div>
                                <span className="font-medium">Ubicación:</span>{" "}
                                {part.ubicacion}
                              </div>
                            )}
                            {/* Mostrar información del vehículo compatible */}
                            {/* Comprobamos primero si hay vehículos compatibles en la respuesta de la API */}
                            {part.vehicles && part.vehicles.length > 0 ? (
                              <div className="col-span-1 sm:col-span-2 mt-1 border-t pt-1">
                                <span className="font-medium">Compatible con:</span>{" "}
                                <Link href={`/vehiculos/${part.vehicles[0].id}`} className="text-primary hover:underline">
                                  {`${part.vehicles[0].marca} ${part.vehicles[0].modelo}${part.vehicles[0].version ? ` ${part.vehicles[0].version}` : ''}`}
                                </Link>
                                <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                                  <div><span className="font-medium">Marca:</span> {part.vehicles[0].marca}</div>
                                  <div><span className="font-medium">Modelo:</span> {part.vehicles[0].modelo}</div>
                                  <div><span className="font-medium">Año:</span> {part.vehicles[0].anyo}</div>
                                  <div><span className="font-medium">Combustible:</span> {part.vehicles[0].combustible}</div>
                                </div>
                              </div>
                            ) : (
                              /* Si no hay vehículos en la respuesta, buscamos la información de marca/modelo en la propia pieza */
                              <div className="col-span-1 sm:col-span-2 mt-1 border-t pt-1">
                                <span className="font-medium">Compatible con:</span>{" "}
                                {part.marcaVehiculo && part.modeloVehiculo ? (
                                  <>
                                    {/* Si tiene idVehiculo, creamos un enlace al vehículo */}
                                    {part.idVehiculo ? (
                                      <Link href={`/vehiculos/${part.idVehiculo}`} className="text-primary hover:underline">
                                        {`${part.marcaVehiculo} ${part.modeloVehiculo}${part.versionVehiculo ? ` ${part.versionVehiculo}` : ''}`}
                                      </Link>
                                    ) : (
                                      <span className="text-gray-700">{`${part.marcaVehiculo} ${part.modeloVehiculo}${part.versionVehiculo ? ` ${part.versionVehiculo}` : ''}`}</span>
                                    )}

                                    <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                                      <div><span className="font-medium">Marca:</span> {part.marcaVehiculo}</div>
                                      <div><span className="font-medium">Modelo:</span> {part.modeloVehiculo}</div>
                                      {part.anyoVehiculo && <div><span className="font-medium">Año:</span> {part.anyoVehiculo}</div>}
                                      {part.combustibleVehiculo && <div><span className="font-medium">Combustible:</span> {part.combustibleVehiculo}</div>}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-gray-500 italic">Información no disponible</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                          <div className="text-xl font-bold text-primary mb-2 sm:mb-0">
                            {formatPrice(part.precio)}
                          </div>

                          <Link href={`/piezas/${part.id}`}>
                            <Button size="sm">
                              <Eye className="h-4 w-4 mr-2" /> Ver detalles
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Vista de tabla */}
        {!isLoading && items.length > 0 && viewType === 'table' && (
          <div className="overflow-auto mb-10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagen</TableHead>
                  <TableHead onClick={() => {
                    setSort(sort === 'a-z' ? 'z-a' : 'a-z');
                    setPage(1);
                  }} className="cursor-pointer">
                    <div className="flex items-center">
                      Descripción
                      {(sort === 'a-z' || sort === 'z-a') && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sort === 'z-z' ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Vehículo Compatible</TableHead>
                  <TableHead onClick={() => {
                    setSort(sort === 'price-asc' ? 'price-desc' : 'price-asc');
                    setPage(1);
                  }} className="cursor-pointer">
                    <div className="flex items-center">
                      Precio
                      {(sort === 'price-asc' || sort === 'price-desc') && (
                        <ArrowUpDown className={`ml-2 h-4 w-4 ${sort === 'price-desc' ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      <div className="w-16 h-16 relative bg-gray-100 rounded-md overflow-hidden">
                        {part.imagenes && part.imagenes.length > 0 ? (
                          <img
                            src={part.imagenes[0]}
                            alt={part.descripcionArticulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Wrench className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {part.descripcionArticulo || "Sin descripción"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.descripcionFamilia || "Sin clasificar"}</Badge>
                    </TableCell>
                    <TableCell>{part.refPrincipal || "-"}</TableCell>
                    <TableCell>{part.codArticulo || "-"}</TableCell>
                    <TableCell>
                      {part.vehicles && part.vehicles.length > 0 ? (
                        <div>
                          <Link href={`/vehiculos/${part.vehicles[0].id}`} className="text-primary hover:underline font-medium">
                            {`${part.vehicles[0].marca} ${part.vehicles[0].modelo}${part.vehicles[0].version ? ` ${part.vehicles[0].version}` : ''}`}
                          </Link>
                          <div className="text-xs text-gray-600 mt-1">
                            <div><span className="font-medium">Marca:</span> {part.vehicles[0].marca}</div>
                            <div><span className="font-medium">Modelo:</span> {part.vehicles[0].modelo}</div>
                            <div><span className="font-medium">Año:</span> {part.vehicles[0].anyo}</div>
                            <div><span className="font-medium">Combustible:</span> {part.vehicles[0].combustible}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {formatPrice(part.precio)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/piezas/${part.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 mr-2" /> Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginación */}
        {data?.pagination && (
          <div className="mt-8 py-4">
            <PaginationControls
              currentPage={page}
              totalItems={data.pagination.total || 0} 
              itemsPerPage={limit}
              onPageChange={setPage}
              className="max-w-4xl mx-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Parts;