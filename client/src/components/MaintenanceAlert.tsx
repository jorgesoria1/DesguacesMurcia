import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

/**
 * Componente que muestra una alerta cuando el sitio está en modo mantenimiento
 * Solo visible para administradores, para recordarles que el sitio está en mantenimiento
 */
const MaintenanceAlert = () => {
  const { user } = useAuth();
  
  // Solo mostrar para administradores
  const isAdmin = user?.isAdmin === true;

  // Obtener la configuración de mantenimiento
  const { data, isLoading } = useQuery({
    queryKey: ['/api/maintenance/config'],
    enabled: isAdmin, // Solo hacer la consulta si es administrador
    refetchInterval: 60000, // Actualizar cada minuto
  });

  // Si no es admin o está cargando, no mostrar nada
  if (!isAdmin || isLoading) {
    return null;
  }

  // Si no está en modo mantenimiento, no mostrar nada
  if (!data?.maintenanceMode) {
    return null;
  }

  return (
    <Alert variant="warning" className="rounded-none border-l-0 border-r-0 border-t-0 border-b border-amber-500 bg-amber-50">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
          <AlertDescription className="text-amber-700 font-medium">
            El sitio está en modo mantenimiento. 
            {data.maintenanceMessage && (
              <span className="ml-1">
                Mensaje: {data.maintenanceMessage}
              </span>
            )}
          </AlertDescription>
        </div>
        
        {data.estimatedTime && (
          <div className="flex items-center text-amber-700 text-sm">
            <Clock className="h-3 w-3 mr-1" />
            <span>Tiempo estimado: {data.estimatedTime}</span>
          </div>
        )}
      </div>
    </Alert>
  );
};

export default MaintenanceAlert;