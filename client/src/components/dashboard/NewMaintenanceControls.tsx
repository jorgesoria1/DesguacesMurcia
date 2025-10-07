import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

/**
 * Componente completamente nuevo para gestionar el modo mantenimiento
 * Soluciona problemas de nombres de campos y sincronización con el servidor
 */
const NewMaintenanceControls = () => {
  // Estado local para la configuración
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState('Estamos realizando mejoras en nuestra plataforma.');
  const [estimatedTime, setEstimatedTime] = useState('Volveremos pronto');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hook para mostrar notificaciones
  const { toast } = useToast();

  // Cargar configuración actual al montar el componente
  useEffect(() => {
    loadMaintenanceConfig();
  }, []);

  // Función para cargar la configuración de mantenimiento
  const loadMaintenanceConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/maintenance/config');
      
      if (!response.ok) {
        throw new Error(`Error al cargar configuración: ${response.status}`);
      }
      
      const config = await response.json();
      console.log("Configuración cargada:", config);
      
      // Actualizar estado local con la configuración del servidor
      setIsEnabled(Boolean(config.maintenanceMode));
      setMessage(config.maintenanceMessage || 'Estamos realizando mejoras en nuestra plataforma.');
      setEstimatedTime(config.estimatedTime || 'Volveremos pronto');
    } catch (err) {
      console.error('Error al cargar configuración de mantenimiento:', err);
      setError('No se pudo cargar la configuración de mantenimiento');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cambiar rápidamente el modo mantenimiento
  const toggleMaintenanceMode = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const newValue = !isEnabled;
      
      const response = await fetch('/api/maintenance/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Error al cambiar modo mantenimiento: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setIsEnabled(result.maintenanceMode);
        
        toast({
          title: `Modo mantenimiento ${result.maintenanceMode ? 'activado' : 'desactivado'}`,
          description: result.message || `El modo mantenimiento ha sido ${result.maintenanceMode ? 'activado' : 'desactivado'} correctamente.`,
        });
      } else {
        throw new Error(result.error || 'Error desconocido al cambiar modo mantenimiento');
      }
    } catch (err) {
      console.error('Error al cambiar modo mantenimiento:', err);
      setError('No se pudo cambiar el modo mantenimiento');
      
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el modo mantenimiento',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Función para guardar la configuración completa
  const saveMaintenanceConfig = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Preparar datos en el formato exacto que espera la API
      const configData = {
        maintenanceMode: isEnabled,
        maintenanceMessage: message,
        estimatedTime: estimatedTime
      };
      
      console.log("Enviando configuración:", configData);
      
      const response = await fetch('/api/maintenance/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Error al actualizar configuración: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Configuración guardada',
          description: 'La configuración de mantenimiento se ha guardado correctamente',
        });
        
        // Recargar la configuración para asegurar sincronización
        await loadMaintenanceConfig();
      } else {
        throw new Error(result.error || 'Error desconocido al guardar configuración');
      }
    } catch (err) {
      console.error('Error al guardar configuración de mantenimiento:', err);
      setError('No se pudo guardar la configuración de mantenimiento');
      
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Mantenimiento</CardTitle>
          <CardDescription>Cargando configuración...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Mantenimiento</CardTitle>
        <CardDescription>
          Controla cuándo el sitio está en modo mantenimiento y qué mensaje ven los usuarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <div>
            <h4 className="font-medium leading-none">Modo Mantenimiento</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Los administradores pueden seguir accediendo a la web en modo mantenimiento.
            </p>
          </div>
          <Switch 
            checked={isEnabled} 
            onCheckedChange={(checked) => setIsEnabled(checked)}
            disabled={isSaving}
          />
        </div>
        
        <div className="space-y-4 my-6">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Mensaje de mantenimiento
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mensaje que verán los usuarios"
              className="resize-none"
              disabled={isSaving}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">
              Tiempo estimado
            </label>
            <Input
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="Tiempo estimado para volver"
              disabled={isSaving}
            />
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            variant={isEnabled ? "destructive" : "default"}
            onClick={toggleMaintenanceMode}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : isEnabled ? (
              'Desactivar Modo Mantenimiento'
            ) : (
              'Activar Modo Mantenimiento'
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={saveMaintenanceConfig}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Configuración'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewMaintenanceControls;