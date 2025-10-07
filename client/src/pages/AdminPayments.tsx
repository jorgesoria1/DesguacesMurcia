
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminPayments() {
  const { toast } = useToast();
  const [shippingMethods, setShippingMethods] = React.useState<any[]>([]);
  const [redsysConfig, setRedsysConfig] = React.useState({
    merchantCode: "",
    terminal: "001",
    secretKey: "",
    environment: "test" as "test" | "production"
  });

  const [newShippingMethod, setNewShippingMethod] = React.useState({
    name: "",
    description: "",
    basePrice: "",
    freeShippingThreshold: "",
    weightBasedPricing: false,
    pricePerKg: "",
    estimatedDays: "1",
    isActive: true
  });

  React.useEffect(() => {
    loadShippingMethods();
    loadRedsysConfig();
  }, []);

  const loadShippingMethods = async () => {
    try {
      const response = await apiRequest("GET", "/api/shipping/methods");
      if (response.ok) {
        const methods = await response.json();
        setShippingMethods(methods);
      }
    } catch (error) {
      console.error("Error loading shipping methods:", error);
    }
  };

  const loadRedsysConfig = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/site-config/redsys_config");
      if (response.ok) {
        const config = await response.json();
        if (config.value) {
          setRedsysConfig(JSON.parse(config.value));
        }
      }
    } catch (error) {
      console.error("Error loading Redsys config:", error);
    }
  };

  const saveRedsysConfig = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/site-config", {
        key: "redsys_config",
        value: JSON.stringify(redsysConfig),
        description: "Configuración de Redsys para pagos con tarjeta"
      });

      if (response.ok) {
        toast({
          title: "Configuración guardada",
          description: "La configuración de Redsys se ha guardado correctamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };

  const createShippingMethod = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/shipping/methods", {
        ...newShippingMethod,
        basePrice: parseFloat(newShippingMethod.basePrice) || 0,
        freeShippingThreshold: newShippingMethod.freeShippingThreshold 
          ? parseFloat(newShippingMethod.freeShippingThreshold) 
          : null,
        pricePerKg: parseFloat(newShippingMethod.pricePerKg) || 0,
        estimatedDays: parseInt(newShippingMethod.estimatedDays) || 1
      });

      if (response.ok) {
        toast({
          title: "Método creado",
          description: "El método de envío se ha creado correctamente",
        });
        loadShippingMethods();
        setNewShippingMethod({
          name: "",
          description: "",
          basePrice: "",
          freeShippingThreshold: "",
          weightBasedPricing: false,
          pricePerKg: "",
          estimatedDays: "1",
          isActive: true
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el método de envío",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Configuración de Pagos y Envíos</h1>

      <Tabs defaultValue="shipping" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shipping">Métodos de Envío</TabsTrigger>
          <TabsTrigger value="payments">Configuración de Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Método de Envío</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newShippingMethod.name}
                    onChange={(e) => setNewShippingMethod(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Envío estándar"
                  />
                </div>
                <div>
                  <Label htmlFor="basePrice">Precio base (€)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    value={newShippingMethod.basePrice}
                    onChange={(e) => setNewShippingMethod(prev => ({ ...prev, basePrice: e.target.value }))}
                    placeholder="5.95"
                  />
                </div>
                <div>
                  <Label htmlFor="freeThreshold">Envío gratuito desde (€)</Label>
                  <Input
                    id="freeThreshold"
                    type="number"
                    step="0.01"
                    value={newShippingMethod.freeShippingThreshold}
                    onChange={(e) => setNewShippingMethod(prev => ({ ...prev, freeShippingThreshold: e.target.value }))}
                    placeholder="50.00"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedDays">Días estimados</Label>
                  <Input
                    id="estimatedDays"
                    type="number"
                    value={newShippingMethod.estimatedDays}
                    onChange={(e) => setNewShippingMethod(prev => ({ ...prev, estimatedDays: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={newShippingMethod.description}
                  onChange={(e) => setNewShippingMethod(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Envío en 24-48 horas laborables"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newShippingMethod.isActive}
                  onCheckedChange={(checked) => setNewShippingMethod(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Activo</Label>
              </div>
              <Button onClick={createShippingMethod}>Crear Método</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métodos de Envío Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shippingMethods.map((method) => (
                  <div key={method.id} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{method.name}</h3>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <p className="text-sm">
                          Precio: {method.basePrice}€
                          {method.freeShippingThreshold && (
                            <span> (Gratuito desde {method.freeShippingThreshold}€)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          method.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {method.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Redsys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="merchantCode">Código de comercio</Label>
                  <Input
                    id="merchantCode"
                    value={redsysConfig.merchantCode}
                    onChange={(e) => setRedsysConfig(prev => ({ ...prev, merchantCode: e.target.value }))}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="terminal">Terminal</Label>
                  <Input
                    id="terminal"
                    value={redsysConfig.terminal}
                    onChange={(e) => setRedsysConfig(prev => ({ ...prev, terminal: e.target.value }))}
                    placeholder="001"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="secretKey">Clave secreta</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={redsysConfig.secretKey}
                    onChange={(e) => setRedsysConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="Clave secreta de Redsys"
                  />
                </div>
                <div>
                  <Label htmlFor="environment">Entorno</Label>
                  <select
                    id="environment"
                    className="w-full p-2 border rounded"
                    value={redsysConfig.environment}
                    onChange={(e) => setRedsysConfig(prev => ({ ...prev, environment: e.target.value as "test" | "production" }))}
                  >
                    <option value="test">Pruebas</option>
                    <option value="production">Producción</option>
                  </select>
                </div>
              </div>
              <Button onClick={saveRedsysConfig}>Guardar Configuración</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
