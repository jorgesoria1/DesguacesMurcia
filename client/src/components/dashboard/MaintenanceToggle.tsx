import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Componente para controlar el modo mantenimiento desde el panel de administración
 */
const MaintenanceToggle = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estado local para los campos del formulario
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  // Obtener la configuración actual
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/maintenance/config'],
  });

  // Efecto para actualizar el estado local cuando llegan los datos
  React.useEffect(() => {
    if (config) {
      console.log('🔧 MAINTENANCE CONFIG: Datos recibidos del servidor:', config);
      setMaintenanceMode(config.maintenanceMode || false);
      setMaintenanceMessage(config.maintenanceMessage || '');
      setEstimatedTime(config.estimatedTime || '');
      console.log('🔧 MAINTENANCE CONFIG: Estado local actualizado:', {
        maintenanceMode: config.maintenanceMode || false,
        maintenanceMessage: config.maintenanceMessage || '',
        estimatedTime: config.estimatedTime || ''
      });
    }
  }, [config]);

  // Mutación para actualizar la configuración
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      console.log('🔧 MAINTENANCE: Enviando datos al servidor:', data);
      const response = await fetch('/api/maintenance/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ MAINTENANCE: Error del servidor:', errorText);
        throw new Error(errorText || 'Error al actualizar la configuración de mantenimiento');
      }
      
      const result = await response.json();
      console.log('✅ MAINTENANCE: Respuesta del servidor:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('✅ MAINTENANCE: Configuración actualizada exitosamente');
      
      // Invalidar la consulta para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance/config'] });
      
      toast({
        title: maintenanceMode ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado',
        description: 'La configuración se ha actualizado correctamente',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('❌ MAINTENANCE: Error actualizando configuración:', error);
      
      // Revertir cambios locales en caso de error
      if (config) {
        setMaintenanceMode(config.maintenanceMode || false);
        setMaintenanceMessage(config.maintenanceMessage || '');
        setEstimatedTime(config.estimatedTime || '');
      }
      
      toast({
        title: 'Error',
        description: 'Ha ocurrido un error al actualizar la configuración',
        variant: 'destructive',
      });
    }
  });

  // Manejar cambio inmediato del switch de mantenimiento
  const handleMaintenanceToggle = (newState: boolean) => {
    console.log(`🔧 MAINTENANCE TOGGLE: ${newState ? 'activando' : 'desactivando'} modo mantenimiento`);
    
    // Actualizar estado local inmediatamente
    setMaintenanceMode(newState);
    
    // Enviar cambio inmediatamente al servidor
    const data = {
      maintenanceMode: newState,
      maintenanceMessage,
      estimatedTime,
    };
    
    mutate(data);
  };

  // Manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Preparar los datos para enviar
    const data = {
      maintenanceMode,
      maintenanceMessage,
      estimatedTime,
    };
    
    // Ejecutar la mutación
    mutate(data);
  };

  if (isLoadingConfig) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Modo Mantenimiento</CardTitle>
        <CardDescription>
          Activa el modo mantenimiento para realizar tareas de actualización o mantenimiento.
          Solo los administradores podrán acceder al sitio mientras esté activo.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {maintenanceMode && (
            <Alert variant="warning" className="bg-amber-50 border-amber-500">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                El modo mantenimiento está activado. Los usuarios normales no pueden acceder al sitio.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center space-x-2">
            <Switch
              id="maintenance-mode"
              checked={maintenanceMode}
              onCheckedChange={handleMaintenanceToggle}
            />
            <Label htmlFor="maintenance-mode" className="font-medium">
              {maintenanceMode ? 'Activado' : 'Desactivado'}
            </Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maintenance-message">Mensaje de mantenimiento</Label>
            <Textarea
              id="maintenance-message"
              placeholder="Ingrese un mensaje informativo sobre el mantenimiento..."
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="resize-none"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estimated-time">Tiempo estimado</Label>
            <Input
              id="estimated-time"
              type="text"
              placeholder="Ej: 30 minutos, 2 horas, etc."
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button type="submit" disabled={isPending} className="ml-auto">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar configuración
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default MaintenanceToggle;