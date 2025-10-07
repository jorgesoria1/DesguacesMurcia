import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck, MapPin, LogOut } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Settings, Weight, Map, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const shippingMethodSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  base_price: z.coerce.number().min(0, "El precio base debe ser mayor o igual a 0"),
  is_active: z.boolean().default(true),
  free_shipping_threshold: z.coerce.number().min(0).optional(),
  weight_based_pricing: z.boolean().default(true),
  price_per_kg: z.coerce.number().min(0).optional(),
  max_weight: z.coerce.number().min(0).optional(),
  estimated_days: z.coerce.number().min(1).optional(),
  instructions: z.string().optional(),
});

const rateSchema = z.object({
  shipping_config_id: z.number(),
  min_weight: z.coerce.number().min(0, "El peso mínimo debe ser mayor o igual a 0"),
  max_weight: z.coerce.number().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
});

const zoneSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sort_order: z.coerce.number().min(0, "El orden debe ser mayor o igual a 0"),
  is_active: z.boolean().default(true),
});

const zoneRateSchema = z.object({
  shipping_config_id: z.number(),
  shipping_zone_id: z.number(),
  min_weight: z.coerce.number().min(0, "El peso mínimo debe ser mayor o igual a 0"),
  max_weight: z.coerce.number().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
});

type ShippingMethodForm = z.infer<typeof shippingMethodSchema>;
type RateForm = z.infer<typeof rateSchema>;
type ZoneForm = z.infer<typeof zoneSchema>;
type ZoneRateForm = z.infer<typeof zoneRateSchema>;

interface ShippingMethod {
  id: number;
  name: string;
  description?: string;
  base_price: string;
  is_active: boolean;
  free_shipping_threshold?: string;
  weight_based_pricing: boolean;
  price_per_kg?: string;
  max_weight?: string;
  estimated_days?: number;
  instructions?: string;
  rates?: ShippingRate[];
  created_at: string;
  updated_at: string;
}

interface ShippingRate {
  id: number;
  shipping_config_id: number;
  min_weight: string;
  max_weight?: string;
  price: string;
  created_at: string;
  updated_at: string;
}

interface ShippingZone {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  province_count: number;
  provinces: string[];
  created_at: string;
  updated_at: string;
}

interface Province {
  id: number;
  name: string;
  code?: string;
  shipping_zone_id?: number;
  zone_name?: string;
  created_at: string;
  updated_at: string;
}

interface ZoneRate {
  id: number;
  shipping_config_id: number;
  shipping_zone_id: number;
  zone_name: string;
  min_weight: string;
  max_weight?: string;
  price: string;
  created_at: string;
  updated_at: string;
}

export default function AdminShipping() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [selectedMethodForRates, setSelectedMethodForRates] = useState<ShippingMethod | null>(null);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);

  // Zone management states
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  
  // Zone rates states
  const [selectedMethodForZoneRates, setSelectedMethodForZoneRates] = useState<ShippingMethod | null>(null);
  const [editingZoneRate, setEditingZoneRate] = useState<ZoneRate | null>(null);
  const [isZoneRateDialogOpen, setIsZoneRateDialogOpen] = useState(false);

  const { data: shippingMethods = [], isLoading } = useQuery({
    queryKey: ["/api/admin/shipping/methods"],
  });

  const { data: shippingZones = [], isLoading: isLoadingZones } = useQuery({
    queryKey: ["/api/admin/shipping/zones"],
  });

  const { data: provinces = [], isLoading: isLoadingProvinces } = useQuery({
    queryKey: ["/api/admin/provinces"],
  });

  const { data: zoneRates = [], isLoading: isLoadingZoneRates } = useQuery({
    queryKey: selectedMethodForZoneRates 
      ? ["/api/admin/shipping/zone-rates", selectedMethodForZoneRates.id]
      : ["/api/admin/shipping/zone-rates"],
    enabled: !!selectedMethodForZoneRates,
  });

  const methodForm = useForm<ShippingMethodForm>({
    resolver: zodResolver(shippingMethodSchema),
    defaultValues: {
      name: "",
      description: "",
      base_price: 0,
      is_active: true,
      free_shipping_threshold: 0,
      weight_based_pricing: true,
      price_per_kg: 0,
      max_weight: 0,
      estimated_days: 3,
      instructions: "",
    },
  });

  const rateForm = useForm<RateForm>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      shipping_config_id: 0,
      min_weight: 0,
      max_weight: 0,
      price: 0,
    },
  });

  const zoneForm = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: "",
      description: "",
      sort_order: 0,
      is_active: true,
    },
  });

  const zoneRateForm = useForm<ZoneRateForm>({
    resolver: zodResolver(zoneRateSchema),
    defaultValues: {
      shipping_config_id: 0,
      shipping_zone_id: 0,
      min_weight: 0,
      max_weight: 0,
      price: 0,
    },
  });

  // Shipping method mutations
  const createMethodMutation = useMutation({
    mutationFn: (data: ShippingMethodForm) => apiRequest("POST", "/api/admin/shipping/methods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/methods"] });
      toast({ title: "Método de envío creado exitosamente" });
      setIsDialogOpen(false);
      setEditingMethod(null);
      methodForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al crear método", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMethodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShippingMethodForm }) => 
      apiRequest("PUT", `/api/admin/shipping/methods/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/methods"] });
      toast({ title: "Método de envío actualizado exitosamente" });
      setIsDialogOpen(false);
      setEditingMethod(null);
      methodForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar método", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/shipping/methods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/methods"] });
      toast({ title: "Método de envío eliminado exitosamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al eliminar método", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Zone management mutations
  const createZoneMutation = useMutation({
    mutationFn: (data: ZoneForm) => apiRequest("POST", "/api/admin/shipping/zones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
      toast({ title: "Zona de envío creada exitosamente" });
      setIsZoneDialogOpen(false);
      setEditingZone(null);
      zoneForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al crear zona", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ZoneForm }) => 
      apiRequest("PUT", `/api/admin/shipping/zones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
      toast({ title: "Zona de envío actualizada exitosamente" });
      setIsZoneDialogOpen(false);
      setEditingZone(null);
      zoneForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar zona", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/shipping/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/provinces"] });
      toast({ title: "Zona de envío eliminada exitosamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al eliminar zona", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateProvinceZoneMutation = useMutation({
    mutationFn: ({ provinceId, zoneId }: { provinceId: number; zoneId: number | null }) => 
      apiRequest("PUT", `/api/admin/provinces/${provinceId}/zone`, { shipping_zone_id: zoneId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/provinces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
      toast({ title: "Asignación de provincia actualizada exitosamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar asignación", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Zone rate mutations
  const createZoneRateMutation = useMutation({
    mutationFn: (data: ZoneRateForm) => apiRequest("POST", "/api/admin/shipping/zone-rates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/shipping/zone-rates", selectedMethodForZoneRates?.id] 
      });
      toast({ title: "Tarifa por zona creada exitosamente" });
      setIsZoneRateDialogOpen(false);
      setEditingZoneRate(null);
      zoneRateForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al crear tarifa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateZoneRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ZoneRateForm }) => 
      apiRequest("PUT", `/api/admin/shipping/zone-rates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/shipping/zone-rates", selectedMethodForZoneRates?.id] 
      });
      toast({ title: "Tarifa por zona actualizada exitosamente" });
      setIsZoneRateDialogOpen(false);
      setEditingZoneRate(null);
      zoneRateForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar tarifa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteZoneRateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/shipping/zone-rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/shipping/zone-rates", selectedMethodForZoneRates?.id] 
      });
      toast({ title: "Tarifa por zona eliminada exitosamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al eliminar tarifa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Event handlers
  const handleEditMethod = (method: ShippingMethod) => {
    setEditingMethod(method);
    methodForm.reset({
      name: method.name,
      description: method.description || "",
      base_price: parseFloat(method.base_price),
      is_active: method.is_active,
      free_shipping_threshold: method.free_shipping_threshold ? parseFloat(method.free_shipping_threshold) : 0,
      weight_based_pricing: method.weight_based_pricing,
      price_per_kg: method.price_per_kg ? parseFloat(method.price_per_kg) : 0,
      max_weight: method.max_weight ? parseFloat(method.max_weight) : 0,
      estimated_days: method.estimated_days || 3,
      instructions: method.instructions || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteMethod = (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este método de envío y todas sus tarifas?")) {
      deleteMethodMutation.mutate(id);
    }
  };

  const handleEditZone = (zone: ShippingZone) => {
    setEditingZone(zone);
    zoneForm.reset({
      name: zone.name,
      description: zone.description || "",
      sort_order: zone.sort_order,
      is_active: zone.is_active,
    });
    setIsZoneDialogOpen(true);
  };

  const handleDeleteZone = (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta zona de envío? Se desasignarán todas las provincias.")) {
      deleteZoneMutation.mutate(id);
    }
  };

  const onSubmitMethod = (data: ShippingMethodForm) => {
    if (editingMethod) {
      updateMethodMutation.mutate({ id: editingMethod.id, data });
    } else {
      createMethodMutation.mutate(data);
    }
  };

  const onSubmitZone = (data: ZoneForm) => {
    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data });
    } else {
      createZoneMutation.mutate(data);
    }
  };

  const handleProvinceZoneChange = (provinceId: number, zoneId: string) => {
    const newZoneId = zoneId === "" ? null : parseInt(zoneId);
    updateProvinceZoneMutation.mutate({ provinceId, zoneId: newZoneId });
  };

  const handleEditZoneRate = (rate: ZoneRate) => {
    setEditingZoneRate(rate);
    zoneRateForm.reset({
      shipping_config_id: rate.shipping_config_id,
      shipping_zone_id: rate.shipping_zone_id,
      min_weight: parseFloat(rate.min_weight),
      max_weight: rate.max_weight ? parseFloat(rate.max_weight) : 0,
      price: parseFloat(rate.price),
    });
    setIsZoneRateDialogOpen(true);
  };

  const handleDeleteZoneRate = (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta tarifa por zona?")) {
      deleteZoneRateMutation.mutate(id);
    }
  };

  const onSubmitZoneRate = (data: ZoneRateForm) => {
    if (editingZoneRate) {
      updateZoneRateMutation.mutate({ id: editingZoneRate.id, data });
    } else {
      createZoneRateMutation.mutate(data);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };


  if (isLoading || isLoadingZones || isLoadingProvinces) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Gestión de Envíos</h1>
            <p className="text-muted-foreground">
              Configure métodos de envío, zonas y tarifas
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

      <Tabs defaultValue="methods" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="methods">Métodos de Envío</TabsTrigger>
          <TabsTrigger value="zones">Zonas de Envío</TabsTrigger>
          <TabsTrigger value="provinces">Asignación de Provincias</TabsTrigger>
          <TabsTrigger value="zone-rates">Tarifas por Zona</TabsTrigger>
        </TabsList>

        {/* Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Métodos de Envío</h2>
              <p className="text-muted-foreground">
                Configura los métodos de envío disponibles
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingMethod(null);
                  methodForm.reset();
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Método
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMethod ? "Editar Método de Envío" : "Nuevo Método de Envío"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingMethod 
                      ? "Modifica la configuración del método de envío" 
                      : "Configura un nuevo método de envío para tu tienda"
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...methodForm}>
                  <form onSubmit={methodForm.handleSubmit(onSubmitMethod)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={methodForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Método</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Envío Estándar" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={methodForm.control}
                        name="base_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio Base (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={methodForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descripción del método de envío" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={methodForm.control}
                        name="estimated_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Días Estimados</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={methodForm.control}
                        name="free_shipping_threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Envío Gratis a partir de (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={methodForm.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instrucciones</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Instrucciones adicionales para este método" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={methodForm.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Método Activo</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              El método estará disponible para los clientes
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createMethodMutation.isPending || updateMethodMutation.isPending}
                      >
                        {editingMethod ? "Actualizar" : "Crear"} Método
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {(shippingMethods as ShippingMethod[]).map((method) => (
              <Card key={method.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        {method.name}
                        <Badge variant={method.is_active ? "default" : "secondary"}>
                          {method.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{method.description}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMethod(method)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMethod(method.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Precio Base</Label>
                      <p className="font-medium">€{parseFloat(method.base_price).toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Días Estimados</Label>
                      <p className="font-medium">{method.estimated_days || 3} días</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Envío Gratis</Label>
                      <p className="font-medium">
                        {method.free_shipping_threshold 
                          ? `€${parseFloat(method.free_shipping_threshold).toFixed(2)}` 
                          : "No disponible"
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Estado</Label>
                      <p className="font-medium">
                        {method.is_active ? "Disponible" : "No disponible"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Zonas RODES</h2>
              <p className="text-muted-foreground">
                Gestiona las zonas de envío para el transporte RODES
              </p>
            </div>
            <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingZone(null);
                  zoneForm.reset();
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Zona
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingZone ? "Editar Zona de Envío" : "Nueva Zona de Envío"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingZone 
                      ? "Modifica la configuración de la zona" 
                      : "Crea una nueva zona para organizar las provincias"
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...zoneForm}>
                  <form onSubmit={zoneForm.handleSubmit(onSubmitZone)} className="space-y-4">
                    <FormField
                      control={zoneForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Zona</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Zona 1 - Madrid y Centro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={zoneForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descripción de la zona y provincias incluidas" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={zoneForm.control}
                      name="sort_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orden de Visualización</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={zoneForm.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Zona Activa</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              La zona estará disponible para asignación
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsZoneDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createZoneMutation.isPending || updateZoneMutation.isPending}
                      >
                        {editingZone ? "Actualizar" : "Crear"} Zona
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {(shippingZones as ShippingZone[]).map((zone) => (
              <Card key={zone.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {zone.name}
                        <Badge variant={zone.is_active ? "default" : "secondary"}>
                          {zone.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{zone.description}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditZone(zone)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteZone(zone.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Provincias Asignadas</Label>
                      <p className="font-medium">{zone.province_count} provincias</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Orden</Label>
                      <p className="font-medium">{zone.sort_order}</p>
                    </div>
                  </div>
                  {zone.provinces && zone.provinces.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-muted-foreground">Provincias:</Label>
                      <p className="text-sm mt-1">{zone.provinces.join(", ")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Provinces Tab */}
        <TabsContent value="provinces" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Asignación de Provincias</h2>
            <p className="text-muted-foreground">
              Asigna cada provincia española a una zona de envío universal
            </p>
          </div>

          <div className="grid gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Zona Actual</TableHead>
                  <TableHead>Cambiar Zona</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(provinces as Province[]).map((province) => (
                  <TableRow key={province.id}>
                    <TableCell className="font-medium">{province.name}</TableCell>
                    <TableCell>{province.code}</TableCell>
                    <TableCell>
                      {province.zone_name ? (
                        <Badge variant="outline">{province.zone_name}</Badge>
                      ) : (
                        <Badge variant="secondary">Sin asignar</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={province.shipping_zone_id?.toString() || ""}
                        onValueChange={(value) => handleProvinceZoneChange(province.id, value)}
                        disabled={updateProvinceZoneMutation.isPending}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Seleccionar zona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin asignar</SelectItem>
                          {(shippingZones as ShippingZone[])
                            .filter(zone => zone.is_active)
                            .map((zone) => (
                              <SelectItem key={zone.id} value={zone.id.toString()}>
                                {zone.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Zone Rates Tab */}
        <TabsContent value="zone-rates" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Tarifas por Zona</h2>
            <p className="text-muted-foreground">
              Configura precios específicos por zona para cada método de envío
            </p>
          </div>

          {/* Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Método de Envío</CardTitle>
              <CardDescription>
                Elige un método de envío para configurar sus tarifas por zona
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(shippingMethods as ShippingMethod[]).map((method) => (
                  <Card 
                    key={method.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedMethodForZoneRates?.id === method.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedMethodForZoneRates(method)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{method.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {method.description || "Sin descripción"}
                          </p>
                        </div>
                        <Badge variant={method.is_active ? "default" : "secondary"}>
                          {method.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zone Rates Configuration */}
          {selectedMethodForZoneRates && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Tarifas de {selectedMethodForZoneRates.name}</CardTitle>
                    <CardDescription>
                      Configura precios por zona y rango de peso
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingZoneRate(null);
                      zoneRateForm.reset({
                        shipping_config_id: selectedMethodForZoneRates?.id || 0,
                        shipping_zone_id: 0,
                        min_weight: 0,
                        max_weight: 0,
                        price: 0,
                      });
                      setIsZoneRateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Tarifa
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingZoneRates ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando tarifas...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zona</TableHead>
                        <TableHead>Peso Mínimo (g)</TableHead>
                        <TableHead>Peso Máximo (g)</TableHead>
                        <TableHead>Precio (€)</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(zoneRates as ZoneRate[]).map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{rate.zone_name}</TableCell>
                          <TableCell>{parseFloat(rate.min_weight).toLocaleString()}</TableCell>
                          <TableCell>
                            {rate.max_weight ? parseFloat(rate.max_weight).toLocaleString() : "Sin límite"}
                          </TableCell>
                          <TableCell>€{parseFloat(rate.price).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditZoneRate(rate)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteZoneRate(rate.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(zoneRates as ZoneRate[]).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay tarifas configuradas para este método de envío.
                            <br />
                            Haz clic en "Nueva Tarifa" para agregar una.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Zone Rate Dialog */}
      <Dialog open={isZoneRateDialogOpen} onOpenChange={setIsZoneRateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingZoneRate ? "Editar Tarifa por Zona" : "Nueva Tarifa por Zona"}
            </DialogTitle>
            <DialogDescription>
              {editingZoneRate 
                ? "Modifica la tarifa de envío para esta zona" 
                : "Configura una nueva tarifa de envío por zona"
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...zoneRateForm}>
            <form onSubmit={zoneRateForm.handleSubmit(onSubmitZoneRate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={zoneRateForm.control}
                  name="shipping_zone_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona de Envío</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una zona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(shippingZones as ShippingZone[])
                            .filter(zone => zone.is_active)
                            .map((zone) => (
                              <SelectItem key={zone.id} value={zone.id.toString()}>
                                {zone.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={zoneRateForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={zoneRateForm.control}
                  name="min_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso Mínimo (g)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={zoneRateForm.control}
                  name="max_weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso Máximo (g) - Opcional</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Sin límite" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsZoneRateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createZoneRateMutation.isPending || updateZoneRateMutation.isPending}
                >
                  {editingZoneRate ? "Actualizar" : "Crear"} Tarifa
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}