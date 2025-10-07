import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Componente final para el modo mantenimiento que utiliza
 * axios para gestionar las peticiones HTTP de forma más robusta
 */
const FinalMaintenanceToggle: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasError, setHasError] = useState(false);
  const queryClient = useQueryClient();

  // Cargar el estado inicial
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Usar axios para una gestión más robusta de las solicitudes
        const response = await axios.get('/api/site/config/raw', {
          withCredentials: true,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        

        setIsEnabled(Boolean(response.data.maintenanceMode));
      } catch (error) {
        console.error("Error al cargar estado inicial:", error);
        setHasError(true);
        toast({
          title: "Error",
          description: "No se pudo cargar la configuración inicial",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialState();
  }, []);

  // Función para cambiar el estado del modo mantenimiento
  const toggleMaintenanceMode = async () => {
    try {
      setIsUpdating(true);
      setHasError(false);
      const newState = !isEnabled;
      

      
      // Obtener la configuración actual primero
      const configResponse = await axios.get('/api/site/config/raw', {
        withCredentials: true
      });
      
      const currentConfig = configResponse.data;
      
      // Actualizar la configuración
      const updateResponse = await axios.post('/api/site/config', {
        ...currentConfig,
        maintenanceMode: newState,
        maintenanceMessage: currentConfig.maintenanceMessage || "Estamos realizando mejoras en nuestra plataforma.",
        estimatedCompletion: currentConfig.estimatedCompletion || "Volveremos pronto"
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      

      
      // Actualizar el estado local
      setIsEnabled(newState);
      
      // Invalidar la consulta para que otros componentes se actualicen
      queryClient.invalidateQueries({ queryKey: ['/api/site/config'] });
      
      toast({
        title: "Configuración actualizada",
        description: `Modo mantenimiento ${newState ? 'activado' : 'desactivado'} correctamente`,
      });
    } catch (error) {
      console.error("Error al actualizar configuración:", error);
      setHasError(true);
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración. Por favor, verifica tu conexión e inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Mostrar spinner durante la carga inicial
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mostrar error si no se pudo cargar
  if (hasError && !isLoading) {
    return (
      <Card className="mb-6 border-red-500">
        <CardHeader>
          <CardTitle className="text-red-500">Modo Mantenimiento</CardTitle>
          <CardDescription>
            Ha ocurrido un error al cargar la configuración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Button 
              variant="outline"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`mb-6 ${hasError ? 'border-red-500' : ''}`}>
      <CardHeader>
        <CardTitle>Modo Mantenimiento</CardTitle>
        <CardDescription>
          Activa o desactiva el modo mantenimiento del sitio web
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Estado Actual:</div>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? 'Sitio en mantenimiento' : 'Sitio en funcionamiento normal'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={toggleMaintenanceMode}
              disabled={isUpdating}
              className="data-[state=checked]:bg-green-500"
            />
            <span className="font-medium text-sm">
              {isEnabled ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>
        
        <div className="mt-4">
          <Button 
            variant={isEnabled ? "destructive" : "default"}
            className="w-full"
            onClick={toggleMaintenanceMode}
            disabled={isUpdating}
          >
            {isUpdating ? (
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
        </div>
        
        {hasError && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
            Ha ocurrido un error. Por favor, intenta de nuevo o recarga la página.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinalMaintenanceToggle;