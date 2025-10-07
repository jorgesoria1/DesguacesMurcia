import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart } from "lucide-react";

import ApiConfigForm from "@/components/dashboard/ApiConfigForm";
import ImportControls from "@/components/dashboard/ImportControls";
import ScheduleControls from "@/components/dashboard/ScheduleControls";
import ImportStats from "@/components/dashboard/ImportStats";
import ImportHistoryTable from "@/components/ImportHistoryTable";
import Sidebar from "@/components/dashboard/Sidebar";
import { ApiDiagnostic } from "@/components/dashboard/ApiDiagnostic";
import ApiStatsCard from "@/components/dashboard/ApiStatsCard";
import ApiRawData from "@/components/dashboard/ApiRawData";

import { importApi, configApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const Dashboard = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("panel");

  // Obtener historial de importaciones
  const { 
    data: importHistory, 
    isLoading: isLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['/api/import/history'],
    queryFn: () => importApi.getHistory(10),
  });

  // Obtener programaciones de importaciones
  const { 
    data: schedules, 
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules
  } = useQuery({
    queryKey: ['/api/import/schedule'],
    queryFn: () => importApi.getSchedules(),
  });

  // Obtener configuración de la API
  const { 
    data: apiConfig, 
    isLoading: isLoadingConfig,
    refetch: refetchConfig
  } = useQuery({
    queryKey: ['/api/config'],
    queryFn: () => configApi.getConfig(),
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/admin");
      }
    });
  };

  // Función para refrescar todos los datos
  const refreshAllData = () => {
    refetchHistory();
    refetchSchedules();
    refetchConfig();
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

  if (isLoadingConfig || isLoadingSchedules) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenido principal */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Panel de Administración</h1>
            <p className="text-muted-foreground">
              Gestione los datos de la tienda e importaciones API
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        <div className="mb-8">
          <Tabs defaultValue="panel" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="panel">Panel principal</TabsTrigger>
              <TabsTrigger value="imports">Importaciones</TabsTrigger>
              <TabsTrigger value="settings">Configuración</TabsTrigger>
            </TabsList>

            {/* Panel principal */}
            <TabsContent value="panel">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <ImportStats 
                  isLoading={isLoadingHistory} 
                  history={importHistory || []} 
                />
              </div>
              
              {/* Tarjeta de estadísticas */}
              <div className="mb-8">
                <ApiStatsCard />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-montserrat font-semibold mb-4 flex items-center">
                      <BarChart className="h-5 w-5 mr-2" />
                      Importación Manual
                    </h3>
                    <ImportControls 
                      onSuccess={refreshAllData} 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-montserrat font-semibold mb-4">
                      Programación de Importaciones
                    </h3>
                    <ScheduleControls 
                      schedules={schedules || []} 
                      onSuccess={refetchSchedules} 
                    />
                  </CardContent>
                </Card>
              </div>

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
                    pageSize={50}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña de importaciones */}
            <TabsContent value="imports">
              <div className="grid grid-cols-1 gap-6">
                <ApiStatsCard />
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-montserrat font-semibold mb-4">
                      Importación Manual
                    </h3>
                    <ImportControls 
                      onSuccess={refreshAllData} 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-montserrat font-semibold mb-4">
                      Programación de Importaciones
                    </h3>
                    <ScheduleControls 
                      schedules={schedules || []} 
                      onSuccess={refetchSchedules} 
                    />
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
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pestaña de configuración */}
            <TabsContent value="settings">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-montserrat font-semibold mb-4">
                      Configuración de API
                    </h3>
                    <ApiConfigForm 
                      apiConfig={apiConfig} 
                      onSuccess={refetchConfig} 
                    />
                  </CardContent>
                </Card>

                <ApiDiagnostic />
                
                <ApiRawData />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
