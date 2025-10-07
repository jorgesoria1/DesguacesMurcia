import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Database, CloudIcon, RefreshCw } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const ApiStatsCard: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar estadísticas básicas primero (súper rápidas)
  const { data: quickStats, isLoading: isLoadingQuick } = useQuery({
    queryKey: ['/api/dashboard/stats-quick'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats-quick');
      if (!response.ok) throw new Error('Error cargando estadísticas básicas');
      return response.json();
    },
    retry: 1,
    staleTime: 30000, // Cache por 30 segundos
  });

  // Cargar estadísticas completas de forma diferida
  const { data: fullStats, isLoading: isLoadingFull, error, refetch } = useQuery({
    queryKey: ['/api/dashboard/stats-local'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats-local');
      if (!response.ok) throw new Error('Error cargando estadísticas completas');
      return response.json();
    },
    enabled: !!quickStats, // Solo cargar después de quickStats
    refetchInterval: false,
    retry: 2,
  });

  // Usar quickStats si fullStats no está disponible aún
  const stats = fullStats || quickStats;
  const isLoading = isLoadingQuick;

  // Función para actualizar estadísticas completas (incluye API externa)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Actualizando estadísticas completas...');
      
      // Llamar al endpoint completo que maneja la API y actualiza el cache
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error(`Error al cargar estadísticas completas: ${response.status}`);
      }
      const data = await response.json();
      console.log('Complete stats data received:', data);

      // Actualizar el cache local con los nuevos datos
      const queryClient = (await import("@/lib/queryClient")).queryClient;
      queryClient.setQueryData(['/api/dashboard/stats-local'], data);
      
      // También refrescar los datos locales para reflejar los cambios
      await refetch();
      
      console.log('Estadísticas actualizadas exitosamente');
    } catch (error) {
      console.error('Error actualizando estadísticas:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-montserrat font-semibold mb-4">Estadísticas de datos</h3>
          <div className="p-4 bg-red-50 text-red-500 rounded-md">
            Error al cargar estadísticas. Intente nuevamente más tarde.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-montserrat font-semibold">
              Estadísticas de datos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {stats?.api?.vehiclesCount > 0 || stats?.api?.partsCount > 0 ? (
                <span className="text-green-600">
                  ✓ Datos de API disponibles{stats?.lastApiUpdate ? 
                    ` - Última actualización: ${formatDateTime(stats.lastApiUpdate)}` : 
                    stats?.timestamp ? ` - ${formatDateTime(stats.timestamp)}` : ''
                  }
                </span>
              ) : stats?.isLocal ? (
                <span className="text-orange-600">
                  ⚠️ Sin datos de API - Presiona "Actualizar" para consultar API externa
                </span>
              ) : (
                <span className="text-gray-600">
                  Datos locales - {stats?.timestamp ? 
                    formatDateTime(stats.timestamp) : 'ahora'
                  }
                </span>
              )}
            </p>
            {stats?.lastApiUpdate && (
              <p className="text-xs text-muted-foreground mt-1">
                Nota: Los datos locales pueden incluir importaciones posteriores a la última consulta de API.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-4 rounded-lg ${isLoading ? 'bg-gray-50' : 'bg-blue-50'}`}>
            <div className="flex items-center mb-2">
              <CloudIcon className={`h-5 w-5 mr-2 ${isLoading ? 'text-gray-400' : 'text-blue-600'}`} />
              <h4 className={`font-semibold ${isLoading ? 'text-gray-400' : 'text-blue-600'}`}>API Metasync</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Vehículos:</span>
                <span className="font-semibold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : stats?.api?.vehiclesCount > 0 ? (
                    stats.api.vehiclesCount
                  ) : (
                    <span className="text-orange-500">No disponible</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Piezas:</span>
                <span className="font-semibold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : stats?.api?.partsCount > 0 ? (
                    stats.api.partsCount
                  ) : (
                    <span className="text-orange-500">No disponible</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isLoading ? 'bg-gray-50' : 'bg-green-50'}`}>
            <div className="flex items-center mb-2">
              <Database className={`h-5 w-5 mr-2 ${isLoading ? 'text-gray-400' : 'text-green-600'}`} />
              <h4 className={`font-semibold ${isLoading ? 'text-gray-400' : 'text-green-600'}`}>Base de datos local</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Vehículos:</span>
                <div className="flex items-center">
                  <span className="font-semibold mr-2">
                    {isLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.database?.vehiclesCount || 0
                    )}
                  </span>
                  {!isLoading && stats?.api?.vehiclesCount > 0 && stats?.database?.vehiclesImportPercentage !== undefined ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      stats.database.vehiclesImportPercentage >= 90 ? 'bg-green-100 text-green-800' :
                      stats.database.vehiclesImportPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {stats.database.vehiclesImportPercentage}%
                    </span>
                  ) : !isLoading && stats?.api?.vehiclesCount === 0 ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      Sin API
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Piezas:</span>
                <div className="flex items-center">
                  <span className="font-semibold mr-2">
                    {isLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.database?.partsCount || 0
                    )}
                  </span>
                  {!isLoading && stats?.api?.partsCount > 0 && stats?.database?.partsImportPercentage !== undefined ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      stats.database.partsImportPercentage >= 90 ? 'bg-green-100 text-green-800' :
                      stats.database.partsImportPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {stats.database.partsImportPercentage}%
                    </span>
                  ) : !isLoading && stats?.api?.partsCount === 0 ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      Sin API
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        {stats && (
          <div className="mt-4">
            <div className="text-xs text-muted-foreground mb-2">
              <span className="font-semibold">Nota:</span> Los porcentajes se calculan respecto al total disponible en la API externa. Si no hay datos de API, se muestra "Sin API".
              {stats?.lastApiUpdate && (
                <div className="mt-1 text-orange-600">
                  ⚠️ Los datos locales pueden incluir importaciones posteriores a la última consulta de API.
                </div>
              )}
            </div>
            {!isLoading && stats && (
              <div className="mt-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    Última actualización: {formatDateTime(stats.timestamp)}
                  </p>
                  {stats.imports?.recent > 0 && (
                    <p className="text-xs text-green-600">
                      {stats.imports.recent} importaciones recientes
                    </p>
                  )}
                  {stats.sync?.lastSync && (
                    <p className="text-xs text-blue-600">
                      Última sincronización: {formatDateTime(stats.sync.lastSync)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiStatsCard;