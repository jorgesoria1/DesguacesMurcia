import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, LogOut, CheckCircle, XCircle, Info } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { configApi, ApiConfig } from "@/lib/api";

interface PartData {
  RefLocal: number;
  IdEmpresa: number;
  IdVehiculo: number;
  CodFamilia: string;
  DescripcionFamilia: string;
  CodArticulo: string;
  DescripcionArticulo: string;
  CodVersionVehiculo: string;
  RefPrincipal: string;
  AnyoInicio: number;
  AnyoFin: number;
  Puertas: number;
  RVCode: string;
  Precio: number;
  AnyoStock: number;
  Peso: number;
  Ubicacion: number;
  Observaciones: string;
  Reserva: number;
  TipoMaterial: number;
  Vendido?: boolean;
  Activo?: boolean;
  Imagenes?: string[];
}

interface ApiResponse {
  success: boolean;
  data?: {
    piezas?: PartData[];
  };
  error?: string;
}

function PartLookup() {
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

  const [refLocal, setRefLocal] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [partData, setPartData] = useState<PartData | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);

  // Cargar configuración de API al montar
  React.useEffect(() => {
    const loadApiConfig = async () => {
      try {
        const config = await configApi.getConfig();
        setApiConfig(config);
      } catch (error) {
        console.error("Error al cargar configuración:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar la configuración de la API",
          variant: "destructive"
        });
      }
    };

    if (isAuthenticated && isAdmin) {
      loadApiConfig();
    }
  }, [isAuthenticated, isAdmin]);

  const handleSearch = async () => {
    if (!refLocal.trim()) {
      toast({
        title: "Error",
        description: "Por favor, introduce una referencia",
        variant: "destructive"
      });
      return;
    }

    if (!apiConfig) {
      toast({
        title: "Error",
        description: "No hay configuración de API disponible",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setPartData(null);
    setNotFound(false);

    try {
      // Consultar directamente en la API de Metasync
      const response = await fetch('/api/metasync-optimized/parts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refLocal: parseInt(refLocal)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.part) {
        const apiPart = data.part;

        // Mapear campos de la API Metasync al formato esperado
        const mappedPart: PartData = {
          RefLocal: apiPart.refLocal || apiPart.RefLocal,
          IdEmpresa: apiPart.idEmpresa || apiPart.IdEmpresa,
          IdVehiculo: apiPart.idVehiculo || apiPart.IdVehiculo || 0,
          CodFamilia: apiPart.codFamilia || apiPart.CodFamilia || '',
          DescripcionFamilia: apiPart.descripcionFamilia || apiPart.DescripcionFamilia || '',
          CodArticulo: apiPart.codArticulo || apiPart.CodArticulo || '',
          DescripcionArticulo: apiPart.descripcionArticulo || apiPart.DescripcionArticulo || '',
          CodVersionVehiculo: apiPart.codVersion || apiPart.CodVersionVehiculo || '',
          RefPrincipal: apiPart.refPrincipal || apiPart.RefPrincipal || '',
          AnyoInicio: apiPart.anyoInicio || apiPart.AnyoInicio || 0,
          AnyoFin: apiPart.anyoFin || apiPart.AnyoFin || 0,
          Puertas: apiPart.puertas || apiPart.Puertas || 0,
          RVCode: apiPart.rvCode || apiPart.RVCode || '',
          Precio: parseFloat(apiPart.precio || apiPart.Precio || '0'),
          AnyoStock: apiPart.anyoStock || apiPart.AnyoStock || 0,
          Peso: apiPart.peso || apiPart.Peso || 0,
          Ubicacion: apiPart.ubicacion || apiPart.Ubicacion || 0,
          Observaciones: apiPart.observaciones || apiPart.Observaciones || '',
          Reserva: apiPart.reserva || apiPart.Reserva || 0,
          TipoMaterial: apiPart.tipoMaterial || apiPart.TipoMaterial || 0,
          Vendido: apiPart.vendido || apiPart.Vendido || false,
          Activo: apiPart.activo || apiPart.Activo || false,
          Imagenes: apiPart.imagenes || apiPart.urlsImgs || apiPart.Imagenes || []
        };

        setPartData(mappedPart);
        setNotFound(false);
        toast({
          title: "Pieza encontrada en API Metasync",
          description: `Se encontró la pieza ${refLocal}`,
        });
      } else {
        setPartData(null);
        setNotFound(true);
        toast({
          title: "No encontrada",
          description: `No se encontró la pieza con referencia ${refLocal} en la API Metasync`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al buscar pieza:", error);
      toast({
        title: "Error",
        description: "Error al consultar la API de Metasync",
        variant: "destructive"
      });
      setPartData(null);
      setNotFound(false);
    } finally {
      setIsLoading(false);
    }
  };

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
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Consulta de Pieza por Referencia</h1>
            <p className="text-muted-foreground">
              Introduce una referencia local para ver los datos de la pieza en la API
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        {/* Buscador */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Pieza</CardTitle>
            <CardDescription>
              Introduce el número de referencia local (RefLocal) de la pieza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="refLocal">Referencia Local</Label>
                <Input
                  id="refLocal"
                  type="number"
                  placeholder="Ej: 1819916"
                  value={refLocal}
                  onChange={(e) => setRefLocal(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {notFound && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">No se encontró ninguna pieza con esa referencia en la API</span>
              </div>
            </CardContent>
          </Card>
        )}

        {partData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Datos de la Pieza</CardTitle>
                <div className="flex gap-2">
                  {partData.Activo !== undefined && (
                    <Badge variant={partData.Activo ? "default" : "secondary"}>
                      {partData.Activo ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Activa
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactiva
                        </>
                      )}
                    </Badge>
                  )}
                  {partData.Vendido !== undefined && (
                    <Badge variant={partData.Vendido ? "destructive" : "default"}>
                      {partData.Vendido ? "Vendida" : "Disponible"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Información principal */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Info className="mr-2 h-5 w-5" />
                    Información Principal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Referencia Local</Label>
                      <p className="font-mono font-semibold text-lg">{partData.RefLocal}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Descripción</Label>
                      <p className="font-semibold">{partData.DescripcionArticulo}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Código Artículo</Label>
                      <p className="font-mono">{partData.CodArticulo || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Referencia Principal</Label>
                      <p className="font-mono">{partData.RefPrincipal || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Familia y categoría */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Categoría</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Familia</Label>
                      <p>{partData.DescripcionFamilia || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Código Familia</Label>
                      <p className="font-mono">{partData.CodFamilia || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Datos comerciales */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Datos Comerciales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Precio</Label>
                      <p className="font-semibold text-lg text-green-600">{partData.Precio.toFixed(2)} €</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Peso</Label>
                      <p>{partData.Peso} kg</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ubicación</Label>
                      <p>{partData.Ubicacion}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Datos técnicos */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Datos Técnicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ID Vehículo</Label>
                      <p>{partData.IdVehiculo}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Código Versión</Label>
                      <p className="font-mono">{partData.CodVersionVehiculo || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">RV Code</Label>
                      <p className="font-mono">{partData.RVCode || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Puertas</Label>
                      <p>{partData.Puertas}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Año Inicio</Label>
                      <p>{partData.AnyoInicio}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Año Fin</Label>
                      <p>{partData.AnyoFin}</p>
                    </div>
                  </div>
                </div>

                {partData.Observaciones && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Observaciones</h3>
                      <p className="text-sm bg-gray-50 p-3 rounded">{partData.Observaciones}</p>
                    </div>
                  </>
                )}

                {partData.Imagenes && partData.Imagenes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Imágenes ({partData.Imagenes.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {partData.Imagenes.map((img, idx) => (
                          <div key={idx} className="border rounded overflow-hidden">
                            <img
                              src={img}
                              alt={`Imagen ${idx + 1}`}
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PartLookup;