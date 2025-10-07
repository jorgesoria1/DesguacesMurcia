
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
// Import Link para añadir enlace a la página desde la navegación principal
import { Link } from "wouter";

export default function VehicleMatchingTest() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [partMatchResult, setPartMatchResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("vehicle-search");
  const [formData, setFormData] = useState({
    codVersion: "01060072",
    puertas: "3",
    anyoInicio: "1994",
    anyoFin: "1999",
    rvCode: "4394G"
  });
  const [partId, setPartId] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handlePartIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPartId(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMatchResult(null);

    try {
      // Preparamos los datos para enviar al servidor
      const payload = {
        codVersion: formData.codVersion || undefined,
        puertas: formData.puertas ? parseInt(formData.puertas) : undefined,
        anyoInicio: formData.anyoInicio ? parseInt(formData.anyoInicio) : undefined,
        anyoFin: formData.anyoFin ? parseInt(formData.anyoFin) : undefined,
        rvCode: formData.rvCode || undefined
      };

      console.log("Enviando payload:", payload);
      
      // Hacemos la solicitud al endpoint de prueba
      const response = await axios.post("/api/test/vehicle-matching", payload);
      setMatchResult(response.data);

      if (response.data.success) {
        toast({
          title: "¡Éxito!",
          description: "Se encontró un vehículo coincidente.",
          variant: "default",
        });
      } else {
        toast({
          title: "No se encontraron coincidencias",
          description: "No se encontró ningún vehículo con los criterios especificados.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al realizar la prueba:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al realizar la prueba de matching.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadVehicleData = () => {
    setFormData({
      codVersion: "Stella",
      puertas: "3",
      anyoInicio: "1999", 
      anyoFin: "1999",
      rvCode: ""
    });
    
    toast({
      title: "Datos cargados",
      description: "Se han cargado los datos de prueba para búsqueda.",
      variant: "default",
    });
  };

  // Función para ejecutar una búsqueda automática al cargar la página
  const handlePartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPartMatchResult(null);

    if (!partId || isNaN(parseInt(partId))) {
      toast({
        title: "Error de validación",
        description: "Por favor, ingresa un ID de pieza válido",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Preparamos los datos para enviar al servidor
      const payload = {
        partId: parseInt(partId)
      };

      console.log("Enviando part ID:", payload);
      
      // Hacemos la solicitud al endpoint de prueba
      const response = await axios.post("/api/test/part-vehicle-matching", payload);
      setPartMatchResult(response.data);

      if (response.data.success) {
        toast({
          title: "¡Éxito!",
          description: `Se encontraron ${response.data.count} vehículos compatibles con la pieza.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No se encontraron coincidencias",
          description: response.data.message || "No se encontraron vehículos compatibles con esta pieza.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al realizar la prueba:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al realizar el matching de pieza con vehículos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runInitialSearch = () => {
    setTimeout(() => {
      if (activeTab === "vehicle-search") {
        // Crear un evento sintético para evitar el warning de TypeScript
        const event = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(event);
      }
    }, 500);
  };
  
  useEffect(() => {
    runInitialSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Prueba de Matching de Vehículos</h1>
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">¡Algoritmo de matching simplificado!</h2>
        <p className="mb-2 text-gray-700">
          Hemos actualizado el algoritmo de matching para enfocarse solo en los campos esenciales:
        </p>
        <ul className="list-disc pl-5 text-gray-700 mb-2">
          <li>Búsqueda por código de referencia único (rvCode)</li>
          <li>Búsqueda por versión del vehículo (codVersion)</li>
          <li>Filtrado por rango de años (anyoInicio - anyoFin)</li>
          <li>Filtrado por número de puertas</li>
        </ul>
        <p className="text-gray-700">
          Puedes usar cualquier combinación de estos campos para encontrar vehículos compatibles.
        </p>
      </div>
      
      <Tabs defaultValue="vehicle-search" className="mb-6" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vehicle-search">Búsqueda de Vehículos</TabsTrigger>
          <TabsTrigger value="part-matching">Matching de Piezas</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicle-search">
          <div className="border-t pt-4">
            <p className="mb-6 text-gray-600">
              Esta opción te permite probar la búsqueda de vehículos compatible con los criterios especificados.
              Rellena solo los campos que necesites para la búsqueda.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Datos de prueba</CardTitle>
                  <CardDescription>
                    Introduce los criterios de búsqueda deseados para encontrar un vehículo coincidente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="codVersion">Código Versión</Label>
                      <Input
                        id="codVersion"
                        name="codVersion"
                        value={formData.codVersion}
                        onChange={handleChange}
                        placeholder="Ejemplo: 01060072"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="puertas">Número de Puertas</Label>
                      <Input
                        id="puertas"
                        name="puertas"
                        type="number"
                        value={formData.puertas}
                        onChange={handleChange}
                        placeholder="Ejemplo: 3"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="anyoInicio">Año Inicio</Label>
                        <Input
                          id="anyoInicio"
                          name="anyoInicio"
                          type="number"
                          value={formData.anyoInicio}
                          onChange={handleChange}
                          placeholder="Ejemplo: 1994"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="anyoFin">Año Fin</Label>
                        <Input
                          id="anyoFin"
                          name="anyoFin"
                          type="number"
                          value={formData.anyoFin}
                          onChange={handleChange}
                          placeholder="Ejemplo: 1999"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rvCode">Código RV</Label>
                      <Input
                        id="rvCode"
                        name="rvCode"
                        value={formData.rvCode}
                        onChange={handleChange}
                        placeholder="Ejemplo: 4394G"
                      />
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleLoadVehicleData}>
                    Cargar ejemplo
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Buscando..." : "Probar matching"}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultado</CardTitle>
                  <CardDescription>
                    Aquí se mostrará el resultado de la búsqueda
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {matchResult ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-md bg-gray-50">
                        <p className="font-semibold">
                          {matchResult.success ? (
                            <span className="text-green-600">✓ Vehículo encontrado</span>
                          ) : (
                            <span className="text-red-600">✗ No se encontró ningún vehículo</span>
                          )}
                        </p>
                        
                        {matchResult.success && matchResult.matchedVehicle && (
                          <div className="mt-4 space-y-2">
                            <p><span className="font-semibold">ID:</span> {matchResult.matchedVehicle.id}</p>
                            <p><span className="font-semibold">Marca:</span> {matchResult.matchedVehicle.marca}</p>
                            <p><span className="font-semibold">Modelo:</span> {matchResult.matchedVehicle.modelo}</p>
                            <p><span className="font-semibold">Versión:</span> {matchResult.matchedVehicle.version}</p>
                            <p><span className="font-semibold">Año:</span> {matchResult.matchedVehicle.anyo}</p>
                            {matchResult.totalMatches > 1 && (
                              <p className="text-blue-600">
                                <span className="font-semibold">Nota:</span> Se encontraron {matchResult.totalMatches} vehículos que coinciden. Se muestra el primero.
                              </p>
                            )}
                          </div>
                        )}
                        
                        {!matchResult.success && (
                          <p className="mt-2">
                            No se encontró ningún vehículo que coincida con los criterios proporcionados.
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold mb-1">Datos de respuesta completos:</p>
                        <pre className="p-2 bg-gray-100 rounded-md overflow-auto text-xs">
                          {JSON.stringify(matchResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-48 text-gray-400">
                      Aquí se mostrarán los resultados del matching
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="part-matching">
          <div className="border-t pt-4">
            <p className="mb-6 text-gray-600">
              Esta opción te permite probar la funcionalidad de matching entre piezas y vehículos.
              Introduce el ID de una pieza para encontrar todos los vehículos compatibles.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Matching de Pieza</CardTitle>
                  <CardDescription>
                    Introduce el ID de una pieza para encontrar vehículos compatibles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePartSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="partId">ID de Pieza</Label>
                      <Input
                        id="partId"
                        name="partId"
                        type="number"
                        value={partId}
                        onChange={handlePartIdChange}
                        placeholder="Ejemplo: 1234"
                      />
                      <p className="text-sm text-gray-500">
                        El sistema buscará vehículos compatibles basados en los campos de matching de la pieza
                        (codVersion, puertas, anyoInicio, anyoFin, rvCode).
                      </p>
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handlePartSubmit} disabled={loading}>
                    {loading ? "Buscando..." : "Buscar vehículos compatibles"}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vehículos Compatibles</CardTitle>
                  <CardDescription>
                    Aquí se mostrarán los vehículos compatibles con la pieza
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {partMatchResult ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-md bg-gray-50">
                        <p className="font-semibold">
                          {partMatchResult.success ? (
                            <span className="text-green-600">✓ Se encontraron {partMatchResult.count} vehículos compatibles</span>
                          ) : (
                            <span className="text-red-600">✗ No se encontraron vehículos compatibles</span>
                          )}
                        </p>
                        
                        {partMatchResult.success && partMatchResult.data && partMatchResult.data.length > 0 && (
                          <div className="mt-4">
                            <p className="font-semibold mb-2">Vehículos compatibles:</p>
                            <div className="max-h-64 overflow-y-auto">
                              {partMatchResult.data.map((vehicle: any, index: number) => (
                                <div key={vehicle.id} className="mb-4 p-3 bg-white rounded border border-gray-200">
                                  <p className="text-sm text-gray-500">Vehículo #{index + 1}</p>
                                  <p><span className="font-semibold">ID:</span> {vehicle.id}</p>
                                  <p><span className="font-semibold">Marca:</span> {vehicle.marca}</p>
                                  <p><span className="font-semibold">Modelo:</span> {vehicle.modelo}</p>
                                  <p><span className="font-semibold">Versión:</span> {vehicle.version}</p>
                                  <p><span className="font-semibold">Año:</span> {vehicle.anyo}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {!partMatchResult.success && (
                          <p className="mt-2">
                            No se encontraron vehículos compatibles con la pieza proporcionada.
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold mb-1">Datos de respuesta completos:</p>
                        <pre className="p-2 bg-gray-100 rounded-md overflow-auto text-xs">
                          {JSON.stringify(partMatchResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-48 text-gray-400">
                      Aquí se mostrarán los vehículos compatibles
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
