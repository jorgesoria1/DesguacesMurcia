import React from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Settings, Shield, Bot, Database, Globe, HardDrive, Star } from "lucide-react";

import ApiConfigForm from "@/components/dashboard/ApiConfigForm";
import { ApiDiagnostic } from "@/components/dashboard/ApiDiagnostic";
import ApiRawData from "@/components/dashboard/ApiRawData";
import ChatbotConfigForm from "@/components/dashboard/ChatbotConfigForm";
import MaintenanceToggle from "@/components/dashboard/MaintenanceToggle";
import GoogleMerchantPanel from "@/components/dashboard/GoogleMerchantPanel";
import AdminGoogleReviewsNew from "@/pages/AdminGoogleReviewsNew";
import BackupsConfigForm from "@/components/dashboard/BackupsConfigForm";
import Sidebar from "@/components/dashboard/Sidebar";

import { configApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const AdminSettings = () => {
  const [, navigate] = useLocation();
  const { logout } = useAuth();

  // Obtener configuración de la API
  const { 
    data: apiConfig, 
    isLoading: isLoadingConfig,
    refetch: refetchConfig
  } = useQuery({
    queryKey: ['/api/config'],
    queryFn: () => configApi.getConfig(),
  });

  // Obtener configuración del chatbot
  const { 
    data: chatbotConfig, 
    isLoading: isLoadingChatbot,
    refetch: refetchChatbot
  } = useQuery({
    queryKey: ['/api/config/chatbot'],
    queryFn: () => configApi.getChatbotConfig(),
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (isLoadingConfig || isLoadingChatbot) {
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
            <h1 className="text-3xl font-montserrat font-bold">Configuración</h1>
            <p className="text-muted-foreground">
              Configuración general del sistema
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        <Tabs defaultValue="maintenance" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Mantenimiento
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              API
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Chatbot
            </TabsTrigger>
            <TabsTrigger value="backups" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="google" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Google Merchant
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Google Reviews
            </TabsTrigger>

          </TabsList>

          {/* Pestaña de Modo Mantenimiento */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Modo Mantenimiento
                </h3>
                <p className="text-muted-foreground mb-4">
                  Active el modo mantenimiento cuando necesite realizar actualizaciones importantes en el sitio.
                  La página principal y las páginas públicas mostrarán una pantalla de mantenimiento.
                </p>
                <MaintenanceToggle />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Configuración de API */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Configuración de API
                </h3>
                <p className="text-muted-foreground mb-4">
                  Configure los parámetros de conexión con la API externa de Metasync.
                </p>
                <ApiConfigForm 
                  apiConfig={apiConfig} 
                  onSuccess={refetchConfig} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Configuración del Chatbot */}
          <TabsContent value="chatbot" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Configuración del Chatbot
                </h3>
                <p className="text-muted-foreground mb-4">
                  Configure el código de integración del chatbot para atención al cliente.
                </p>
                <ChatbotConfigForm 
                  initialCode={chatbotConfig?.chatbotCode} 
                  onSuccess={refetchChatbot}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Backups */}
          <TabsContent value="backups" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Sistema de Backups
                </h3>
                <p className="text-muted-foreground mb-4">
                  Cree y gestione backups de su base de datos. Los backups se guardan en el servidor para su seguridad.
                </p>
                <BackupsConfigForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Google Merchant Center */}
          <TabsContent value="google" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Google Merchant Center Feed
                </h3>
                <p className="text-muted-foreground mb-4">
                  Genere y configure el feed XML para sincronizar sus productos con Google Merchant Center.
                </p>
                <GoogleMerchantPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Google Reviews */}
          <TabsContent value="reviews" className="space-y-6">
            <div className="-m-8">
              <AdminGoogleReviewsNew />
            </div>
          </TabsContent>

          {/* Pestaña de Diagnósticos */}
          <TabsContent value="diagnostics" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Diagnósticos del Sistema
                </h3>
                <p className="text-muted-foreground mb-4">
                  Herramientas de diagnóstico y datos en bruto de la API.
                </p>
                <ApiDiagnostic />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-montserrat font-semibold mb-4">
                  Datos en Bruto
                </h3>
                <p className="text-muted-foreground mb-4">
                  Visualización de datos en bruto obtenidos de la API externa.
                </p>
                <ApiRawData />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSettings;