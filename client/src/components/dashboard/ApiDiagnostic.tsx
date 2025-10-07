import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCcw, 
  Server, 
  Link,
  XCircle,
  RotateCcw,
  BarChart,
  Database
} from "lucide-react";
import { diagnosticApi, ApiDiagnosticResponse, ApiDiagnosticResult } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ApiDiagnostic() {
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  const [countsData, setCountsData] = useState<any>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<ApiDiagnosticResponse>({
    queryKey: ["/api/diagnostic"],
    queryFn: diagnosticApi.runDiagnostic
  });

  const handleRefresh = () => {
    refetch();
  };
  
  const checkCounts = async () => {
    try {
      setIsLoadingCounts(true);
      const result = await diagnosticApi.checkCounts();
      setCountsData(result);
    } catch (err) {
      console.error("Error al verificar conteos:", err);
    } finally {
      setIsLoadingCounts(false);
    }
  };

  const toggleExpanded = (endpoint: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [endpoint]: !prev[endpoint]
    }));
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Diagnóstico de API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <RotateCcw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="mt-4 text-sm text-muted-foreground">Ejecutando diagnóstico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Diagnóstico de API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="mt-4 text-sm text-muted-foreground">
              Error al ejecutar diagnóstico: {error instanceof Error ? error.message : "Error desconocido"}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={handleRefresh} className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const formattedDate = data?.timestamp 
    ? format(new Date(data.timestamp), 'dd MMMM yyyy HH:mm:ss', { locale: es })
    : '';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Diagnóstico de API
        </CardTitle>
        <CardDescription>
          Fecha: {formattedDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          <p><strong>Nota:</strong> Los vehículos se obtienen a través del endpoint RecuperarCambiosCanalEmpresa, ya que el endpoint específico RecuperarCambiosVehiculosCanalEmpresa no responde correctamente.</p>
        </div>
        {data && (
          <>
            <div className="mb-6 flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Estado general:</span>
                {data.success ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Conexión correcta
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Con errores
                  </Badge>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total endpoints:</span>
                <span className="text-sm">{data.diagnostics.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Endpoints correctos:</span>
                <span className="text-sm text-green-600">{data.diagnostics.filter(d => d.success).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Endpoints con error:</span>
                <span className="text-sm text-red-600">{data.diagnostics.filter(d => !d.success).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Estado del sistema:</span>
                <span className="text-sm">{data.success ? 'Funcionando' : 'Con problemas'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Última actualización:</span>
                <span className="text-sm">{format(new Date(data.timestamp), 'HH:mm:ss', { locale: es })}</span>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {data.diagnostics.map((result: ApiDiagnosticResult, index: number) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2 w-full justify-between">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>{result.endpoint}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.success && result.responseData && result.responseData.summary && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                            {result.responseData.summary}
                          </Badge>
                        )}
                        {!result.success && result.status && (
                          <Badge variant="destructive" className="ml-2">
                            Error {result.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 p-2 text-sm">
                      <div className="grid grid-cols-2 gap-1">
                        <span className="font-medium">URL:</span>
                        <span className="font-mono text-xs break-all">{result.url}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="font-medium">Método:</span>
                        <span>{result.method}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="font-medium">Estado:</span>
                        <span>{result.status || "N/A"}</span>
                      </div>
                      {result.success && result.responseData && result.responseData.summary && (
                        <div className="grid grid-cols-2 gap-1">
                          <span className="font-medium">Datos:</span>
                          <span className="text-xs font-semibold text-green-700">{result.responseData.summary}</span>
                        </div>
                      )}
                      {result.success && result.responseData && result.responseData.itemCount && (
                        <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                          <p className="text-sm text-green-700 font-medium mb-1">Detalle de datos:</p>
                          <ul className="list-disc list-inside text-xs text-green-700">
                            {result.responseData.itemCount.piezas > 0 && (
                              <li>Piezas: {result.responseData.itemCount.piezas}</li>
                            )}
                            {result.responseData.itemCount.vehiculos > 0 && (
                              <li>Vehículos: {result.responseData.itemCount.vehiculos}</li>
                            )}
                            {result.responseData.pagination && (
                              <li>Último ID: {result.responseData.pagination.lastId}</li>
                            )}
                          </ul>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        <span className="font-medium">Mensaje:</span>
                        <span className="text-xs">{result.message}</span>
                      </div>
                      {!result.success && (
                        <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                          <p className="text-sm text-red-700 font-medium">Sugerencia de solución:</p>
                          <ul className="list-disc list-inside text-xs text-red-700 mt-1">
                            {result.status === 404 && (
                              <>
                                <li>Verificar que la URL del endpoint es correcta</li>
                                <li>Comprobar que el API key tiene acceso a este endpoint</li>
                                <li>La respuesta 404 indica que el recurso no fue encontrado</li>
                              </>
                            )}
                            {result.status === 401 && (
                              <>
                                <li>El API key proporcionado no es válido o ha expirado</li>
                                <li>Verificar las credenciales en la configuración</li>
                              </>
                            )}
                            {result.status === 403 && (
                              <>
                                <li>El API key no tiene permisos suficientes</li>
                                <li>Contactar con el proveedor de la API</li>
                              </>
                            )}
                            {!result.status && (
                              <>
                                <li>Verificar la conexión a internet</li>
                                <li>El servidor de la API podría estar caído</li>
                                <li>Contactar con el proveedor de la API</li>
                              </>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </>
        )}
      </CardContent>
      <CardContent className="pt-5">
        {countsData && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-5">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-blue-500" />
              Validación de conteos y recuperación de datos
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 ml-2">
                {new Date(countsData.timestamp).toLocaleTimeString()}
              </Badge>
            </h3>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">Conteo API</TableHead>
                  <TableHead className="text-right">Recuperados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Vehículos</TableCell>
                  <TableCell className="text-right">{countsData.vehicleCount}</TableCell>
                  <TableCell className="text-right">
                    {countsData.vehiclesRetrieved > 0 ? (
                      <span className="text-green-600">{countsData.vehiclesRetrieved}</span>
                    ) : (
                      <span className="text-red-600">0</span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Piezas</TableCell>
                  <TableCell className="text-right">{countsData.partCount}</TableCell>
                  <TableCell className="text-right">
                    {countsData.partsRetrieved > 0 ? (
                      <span className="text-green-600">{countsData.partsRetrieved}</span>
                    ) : (
                      <span className="text-red-600">0</span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {countsData.vehiclesInPartsResponse > 0 && (
              <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                <span className="font-medium">Nota:</span> Se encontraron {countsData.vehiclesInPartsResponse} vehículos asociados en la respuesta de piezas.
              </div>
            )}
            
            {countsData.vehicleCount > 0 && countsData.vehiclesRetrieved === 0 && (
              <div className="mt-3 text-xs text-amber-700 bg-amber-100 p-2 rounded">
                <span className="font-medium">Sugerencia:</span> Los conteos muestran vehículos disponibles pero no se pudieron recuperar directamente. 
                Intente recuperar vehículos a través de la API de piezas, donde aparecen como elementos asociados.
              </div>
            )}
          </div>
        )}
      </CardContent>
        
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={handleRefresh} className="w-full">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Actualizar diagnóstico
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={checkCounts} 
          className="w-full"
          disabled={isLoadingCounts}
        >
          {isLoadingCounts ? (
            <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BarChart className="mr-2 h-4 w-4" />
          )}
          Verificar conteos
        </Button>
      </CardFooter>
    </Card>
  );
}