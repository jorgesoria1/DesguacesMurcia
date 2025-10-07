import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, MapPin, LogOut } from "lucide-react";
import { Redirect, useLocation } from "wouter";

// Esquema de validación para actualizar perfil
const profileSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(9, "Teléfono inválido").max(15, "Teléfono inválido"),
  nifCif: z.string().min(1, "El NIF/CIF es requerido"),
});

// Esquema de validación para dirección
const addressSchema = z.object({
  address: z.string().min(1, "La dirección es requerida"),
  city: z.string().min(1, "La ciudad es requerida"),
  postalCode: z.string().min(5, "Código postal inválido"),
  province: z.string().min(1, "La provincia es requerida"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type AddressFormValues = z.infer<typeof addressSchema>;

interface Province {
  id: number;
  name: string;
  code: string;
  shipping_zone_id: number;
}

// Componente para el panel de usuario
const UserPanel: React.FC = () => {
  const { user, isLoading, updateProfile, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);

  // Cargar provincias
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch('/api/provinces');
        const data = await response.json();
        setProvinces(data);
      } catch (error) {
        console.error('Error loading provinces:', error);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  // Si el usuario no está autenticado, redirigir al login
  if (!isLoading && !user) {
    return <Redirect to="/login?redirect=panel" />;
  }

  // Componente para mostrar durante la carga
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando información de usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de usuario</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tu información personal y direcciones
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-4 md:mt-0"
          onClick={() => {
            logout();
            setLocation("/");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-8">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Direcciones
          </TabsTrigger>
        </TabsList>

        {/* Contenido para la pestaña de perfil */}
        <TabsContent value="profile">
          <ProfileTab user={user} updateProfile={updateProfile} />
        </TabsContent>

        {/* Contenido para la pestaña de direcciones */}
        <TabsContent value="addresses">
          <AddressTab user={user} updateProfile={updateProfile} provinces={provinces} />
        </TabsContent>


      </Tabs>
    </div>
  );
};

// Componente para la pestaña de perfil
const ProfileTab: React.FC<{ 
  user: any;
  updateProfile: (data: Partial<any>) => Promise<{ success: boolean; message?: string }>;
}> = ({ user, updateProfile }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      nifCif: user?.nifCif || "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true);
      const result = await updateProfile(data);
      
      if (result.success) {
        toast({
          title: "Perfil actualizado",
          description: "Tu información personal ha sido actualizada correctamente",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "No se pudo actualizar el perfil",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar tu perfil",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
        <CardDescription>
          Actualiza tu información personal y detalles de contacto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input placeholder="Tus apellidos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Teléfono de contacto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nifCif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF/CIF</FormLabel>
                    <FormControl>
                      <Input placeholder="NIF o CIF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto"
            >
              {isSubmitting ? (
                <>
                  Guardando...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

// Componente para la pestaña de direcciones
const AddressTab: React.FC<{ 
  user: any;
  updateProfile: (data: Partial<any>) => Promise<{ success: boolean; message?: string }>;
  provinces: Province[];
}> = ({ user, updateProfile, provinces }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address: user?.address || "",
      city: user?.city || "",
      postalCode: user?.postalCode || "",
      province: user?.province || "",
    },
  });

  const onSubmit = async (data: AddressFormValues) => {
    try {
      setIsSubmitting(true);
      const result = await updateProfile(data);
      
      if (result.success) {
        toast({
          title: "Dirección actualizada",
          description: "Tu dirección ha sido actualizada correctamente",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "No se pudo actualizar la dirección",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al actualizar dirección:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar tu dirección",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dirección de envío</CardTitle>
        <CardDescription>
          Actualiza tu dirección para recibir tus pedidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, piso, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona provincia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={province.name}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código postal</FormLabel>
                    <FormControl>
                      <Input placeholder="Código postal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto"
            >
              {isSubmitting ? (
                <>
                  Guardando...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                'Guardar dirección'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default UserPanel;
