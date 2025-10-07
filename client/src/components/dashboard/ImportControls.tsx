import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Car,
  Package,
  DatabaseIcon,
  RefreshCw,
  Zap,
  Download,
  DownloadCloud
} from "lucide-react";
import { importApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportControlsProps {
  onSuccess?: () => void;
}

const ImportControls: React.FC<ImportControlsProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isImportingVehicles, setIsImportingVehicles] = useState(false);
  const [isImportingParts, setIsImportingParts] = useState(false);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [isImportingAllVehicles, setIsImportingAllVehicles] = useState(false);
  const [isImportingAllParts, setIsImportingAllParts] = useState(false);

  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);

  const handleImport = async (type: "vehicles" | "parts" | "all", fullImport: boolean = false) => {
    // Determinar qué estado de carga usar correctamente
    let setLoading: (value: boolean) => void;
    
    if (type === "vehicles") {
      setLoading = fullImport ? setIsImportingAllVehicles : setIsImportingVehicles;
    } else if (type === "parts") {
      setLoading = fullImport ? setIsImportingAllParts : setIsImportingParts;
    } else {
      setLoading = setIsImportingAll;
    }

    try {
      // Solo activar el estado específico del botón que se está usando
      setLoading(true);

      // Usar el endpoint correcto según el tipo de importación
      let response;
      let endpoint;
      
      if (type === "all") {
        endpoint = '/api/metasync-optimized/import/all';
      } else {
        endpoint = `/api/metasync-optimized/import/${type}`;
      }
      
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullImport: fullImport,
          fromDate: fromDate?.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Error en la importación: ${response.statusText}`);
      }

      const importTypeText = 
        type === "vehicles" ? "vehículos" :
        type === "parts" ? "piezas" :
        "vehículos y piezas";

      const importModeText = fullImport 
        ? "completa" 
        : fromDate 
          ? `desde ${format(fromDate, 'dd/MM/yyyy', { locale: es })}` 
          : "incremental (desde última sincronización)";

      toast({
        title: "Importación iniciada",
        description: `La importación ${importModeText} de ${importTypeText} ha sido iniciada correctamente.`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Error al iniciar importación de ${type}:`, error);
      toast({
        title: "Error al iniciar importación",
        description: "No se pudo iniciar la importación. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="mb-4 text-muted-foreground">
        Inicie una importación manual de vehículos y/o piezas desde la API de Metasync.
      </p>

      <div className="bg-slate-50 p-4 rounded-md space-y-4 mb-4 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-primary">Importación optimizada</h3>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-600 font-medium">Sistema de alto rendimiento</span>
          </div>
        </div>

        <div className="rounded-md bg-green-50 p-3 border border-green-100">
          <div className="flex items-start">
            <div>
              <h4 className="text-sm font-medium text-green-800">Sistema optimizado para grandes volúmenes</h4>
              <p className="text-xs text-green-700 mt-1">
                Esta importación utiliza técnicas avanzadas para procesar eficientemente grandes 
                volúmenes de datos. Ideal para la sincronización de vehículos y piezas.
              </p>
              <ul className="mt-2 text-xs text-green-700 list-disc pl-4">
                <li>Procesamiento por lotes para mayor rendimiento</li>
                <li>Manejo automático de relaciones vehículo-pieza</li>
                <li>Optimización de memoria para más de 100,000 registros</li>
                <li>Reintentos automáticos en caso de fallos de red</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fecha desde la que importar (sólo para importaciones incrementales)</Label>
          <DatePicker
            value={fromDate}
            onChange={setFromDate}
            placeholder="Seleccionar fecha"
          />
          <div className="text-xs text-muted-foreground">
            Si no seleccionas una fecha, se importarán los datos desde la última sincronización registrada.
          </div>
        </div>
      </div>

      <Tabs defaultValue="incremental" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incremental">Importación Incremental</TabsTrigger>
          <TabsTrigger value="completa">Importación Completa</TabsTrigger>
        </TabsList>

        <TabsContent value="incremental" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full bg-secondary hover:bg-secondary/90 h-20 flex flex-col items-center justify-center"
                  disabled={isImportingVehicles}
                >
                  {isImportingVehicles ? (
                    <RefreshCw className="h-6 w-6 animate-spin mb-1" />
                  ) : (
                    <Car className="h-6 w-6 mb-1" />
                  )}
                  <span>
                    {isImportingVehicles ? "Importando..." : "Importar vehículos"}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar vehículos</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>¿Está seguro de que desea iniciar una importación manual de vehículos?
                    Este proceso puede tardar varios minutos dependiendo de la cantidad de datos.</p>

                    <div className="mt-2 p-2 bg-slate-100 rounded text-sm">
                      <span className="font-medium">Modo de importación: </span>
                      {fromDate 
                        ? `Desde ${format(fromDate, 'dd/MM/yyyy', { locale: es })}` 
                        : "Incremental desde última sincronización"}
                    </div>

                    <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-sm text-green-800">
                      <span className="font-medium flex items-center"><Zap className="h-3 w-3 mr-1" /> Sistema optimizado: </span>
                      Mayor rendimiento y eficiencia para grandes volúmenes de datos
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleImport("vehicles", false)}>
                    Iniciar importación
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full bg-secondary hover:bg-secondary/90 h-20 flex flex-col items-center justify-center"
                  disabled={isImportingParts}
                >
                  {isImportingParts ? (
                    <RefreshCw className="h-6 w-6 animate-spin mb-1" />
                  ) : (
                    <Package className="h-6 w-6 mb-1" />
                  )}
                  <span>
                    {isImportingParts ? "Importando..." : "Importar piezas"}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar piezas</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>¿Está seguro de que desea iniciar una importación manual de piezas?
                    Este proceso puede tardar varios minutos dependiendo de la cantidad de datos.</p>

                    <div className="mt-2 p-2 bg-slate-100 rounded text-sm">
                      <span className="font-medium">Modo de importación: </span>
                      {fromDate 
                        ? `Desde ${format(fromDate, 'dd/MM/yyyy', { locale: es })}` 
                        : "Incremental desde última sincronización"}
                    </div>

                    <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-sm text-green-800">
                      <span className="font-medium flex items-center"><Zap className="h-3 w-3 mr-1" /> Sistema optimizado: </span>
                      Mayor rendimiento y eficiencia para grandes volúmenes de datos
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleImport("parts", false)}>
                    Iniciar importación
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 h-20 flex flex-col items-center justify-center mt-4"
                disabled={isImportingAll}
              >
                {isImportingAll ? (
                  <RefreshCw className="h-6 w-6 animate-spin mb-1" />
                ) : (
                  <DatabaseIcon className="h-6 w-6 mb-1" />
                )}
                <span>
                  {isImportingAll ? "Importando..." : "Importar vehículos y piezas"}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Importar todo</AlertDialogTitle>
                <AlertDialogDescription>
                  <p>¿Está seguro de que desea iniciar una importación manual de vehículos y piezas?
                  Este proceso puede tardar varios minutos dependiendo de la cantidad de datos.</p>

                  <div className="mt-2 p-2 bg-slate-100 rounded text-sm">
                    <span className="font-medium">Modo de importación: </span>
                    {fromDate 
                      ? `Desde ${format(fromDate, 'dd/MM/yyyy', { locale: es })}` 
                      : "Incremental desde última sincronización"}
                  </div>

                  <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-sm text-green-800">
                    <span className="font-medium flex items-center"><Zap className="h-3 w-3 mr-1" /> Sistema optimizado: </span>
                    Mayor rendimiento y eficiencia para grandes volúmenes de datos
                  </div>

                  <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                    <span className="font-medium">Nota: </span>
                    Primero se importarán los vehículos y luego las piezas automáticamente. 
                    Esta es la opción recomendada para mantener la consistencia de los datos.
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleImport("all", false)}>
                  Iniciar importación
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="completa" className="mt-4">
          <div className="mb-3 rounded-md bg-amber-50 p-3 border border-amber-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <DownloadCloud className="h-5 w-5 text-amber-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Importación completa</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    La importación completa descargará <strong>todos</strong> los vehículos o piezas 
                    disponibles en la API, sin importar la fecha. Este proceso puede tardar bastante tiempo 
                    dependiendo del volumen de datos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 h-20 flex flex-col items-center justify-center"
                  disabled={isImportingAllVehicles}
                >
                  {isImportingAllVehicles ? (
                    <RefreshCw className="h-6 w-6 animate-spin mb-1" />
                  ) : (
                    <Download className="h-6 w-6 mb-1" />
                  )}
                  <span>
                    {isImportingAllVehicles ? "Importando..." : "Importar TODOS los vehículos"}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar TODOS los vehículos</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>¿Está seguro de que desea iniciar una importación COMPLETA de vehículos?
                    Se descargarán todos los vehículos disponibles en la API, sin filtro de fecha.</p>

                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                      <span className="font-medium">Advertencia: </span>
                      Este proceso podría tardar mucho tiempo dependiendo del volumen de datos.
                      Se descargará la base completa de vehículos.
                    </div>

                    <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-sm text-green-800">
                      <span className="font-medium flex items-center"><Zap className="h-3 w-3 mr-1" /> Sistema optimizado: </span>
                      Mayor rendimiento y eficiencia para grandes volúmenes de datos
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleImport("vehicles", true)}>
                    Iniciar importación completa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 h-20 flex flex-col items-center justify-center"
                  disabled={isImportingAllParts}
                >
                  {isImportingAllParts ? (
                    <RefreshCw className="h-6 w-6 animate-spin mb-1" />
                  ) : (
                    <Download className="h-6 w-6 mb-1" />
                  )}
                  <span>
                    {isImportingAllParts ? "Importando..." : "Importar TODAS las piezas"}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar TODAS las piezas</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>¿Está seguro de que desea iniciar una importación COMPLETA de piezas?
                    Se descargarán todas las piezas disponibles en la API, sin filtro de fecha.</p>

                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                      <span className="font-medium">Advertencia: </span>
                      Este proceso podría tardar mucho tiempo dependiendo del volumen de datos.
                      Se descargará la base completa de piezas.
                    </div>

                    <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-sm text-green-800">
                      <span className="font-medium flex items-center"><Zap className="h-3 w-3 mr-1" /> Sistema optimizado: </span>
                      Mayor rendimiento y eficiencia para grandes volúmenes de datos
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleImport("parts", true)}>
                    Iniciar importación completa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 p-4 border-t">
        <h4 className="font-semibold mb-3 text-orange-600">🔧 Mantenimiento de Datos</h4>
        <p className="text-sm text-gray-600 mb-3">
          Desactiva automáticamente piezas con precio cero o inválido que no deberían aparecer en el catálogo.
        </p>
        <Button
          onClick={async () => {
            try {
              const response = await fetch('/api/admin/cleanup-invalid-parts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const result = await response.json();

              if (result.success) {
                toast({
                  title: "Limpieza completada",
                  description: `${result.deactivated} piezas desactivadas`,
                });
              } else {
                toast({
                  title: "Error",
                  description: result.error || "No se pudo limpiar las piezas.",
                  variant: "destructive",
                });
              }
            } catch (error) {
              toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Error desconocido",
                variant: "destructive",
              });
            }
          }}
          variant="outline"
          size="sm"
          className="bg-orange-50 hover:bg-orange-100 border-orange-300"
        >
          🔧 Limpiar Piezas con Precio Inválido
        </Button>
      </div>
    </div>
  );
};

export default ImportControls;