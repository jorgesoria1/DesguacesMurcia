import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, Download, Upload, Clock, Calendar, Settings, AlertTriangle, CheckCircle, XCircle, Pause, Play, Square, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

import Sidebar from "@/components/dashboard/Sidebar";
import ImportHistoryTable from "@/components/ImportHistoryTable";
import ApiStatsCard from "@/components/dashboard/ApiStatsCard";
import SyncStatus from "@/components/dashboard/SyncStatus";
import { ImportControlPanel } from "@/components/ImportControlPanel";

import { importApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

interface ImportStats {
  totalItems: number;
  newItems: number;
  updatedItems: number;
  errorCount: number;
  lastImport?: string;
}

interface ScheduleConfig {
  id?: number;
  type: 'vehicles' | 'parts' | 'all';
  frequency: string;
  active: boolean;
  isFullImport?: boolean;
  nextRun?: string;
  lastRun?: string;
  days?: string[];
}

const AdminImportOptimized = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  // Estados de importación - control granular por tipo y modalidad
  const [isImporting, setIsImporting] = useState({
    vehiclesIncremental: false,
    vehiclesComplete: false,
    partsIncremental: false,
    partsComplete: false,
    allComplete: false,
    allIncremental: false,
    updateCounters: false
  });

  // Estados de programación
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [newSchedule, setNewSchedule] = useState<ScheduleConfig>({
    type: 'vehicles',
    frequency: '12h',
    active: true,
    isFullImport: false,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });
  const [editingSchedule, setEditingSchedule] = useState<ScheduleConfig | null>(null);

  // Estados de configuración
  const [importConfig, setImportConfig] = useState({
    fromDate: undefined as Date | undefined,
    fullImport: false,
    batchSize: 1000,
    autoRecovery: true
  });

  // Estados de monitoreo
  const [activeImports, setActiveImports] = useState<any[]>([]);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("import");

  // Estados de diagnóstico del sistema
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<{
    apiConnection: boolean;
    databaseConnection: boolean;
    schedulerStatus: boolean;
    diskSpace: string;
    memoryUsage: string;
    lastChecked: string;
  } | null>(null);

  // Obtener historial de importaciones
  const { 
    data: importHistory, 
    isLoading: isLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['/api/import/history'],
    queryFn: () => importApi.getHistory(20),
    refetchInterval: autoRefreshEnabled ? 5000 : false
  });

  // Obtener programaciones
  const { 
    data: schedulesData, 
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules
  } = useQuery({
    queryKey: ['/api/import/schedule'],
    queryFn: () => importApi.getSchedules(),
    refetchInterval: autoRefreshEnabled ? 10000 : false
  });

  // Obtener estadísticas
  const { 
    data: stats, 
    refetch: refetchStats,
    error: statsError
  } = useQuery({
    queryKey: ['/api/import/stats'],
    queryFn: () => importApi.getImportStats(),
    refetchInterval: autoRefreshEnabled ? 30000 : false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  useEffect(() => {
    if (schedulesData) {
      setSchedules(schedulesData as ScheduleConfig[]);
    }
  }, [schedulesData]);

  useEffect(() => {
    if (!importHistory) return;

    const hasActive = importHistory.some(item => 
      item.status === 'in_progress' || item.status === 'processing'
    );

    setAutoRefreshActive(hasActive);
    setActiveImports(importHistory.filter(item => 
      item.status === 'in_progress' || item.status === 'processing'
    ));
  }, [importHistory]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive"
      });
    }
  };

  const handleImport = async (type: 'vehicles' | 'parts' | 'all', fullImport: boolean = false) => {
    try {
      // Determinar la clave de estado específica
      const stateKey = getImportStateKey(type, fullImport);
      setIsImporting(prev => ({ ...prev, [stateKey]: true }));

      const options = {
        fromDate: !fullImport && importConfig.fromDate ? format(importConfig.fromDate, 'yyyy-MM-dd') : undefined,
        fullImport,
        batchSize: importConfig.batchSize,
        autoRecovery: importConfig.autoRecovery
      };

      // Use existing working import system
      await importApi.startOptimizedImport(type, options);

      const importTypeText = 
        type === "vehicles" ? "vehículos" :
        type === "parts" ? "piezas" :
        "vehículos y piezas";

      toast({
        title: "Importación iniciada",
        description: `La importación ${fullImport ? 'completa' : 'incremental'} de ${importTypeText} ha comenzado`,
      });

      // Cambiar automáticamente a la pestaña de monitoreo
      setActiveTab("monitor");

      refetchHistory();
      refetchStats();
    } catch (error) {
      console.error("Error al iniciar importación:", error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la importación",
        variant: "destructive"
      });
    } finally {
      // Resetear el estado específico después de un breve delay
      setTimeout(() => {
        const stateKey = getImportStateKey(type, fullImport);
        setIsImporting(prev => ({ ...prev, [stateKey]: false }));
      }, 2000);
    }
  };

  // Función auxiliar para determinar la clave de estado
  const getImportStateKey = (type: 'vehicles' | 'parts' | 'all', fullImport: boolean) => {
    if (type === 'vehicles') {
      return fullImport ? 'vehiclesComplete' : 'vehiclesIncremental';
    } else if (type === 'parts') {
      return fullImport ? 'partsComplete' : 'partsIncremental';
    } else {
      return fullImport ? 'allComplete' : 'allIncremental';
    }
  };

  const handleUpdateCounters = async () => {
    try {
      setIsImporting(prev => ({ ...prev, updateCounters: true }));
      
      const response = await fetch('/api/import/update-vehicle-counters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al actualizar contadores');
      }

      const result = await response.json();
      
      toast({
        title: "Contadores actualizados",
        description: "Los contadores de piezas en vehículos se han actualizado correctamente",
      });

      refetchStats();
      refetchHistory();
      
    } catch (error) {
      console.error('Error al actualizar contadores:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los contadores de piezas",
        variant: "destructive"
      });
    } finally {
      setIsImporting(prev => ({ ...prev, updateCounters: false }));
    }
  };

  const handleScheduleImport = async () => {
    try {
      await importApi.createSchedule(newSchedule);

      const modalidadText = newSchedule.isFullImport ? 'completa' : 'incremental';
      toast({
        title: "Programación creada",
        description: `Importación ${modalidadText} de ${newSchedule.type} programada cada ${newSchedule.frequency}`,
      });

      refetchSchedules();
      setNewSchedule({
        type: 'vehicles',
        frequency: '12h',
        active: true,
        isFullImport: false,
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      });
    } catch (error) {
      console.error("Error al programar importación:", error);
      toast({
        title: "Error",
        description: "No se pudo programar la importación",
        variant: "destructive"
      });
    }
  };

  const handleUpdateSchedule = async (scheduleId: number, updates: Partial<ScheduleConfig>) => {
    try {
      await importApi.updateScheduleConfig(scheduleId, updates);

      toast({
        title: "Programación actualizada",
        description: "La programación ha sido actualizada correctamente",
      });

      refetchSchedules();
      setEditingSchedule(null);
    } catch (error) {
      console.error("Error al actualizar programación:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la programación",
        variant: "destructive"
      });
    }
  };

  const handleEditSchedule = (schedule: ScheduleConfig) => {
    setEditingSchedule(schedule);
  };

  const handleCancelEdit = () => {
    setEditingSchedule(null);
  };

  // Función para ejecutar diagnósticos del sistema
  const handleRunDiagnostics = async () => {
    setDiagnosticsLoading(true);
    
    try {
      const [apiTest, rawVehicles, rawParts] = await Promise.all([
        fetch('/api/diagnostic', { credentials: 'include' }),
        fetch('/api/raw/vehicles', { credentials: 'include' }),
        fetch('/api/raw/parts', { credentials: 'include' })
      ]);

      const results = {
        apiConnection: apiTest.ok,
        databaseConnection: rawVehicles.ok && rawParts.ok,
        schedulerStatus: true, // Asumimos que el scheduler está funcionando si las programaciones existen
        diskSpace: 'Suficiente', // Valor por defecto
        memoryUsage: 'Normal', // Valor por defecto
        lastChecked: new Date().toISOString()
      };

      setDiagnosticsData(results);

      if (results.apiConnection && results.databaseConnection) {
        toast({
          title: "Diagnóstico completado",
          description: "Todos los sistemas están funcionando correctamente",
        });
      } else {
        toast({
          title: "Problemas detectados",
          description: "Se encontraron problemas en algunos sistemas",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error en diagnósticos:', error);
      toast({
        title: "Error en diagnósticos",
        description: "No se pudo completar el diagnóstico del sistema",
        variant: "destructive"
      });
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleControlImport = async (importId: number, action: 'pause' | 'resume' | 'cancel' | 'delete') => {
    try {
      console.log(`Ejecutando acción ${action} para importación ID: ${importId}`);
      
      if (action === 'pause') {
        await importApi.pauseImportOperation(importId);
      } else if (action === 'resume') {
        await importApi.resumeImportOperation(importId);
      } else if (action === 'cancel') {
        await importApi.cancelImportOperation(importId);
      } else if (action === 'delete') {
        const result = await importApi.deleteImportFromHistory(importId);
        console.log('Resultado de eliminación:', result);
      }

      const actionText = {
        pause: 'pausada',
        resume: 'reanudada',
        cancel: 'cancelada',
        delete: 'eliminada'
      }[action];

      toast({
        title: "Importación " + actionText,
        description: `La importación ha sido ${actionText} correctamente`,
      });

      refetchHistory();
    } catch (error) {
      console.error(`Error al ${action} importación:`, error);
      console.error('Error details:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `No se pudo ${action} la importación`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteAllHistory = async () => {
    try {
      await importApi.deleteAllImportHistory();
      toast({
        title: "Historial eliminado",
        description: "Todo el historial de importaciones ha sido eliminado correctamente",
      });
      refetchHistory();
      refetchStats();
    } catch (error) {
      console.error("Error al eliminar historial:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el historial de importaciones",
        variant: "destructive"
      });
    }
  };

  const handleClearStatistics = async () => {
    try {
      await importApi.clearImportStatistics();
      toast({
        title: "Estadísticas limpiadas",
        description: "Las estadísticas de importación han sido reiniciadas",
      });
      refetchStats();
    } catch (error) {
      console.error("Error al limpiar estadísticas:", error);
      toast({
        title: "Error",
        description: "No se pudieron limpiar las estadísticas",
        variant: "destructive"
      });
    }
  };

  const toggleSchedule = async (scheduleId: number, active: boolean) => {
    try {
      await importApi.updateScheduleConfig(scheduleId, { active });

      toast({
        title: active ? "Programación activada" : "Programación desactivada",
        description: `La programación ha sido ${active ? 'activada' : 'desactivada'}`,
      });

      refetchSchedules();
    } catch (error) {
      console.error("Error al actualizar programación:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la programación",
        variant: "destructive"
      });
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      await importApi.deleteSchedule(id);
      refetchSchedules();
      toast({
        title: "Programación eliminada",
        description: "La programación ha sido eliminada correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar programación:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la programación",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoadingSchedules) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Importación Optimizada</h1>
            <p className="text-muted-foreground">
              Sistema avanzado de importación y sincronización de datos
              {autoRefreshEnabled && (
                <span className="ml-2 inline-flex items-center text-green-600 font-medium">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Actualización automática activa
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        {/* Alertas de importaciones activas */}
        {activeImports.length > 0 && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Hay {activeImports.length} importación(es) en curso. 
              {autoRefreshEnabled ? ' La página se actualiza automáticamente cada 5 segundos.' : ' Active la actualización automática en Configuración para monitoreo en tiempo real.'}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="import">Importación</TabsTrigger>
            <TabsTrigger value="schedule">Programación</TabsTrigger>
            <TabsTrigger value="monitor">Monitoreo</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          {/* Tab de Importación */}
          <TabsContent value="import" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <SyncStatus />
              <ApiStatsCard />
            </div>

            {/* Configuración de importación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Importación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Importar desde (fecha)</Label>
                    <DatePicker
                      value={importConfig.fromDate}
                      onChange={(date: Date | undefined) => setImportConfig(prev => ({ ...prev, fromDate: date }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tamaño de lote</Label>
                    <Select
                      value={importConfig.batchSize.toString()}
                      onValueChange={(value) => setImportConfig(prev => ({ ...prev, batchSize: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">500 elementos</SelectItem>
                        <SelectItem value="1000">1000 elementos</SelectItem>
                        <SelectItem value="2000">2000 elementos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="fullImport"
                    checked={importConfig.fullImport}
                    onCheckedChange={(checked) => setImportConfig(prev => ({ ...prev, fullImport: checked }))}
                  />
                  <Label htmlFor="fullImport">Importación completa (todos los datos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoRecovery"
                    checked={importConfig.autoRecovery}
                    onCheckedChange={(checked) => setImportConfig(prev => ({ ...prev, autoRecovery: checked }))}
                  />
                  <Label htmlFor="autoRecovery">Recuperación automática de errores</Label>
                </div>
              </CardContent>
            </Card>

            {/* Controles de importación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Vehículos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleImport('vehicles', false)}
                      disabled={isImporting.vehiclesIncremental || isImporting.vehiclesComplete}
                      className="w-full"
                    >
                      {isImporting.vehiclesIncremental ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Importación Incremental
                    </Button>
                    <Button
                      onClick={() => handleImport('vehicles', true)}
                      disabled={isImporting.vehiclesIncremental || isImporting.vehiclesComplete}
                      variant="outline"
                      className="w-full"
                    >
                      {isImporting.vehiclesComplete ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Importación Completa
                    </Button>
                  </div>
                  {stats?.vehicles && (
                    <div className="text-sm text-muted-foreground">
                      <p>Total: {stats.vehicles.totalItems}</p>
                      <p>Nuevos: {stats.vehicles.newItems}</p>
                      <p>Actualizados: {stats.vehicles.updatedItems}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Piezas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleImport('parts', false)}
                      disabled={isImporting.partsIncremental || isImporting.partsComplete}
                      className="w-full"
                    >
                      {isImporting.partsIncremental ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Importación Incremental
                    </Button>
                    <Button
                      onClick={() => handleImport('parts', true)}
                      disabled={isImporting.partsIncremental || isImporting.partsComplete}
                      variant="outline"
                      className="w-full"
                    >
                      {isImporting.partsComplete ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Importación Completa
                    </Button>
                  </div>
                  {stats?.parts && (
                    <div className="text-sm text-muted-foreground">
                      <p>Total: {stats.parts.totalItems}</p>
                      <p>Nuevas: {stats.parts.newItems}</p>
                      <p>Actualizadas: {stats.parts.updatedItems}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Todo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleImport('all', false)}
                      disabled={isImporting.allIncremental || isImporting.allComplete}
                      className="w-full"
                    >
                      {isImporting.allIncremental ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Importación Incremental
                    </Button>
                    <Button
                      onClick={() => handleImport('all', true)}
                      disabled={isImporting.allIncremental || isImporting.allComplete}
                      variant="outline"
                      className="w-full"
                    >
                      {isImporting.allComplete ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Importación Completa
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Importa vehículos y piezas en secuencia optimizada</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Mantenimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      onClick={handleUpdateCounters}
                      disabled={isImporting.updateCounters}
                      variant="secondary"
                      className="w-full"
                    >
                      {isImporting.updateCounters ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Actualizar Contadores
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Actualiza los contadores de piezas en vehículos</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab de Programación */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Nueva Programación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de importación</Label>
                    <Select
                      value={newSchedule.type}
                      onValueChange={(value: 'vehicles' | 'parts' | 'all') => 
                        setNewSchedule(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vehicles">Vehículos</SelectItem>
                        <SelectItem value="parts">Piezas</SelectItem>
                        <SelectItem value="all">Todo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Modalidad</Label>
                    <Select
                      value={newSchedule.isFullImport ? 'complete' : 'incremental'}
                      onValueChange={(value) => 
                        setNewSchedule(prev => ({ ...prev, isFullImport: value === 'complete' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incremental">
                          <div className="flex flex-col">
                            <span className="font-medium">Incremental</span>
                            <span className="text-xs text-muted-foreground">Últimos 7 días</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="complete">
                          <div className="flex flex-col">
                            <span className="font-medium">Completa</span>
                            <span className="text-xs text-muted-foreground">Todos los datos</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frecuencia</Label>
                    <Select
                      value={newSchedule.frequency}
                      onValueChange={(value) => setNewSchedule(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">Cada hora</SelectItem>
                        <SelectItem value="6h">Cada 6 horas</SelectItem>
                        <SelectItem value="12h">Cada 12 horas</SelectItem>
                        <SelectItem value="24h">Diariamente</SelectItem>
                        <SelectItem value="7d">Semanalmente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Hora de inicio</Label>
                    <Input
                      type="time"
                      value={newSchedule.startTime || "02:00"}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Hora específica para iniciar las sincronizaciones programadas (formato 24h)
                    </p>
                  </div>
                  
                  {(newSchedule.frequency === '24h' || newSchedule.frequency === '7d') && (
                    <div className="space-y-2">
                      <Label>Días de la semana</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'monday', label: 'Lun' },
                          { value: 'tuesday', label: 'Mar' },
                          { value: 'wednesday', label: 'Mié' },
                          { value: 'thursday', label: 'Jue' },
                          { value: 'friday', label: 'Vie' },
                          { value: 'saturday', label: 'Sáb' },
                          { value: 'sunday', label: 'Dom' }
                        ].map((day) => (
                          <div key={day.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={day.value}
                              checked={newSchedule.days?.includes(day.value) || false}
                              onCheckedChange={(checked) => {
                                const currentDays = newSchedule.days || [];
                                if (checked) {
                                  setNewSchedule({
                                    ...newSchedule,
                                    days: [...currentDays, day.value]
                                  });
                                } else {
                                  setNewSchedule({
                                    ...newSchedule,
                                    days: currentDays.filter(d => d !== day.value)
                                  });
                                }
                              }}
                            />
                            <Label htmlFor={day.value} className="text-sm">
                              {day.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button onClick={handleScheduleImport} className="w-full">
                      <Calendar className="mr-2 h-4 w-4" />
                      Programar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Programaciones Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="p-4 border rounded-lg">
                      {editingSchedule && editingSchedule.id === schedule.id ? (
                        // Formulario de edición
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Frecuencia</Label>
                              <Select
                                value={editingSchedule.frequency}
                                onValueChange={(value) => setEditingSchedule({...editingSchedule, frequency: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1h">Cada hora</SelectItem>
                                  <SelectItem value="6h">Cada 6 horas</SelectItem>
                                  <SelectItem value="12h">Cada 12 horas</SelectItem>
                                  <SelectItem value="24h">Diariamente</SelectItem>
                                  <SelectItem value="7d">Semanalmente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo de importación</Label>
                              <Select
                                value={editingSchedule.isFullImport ? 'complete' : 'incremental'}
                                onValueChange={(value) => setEditingSchedule({...editingSchedule, isFullImport: value === 'complete'})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="incremental">Incremental</SelectItem>
                                  <SelectItem value="complete">Completa</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Hora de inicio</Label>
                              <Input
                                type="time"
                                value={editingSchedule.startTime || "02:00"}
                                onChange={(e) => setEditingSchedule({...editingSchedule, startTime: e.target.value})}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                Hora específica para iniciar las sincronizaciones programadas (formato 24h)
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Estado</Label>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={editingSchedule.active}
                                  onCheckedChange={(checked) => setEditingSchedule({...editingSchedule, active: checked})}
                                />
                                <Label>{editingSchedule.active ? 'Activa' : 'Inactiva'}</Label>
                              </div>
                            </div>
                          </div>
                          
                          {(editingSchedule.frequency === '24h' || editingSchedule.frequency === '7d') && (
                            <div className="space-y-2">
                              <Label>Días de la semana</Label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { value: 'monday', label: 'Lun' },
                                  { value: 'tuesday', label: 'Mar' },
                                  { value: 'wednesday', label: 'Mié' },
                                  { value: 'thursday', label: 'Jue' },
                                  { value: 'friday', label: 'Vie' },
                                  { value: 'saturday', label: 'Sáb' },
                                  { value: 'sunday', label: 'Dom' }
                                ].map((day) => (
                                  <div key={day.value} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-${day.value}`}
                                      checked={editingSchedule.days?.includes(day.value) || false}
                                      onCheckedChange={(checked) => {
                                        const currentDays = editingSchedule.days || [];
                                        if (checked) {
                                          setEditingSchedule({
                                            ...editingSchedule,
                                            days: [...currentDays, day.value]
                                          });
                                        } else {
                                          setEditingSchedule({
                                            ...editingSchedule,
                                            days: currentDays.filter(d => d !== day.value)
                                          });
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`edit-${day.value}`} className="text-sm">
                                      {day.label}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleUpdateSchedule(schedule.id!, editingSchedule)}
                              className="bg-primary hover:bg-secondary"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Guardar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Vista normal
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(schedule.active ? 'completed' : 'paused')}
                              <Badge variant={schedule.active ? 'default' : 'secondary'}>
                                {schedule.type.toUpperCase()}
                              </Badge>
                              <Badge variant={schedule.isFullImport ? 'destructive' : 'outline'}>
                                {schedule.isFullImport ? 'Completa' : 'Incremental'}
                              </Badge>
                            </div>
                            <div>
                              <p className="font-medium">Cada {schedule.frequency}</p>
                              <p className="text-sm text-muted-foreground">
                                {schedule.isFullImport ? 'Todos los datos' : 'Últimos 7 días'}
                                {schedule.lastRun && ` • Última: ${new Date(schedule.lastRun).toLocaleString()}`}
                                {schedule.nextRun && ` • Próxima: ${new Date(schedule.nextRun).toLocaleString()}`}
                              </p>
                              {schedule.days && schedule.days.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Días: {schedule.days.map(day => {
                                    const dayNames = {
                                      monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', 
                                      thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom'
                                    };
                                    return dayNames[day as keyof typeof dayNames];
                                  }).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSchedule(schedule)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Switch
                              checked={schedule.active}
                              onCheckedChange={(checked) => toggleSchedule(schedule.id!, checked)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSchedule(schedule.id!)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {schedules.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hay programaciones configuradas
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Monitoreo */}
          <TabsContent value="monitor" className="space-y-6">
            <ImportControlPanel 
              importHistory={importHistory || []}
              onControlImport={handleControlImport}
              onDeleteAllHistory={handleDeleteAllHistory}
            />
          </TabsContent>

          {/* Tab de Configuración */}
          <TabsContent value="config" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración del Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoRefreshEnabled"
                      checked={autoRefreshEnabled}
                      onCheckedChange={setAutoRefreshEnabled}
                    />
                    <Label htmlFor="autoRefreshEnabled">
                      Actualización automática de datos
                      <span className="block text-xs text-muted-foreground">
                        Actualiza automáticamente el historial y estado de las importaciones
                      </span>
                    </Label>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Intervalo de actualización automática</Label>
                    <Select defaultValue="5000">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2000">2 segundos</SelectItem>
                        <SelectItem value="5000">5 segundos</SelectItem>
                        <SelectItem value="10000">10 segundos</SelectItem>
                        <SelectItem value="30000">30 segundos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Tiempo límite de importación</Label>
                    <Select defaultValue="3600">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1800">30 minutos</SelectItem>
                        <SelectItem value="3600">1 hora</SelectItem>
                        <SelectItem value="7200">2 horas</SelectItem>
                        <SelectItem value="14400">4 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Estadísticas Generales</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearStatistics}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpiar Estadísticas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{stats.totalImports || 0}</p>
                          <p className="text-sm text-muted-foreground">Importaciones totales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{stats.successRate || 0}%</p>
                          <p className="text-sm text-muted-foreground">Tasa de éxito</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Última importación:</span>{" "}
                          {stats.lastImport ? new Date(stats.lastImport).toLocaleString() : 'Nunca'}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Próxima programada:</span>{" "}
                          {stats.nextScheduled ? new Date(stats.nextScheduled).toLocaleString() : 'No programada'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminImportOptimized;