import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building, CreditCard, Save, Settings, AlertCircle } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

interface PaymentModule {
  provider: string;
  name: string;
  isActive: boolean;
  configFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'checkbox';
    required: boolean;
    options?: Array<{value: string, label: string}>;
    description?: string;
  }>;
  config: any;
}

const moduleIcons = {
  bank_transfer: Building,
  redsys: CreditCard,
  stripe: CreditCard,
  paypal: CreditCard,
};

export default function AdminPaymentMethods() {
  const { toast } = useToast();
  const [modules, setModules] = useState<PaymentModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string>('');
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      console.log('AdminPaymentMethods: Cargando módulos...');
      const response = await apiRequest('GET', '/api/admin/payment-modules');
      console.log('AdminPaymentMethods: Response object:', response);
      
      // apiRequest devuelve un Response, necesitamos hacer .json()
      const data = await response.json();
      console.log('AdminPaymentMethods: Data después de JSON:', data);
      console.log('AdminPaymentMethods: Tipo de data:', typeof data);
      console.log('AdminPaymentMethods: Es array?', Array.isArray(data));
      
      // Verificar que la respuesta sea un array
      if (Array.isArray(data)) {
        console.log('AdminPaymentMethods: Módulos válidos:', data.length);
        console.log('AdminPaymentMethods: Primer módulo:', data[0]);
        setModules(data);
        
        // Crear estado inicial para switches
        const states: Record<string, boolean> = {};
        data.forEach((module: PaymentModule) => {
          states[module.provider] = module.isActive;
        });
        setModuleStates(states);
        console.log('AdminPaymentMethods: Estados de módulos:', states);
        
        if (data.length > 0) {
          setActiveModule(data[0].provider);
          setFormData(data[0].config || {});
        }
      } else {
        console.error('La respuesta no es un array:', data);
        console.error('AdminPaymentMethods: Tipo de respuesta:', typeof data);
        setModules([]);
      }
    } catch (error) {
      console.error('AdminPaymentMethods: Error cargando módulos:', error);
      setModules([]);
      toast({
        title: "Error",
        description: "No se pudieron cargar los módulos de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModuleChange = (provider: string) => {
    setActiveModule(provider);
    const module = modules.find(m => m.provider === provider);
    setFormData(module?.config || {});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConfig = async () => {
    if (!activeModule) return;

    setSaving(true);
    try {
      await apiRequest('PUT', `/api/admin/payment-modules/${activeModule}`, {
        config: formData
      });
      
      toast({
        title: "Configuración guardada",
        description: "La configuración del módulo se ha guardado correctamente",
      });
      
      // Recargar módulos para obtener estado actualizado
      await loadModules();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModule = async (provider: string, isActive: boolean) => {
    try {
      await apiRequest('PUT', `/api/admin/payment-modules/${provider}`, {
        isActive
      });
      
      // Actualizar estado local
      setModuleStates(prev => ({
        ...prev,
        [provider]: isActive
      }));
      
      toast({
        title: isActive ? "Módulo activado" : "Módulo desactivado",
        description: `El módulo ${provider} ha sido ${isActive ? 'activado' : 'desactivado'}`,
      });
      
      // Recargar módulos para obtener estado actualizado
      await loadModules();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del módulo",
        variant: "destructive",
      });
    }
  };

  const renderConfigField = (field: any) => {
    const value = formData[field.name] || '';
    
    switch (field.type) {
      case 'text':
      case 'password':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.description}
              className="w-full"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      
      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <select
              id={field.name}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Switch
              id={field.name}
              checked={value}
              onCheckedChange={(checked) => handleInputChange(field.name, checked)}
            />
            <Label htmlFor={field.name} className="text-sm">
              {field.label}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground ml-2">({field.description})</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('AdminPaymentMethods: Renderizando con modules:', modules, 'loading:', loading);
  console.log('AdminPaymentMethods: modules.length:', modules.length);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Módulos de Pago</h1>
            <p className="text-muted-foreground">
              Gestiona los módulos de pago disponibles en tu tienda
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lista de módulos */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              {modules && modules.length > 0 ? modules.map((module) => {
                const Icon = moduleIcons[module.provider as keyof typeof moduleIcons] || CreditCard;
                return (
                  <Card 
                    key={module.provider} 
                    className={`cursor-pointer transition-all ${
                      activeModule === module.provider 
                        ? 'ring-2 ring-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleModuleChange(module.provider)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-sm">{module.name}</CardTitle>
                        </div>
                        <Badge variant={moduleStates[module.provider] ? "default" : "secondary"}>
                          {moduleStates[module.provider] ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={moduleStates[module.provider]}
                          onCheckedChange={(checked) => handleToggleModule(module.provider, checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Label className="text-xs text-muted-foreground">
                          {moduleStates[module.provider] ? "Habilitado" : "Deshabilitado"}
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No hay módulos disponibles
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Configuración del módulo seleccionado */}
          <div className="lg:col-span-3">
            {activeModule && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <CardTitle>
                      Configuración - {modules.find(m => m.provider === activeModule)?.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {modules.find(m => m.provider === activeModule)?.configFields.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Este módulo no requiere configuración adicional
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {modules
                          .find(m => m.provider === activeModule)
                          ?.configFields.map(field => renderConfigField(field))}
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleSaveConfig} 
                          disabled={saving}
                          className="flex items-center space-x-2"
                        >
                          <Save className="h-4 w-4" />
                          <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {modules.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay módulos de pago disponibles</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Los módulos de pago se cargan automáticamente del sistema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}