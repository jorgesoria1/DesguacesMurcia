import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, CheckCircle, XCircle, LogOut, RefreshCw } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import Sidebar from "@/components/dashboard/Sidebar";
import { configApi, ApiConfig } from "@/lib/api";

// Tipo para representar una prueba de API
interface ApiTest {
  id: string;
  name: string;
  endpoint: string;
  description: string;
  headers: Record<string, string | number | boolean>;
  body?: string; // Campo opcional para body en formato JSON
  response?: any;
  loading: boolean;
  error?: string;
  success?: boolean;
  requiresBody?: boolean; // Indica si el test requiere un body
}

// Tipo para representar un grupo de tests
interface ApiTestGroup {
  id: string;
  name: string;
  description: string;
  tests: ApiTest[];
}

function ApiTester() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const isAuthenticated = user !== null;
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin");
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const [lastId, setLastId] = useState<string>("0");
  const [offset, setOffset] = useState<string>("1000");
  const [date, setDate] = useState<Date>(new Date(2000, 0, 1)); // Default to 2000-01-01
  const [activeTestGroup, setActiveTestGroup] = useState<string>("recovery");
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  
  // Función para cargar la configuración de la API
  const loadApiConfig = async () => {
    try {
      setIsLoadingConfig(true);
      const config = await configApi.getConfig();
      setApiConfig(config);
      console.log("Configuración de API cargada:", config);
      toast({
        title: "Configuración cargada",
        description: `API Key: ${config.apiKey.substring(0, 8)}... | ID Empresa: ${config.companyId}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error al cargar la configuración de la API:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración de la API",
        variant: "destructive"
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };
  
  // Cargar la configuración de la API al cargar el componente
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadApiConfig();
    }
  }, [isAuthenticated, isAdmin]);
  
  // Actualizar grupos de pruebas cuando cambia la configuración de la API
  useEffect(() => {
    if (apiConfig) {
      // Crear una copia profunda de los grupos actuales
      const updatedGroups = JSON.parse(JSON.stringify(testGroups)) as ApiTestGroup[];
      
      // Actualizar cada test con la nueva configuración
      updatedGroups.forEach(group => {
        group.tests.forEach(test => {
          if ('apikey' in test.headers) {
            test.headers.apikey = apiConfig.apiKey;
          }
          if ('idempresa' in test.headers) {
            test.headers.idempresa = apiConfig.companyId;
          }
        });
      });
      
      // Actualizar el estado
      setTestGroups(updatedGroups);
    }
  }, [apiConfig]);
  
  // Función para exportar a JSON
  const exportToJson = (test: ApiTest) => {
    try {
      // Crear blob con los datos
      const json = JSON.stringify(test.response, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      
      // Crear url y link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Configurar y descargar
      link.href = url;
      link.download = `${test.name}_${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Archivo JSON exportado",
        description: "El archivo se ha descargado correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al exportar JSON:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo JSON",
        variant: "destructive"
      });
    }
  };
  
  // Función para convertir un objeto a CSV
  const objectToCsv = (data: any[]): string => {
    if (!data || data.length === 0) return '';
    
    // Asegurarnos que todos los elementos del array sean objetos válidos
    const validData = data.filter(item => item && typeof item === 'object');
    
    if (validData.length === 0) return '';
    
    // Obtener todas las keys de todos los objetos como strings
    const headersSet = new Set<string>();
    for (const obj of validData) {
      if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          headersSet.add(key);
        }
      }
    }
    const headers = Array.from(headersSet);
    
    // Crear línea de encabezados
    const csvRows = [headers.join(',')];
    
    // Crear filas con datos
    for (const item of validData) {
      const row: string[] = [];
      for (const header of headers) {
        let value = '';
        
        if (item.hasOwnProperty(header)) {
          const rawValue = (item as any)[header];
          if (rawValue === null || rawValue === undefined) {
            value = '';
          } else if (typeof rawValue === 'object') {
            value = `"${JSON.stringify(rawValue).replace(/"/g, '""')}"`;
          } else {
            value = `"${String(rawValue).replace(/"/g, '""')}"`;
          }
        }
        
        row.push(value);
      }
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  };
  
  // Función para exportar a CSV
  const exportToCsv = (test: ApiTest) => {
    try {
      let csvContent = '';
      let filename = `${test.name}_${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.csv`;
      
      // Detectar si hay piezas o vehículos en la respuesta
      if (test.response?.data?.piezas && test.response.data.piezas.length > 0) {
        csvContent = objectToCsv(test.response.data.piezas);
        filename = `piezas_${filename}`;
      } else if (test.response?.data?.vehiculos && test.response.data.vehiculos.length > 0) {
        csvContent = objectToCsv(test.response.data.vehiculos);
        filename = `vehiculos_${filename}`;
      } else if (Array.isArray(test.response?.data)) {
        csvContent = objectToCsv(test.response.data);
      } else {
        // Si es un objeto simple, convertirlo a array
        csvContent = objectToCsv([test.response?.data || {}]);
      }
      
      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Archivo CSV exportado",
        description: "El archivo se ha descargado correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error al exportar CSV:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo CSV",
        variant: "destructive"
      });
    }
  };
  
  // Formato de fecha para la API: DD/MM/YYYY HH:MM:SS
  const formattedDate = date ? format(date, "dd/MM/yyyy HH:mm:ss") : "01/01/2000 00:00:00";
  
  // Definir los grupos de pruebas
  const [testGroups, setTestGroups] = useState<ApiTestGroup[]>([
    {
      id: "recovery",
      name: "Recuperación de Datos",
      description: "Endpoints para recuperar piezas y vehículos actualizados",
      tests: [
        {
          id: "recuperarCambiosCanalEmpresa",
          name: "RecuperarCambiosCanalEmpresa",
          endpoint: "/api/raw/test-metasync",
          description: "Recupera piezas y vehículos actualizados para una empresa específica",
          headers: {
            method: "RecuperarCambiosCanalEmpresa",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate,
            lastid: lastId,
            offset: offset,
            idempresa: apiConfig?.companyId || 1476
          },
          loading: false
        },
        {
          id: "recuperarCambiosVehiculosCanalEmpresa",
          name: "RecuperarCambiosVehiculosCanalEmpresa",
          endpoint: "/api/raw/test-metasync",
          description: "Recupera vehículos actualizados para una empresa específica (Nota: puede devolver 404, utilizar RecuperarCambiosCanalEmpresa para vehículos)",
          headers: {
            method: "RecuperarCambiosVehiculosCanalEmpresa",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate,
            lastid: lastId,
            offset: offset,
            idempresa: apiConfig?.companyId || 1476
          },
          loading: false
        },
        {
          id: "recuperarCambiosCanal",
          name: "RecuperarCambiosCanal",
          endpoint: "/api/raw/test-metasync",
          description: "Recupera piezas y vehículos actualizados de todos los canales",
          headers: {
            method: "RecuperarCambiosCanal",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate,
            lastid: lastId,
            offset: offset
          },
          loading: false
        },
        {
          id: "recuperarCambiosVehiculosCanal",
          name: "RecuperarCambiosVehiculosCanal",
          endpoint: "/api/raw/test-metasync",
          description: "Recupera vehículos actualizados de todos los canales",
          headers: {
            method: "RecuperarCambiosVehiculosCanal",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate,
            lastid: lastId,
            offset: offset
          },
          loading: false
        }
      ]
    },
    {
      id: "counts",
      name: "Conteos",
      description: "Endpoints para contar piezas y vehículos",
      tests: [
        {
          id: "conteoPiezasEmpresa",
          name: "ConteoPiezasEmpresa",
          endpoint: "/api/raw/test-metasync",
          description: "Cuenta piezas actualizadas para una empresa específica",
          headers: {
            method: "ConteoPiezasEmpresa",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate,
            idempresa: apiConfig?.companyId || 1476
          },
          loading: false
        },
        {
          id: "conteoVehiculosEmpresa",
          name: "ConteoVehiculosEmpresa",
          endpoint: "/api/raw/test-metasync",
          description: "Cuenta vehículos actualizados para una empresa específica",
          headers: {
            method: "ConteoVehiculosEmpresa",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate,
            idempresa: apiConfig?.companyId || 1476
          },
          loading: false
        },
        {
          id: "conteoPiezasCanal",
          name: "ConteoPiezasCanal",
          endpoint: "/api/raw/test-metasync",
          description: "Cuenta piezas actualizadas de todos los canales",
          headers: {
            method: "ConteoPiezasCanal",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate
          },
          loading: false
        },
        {
          id: "conteoVehiculosCanal",
          name: "ConteoVehiculosCanal",
          endpoint: "/api/raw/test-metasync",
          description: "Cuenta vehículos actualizados de todos los canales",
          headers: {
            method: "ConteoVehiculosCanal",
            apikey: apiConfig?.apiKey || "",
            fecha: formattedDate
          },
          loading: false
        }
      ]
    },
    {
      id: "operations",
      name: "Operaciones",
      description: "Operaciones de inserción y eliminación",
      tests: [
        {
          id: "inventarioUPSERT",
          name: "InventarioUPSERT",
          endpoint: "/api/raw/test-metasync",
          description: "Insertar piezas y vehículos (requiere JSON en el body)",
          headers: {
            method: "InventarioUPSERT",
            apikey: apiConfig?.apiKey || "",
            idempresa: apiConfig?.companyId || 1476
          },
          body: JSON.stringify({
            "Piezas": [],
            "Vehiculos": []
          }, null, 2),
          requiresBody: true,
          loading: false
        },
        {
          id: "deleteParts",
          name: "DeleteParts",
          endpoint: "/api/raw/test-metasync",
          description: "Eliminar piezas (requiere array de refLocal en el body)",
          headers: {
            method: "DeleteParts",
            apikey: apiConfig?.apiKey || "",
            idempresa: apiConfig?.companyId || 1476
          },
          body: "[]", // Array vacío como valor inicial
          requiresBody: true,
          loading: false
        }
      ]
    },
    {
      id: "images",
      name: "Imágenes",
      description: "Operaciones con imágenes",
      tests: [
        {
          id: "insertarImagenUrls",
          name: "InsertarImagenUrls",
          endpoint: "/api/raw/test-metasync",
          description: "Insertar imágenes a partir de URLs",
          headers: {
            method: "InsertarImagenUrls",
            apikey: apiConfig?.apiKey || "",
            idempresa: apiConfig?.companyId || 1476
          },
          body: JSON.stringify({
            "RefLocal": 0,
            "Urls": []
          }, null, 2),
          requiresBody: true,
          loading: false
        }
      ]
    },
    {
      id: "orders",
      name: "Pedidos",
      description: "Operaciones con pedidos",
      tests: [
        {
          id: "crearPedido",
          name: "CrearPedido",
          endpoint: "/api/raw/test-metasync",
          description: "Crear un nuevo pedido",
          headers: {
            method: "CrearPedido",
            apikey: "",
            idempresa: 1476
          },
          body: JSON.stringify({
            "Pedido": {
              "Origen": "",
              "CodigoOrigen": "",
              "Comentarios": ""
            },
            "Cliente": {
              "Nombre": "",
              "Direccion": "",
              "Cp": "",
              "Provincia": "",
              "Poblacion": "",
              "Pais": "",
              "Email": "",
              "Telefono": ""
            },
            "Envio": {
              "Nombre": "",
              "Direccion": "",
              "Cp": "",
              "Provincia": "",
              "Poblacion": "",
              "Pais": "",
              "Email": "",
              "Telefono": ""
            },
            "Lineas": []
          }, null, 2),
          requiresBody: true,
          loading: false
        },
        {
          id: "actualizarEstado",
          name: "ActualizarEstado",
          endpoint: "/api/raw/test-metasync",
          description: "Actualizar estado de un pedido",
          headers: {
            method: "ActualizarEstado",
            apikey: "",
            idempresa: 1476,
            codigo: "",
            estado: ""
          },
          loading: false
        },
        {
          id: "recuperarPedidoOrigen",
          name: "RecuperarPedidoOrigen",
          endpoint: "/api/raw/test-metasync",
          description: "Recuperar un pedido por su código de origen",
          headers: {
            method: "RecuperarPedidoOrigen",
            apikey: "",
            idempresa: 1476,
            codigo: ""
          },
          loading: false
        }
      ]
    }
  ]);

  // Obtener la configuración de API para actualizar los headers
  const fetchApiConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Error al obtener la configuración de API');
      }
      const config = await response.json();
      
      // Actualizar los headers en cada test con la apiKey
      setTestGroups(prevGroups => {
        return prevGroups.map(group => {
          return {
            ...group,
            tests: group.tests.map(test => {
              return {
                ...test,
                headers: {
                  ...test.headers,
                  apikey: config.apiKey
                }
              };
            })
          };
        });
      });
    } catch (error) {
      console.error('Error fetching API config:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener la configuración de API. Verifique que ha configurado la API y que tiene permisos de administrador.",
        variant: "destructive"
      });
    }
  };

  // Actualizar el body de un test
  const updateTestBody = (groupId: string, testId: string, newBody: string) => {
    setTestGroups(prevGroups => {
      const groupIndex = prevGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return prevGroups;
      
      const testIndex = prevGroups[groupIndex].tests.findIndex(t => t.id === testId);
      if (testIndex === -1) return prevGroups;
      
      const newGroups = [...prevGroups];
      newGroups[groupIndex].tests[testIndex].body = newBody;
      return newGroups;
    });
  };

  // Ejecutar test
  const runTest = async (groupId: string, testId: string) => {
    // Encontrar el grupo y test
    const groupIndex = testGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    const testIndex = testGroups[groupIndex].tests.findIndex(t => t.id === testId);
    if (testIndex === -1) return;
    
    // Marcar el test como loading
    setTestGroups(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[groupIndex].tests[testIndex].loading = true;
      newGroups[groupIndex].tests[testIndex].error = undefined;
      newGroups[groupIndex].tests[testIndex].success = undefined;
      return newGroups;
    });
    
    try {
      // Obtener los headers del test
      const { headers, body, requiresBody } = testGroups[groupIndex].tests[testIndex];
      
      // Preparar el requestBody
      let requestBody: any = {};
      
      // Si requiere body, intentar parsearlo como JSON
      if (requiresBody && body) {
        try {
          // Si es un test que requiere body, lo añadimos al requestBody
          requestBody = {
            ...headers,
            body: JSON.parse(body)
          };
        } catch (error) {
          // Si hay un error en el JSON del body
          toast({
            title: "Error en el formato del body",
            description: "El formato JSON del body no es válido",
            variant: "destructive"
          });
          
          setTestGroups(prevGroups => {
            const newGroups = [...prevGroups];
            newGroups[groupIndex].tests[testIndex].loading = false;
            newGroups[groupIndex].tests[testIndex].error = "Error en el formato JSON del body";
            return newGroups;
          });
          
          return;
        }
      } else {
        // Para tests sin body, solo enviamos los headers
        requestBody = headers;
      }
      
      // Hacer la petición
      const response = await fetch(testGroups[groupIndex].tests[testIndex].endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      // Actualizar el resultado
      setTestGroups(prevGroups => {
        const newGroups = [...prevGroups];
        newGroups[groupIndex].tests[testIndex].loading = false;
        newGroups[groupIndex].tests[testIndex].response = data;
        newGroups[groupIndex].tests[testIndex].success = response.ok;
        if (!response.ok) {
          newGroups[groupIndex].tests[testIndex].error = data.error || 'Error desconocido';
        }
        return newGroups;
      });
      
      // Mostrar toast de éxito o error
      if (response.ok) {
        toast({
          title: "Test ejecutado correctamente",
          description: `${testGroups[groupIndex].tests[testIndex].name} completado con éxito.`,
        });
      } else {
        toast({
          title: "Error al ejecutar test",
          description: data.error || 'Error desconocido',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error running test:', error);
      
      // Actualizar el resultado con el error
      setTestGroups(prevGroups => {
        const newGroups = [...prevGroups];
        newGroups[groupIndex].tests[testIndex].loading = false;
        newGroups[groupIndex].tests[testIndex].error = error instanceof Error ? error.message : 'Error desconocido';
        newGroups[groupIndex].tests[testIndex].success = false;
        return newGroups;
      });
      
      toast({
        title: "Error al ejecutar test",
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: "destructive"
      });
    }
  };

  // Cargar los datos cuando se monte el componente
  React.useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchApiConfig();
    }
  }, [isAuthenticated, isAdmin]);

  // Actualizar las fechas en los headers cuando cambie la fecha
  React.useEffect(() => {
    setTestGroups(prevGroups => {
      return prevGroups.map(group => {
        return {
          ...group,
          tests: group.tests.map(test => {
            return {
              ...test,
              headers: {
                ...test.headers,
                fecha: formattedDate
              }
            };
          })
        };
      });
    });
  }, [formattedDate]);

  // Actualizar lastId y offset en los headers cuando cambien
  React.useEffect(() => {
    setTestGroups(prevGroups => {
      return prevGroups.map(group => {
        return {
          ...group,
          tests: group.tests.map(test => {
            // Solo actualizar si el test tiene estos headers
            if ('lastid' in test.headers && 'offset' in test.headers) {
              return {
                ...test,
                headers: {
                  ...test.headers,
                  lastid: lastId,
                  offset: offset
                }
              };
            }
            return test;
          })
        };
      });
    });
  }, [lastId, offset]);

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="container flex flex-col items-center justify-center flex-1 px-4 py-16">
          <h1 className="text-2xl font-bold mb-4">Acceso denegado</h1>
          <p>Debe iniciar sesión como administrador para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Tester de API Metasync</h1>
            <p className="text-muted-foreground">
              Prueba todos los endpoints de la API Metasync y visualiza los resultados
            </p>
            <div className="mt-2 text-sm p-2 rounded border border-amber-200 bg-amber-50 text-amber-700">
              <strong>Nota:</strong> Para recuperar vehículos, usar RecuperarCambiosCanalEmpresa, ya que también contiene datos de vehículos y el endpoint RecuperarCambiosVehiculosCanalEmpresa puede no responder correctamente.
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Parámetros globales</CardTitle>
            <CardDescription>
              Estos parámetros se aplican a todos los tests según corresponda
            </CardDescription>
            <div className="flex items-center justify-end mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadApiConfig}
                disabled={isLoadingConfig}
                className="flex items-center gap-1"
              >
                {isLoadingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Actualizar Configuración
              </Button>
              {apiConfig && (
                <div className="ml-2 text-xs text-muted-foreground">
                  API Key: {apiConfig.apiKey.substring(0, 8)}...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha (para todos los endpoints)</Label>
                <DatePicker
                  value={date}
                  onChange={(newDate) => newDate && setDate(newDate)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato para API: {formattedDate}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastId">Last ID (para endpoints de recuperación)</Label>
                <Input
                  id="lastId"
                  value={lastId}
                  onChange={(e) => setLastId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offset">Offset (para endpoints de recuperación)</Label>
                <Input
                  id="offset"
                  value={offset}
                  onChange={(e) => setOffset(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTestGroup} onValueChange={setActiveTestGroup}>
          <TabsList className="mb-6">
            {testGroups.map((group) => (
              <TabsTrigger key={group.id} value={group.id}>
                {group.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* Contenido de cada grupo */}
          {testGroups.map((group) => (
            <TabsContent key={group.id} value={group.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {group.tests.map((test) => (
                      <div key={test.id} className="border rounded-lg p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{test.name}</h3>
                            <p className="text-muted-foreground">{test.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="default" 
                              onClick={() => runTest(group.id, test.id)}
                              disabled={test.loading}
                            >
                              {test.loading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Ejecutar
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Headers</h4>
                          <div className="bg-muted p-3 rounded-md overflow-x-auto">
                            <pre className="text-xs">
                              {JSON.stringify(test.headers, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        {/* Editor de Body para métodos que lo requieran */}
                        {test.requiresBody && (
                          <div className="mb-4 border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium">Body (JSON)</h4>
                            </div>
                            <div className="border border-input rounded-md">
                              <textarea
                                className="w-full p-3 font-mono text-xs bg-background resize-y min-h-[200px]"
                                value={test.body || ""}
                                onChange={(e) => updateTestBody(group.id, test.id, e.target.value)}
                                placeholder="Escribe el body en formato JSON"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              El body debe estar en formato JSON válido
                            </p>
                          </div>
                        )}
                        
                        {/* Resultados */}
                        {test.response && (
                          <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-medium flex items-center">
                                Resultado
                                {test.success ? (
                                  <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="ml-2 h-4 w-4 text-red-500" />
                                )}
                              </h4>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => exportToJson(test)}
                                >
                                  Exportar JSON
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => exportToCsv(test)}
                                >
                                  Exportar CSV
                                </Button>
                              </div>
                            </div>
                            
                            {test.error ? (
                              <div className="bg-red-50 text-red-500 p-3 rounded-md overflow-x-auto">
                                <pre className="text-xs">{test.error}</pre>
                              </div>
                            ) : (
                              <div className="bg-muted p-3 rounded-md overflow-x-auto max-h-96">
                                <pre className="text-xs">
                                  {JSON.stringify(test.response, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export default ApiTester;