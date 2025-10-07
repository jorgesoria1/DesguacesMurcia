import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Search, Plus, MoreHorizontal, Trash, Edit, Eye, ArrowUpDown, Save, Filter, Car, Calendar, Fuel, Gauge, Hash, MapPin, ShoppingCart, Package, Image as ImageIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_ITEMS_PER_PAGE = 100;

interface Vehicle {
  id: number;
  idLocal: number;
  marca: string;
  modelo: string;
  version?: string;
  anyo: number;
  combustible?: string;
  descripcion?: string;
  matricula?: string;
  bastidor?: string;
  color?: string;
  kilometraje?: number;
  potencia?: number;
  activo: boolean;
  totalParts?: number;
  activeParts?: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  imagenes?: string[];
}

const VehicleForm = ({ 
  vehicle, 
  onSave, 
  onCancel,
  isNew = false 
}: { 
  vehicle: Partial<Vehicle>; 
  onSave: (data: Partial<Vehicle>) => void; 
  onCancel: () => void;
  isNew?: boolean;
}) => {
  const [formData, setFormData] = useState<Partial<Vehicle>>(vehicle);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'anyo' || name === 'kilometraje' || name === 'potencia' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleNextImage = () => {
    if (formData.imagenes && formData.imagenes.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === formData.imagenes!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (formData.imagenes && formData.imagenes.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? formData.imagenes!.length - 1 : prev - 1
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Galería de imágenes */}
      {formData.imagenes && formData.imagenes.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Imágenes del vehículo
          </h3>
          <div className="relative">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={formData.imagenes[currentImageIndex]}
                alt={`${formData.marca} ${formData.modelo}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>Imagen no disponible</p>
                </div>
              </div>
            </div>
            
            {/* Controles de navegación */}
            {formData.imagenes.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={handlePrevImage}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={handleNextImage}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {/* Indicador de imagen actual */}
            {formData.imagenes.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {currentImageIndex + 1} / {formData.imagenes.length}
              </div>
            )}
          </div>
          
          {/* Miniaturas */}
          {formData.imagenes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {formData.imagenes.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${formData.marca} ${formData.modelo} - ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="marca">Marca *</Label>
          <Input 
            id="marca" 
            name="marca" 
            value={formData.marca || ''} 
            onChange={handleChange} 
            required 
            placeholder="Ej: BMW, Mercedes, Audi..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo *</Label>
          <Input 
            id="modelo" 
            name="modelo" 
            value={formData.modelo || ''} 
            onChange={handleChange} 
            required 
            placeholder="Ej: Serie 3, Clase C, A4..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="version">Versión</Label>
          <Input 
            id="version" 
            name="version" 
            value={formData.version || ''} 
            onChange={handleChange} 
            placeholder="Ej: Sport, Comfort, GTI..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anyo">Año *</Label>
          <Input 
            id="anyo" 
            name="anyo" 
            type="number" 
            min="1980"
            max="2030"
            value={formData.anyo || ''} 
            onChange={handleChange} 
            required 
            placeholder="Ej: 2020"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="combustible">Combustible</Label>
          <Select
            value={formData.combustible || ''}
            onValueChange={(value) => handleSelectChange('combustible', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar combustible" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Gasolina">Gasolina</SelectItem>
              <SelectItem value="Diesel">Diesel</SelectItem>
              <SelectItem value="Híbrido">Híbrido</SelectItem>
              <SelectItem value="Eléctrico">Eléctrico</SelectItem>
              <SelectItem value="GLP">GLP</SelectItem>
              <SelectItem value="GNC">GNC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="matricula">Matrícula</Label>
          <Input 
            id="matricula" 
            name="matricula" 
            value={formData.matricula || ''} 
            onChange={handleChange} 
            placeholder="Ej: 1234ABC"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bastidor">Bastidor</Label>
          <Input 
            id="bastidor" 
            name="bastidor" 
            value={formData.bastidor || ''} 
            onChange={handleChange} 
            placeholder="Número de bastidor"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input 
            id="color" 
            name="color" 
            value={formData.color || ''} 
            onChange={handleChange} 
            placeholder="Ej: Azul, Rojo, Blanco..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kilometraje">Kilometraje</Label>
          <Input 
            id="kilometraje" 
            name="kilometraje" 
            type="number" 
            min="0"
            value={formData.kilometraje || ''} 
            onChange={handleChange} 
            placeholder="Km recorridos"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="potencia">Potencia (CV)</Label>
          <Input 
            id="potencia" 
            name="potencia" 
            type="number" 
            min="0"
            value={formData.potencia || ''} 
            onChange={handleChange} 
            placeholder="Caballos de potencia"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea 
          id="descripcion" 
          name="descripcion" 
          value={formData.descripcion || ''} 
          onChange={handleChange} 
          placeholder="Descripción detallada del vehículo..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          {isNew ? 'Crear vehículo' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
};

const AdminVehicles = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteAllVehiclesOpen, setConfirmDeleteAllVehiclesOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("fechaActualizacion");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [fuelFilter, setFuelFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");

  // Estados para edición y creación
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  
  // Estados para modal de detalles
  const [showVehicleDetailModal, setShowVehicleDetailModal] = useState(false);
  const [vehicleDetailData, setVehicleDetailData] = useState<Vehicle | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Verificar si estamos en la ruta de edición
  const [isEditRoute] = useRoute('/admin/vehicles/edit/:id');
  const [isNewRoute] = useRoute('/admin/vehicles/new');

  // Redireccionar si no es admin
  if (user && !user.isAdmin) {
    setLocation("/");
  }

  // Obtener vehículos
  const { data: vehiclesResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/optimized/vehicles', currentPage, searchTerm, brandFilter, fuelFilter, yearFilter, sortBy, sortDirection, itemsPerPage],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.append("limit", itemsPerPage.toString());
        params.append("offset", ((currentPage - 1) * itemsPerPage).toString());
        params.append("getTotalCount", "true"); // Asegurar que se obtenga el conteo total

        if (searchTerm) {
          params.append("search", searchTerm);
        }
        if (brandFilter) {
          params.append("marca", brandFilter);
        }
        if (fuelFilter) {
          params.append("combustible", fuelFilter);
        }
        if (yearFilter) {
          params.append("anyo", yearFilter);
        }
        if (sortBy) {
          params.append("orden", `${sortBy}_${sortDirection}`);
        }

        const response = await fetch(`/api/optimized/vehicles?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Error al cargar vehículos');
        }
        return await response.json();
      } catch (error) {
        console.error('Error en la consulta de vehículos:', error);
        throw error;
      }
    },
    enabled: !editing && !creating,
    staleTime: 120000,
    refetchOnWindowFocus: false
  });

  const vehicles = vehiclesResponse?.data || [];
  const totalItems = vehiclesResponse?.pagination?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Debug logging
  console.log('🚗 AdminVehicles Data:', {
    vehiclesCount: vehicles.length,
    totalItems,
    itemsPerPage,
    totalPages,
    currentPage,
    pagination: vehiclesResponse?.pagination,
    fullResponse: vehiclesResponse
  });

  // Additional debug for pagination issues
  if (vehiclesResponse?.pagination) {
    console.log('📊 Pagination details:', {
      total: vehiclesResponse.pagination.total,
      limit: vehiclesResponse.pagination.limit,
      offset: vehiclesResponse.pagination.offset,
      page: vehiclesResponse.pagination.page,
      totalPages: vehiclesResponse.pagination.totalPages,
      hasMore: vehiclesResponse.pagination.hasMore
    });
    
    // Detectar problemas de conteo
    if (vehiclesResponse.pagination.total < 1000) {
      console.warn('⚠️ Conteo sospechosamente bajo en AdminVehicles:', vehiclesResponse.pagination.total);
    }
  }

  // Mutaciones
  const createVehicleMutation = useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Error al crear vehículo');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vehículo creado",
        description: "El vehículo ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/optimized/vehicles'] });
      setCreating(false);
      setCurrentVehicle(null);
      setLocation("/admin/vehicles");
    },
    onError: (error) => {
      toast({
        title: "Error al crear vehículo",
        description: "No se pudo crear el vehículo. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({id, data}: {id: number, data: Partial<Vehicle>}) => {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Error al actualizar vehículo');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vehículo actualizado",
        description: "El vehículo ha sido actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/optimized/vehicles'] });
      setEditing(false);
      setCurrentVehicle(null);
      setLocation("/admin/vehicles");
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar vehículo",
        description: "No se pudo actualizar el vehículo. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al eliminar vehículo');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vehículo eliminado",
        description: "El vehículo ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/optimized/vehicles'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar vehículo",
        description: "No se pudo eliminar el vehículo. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const deleteAllVehiclesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/vehicles/delete-all', {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al eliminar todos los vehículos');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Todos los vehículos eliminados",
        description: "Se han eliminado todos los vehículos correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/optimized/vehicles'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar todos los vehículos",
        description: "No se pudieron eliminar todos los vehículos. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const toggleVehicleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/vehicles/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cambiar estado del vehículo');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Estado cambiado",
        description: data.message || "El estado del vehículo ha sido cambiado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/optimized/vehicles'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error al cambiar estado",
        description: "No se pudo cambiar el estado del vehículo. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Manejadores
  const handleSaveVehicle = (data: Partial<Vehicle>) => {
    if (creating) {
      createVehicleMutation.mutate(data);
    } else if (currentVehicle && currentVehicle.id) {
      updateVehicleMutation.mutate({ id: currentVehicle.id, data });
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setCreating(false);
    setCurrentVehicle(null);
    setLocation("/admin/vehicles");
  };

  const handleNewVehicle = () => {
    setCreating(true);
    setCurrentVehicle(null);
    setLocation("/admin/vehicles/new");
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditing(true);
    setCurrentVehicle(vehicle);
    setLocation(`/admin/vehicles/edit/${vehicle.id}`);
  };

  const handleDeleteClick = (id: number) => {
    setDeletingVehicleId(id);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingVehicleId) {
      deleteVehicleMutation.mutate(deletingVehicleId);
    }
    setConfirmDeleteOpen(false);
    setDeletingVehicleId(null);
  };

  const handleDeleteAllVehiclesClick = () => {
    setConfirmDeleteAllVehiclesOpen(true);
  };

  const handleConfirmDeleteAllVehicles = () => {
    deleteAllVehiclesMutation.mutate();
    setConfirmDeleteAllVehiclesOpen(false);
  };

  const handleToggleVehicleStatus = (id: number) => {
    toggleVehicleStatusMutation.mutate(id);
  };

  const handleViewVehicleDetail = (vehicle: Vehicle) => {
    setVehicleDetailData(vehicle);
    setCurrentImageIndex(0);
    setShowVehicleDetailModal(true);
  };

  const handleNextImage = () => {
    if (vehicleDetailData?.imagenes && vehicleDetailData.imagenes.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === vehicleDetailData.imagenes!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (vehicleDetailData?.imagenes && vehicleDetailData.imagenes.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? vehicleDetailData.imagenes!.length - 1 : prev - 1
      );
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    refetch();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Manejador para cambio de items por página
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Resetear a la primera página
  };

  // Obtener marcas únicas para el filtro
  const uniqueBrands = Array.from(new Set(vehicles.map(v => v.marca))).sort();
  const uniqueFuels = Array.from(new Set(vehicles.map(v => v.combustible).filter(Boolean))).sort();

  // Calcular el rango de elementos mostrados
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar activeTab="admin_vehicles" />

      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">
              {creating ? "Nuevo Vehículo" : editing ? "Editar Vehículo" : `Gestión de Vehículos`}
              {!creating && !editing && (
                <span className="text-lg font-normal text-primary ml-2">
                  ({totalItems > 0 ? totalItems.toLocaleString() : '0'} total)
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">
              {creating 
                ? "Complete los datos del nuevo vehículo" 
                : editing 
                ? "Modifique los datos del vehículo y guarde los cambios" 
                : `Gestione todos los vehículos del sistema${totalItems > 0 ? ` - ${totalItems.toLocaleString()} vehículos disponibles` : ''}`
              }
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => (editing || creating) ? handleCancelEdit() : setLocation("/admin")}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {(editing || creating) ? "Volver a vehículos" : "Volver al panel"}
          </Button>
        </div>

        {/* Formulario de edición/creación */}
        {(editing || creating) && (
          <Card>
            <CardHeader>
              <CardTitle>
                {creating ? "Datos del nuevo vehículo" : "Editar datos del vehículo"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleForm 
                vehicle={currentVehicle || {} as Partial<Vehicle>} 
                onSave={handleSaveVehicle} 
                onCancel={handleCancelEdit}
                isNew={creating}
              />
            </CardContent>
          </Card>
        )}

        {/* Lista de vehículos */}
        {!editing && !creating && (
          <>
            <Card className="mb-8">
              <CardContent className="p-6">
                {/* Controles de búsqueda y filtros */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <form onSubmit={handleSearch} className="flex w-full md:w-1/2 gap-2">
                      <Input
                        placeholder="Buscar por marca, modelo, matrícula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit">
                        <Search className="h-4 w-4 mr-2" />
                        Buscar
                      </Button>
                    </form>

                    <div className="flex gap-2">
                      <Button onClick={handleNewVehicle}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo vehículo
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteAllVehiclesClick}>
                        <Trash className="h-4 w-4 mr-2" />
                        Eliminar todos
                      </Button>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="flex flex-wrap gap-4">
                    <div className="w-[200px]">
                      <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filtrar por marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas las marcas</SelectItem>
                          {uniqueBrands.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[200px]">
                      <Select value={fuelFilter} onValueChange={setFuelFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filtrar por combustible" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todos los combustibles</SelectItem>
                          {uniqueFuels.map((fuel) => (
                            <SelectItem key={fuel} value={fuel}>
                              {fuel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[150px]">
                      <Input
                        type="number"
                        placeholder="Año"
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                      />
                    </div>

                    <div className="w-[180px]">
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Items por página" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25 por página</SelectItem>
                          <SelectItem value="50">50 por página</SelectItem>
                          <SelectItem value="100">100 por página</SelectItem>
                          <SelectItem value="200">200 por página</SelectItem>
                          <SelectItem value="500">500 por página</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                {totalItems > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">
                        Mostrando {startItem}-{endItem} de {totalItems.toLocaleString()} vehículos totales
                      </span>
                      <span className="ml-4 text-blue-600">
                        Página {currentPage} de {totalPages}
                      </span>
                      <span className="ml-4 text-blue-600">
                        {itemsPerPage} vehículos por página
                      </span>
                    </div>
                  </div>
                )}
                

                {/* Tabla */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Cargando vehículos...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead onClick={() => handleSort("marca")} className="cursor-pointer">
                            <div className="flex items-center">
                              Marca
                              {sortBy === "marca" && (
                                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("modelo")} className="cursor-pointer">
                            <div className="flex items-center">
                              Modelo
                              {sortBy === "modelo" && (
                                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("anyo")} className="cursor-pointer">
                            <div className="flex items-center">
                              Año
                              {sortBy === "anyo" && (
                                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Combustible</TableHead>
                          <TableHead>Matrícula</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Piezas</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center h-32">
                              {isLoading ? 'Cargando vehículos...' : 'No se encontraron vehículos'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          vehicles.map((vehicle) => (
                            <TableRow key={vehicle.id}>
                              <TableCell className="font-medium">{vehicle.idLocal || vehicle.id}</TableCell>
                              <TableCell>{vehicle.marca}</TableCell>
                              <TableCell>{vehicle.modelo}</TableCell>
                              <TableCell>{vehicle.anyo}</TableCell>
                              <TableCell>
                                {vehicle.combustible && (
                                  <Badge variant="outline">{vehicle.combustible}</Badge>
                                )}
                              </TableCell>
                              <TableCell>{vehicle.matricula || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={vehicle.activo ? "default" : "secondary"}>
                                  {vehicle.activo ? "Activo" : "Inactivo"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 font-medium">
                                    {vehicle.activeParts || 0}
                                  </span>
                                  <span>/</span>
                                  <span>{vehicle.totalParts || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleViewVehicleDetail(vehicle)}>
                                      <Eye className="h-4 w-4 mr-2" /> Ver detalle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditVehicle(vehicle)}>
                                      <Edit className="h-4 w-4 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleToggleVehicleStatus(vehicle.id)}>
                                      {vehicle.activo ? (
                                        <>
                                          <PowerOff className="h-4 w-4 mr-2" /> Desactivar
                                        </>
                                      ) : (
                                        <>
                                          <Power className="h-4 w-4 mr-2" /> Activar
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => handleDeleteClick(vehicle.id)}
                                    >
                                      <Trash className="h-4 w-4 mr-2" /> Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Paginación */}
            {!isLoading && totalItems > 0 && totalPages > 1 && (
              <div className="mt-8">
                <div className="flex justify-center mb-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground bg-gray-50 px-4 py-2 rounded-lg">
                    <span className="font-medium text-gray-800">Total: {totalItems.toLocaleString()} vehículos</span>
                    <span>•</span>
                    <span>Página {currentPage} de {totalPages}</span>
                    <span>•</span>
                    <span>{itemsPerPage} por página</span>
                  </div>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                      />
                    </PaginationItem>

                    {/* Primera página */}
                    {currentPage > 3 && (
                      <>
                        <PaginationItem>
                          <PaginationLink 
                            onClick={() => setCurrentPage(1)}
                            className="cursor-pointer"
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                        {currentPage > 4 && <span className="px-2">...</span>}
                      </>
                    )}

                    {/* Páginas alrededor de la actual */}
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }

                      if (page < 1 || page > totalPages) return null;
                      if (currentPage > 3 && page === 1) return null;
                      if (currentPage < totalPages - 2 && page === totalPages) return null;

                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {/* Última página */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                        <PaginationItem>
                          <PaginationLink 
                            onClick={() => setCurrentPage(totalPages)}
                            className="cursor-pointer"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                {/* Navegación rápida */}
                <div className="flex justify-center mt-4 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primera
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Última
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal de detalles del vehículo */}
        <Dialog open={showVehicleDetailModal} onOpenChange={setShowVehicleDetailModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Detalles del vehículo
              </DialogTitle>
              <DialogDescription>
                Información completa del vehículo incluyendo especificaciones, imágenes y piezas disponibles
              </DialogDescription>
            </DialogHeader>
            
            {vehicleDetailData && (
              <div className="space-y-6">
                {/* Galería de imágenes */}
                {vehicleDetailData.imagenes && vehicleDetailData.imagenes.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Imágenes del vehículo
                    </h3>
                    <div className="relative">
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={vehicleDetailData.imagenes[currentImageIndex]}
                          alt={`${vehicleDetailData.marca} ${vehicleDetailData.modelo}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                            <p>Imagen no disponible</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Controles de navegación */}
                      {vehicleDetailData.imagenes.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                            onClick={handlePrevImage}
                          >
                            <ChevronLeftIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                            onClick={handleNextImage}
                          >
                            <ChevronRightIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* Indicador de imagen actual */}
                      {vehicleDetailData.imagenes.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                          {currentImageIndex + 1} / {vehicleDetailData.imagenes.length}
                        </div>
                      )}
                    </div>
                    
                    {/* Miniaturas */}
                    {vehicleDetailData.imagenes.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {vehicleDetailData.imagenes.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                              index === currentImageIndex
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`${vehicleDetailData.marca} ${vehicleDetailData.modelo} - ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Información principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">ID:</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{vehicleDetailData.id}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Marca:</span>
                    </div>
                    <p className="text-sm">{vehicleDetailData.marca}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Modelo:</span>
                    </div>
                    <p className="text-sm">{vehicleDetailData.modelo}</p>
                  </div>
                  
                  {vehicleDetailData.version && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Versión:</span>
                      </div>
                      <p className="text-sm">{vehicleDetailData.version}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Año:</span>
                    </div>
                    <p className="text-sm">{vehicleDetailData.anyo}</p>
                  </div>
                  
                  {vehicleDetailData.combustible && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Combustible:</span>
                      </div>
                      <Badge variant="outline">{vehicleDetailData.combustible}</Badge>
                    </div>
                  )}
                  
                  {vehicleDetailData.matricula && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Matrícula:</span>
                      </div>
                      <p className="text-sm">{vehicleDetailData.matricula}</p>
                    </div>
                  )}
                  
                  {vehicleDetailData.bastidor && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Bastidor:</span>
                      </div>
                      <p className="text-sm font-mono">{vehicleDetailData.bastidor}</p>
                    </div>
                  )}
                  
                  {vehicleDetailData.potencia && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Potencia:</span>
                      </div>
                      <p className="text-sm">{vehicleDetailData.potencia} CV</p>
                    </div>
                  )}
                  
                  {vehicleDetailData.kilometraje && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Kilometraje:</span>
                      </div>
                      <p className="text-sm">{vehicleDetailData.kilometraje?.toLocaleString()} km</p>
                    </div>
                  )}
                  
                  {vehicleDetailData.color && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Color:</span>
                      </div>
                      <p className="text-sm">{vehicleDetailData.color}</p>
                    </div>
                  )}
                </div>
                
                {/* Estadísticas de piezas */}
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Estadísticas de piezas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {vehicleDetailData.activeParts || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Piezas activas</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {vehicleDetailData.totalParts || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Total piezas</p>
                    </div>
                  </div>
                </div>
                
                {/* Descripción */}
                {vehicleDetailData.descripcion && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Descripción:</h3>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {vehicleDetailData.descripcion}
                    </p>
                  </div>
                )}
                
                {/* Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Creado:</span> {new Date(vehicleDetailData.fechaCreacion).toLocaleDateString('es-ES')}
                  </div>
                  <div>
                    <span className="font-medium">Actualizado:</span> {new Date(vehicleDetailData.fechaActualizacion).toLocaleDateString('es-ES')}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVehicleDetailModal(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogos de confirmación */}
        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar este vehículo? Esta acción no se puede deshacer y eliminará también todas las piezas asociadas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación para eliminar todos los vehículos */}
        <Dialog open={confirmDeleteAllVehiclesOpen} onOpenChange={setConfirmDeleteAllVehiclesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación masiva</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar TODOS los vehículos? Esta acción eliminará permanentemente todos los vehículos del sistema y todas las piezas asociadas. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteAllVehiclesOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteAllVehicles}>
                Eliminar todos los vehículos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminVehicles;