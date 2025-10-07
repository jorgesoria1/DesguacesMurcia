import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Vehicle {
  IdLocal: number;
  Marca: string;
  Modelo: string;
  Version?: string;
  AnyoVehiculo?: number;
  Matricula?: string;
  Bastidor?: string;
  Color?: string;
  Combustible?: string;
  Potencia?: number;
  Kilometraje?: number;
}

interface Part {
  idLocal?: number;
  refLocal: number;
  familia?: string;
  vehiculoIdLocal?: number;
  descripcion?: string;
  precio?: number;
  garantia?: string;
  estado?: string;
  fotos?: string[];
}

export default function ApiRawData() {
  const [activeTab, setActiveTab] = useState("vehicles");
  const limitForm = useForm({
    defaultValues: {
      limit: "20",
    },
  });
  
  const limit = parseInt(limitForm.watch("limit"));
  
  // Consulta para vehículos crudos
  const { 
    data: vehiclesData, 
    isLoading: isLoadingVehicles,
    error: vehiclesError,
    refetch: refetchVehicles
  } = useQuery({
    queryKey: ['/api/raw/vehicles', limit],
    queryFn: async () => {
      const response = await fetch(`/api/raw/vehicles?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Error al obtener vehículos');
      }
      return response.json();
    },
    enabled: activeTab === "vehicles"
  });
  
  // Consulta para piezas crudas
  const { 
    data: partsData, 
    isLoading: isLoadingParts,
    error: partsError,
    refetch: refetchParts
  } = useQuery({
    queryKey: ['/api/raw/parts', limit],
    queryFn: async () => {
      const response = await fetch(`/api/raw/parts?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Error al obtener piezas');
      }
      return response.json();
    },
    enabled: activeTab === "parts"
  });
  
  // Manejar errores
  const hasVehiclesError = vehiclesError !== null;
  const hasPartsError = partsError !== null;
  
  // Vehículos y piezas procesados
  const vehicles = vehiclesData?.vehiculos || [];
  const parts = partsData?.piezas || [];
  
  // Debug logs
  console.log('ApiRawData: vehiclesData', vehiclesData);
  console.log('ApiRawData: partsData', partsData);
  console.log('ApiRawData: vehicles', vehicles);
  console.log('ApiRawData: parts', parts);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleRefresh = () => {
    if (activeTab === "vehicles") {
      refetchVehicles();
    } else {
      refetchParts();
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Datos Crudos de API</CardTitle>
        <CardDescription>
          Visualiza los datos directamente desde la API sin procesar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...limitForm}>
          <div className="flex items-center space-x-4 mb-4">
            <FormField
              control={limitForm.control}
              name="limit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2">
                  <FormLabel>Límite:</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Límite" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button onClick={handleRefresh} disabled={isLoadingVehicles || isLoadingParts}>
              {(isLoadingVehicles || isLoadingParts) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : "Actualizar"}
            </Button>
          </div>
        </Form>
        
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="vehicles">Vehículos</TabsTrigger>
            <TabsTrigger value="parts">Piezas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vehicles">
            {hasVehiclesError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {vehiclesError instanceof Error ? vehiclesError.message : 'Error desconocido al obtener vehículos'}
                </AlertDescription>
              </Alert>
            ) : isLoadingVehicles ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : vehicles.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin datos</AlertTitle>
                <AlertDescription>
                  No se encontraron vehículos en la API. Estructura de respuesta: {JSON.stringify(Object.keys(vehiclesData || {}))}
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Versión</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Combustible</TableHead>
                      <TableHead>Matrícula</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle: Vehicle) => (
                      <TableRow key={vehicle.IdLocal}>
                        <TableCell>{vehicle.IdLocal}</TableCell>
                        <TableCell>{vehicle.Marca || '-'}</TableCell>
                        <TableCell>{vehicle.Modelo || '-'}</TableCell>
                        <TableCell>{vehicle.Version || '-'}</TableCell>
                        <TableCell>{vehicle.AnyoVehiculo || '-'}</TableCell>
                        <TableCell>{vehicle.Combustible || '-'}</TableCell>
                        <TableCell>{vehicle.Matricula || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
            
            {vehiclesData && vehiclesData.result_set && (
              <div className="text-sm text-muted-foreground mt-2">
                Mostrando {vehicles.length} de {vehiclesData.result_set.total || 'desconocido'} vehículos. 
                Last ID: {vehiclesData.result_set.lastId}, Count: {vehiclesData.result_set.count}, Offset: {vehiclesData.result_set.offset}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="parts">
            {hasPartsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {partsError instanceof Error ? partsError.message : 'Error desconocido al obtener piezas'}
                </AlertDescription>
              </Alert>
            ) : isLoadingParts ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : parts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin datos</AlertTitle>
                <AlertDescription>
                  No se encontraron piezas en la API. Estructura de respuesta: {JSON.stringify(Object.keys(partsData || {}))}
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Ref. Local</TableHead>
                      <TableHead>Familia</TableHead>
                      <TableHead>Vehículo ID</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.map((part: Part) => (
                      <TableRow key={part.refLocal}>
                        <TableCell>{part.idLocal || part.refLocal}</TableCell>
                        <TableCell>{part.refLocal}</TableCell>
                        <TableCell>{part.familia || '-'}</TableCell>
                        <TableCell>{part.vehiculoIdLocal || '-'}</TableCell>
                        <TableCell>{part.descripcion || '-'}</TableCell>
                        <TableCell>{part.precio ? `${part.precio}€` : '-'}</TableCell>
                        <TableCell>{part.estado || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
            
            {partsData && partsData.result_set && (
              <div className="text-sm text-muted-foreground mt-2">
                Mostrando {parts.length} de {partsData.result_set.total || 'desconocido'} piezas. 
                Last ID: {partsData.result_set.lastId}, Count: {partsData.result_set.count}, Offset: {partsData.result_set.offset}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}