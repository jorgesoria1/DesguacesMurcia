/**
 * Componente para gestionar el modo mantenimiento desde el panel de administración
 * Este componente permite a los administradores activar/desactivar el modo mantenimiento
 * y establecer mensajes personalizados
 */

import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MaintenanceControls = () => {
  // Estados para gestionar el modo mantenimiento
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState('Estamos realizando mejoras en nuestra plataforma.');
  const [estimatedTime, setEstimatedTime] = useState('Volveremos pronto');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar la configuración actual al montar el componente
  useEffect(() => {
    async function loadMaintenanceConfig() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/maintenance/config');
        
        if (!response.ok) {
          throw new Error(`Error al cargar configuración: ${response.status}`);
        }
        
        const config = await response.json();
        setIsEnabled(config.maintenanceMode);
        setMessage(config.maintenanceMessage || 'Estamos realizando mejoras en nuestra plataforma.');
        setEstimatedTime(config.estimatedTime || 'Volveremos pronto');
      } catch (err) {
        console.error('Error al cargar configuración de mantenimiento:', err);
        setError('No se pudo cargar la configuración de mantenimiento');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadMaintenanceConfig();
  }, []);

  // Función para alternar rápidamente el modo mantenimiento
  const toggleMaintenanceMode = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const response = await fetch('/api/maintenance/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al cambiar modo mantenimiento: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Actualizar estado local
      setIsEnabled(result.maintenanceMode);
      
      // Mostrar notificación
      toast({
        title: 'Modo mantenimiento actualizado',
        description: result.message,
        variant: result.maintenanceMode ? 'destructive' : 'default',
      });
    } catch (err) {
      console.error('Error al cambiar modo mantenimiento:', err);
      setError('No se pudo cambiar el modo mantenimiento');
      
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el modo mantenimiento',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Función para guardar la configuración completa
  const saveMaintenanceConfig = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const response = await fetch('/api/maintenance/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maintenanceMode: isEnabled,
          maintenanceMessage: message,
          estimatedTime: estimatedTime
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar configuración: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Mostrar notificación
      toast({
        title: 'Configuración guardada',
        description: 'La configuración de mantenimiento se ha guardado correctamente',
        variant: 'default',
      });
    } catch (err) {
      console.error('Error al guardar configuración de mantenimiento:', err);
      setError('No se pudo guardar la configuración de mantenimiento');
      
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Renderizado condicional para estados de carga/error
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Modo Mantenimiento</CardTitle>
          <CardDescription>
            Cargando configuración...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Modo Mantenimiento</CardTitle>
        <CardDescription>
          Controla el acceso público a la plataforma. En modo mantenimiento, solo los administradores podrán acceder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-medium">Estado Actual:</div>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? 'Sitio en mantenimiento' : 'Sitio en funcionamiento normal'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => setIsEnabled(checked)}
              disabled={isUpdating}
              className="data-[state=checked]:bg-red-500"
            />
            <span className="font-medium text-sm">
              {isEnabled ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>
        
        <Alert variant="info" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Información</AlertTitle>
          <AlertDescription>
            Los administradores pueden seguir accediendo a la web en modo mantenimiento. 
            Este modo afecta solo a usuarios normales.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Mensaje de mantenimiento
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mensaje que verán los usuarios"
              className="resize-none"
              disabled={isUpdating}
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
              disabled={isUpdating}
            />
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            variant={isEnabled ? "destructive" : "default"}
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
          
          <Button 
            variant="outline"
            onClick={saveMaintenanceConfig}
            disabled={isUpdating}
          >
            {isUpdating ? (
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

export default MaintenanceControls;