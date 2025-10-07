import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, CreditCard, Building2, Wallet, Check, X, AlertCircle } from "lucide-react";

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

export default function PaymentModules() {
  const { toast } = useToast();
  const [modules, setModules] = useState<PaymentModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string>('');
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // Forzar re-render

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/payment-modules');
      const data = await response.json();
      console.log('🔧 PAYMENT MODULES: Datos recibidos:', data);
      
      // Forzar actualización del estado
      setModules([]); // Limpiar primero
      setTimeout(() => {
        setModules(data);
        if (data && data.length > 0) {
          setActiveModule(data[0].provider);
          setFormData(data[0].config || {});
        }
      }, 50);
      
    } catch (error) {
      console.error('❌ PAYMENT MODULES: Error cargando módulos:', error);
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

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const module = modules.find(m => m.provider === activeModule);
      if (!module) return;

      await apiRequest('PUT', `/api/admin/payment-modules/${activeModule}`, {
        config: formData,
        isActive: module.isActive
      });

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      });

      // Recargar módulos
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

  const handleToggleModule = async (provider: string, newState: boolean) => {
    try {
      const module = modules.find(m => m.provider === provider);
      if (!module) return;

      console.log(`🔧 TOGGLE MODULE: ${provider} -> ${newState ? 'activado' : 'desactivado'}`);

      // Actualizar estado local inmediatamente con forzado de re-render
      setModules(prevModules => 
        prevModules.map(m => 
          m.provider === provider 
            ? { ...m, isActive: newState }
            : m
        )
      );

      // Forzar re-render del componente
      setForceUpdate(prev => prev + 1);

      const response = await apiRequest('PUT', `/api/admin/payment-modules/${provider}`, {
        config: module.config,
        isActive: newState
      });

      console.log(`✅ TOGGLE MODULE: ${provider} actualizado en backend`);

      toast({
        title: newState ? "Módulo activado" : "Módulo desactivado",
        description: `El módulo ${module.name} ha sido ${newState ? 'activado' : 'desactivado'}`,
      });

      // Recargar módulos para asegurar sincronización completa con backend
      setTimeout(async () => {
        console.log('🔄 TOGGLE MODULE: Recargando módulos para verificar sincronización...');
        await loadModules();
        setForceUpdate(prev => prev + 1); // Otro forzado después de la recarga
      }, 200);

    } catch (error) {
      console.error(`❌ TOGGLE MODULE ERROR: ${provider}`, error);
      
      // Revertir cambio local en caso de error
      setModules(prevModules => 
        prevModules.map(m => 
          m.provider === provider 
            ? { ...m, isActive: !newState }
            : m
        )
      );

      // Forzar re-render tras error
      setForceUpdate(prev => prev + 1);

      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del módulo",
        variant: "destructive",
      });
    }
  };

  const getModuleIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'paypal':
        return <Wallet className="w-5 h-5 text-yellow-600" />;
      case 'redsys':
        return <CreditCard className="w-5 h-5 text-red-600" />;
      case 'bank_transfer':
        return <Building2 className="w-5 h-5 text-green-600" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const renderConfigField = (field: any) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => handleInputChange(field.name, val)}>
              <SelectTrigger>
                <SelectValue placeholder={`Seleccionar ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id={field.name}
                checked={!!value}
                onCheckedChange={(checked) => handleInputChange(field.name, checked)}
              />
              <Label htmlFor={field.name}>
                {field.label}
              </Label>
            </div>
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
          </div>
        );

      case 'password':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="password"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={`Ingresa ${field.label}`}
            />
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="text"
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={`Ingresa ${field.label}`}
            />
            {field.description && (
              <p className="text-sm text-gray-500">{field.description}</p>
            )}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentModule = modules.find(m => m.provider === activeModule);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Módulos de Pago</h1>
        <Badge variant="outline" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configuración de Pagos
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Lista de módulos */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Módulos Disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((module) => (
              <div
                key={module.provider}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  activeModule === module.provider 
                    ? 'border-primary bg-primary/10' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleModuleChange(module.provider)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getModuleIcon(module.provider)}
                    <span className="font-medium">{module.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      key={`${module.provider}-${forceUpdate}-${module.isActive}`}
                      checked={module.isActive}
                      onCheckedChange={(checked) => handleToggleModule(module.provider, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {module.isActive ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <Badge variant={module.isActive ? "default" : "secondary"} className="text-xs">
                  {module.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Configuración del módulo */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentModule && getModuleIcon(currentModule.provider)}
              Configuración de {currentModule?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentModule ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    Configura los parámetros del módulo de pago. Los campos marcados con * son obligatorios.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentModule.configFields.map(field => renderConfigField(field))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleModuleChange(activeModule)}
                    disabled={saving}
                  >
                    Descartar Cambios
                  </Button>
                  <Button
                    onClick={handleSaveConfig}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Selecciona un módulo para configurar
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Redsys</h4>
              <p className="text-sm text-gray-600">
                Sistema de pago español para tarjetas de crédito y débito. Requiere código de comercio y clave secreta.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">PayPal</h4>
              <p className="text-sm text-gray-600">
                Sistema de pago internacional. Requiere Client ID y Client Secret desde el panel de PayPal.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Stripe</h4>
              <p className="text-sm text-gray-600">
                Procesador de pagos con tarjeta. Requiere claves públicas y privadas de Stripe.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Transferencia Bancaria</h4>
              <p className="text-sm text-gray-600">
                Pago offline. Los clientes reciben instrucciones para realizar transferencia manual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}