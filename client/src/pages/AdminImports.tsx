import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw } from "lucide-react";

import ImportHistoryTable from "@/components/ImportHistoryTable";
import Sidebar from "@/components/dashboard/Sidebar";
import ApiStatsCard from "@/components/dashboard/ApiStatsCard";
import ImportControls from "@/components/dashboard/ImportControls";
import ScheduleControls from "@/components/dashboard/ScheduleControls";
import SyncStatus from "@/components/dashboard/SyncStatus";
import ImportRecoveryPanel from "@/components/dashboard/ImportRecoveryPanel";
import NewScheduleForm from "@/components/dashboard/NewScheduleForm";

import { importApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const AdminImports = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [autoRefreshActive, setAutoRefreshActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Obtener historial de importaciones
  const { 
    data: importHistory, 
    isLoading: isLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['/api/import/history'],
    queryFn: () => importApi.getHistory(10),
    refetchInterval: autoRefreshActive ? 10000 : false // 10 segundos solo cuando hay importaciones activas
  });

  // Obtener programaciones de importaciones
  const { 
    data: schedules, 
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules
  } = useQuery({
    queryKey: ['/api/import/schedule'],
    queryFn: () => importApi.getSchedules(),
    refetchInterval: autoRefreshActive ? 30000 : false // 30 segundos para programaciones
  });
  
  // Verificar si hay importaciones activas
  useEffect(() => {
    if (!importHistory) return;
    
    // Comprobar si hay importaciones en progreso (estados que requieren monitoreo)
    const hasActive = importHistory.some(item => 
      item.status === 'in_progress' || 
      item.status === 'processing' || 
      item.status === 'pending' ||
      item.status === 'running'
    );
    
    // Solo actualizar si el estado cambió
    if (hasActive !== autoRefreshActive) {
      setAutoRefreshActive(hasActive);
      console.log(`Actualización automática ${hasActive ? 'activada' : 'desactivada'} - Importaciones activas: ${hasActive}`);
    }
    
    // Actualizar timestamp solo cuando hay importaciones activas
    if (hasActive) {
      setLastRefresh(new Date());
    }
  }, [importHistory, autoRefreshActive]);

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

  // Función para refrescar todos los datos
  const refreshAllData = () => {
    refetchHistory();
    refetchSchedules();
  };
  
  // Función para manejar la eliminación de un registro de historial
  const handleDeleteHistoryItem = () => {
    refetchHistory();
    toast({
      title: "Registro eliminado",
      description: "El registro ha sido eliminado correctamente del historial",
    });
  };
  
  // Función para manejar la reanudación de una importación
  const handleResumeImport = () => {
    refetchHistory();
    toast({
      title: "Importación reanudada",
      description: "La importación se ha reanudado correctamente",
    });
  };
  
  // Función para manejar la pausa de una importación
  const handlePauseImport = () => {
    refetchHistory();
    toast({
      title: "Importación pausada",
      description: "La importación se ha pausado correctamente",
    });
  };
  
  // Función para manejar la cancelación de una importación
  const handleCancelImport = () => {
    refetchHistory();
    toast({
      title: "Importación cancelada",
      description: "La importación se ha cancelado correctamente",
    });
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
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Gestión de Importaciones</h1>
            <p className="text-muted-foreground">
              Configure las importaciones y programe tareas automáticas
              {autoRefreshActive && (
                <span className="ml-2 inline-flex items-center text-green-600 font-medium">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Actualización automática activa
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {autoRefreshActive && (
              <div className="flex items-center text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Última actualización: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="w-full">
              <SyncStatus autoRefresh={false} refreshInterval={60000} />
            </div>
            
            <div className="w-full">
              <ApiStatsCard />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Importación Manual Optimizada
                </h3>
                <ImportControls 
                  onSuccess={refreshAllData} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Sincronización Automática
                </h3>
                <ScheduleControls 
                  schedules={schedules || []} 
                  onSuccess={refetchSchedules} 
                />
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-6">
            <div className="mb-6">
              <NewScheduleForm onSuccess={refetchSchedules} />
            </div>
            
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Recuperación de Importaciones Bloqueadas
                </h3>
                <ImportRecoveryPanel />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Historial de Importaciones
                </h3>
                <ImportHistoryTable 
                  history={importHistory || []} 
                  isLoading={isLoadingHistory}
                  onDelete={handleDeleteHistoryItem}
                  onResume={handleResumeImport}
                  onPause={handlePauseImport}
                  onCancel={handleCancelImport}
                  pageSize={10}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminImports;