import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Esquema para validar los datos del formulario
const siteConfigSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().optional(),
  estimatedTime: z.string().optional(),
});

type FormData = z.infer<typeof siteConfigSchema>;

const MaintenanceModeForm = () => {
  const queryClient = useQueryClient();

  // Obtener la configuración actual del sitio
  const { data: siteConfig, isLoading } = useQuery({
    queryKey: ['/api/site/config'],
    queryFn: async () => {
      const response = await fetch('/api/site/config');
      if (!response.ok) {
        throw new Error('Error al cargar la configuración del sitio');
      }
      return response.json();
    },
  });

  // Estado local para mantener sincronizado el switch
  const [isMaintenance, setIsMaintenance] = React.useState<boolean>(Boolean(siteConfig?.maintenanceMode));
  
  // Configurar el formulario
  const form = useForm<FormData>({
    resolver: zodResolver(siteConfigSchema),
    defaultValues: {
      maintenanceMode: siteConfig?.maintenanceMode || false,
      maintenanceMessage: siteConfig?.maintenanceMessage || "Estamos realizando mejoras en nuestra plataforma.",
      estimatedTime: siteConfig?.estimatedTime || "Volveremos pronto",
    },
  });

  // Mantener sincronizado el estado del formulario y el switch con los datos del servidor
  React.useEffect(() => {
    if (siteConfig) {
      const maintenanceModeValue = Boolean(siteConfig.maintenanceMode);
      
      console.log("Actualizando formulario y switch con datos del servidor:", {
        maintenanceMode: maintenanceModeValue,
        mensaje: siteConfig.maintenanceMessage,
        estimacion: siteConfig.estimatedTime
      });
      
      // Actualizar el estado local del switch
      setIsMaintenance(maintenanceModeValue);
      
      // Establecer todos los valores a la vez para evitar problemas de sincronización
      form.reset({
        maintenanceMode: maintenanceModeValue,
        maintenanceMessage: siteConfig.maintenanceMessage || "Estamos realizando mejoras en nuestra plataforma.",
        estimatedTime: siteConfig.estimatedTime || "Volveremos pronto"
      }, {
        keepDirty: false,
        keepValues: false,
        keepDefaultValues: false
      });
    }
  }, [siteConfig, form, setIsMaintenance]);

  // Logging para depuración
  const logSubmit = (data: any) => {
    console.log("Enviando datos de configuración:", data);
    return data;
  };

  // Mutación para actualizar la configuración
  const updateConfigMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Usar fetch directamente para mayor control
      const response = await fetch('/api/site/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include', // Importante para incluir cookies de sesión
        body: JSON.stringify(logSubmit(data)),
      });

      // Mostrar respuesta para depuración
      const responseText = await response.text();
      console.log("Respuesta del servidor:", responseText);

      if (!response.ok) {
        throw new Error(`Error al actualizar la configuración: ${responseText}`);
      }

      // Convertir texto a JSON si es posible
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.log("La respuesta no es JSON válido:", responseText);
        return { success: true };
      }
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "La configuración del sitio se ha actualizado correctamente.",
      });
      // Invalidar la consulta para volver a cargar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/site/config'] });
    },
    onError: (error) => {
      console.error("Error al actualizar configuración:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración del sitio. Verifique que ha iniciado sesión como administrador.",
        variant: "destructive",
      });
    },
  });

  // Manejar el envío del formulario
  const onSubmit = (data: FormData) => {
    updateConfigMutation.mutate(data);
  };

  const handleMaintenanceModeChange = async (checked: boolean) => {
    console.log("Cambiando modo mantenimiento a:", checked);
    
    // Actualizar estado local del switch inmediatamente para feedback visual
    setIsMaintenance(checked);
    
    // Actualizar el formulario
    form.setValue("maintenanceMode", checked, { 
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true
    });
    
    // Enviar directamente los datos actualizados en lugar de usar el manejador del formulario
    const currentData = form.getValues();
    
    try {
      // Mostrar feedback inmediato
      toast({
        title: "Actualizando configuración...",
        description: checked ? "Activando modo mantenimiento..." : "Desactivando modo mantenimiento..."
      });
      
      // Enviar los datos actualizados al servidor
      updateConfigMutation.mutate({
        ...currentData,
        maintenanceMode: checked
      }, {
        onSuccess: () => {
          console.log(`Modo mantenimiento ${checked ? 'activado' : 'desactivado'} correctamente`);
          // Mantener el estado local sincronizado
          setIsMaintenance(checked);
        },
        onError: (error) => {
          console.error("Error al cambiar modo mantenimiento:", error);
          // Revertir estado local en caso de error
          setIsMaintenance(!checked);
          toast({
            title: "Error",
            description: "No se pudo actualizar el modo mantenimiento",
            variant: "destructive"
          });
        }
      });
      
    } catch (error) {
      console.error("Error al cambiar modo mantenimiento:", error);
      // Revertir estado local en caso de error
      setIsMaintenance(!checked);
      toast({
        title: "Error",
        description: "No se pudo actualizar el modo mantenimiento",
        variant: "destructive"
      });
      
      // Restaurar el valor anterior en caso de error
      form.setValue("maintenanceMode", !checked);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="maintenanceMode"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Modo Mantenimiento</FormLabel>
                <FormDescription>
                  Activar el modo mantenimiento mostrará una página de mantenimiento
                  en lugar de la página principal.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={isMaintenance}
                  onCheckedChange={handleMaintenanceModeChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maintenanceMessage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensaje de Mantenimiento</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Estamos realizando mejoras en nuestra plataforma." 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Este mensaje se mostrará en la página de mantenimiento.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estimatedTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tiempo Estimado</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Volveremos pronto" 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Tiempo estimado para que el sitio vuelva a estar disponible.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={updateConfigMutation.isPending}
          className="w-full"
        >
          {updateConfigMutation.isPending ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
              Guardando...
            </>
          ) : "Guardar Configuración"}
        </Button>
      </form>
    </Form>
  );
};

export default MaintenanceModeForm;