import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Calendar, Database, RefreshCw, Clock } from "lucide-react";
import { importApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Tipo para el estado de sincronización
type SyncStatusType = {
  type: string;
  lastSyncDate: string;
  lastId: number;
  recordsProcessed: number;
  active: boolean;
  updatedAt: string;
};

type SyncStatusComponentProps = {
  refreshInterval?: number; // tiempo en ms para refrescar datos (por defecto 30 segundos)
  autoRefresh?: boolean; // activar o desactivar la actualización automática
};

const SyncStatus: React.FC<SyncStatusComponentProps> = ({
  refreshInterval = 30000,
  autoRefresh = false
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ vehicles?: SyncStatusType, parts?: SyncStatusType } | null>(null);
  const [dbCounts, setDbCounts] = useState<{ vehicles: number, parts: number }>({ vehicles: 0, parts: 0 });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [lastUIRefresh, setLastUIRefresh] = useState<Date>(new Date());

  // Función para cargar el estado de sincronización
  const loadSyncStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Cargando estado de sincronización...');
      const response = await importApi.getSyncStatus();

      console.log('📊 Respuesta del sync-status:', response);

      // Validar que la respuesta tenga la estructura esperada
      if (response && typeof response === 'object') {
        // Formatear los datos de sincronización
        const formattedStatus: { vehicles?: SyncStatusType, parts?: SyncStatusType } = {};

        // Verificar si hay datos de sincronización en la respuesta
        if (response.vehicles) {
          formattedStatus.vehicles = response.vehicles;
        }
        if (response.parts) {
          formattedStatus.parts = response.parts;
        }
        
        if (!response.vehicles && !response.parts) {
          console.warn('⚠️ No se encontraron datos de sincronización en la respuesta');
        }

        setSyncStatus(formattedStatus);
        setDbCounts(response.dbCounts || { vehicles: 0, parts: 0 });
        setLastRefresh(new Date());
        setLastDataUpdate(new Date()); // Actualizar la fecha de última actualización de datos

        console.log('✅ Estado de sincronización cargado:', {
          vehiclesSync: !!formattedStatus.vehicles,
          partsSync: !!formattedStatus.parts,
          dbCounts: response.dbCounts
        });
      } else {
        console.error('❌ Respuesta inválida del servidor:', response);
        setError("Respuesta inválida del servidor");
      }
    } catch (err) {
      console.error("Error al cargar estado de sincronización:", err);
      setError("Error al cargar el estado de sincronización");
    } finally {
      setLoading(false);
      setLastUIRefresh(new Date()); // Actualizar la fecha de última actualización de la interfaz de usuario
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (autoRefresh) {
      loadSyncStatus();
    } else {
      loadSyncStatus(); // Cargar al inicio aunque autoRefresh sea falso
    }

    // Configurar intervalo de actualización
    const intervalId = autoRefresh ? setInterval(loadSyncStatus, refreshInterval) : null;

    // Limpiar intervalo al desmontar
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInterval, autoRefresh, loadSyncStatus]);

  // Función para calcular el progreso de importación (estimado)
  const calculateProgress = (processed: number, total: number): number => {
    if (total === 0) return 0;
    const progress = (processed / total) * 100;
    return Math.min(progress, 100); // Asegurar que no pase de 100%
  };

  // Formatear tiempo transcurrido desde una fecha
  const formatTimeSince = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      return `hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    } else {
      return 'hace unos segundos';
    }
  };

  // Formatear fecha de sincronización
  const formatSyncDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return formatDateTime(date);
    } catch {
      return 'Fecha inválida';
    }
  };

  // Handler para la actualización manual
  const handleManualRefresh = () => {
    loadSyncStatus();
  };

  if (loading && !syncStatus) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !syncStatus) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-red-500 p-4 text-center">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="h-5 w-5 mr-2 text-green-500" />
            Estado de sincronización
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {lastDataUpdate 
                ? `Datos actualizados ${formatTimeSince(lastDataUpdate)}`
                : lastUIRefresh 
                  ? `Consultado ${formatTimeSince(lastUIRefresh)}`
                  : 'Sin datos'
              }
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh} 
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Sección de vehículos */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Vehículos</h4>
            <div className="bg-slate-50 p-3 rounded-md">
              <div className="flex justify-between items-start mb-2">
                <span className="flex items-center font-medium">
                  <Database className="h-4 w-4 mr-1 text-slate-500" />
                  {dbCounts.vehicles.toLocaleString()} vehículos
                </span>
                {syncStatus?.vehicles && syncStatus.vehicles.recordsProcessed && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Última sync: {formatSyncDate(syncStatus.vehicles.lastSyncDate)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Procesados: {syncStatus.vehicles.recordsProcessed.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
              <Progress
                value={dbCounts.vehicles > 0 ? 100 : 0}
                className="h-2"
              />
            </div>
          </div>

          {/* Sección de piezas */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Piezas</h4>
            <div className="bg-slate-50 p-3 rounded-md">
              <div className="flex justify-between items-start mb-2">
                <span className="flex items-center font-medium">
                  <Database className="h-4 w-4 mr-1 text-slate-500" />
                  {dbCounts.parts.toLocaleString()} piezas
                </span>
                {syncStatus?.parts && syncStatus.parts.recordsProcessed && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Última sync: {formatSyncDate(syncStatus.parts.lastSyncDate)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Procesados: {syncStatus.parts.recordsProcessed.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
              <Progress
                value={dbCounts.parts > 0 ? 100 : 0}
                className="h-2"
              />
            </div>
          </div>

          {/* Información adicional */}
          {autoRefresh && (
            <div className="text-xs text-muted-foreground text-center p-2 bg-blue-50 rounded-md">
              🔄 Actualización automática activa cada {Math.round(refreshInterval / 1000)} segundos
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncStatus;