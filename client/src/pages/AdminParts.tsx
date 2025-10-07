
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Search, Plus, MoreHorizontal, Trash, Edit, Eye, ArrowUpDown, Save, Filter, Package, Image as ImageIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Power, PowerOff } from "lucide-react";
import { formatPrice } from "@/lib/utils";
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

const ITEMS_PER_PAGE = 15;

// Función helper para determinar el tipo de vehículo
const getVehicleClassification = (part: Part) => {
  if (part.idVehiculo < 0) {
    return {
      type: 'processed',
      label: 'Vehículo Procesado',
      variant: 'secondary' as const,
      description: 'Pieza de vehículo procesado (sin vehículo físico asociado)'
    };
  } else {
    return {
      type: 'associated',
      label: 'Vehículo Asociado',
      variant: 'default' as const,
      description: 'Pieza con vehículo físico asociado'
    };
  }
};

interface Part {
  id: number;
  refLocal: number;
  idEmpresa?: number;
  codArticulo?: string;
  refPrincipal?: string;
  descripcionArticulo: string;
  descripcionFamilia: string;
  codFamilia: string;
  precio: number;
  peso?: number;
  idVehiculo: number;
  vehicleMarca?: string;
  vehicleModelo?: string;
  vehicleAnyo?: number;
  anyoStock?: number;
  observaciones?: string;
  ubicacion?: string;
  imagenes?: string[];
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  version?: string;
  anyo: number;
  descripcion?: string;
}

const PartForm = ({ 
  part, 
  onSave, 
  onCancel,
  isNew = false 
}: { 
  part: Partial<Part>; 
  onSave: (data: Partial<Part>) => void; 
  onCancel: () => void;
  isNew?: boolean;
}) => {
  const [formData, setFormData] = useState<Partial<Part>>(part);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Obtener vehículos para el selector
  const { data: vehiclesData } = useQuery({
    queryKey: ['/api/optimized/vehicles', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/optimized/vehicles?limit=1000');
      return response.json();
    },
  });

  const vehicles = vehiclesData?.data || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'refLocal' || name === 'anyoStock' || name === 'peso' || name === 'precio' || name === 'idVehiculo'
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: name === 'idVehiculo' ? parseInt(value) : value
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
            Imágenes de la pieza
          </h3>
          <div className="relative">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={formData.imagenes[currentImageIndex]}
                alt={`${formData.descripcionArticulo}`}
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
                    alt={`${formData.descripcionArticulo} - ${index + 1}`}
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
          <Label htmlFor="refLocal">Referencia local *</Label>
          <Input 
            id="refLocal" 
            name="refLocal" 
            type="number"
            value={formData.refLocal || ''} 
            onChange={handleChange} 
            required 
            placeholder="Número de referencia"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="idVehiculo">Vehículo *</Label>
          <Select 
            value={formData.idVehiculo?.toString() || ''} 
            onValueChange={(value) => handleSelectChange('idVehiculo', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar vehículo" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle: Vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                  {vehicle.marca} {vehicle.modelo} ({vehicle.anyo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="codFamilia">Código de familia *</Label>
          <Input 
            id="codFamilia" 
            name="codFamilia" 
            value={formData.codFamilia || ''} 
            onChange={handleChange} 
            required 
            placeholder="Ej: 001, 002, 003..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcionFamilia">Descripción de familia *</Label>
          <Input 
            id="descripcionFamilia" 
            name="descripcionFamilia" 
            value={formData.descripcionFamilia || ''} 
            onChange={handleChange} 
            required 
            placeholder="Ej: MOTOR, CARROCERÍA, ELECTRICIDAD..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="codArticulo">Código de artículo</Label>
          <Input 
            id="codArticulo" 
            name="codArticulo" 
            value={formData.codArticulo || ''} 
            onChange={handleChange} 
            placeholder="Código del artículo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refPrincipal">Referencia principal</Label>
          <Input 
            id="refPrincipal" 
            name="refPrincipal" 
            value={formData.refPrincipal || ''} 
            onChange={handleChange} 
            placeholder="Referencia del fabricante"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="precio">Precio (€) *</Label>
          <Input 
            id="precio" 
            name="precio" 
            type="number"
            step="0.01"
            min="0"
            value={formData.precio || ''} 
            onChange={handleChange} 
            required 
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="anyoStock">Año de stock</Label>
          <Input 
            id="anyoStock" 
            name="anyoStock" 
            type="number"
            min="1980"
            max="2030"
            value={formData.anyoStock || ''} 
            onChange={handleChange} 
            placeholder="Año de entrada en stock"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="peso">Peso (gramos)</Label>
          <Input 
            id="peso" 
            name="peso" 
            type="number"
            min="0"
            value={formData.peso || ''} 
            onChange={handleChange} 
            placeholder="Peso en gramos"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ubicacion">Ubicación</Label>
          <Input 
            id="ubicacion" 
            name="ubicacion" 
            value={formData.ubicacion || ''} 
            onChange={handleChange} 
            placeholder="Ubicación en almacén"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcionArticulo">Descripción del artículo *</Label>
        <Input 
          id="descripcionArticulo" 
          name="descripcionArticulo" 
          value={formData.descripcionArticulo || ''} 
          onChange={handleChange} 
          required 
          placeholder="Descripción detallada del artículo"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea 
          id="observaciones" 
          name="observaciones" 
          value={formData.observaciones || ''} 
          onChange={handleChange} 
          placeholder="Observaciones adicionales sobre la pieza..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          {isNew ? 'Crear pieza' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
};

const PartPreview = ({ part, onClose }: { part: Part; onClose: () => void }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Información general</h3>
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Referencia local:</span>
              <span>{part.refLocal}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Familia:</span>
              <span>{part.descripcionFamilia}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Artículo:</span>
              <span>{part.descripcionArticulo}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Precio:</span>
              <span className="font-semibold text-green-600">{formatPrice(part.precio)}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Clasificación:</span>
              <Badge variant={getVehicleClassification(part).variant}>
                {getVehicleClassification(part).label}
              </Badge>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Estado:</span>
              <Badge variant={part.activo ? "default" : "destructive"}>
                {part.activo ? "Activada" : "Desactivada"}
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Detalles adicionales</h3>
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Código familia:</span>
              <span>{part.codFamilia}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Código artículo:</span>
              <span>{part.codArticulo || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Ref. principal:</span>
              <span>{part.refPrincipal || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Peso:</span>
              <span>{part.peso ? `${part.peso}g` : '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="font-medium">Ubicación:</span>
              <span>{part.ubicacion || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Vehículo asociado</h3>
        <div className="bg-muted/30 p-3 rounded-md">
          {part.vehicleMarca && part.vehicleModelo ? (
            <span>{part.vehicleMarca} {part.vehicleModelo} ({part.vehicleAnyo})</span>
          ) : (
            <span>ID Vehículo: {part.idVehiculo}</span>
          )}
        </div>
      </div>

      {part.observaciones && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Observaciones</h3>
          <div className="border p-3 rounded-md bg-muted/30 min-h-[60px]">
            {part.observaciones}
          </div>
        </div>
      )}

      {part.imagenes && part.imagenes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Imágenes ({part.imagenes.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {part.imagenes.slice(0, 6).map((img, index) => (
              <div key={index} className="relative aspect-square">
                <img 
                  src={img} 
                  alt={`Imagen ${index + 1} de ${part.descripcionArticulo}`}
                  className="rounded-md object-cover w-full h-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminParts = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingPartId, setDeletingPartId] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("fechaActualizacion");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [familyFilter, setFamilyFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<{min: string, max: string}>({min: "", max: ""});

  // Estados para edición, creación y vista previa
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentPart, setCurrentPart] = useState<Part | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPart, setPreviewPart] = useState<Part | null>(null);

  // Verificar rutas
  const [isEditRoute] = useRoute('/admin/parts/edit/:id');
  const [isNewRoute] = useRoute('/admin/parts/new');

  // Redireccionar si no es admin
  if (user && !user.isAdmin) {
    setLocation("/");
  }

  // Obtener piezas
  const { data: partsResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/search-parts', currentPage, searchTerm, familyFilter, activeFilter, vehicleTypeFilter, priceFilter, sortBy, sortDirection],
    queryFn: async () => {
      try {
        let url = `/api/search-parts?limit=${ITEMS_PER_PAGE}&offset=${(currentPage - 1) * ITEMS_PER_PAGE}&isAdmin=true&getTotalCount=true`;
        
        if (searchTerm) {
          url += `&q=${encodeURIComponent(searchTerm)}`;
        }
        if (familyFilter) {
          url += `&familia=${encodeURIComponent(familyFilter)}`;
        }
        if (activeFilter !== 'all') {
          url += `&activo=${activeFilter === 'active'}`;
        }
        if (vehicleTypeFilter !== 'all') {
          if (vehicleTypeFilter === 'processed') {
            url += `&vehicleType=processed`;
          } else if (vehicleTypeFilter === 'associated') {
            url += `&vehicleType=associated`;
          }
        }
        if (priceFilter.min) {
          url += `&precioMin=${priceFilter.min}`;
        }
        if (priceFilter.max) {
          url += `&precioMax=${priceFilter.max}`;
        }
        if (sortBy) {
          url += `&orden=${sortBy}_${sortDirection}`;
        }

        console.log('Admin parts query URL:', url);
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Error al cargar piezas');
        }
        const data = await response.json();
        console.log('Admin parts response:', data);
        return data;
      } catch (error) {
        console.error('Error en la consulta de piezas:', error);
        throw error;
      }
    },
    enabled: !editing && !creating
  });

  // Obtener familias para filtros
  const { data: familiesData } = useQuery({
    queryKey: ['/api/optimized/parts/families'],
    queryFn: async () => {
      const response = await fetch('/api/optimized/parts/families');
      return response.json();
    },
  });

  const parts = partsResponse?.data || [];
  const totalItems = partsResponse?.pagination?.total || 0;
  const filteredItems = partsResponse?.pagination?.filtered || totalItems;
  const totalPages = Math.ceil(filteredItems / ITEMS_PER_PAGE);
  const families = familiesData || [];

  // Mutaciones
  const createPartMutation = useMutation({
    mutationFn: async (data: Partial<Part>) => {
      const response = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Error al crear pieza');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pieza creada",
        description: "La pieza ha sido creada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/search-parts'] });
      setCreating(false);
      setCurrentPart(null);
      setLocation("/admin/parts");
    },
    onError: (error) => {
      toast({
        title: "Error al crear pieza",
        description: "No se pudo crear la pieza. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const updatePartMutation = useMutation({
    mutationFn: async ({id, data}: {id: number, data: Partial<Part>}) => {
      const response = await fetch(`/api/parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Error al actualizar pieza');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pieza actualizada",
        description: "La pieza ha sido actualizada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/search-parts'] });
      setEditing(false);
      setCurrentPart(null);
      setLocation("/admin/parts");
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar pieza",
        description: "No se pudo actualizar la pieza. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const deletePartMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/parts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al eliminar pieza');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pieza eliminada",
        description: "La pieza ha sido eliminada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/search-parts'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar pieza",
        description: "No se pudo eliminar la pieza. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const deleteAllPartsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/parts/delete-all', {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al eliminar todas las piezas');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Todas las piezas eliminadas",
        description: "Se han eliminado todas las piezas correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/search-parts'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar todas las piezas",
        description: "No se pudieron eliminar todas las piezas. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  const togglePartStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/parts/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cambiar estado de la pieza');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Estado cambiado",
        description: data.message || "El estado de la pieza ha sido cambiado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/search-parts'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error al cambiar estado",
        description: "No se pudo cambiar el estado de la pieza. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Manejadores
  const handleSavePart = (data: Partial<Part>) => {
    if (creating) {
      createPartMutation.mutate(data);
    } else if (currentPart && currentPart.id) {
      updatePartMutation.mutate({ id: currentPart.id, data });
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setCreating(false);
    setCurrentPart(null);
    setLocation("/admin/parts");
  };

  const handleNewPart = () => {
    setCreating(true);
    setCurrentPart(null);
    setLocation("/admin/parts/new");
  };

  const handleEditPart = (part: Part) => {
    setEditing(true);
    setCurrentPart(part);
    setLocation(`/admin/parts/edit/${part.id}`);
  };

  const handlePreviewPart = async (part: Part) => {
    setPreviewPart(part);
    setPreviewOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeletingPartId(id);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingPartId) {
      deletePartMutation.mutate(deletingPartId);
    }
    setConfirmDeleteOpen(false);
    setDeletingPartId(null);
  };

  const handleDeleteAllClick = () => {
    setConfirmDeleteAllOpen(true);
  };

  const handleConfirmDeleteAll = () => {
    deleteAllPartsMutation.mutate();
    setConfirmDeleteAllOpen(false);
  };

  const handleTogglePartStatus = (id: number) => {
    togglePartStatusMutation.mutate(id);
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar activeTab="admin_parts" />

      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">
              {creating ? "Nueva Pieza" : editing ? "Editar Pieza" : "Gestión de Piezas"}
            </h1>
            <p className="text-muted-foreground">
              {creating 
                ? "Complete los datos de la nueva pieza" 
                : editing 
                ? "Modifique los datos de la pieza y guarde los cambios" 
                : "Gestione todas las piezas del sistema"
              }
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => (editing || creating) ? handleCancelEdit() : setLocation("/admin")}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {(editing || creating) ? "Volver a piezas" : "Volver al panel"}
          </Button>
        </div>

        {/* Formulario de edición/creación */}
        {(editing || creating) && (
          <Card>
            <CardHeader>
              <CardTitle>
                {creating ? "Datos de la nueva pieza" : "Editar datos de la pieza"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PartForm 
                part={currentPart || {} as Partial<Part>} 
                onSave={handleSavePart} 
                onCancel={handleCancelEdit}
                isNew={creating}
              />
            </CardContent>
          </Card>
        )}

        {/* Lista de piezas */}
        {!editing && !creating && (
          <>
            <Card className="mb-8">
              <CardContent className="p-6">
                {/* Controles de búsqueda y filtros */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <form onSubmit={handleSearch} className="flex w-full md:w-1/2 gap-2">
                      <Input
                        placeholder="Buscar por referencia, artículo, familia..."
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
                      <Button onClick={handleNewPart}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva pieza
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteAllClick}>
                        <Trash className="h-4 w-4 mr-2" />
                        Eliminar todas
                      </Button>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="flex flex-wrap gap-4">
                    <div className="w-[200px]">
                      <Select value={familyFilter} onValueChange={setFamilyFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filtrar por familia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas las familias</SelectItem>
                          {families.map((family: string) => (
                            <SelectItem key={family} value={family}>
                              {family}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[180px]">
                      <Select value={activeFilter} onValueChange={setActiveFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las piezas</SelectItem>
                          <SelectItem value="active">Activadas</SelectItem>
                          <SelectItem value="inactive">Desactivadas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[200px]">
                      <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Clasificación" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las clasificaciones</SelectItem>
                          <SelectItem value="associated">Vehículo Asociado</SelectItem>
                          <SelectItem value="processed">Vehículo Procesado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Precio mín"
                        value={priceFilter.min}
                        onChange={(e) => setPriceFilter(prev => ({...prev, min: e.target.value}))}
                        className="w-[120px]"
                      />
                      <Input
                        type="number"
                        placeholder="Precio máx"
                        value={priceFilter.max}
                        onChange={(e) => setPriceFilter(prev => ({...prev, max: e.target.value}))}
                        className="w-[120px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Estadísticas mejoradas */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Total de piezas</p>
                          <p className="text-2xl font-bold text-primary">{totalItems.toLocaleString()}</p>
                        </div>
                      </div>
                      {totalItems !== filteredItems && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Filtradas</p>
                          <p className="text-xl font-semibold">{filteredItems.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mostrando {parts.length} piezas
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabla */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Cargando piezas...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Ref.</TableHead>
                          <TableHead onClick={() => handleSort("descripcionFamilia")} className="cursor-pointer">
                            <div className="flex items-center">
                              Familia
                              {sortBy === "descripcionFamilia" && (
                                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("descripcionArticulo")} className="cursor-pointer">
                            <div className="flex items-center">
                              Artículo
                              {sortBy === "descripcionArticulo" && (
                                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                          <TableHead onClick={() => handleSort("precio")} className="cursor-pointer text-right">
                            <div className="flex items-center justify-end">
                              Precio
                              {sortBy === "precio" && (
                                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Vehículo</TableHead>
                          <TableHead onClick={() => handleSort("idVehiculo")} className="cursor-pointer">
                            <div className="flex items-center">
                              Clasificación
                              {sortBy === "idVehiculo" && (
                                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center h-32">
                              No se encontraron piezas
                            </TableCell>
                          </TableRow>
                        ) : (
                          parts.map((part: Part) => (
                            <TableRow key={part.id}>
                              <TableCell className="font-medium">{part.refLocal}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{part.descripcionFamilia}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={part.descripcionArticulo}>
                                {part.descripcionArticulo}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatPrice(part.precio)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {part.vehicleMarca && part.vehicleModelo ? (
                                    <span>{part.vehicleMarca} {part.vehicleModelo}</span>
                                  ) : (
                                    <span>ID: {part.idVehiculo}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getVehicleClassification(part).variant}>
                                  {getVehicleClassification(part).label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={part.activo ? "default" : "secondary"}>
                                  {part.activo ? "Activa" : "Inactiva"}
                                </Badge>
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
                                    <DropdownMenuItem onClick={() => handlePreviewPart(part)}>
                                      <Eye className="h-4 w-4 mr-2" /> Ver detalle
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditPart(part)}>
                                      <Edit className="h-4 w-4 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleTogglePartStatus(part.id)}>
                                      {part.activo ? (
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
                                      onClick={() => handleDeleteClick(part.id)}
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

            {/* Paginación mejorada */}
            {!isLoading && totalPages > 1 && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems)} de {filteredItems.toLocaleString()} piezas
                      {totalItems !== filteredItems && (
                        <span className="text-muted-foreground/70"> (filtradas de {totalItems.toLocaleString()} total)</span>
                      )}
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
                        {currentPage > 3 && totalPages > 5 && (
                          <>
                            <PaginationItem>
                              <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                                1
                              </PaginationLink>
                            </PaginationItem>
                            {currentPage > 4 && (
                              <PaginationItem>
                                <span className="px-3 py-2">...</span>
                              </PaginationItem>
                            )}
                          </>
                        )}
                        
                        {/* Páginas visibles */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let page;
                          if (totalPages <= 5) page = i + 1;
                          else if (currentPage <= 3) page = i + 1;
                          else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                          else page = currentPage - 2 + i;

                          if (page < 1 || page > totalPages) return null;
                          if (currentPage > 3 && totalPages > 5 && page === 1) return null;
                          if (currentPage < totalPages - 2 && totalPages > 5 && page === totalPages) return null;

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
                        {currentPage < totalPages - 2 && totalPages > 5 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <PaginationItem>
                                <span className="px-3 py-2">...</span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
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
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Diálogo de vista previa */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {previewPart?.descripcionArticulo}
                {previewPart && !previewPart.activo && (
                  <Badge variant="destructive" className="ml-2">Desactivada</Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Detalles de la pieza {previewPart?.refLocal} - {previewPart?.descripcionFamilia}
              </DialogDescription>
            </DialogHeader>
            {previewPart && <PartPreview part={previewPart} onClose={() => setPreviewOpen(false)} />}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Cerrar
              </Button>
              {previewPart && (
                <Button onClick={() => {
                  setPreviewOpen(false);
                  handleEditPart(previewPart);
                }}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación de eliminación */}
        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar esta pieza? Esta acción no se puede deshacer.
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

        {/* Diálogo de confirmación para eliminar todas las piezas */}
        <Dialog open={confirmDeleteAllOpen} onOpenChange={setConfirmDeleteAllOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación masiva</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar TODAS las piezas? Esta acción eliminará permanentemente todas las piezas del sistema y no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteAllOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteAll}>
                Eliminar todas las piezas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminParts;
