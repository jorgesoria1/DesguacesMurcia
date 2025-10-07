import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/dashboard/Sidebar";
import { 
  Cookie, 
  Shield, 
  BarChart3, 
  Target, 
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";

interface CookieConfiguration {
  id: string;
  bannerEnabled: boolean;
  bannerMessage: string;
  bannerPosition: 'bottom' | 'top';
  bannerStyle: 'minimal' | 'detailed';
  privacyPolicyUrl: string;
  cookiePolicyUrl: string;
  consentDuration: number; // días
  necessaryCookies: {
    enabled: boolean;
    description: string;
    cookies: string[];
  };
  analyticsCookies: {
    enabled: boolean;
    description: string;
    cookies: string[];
    googleAnalyticsId?: string;
  };
  marketingCookies: {
    enabled: boolean;
    description: string;
    cookies: string[];
  };
  preferencesCookies: {
    enabled: boolean;
    description: string;
    cookies: string[];
  };
}

const AdminCookieSettings: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CookieConfiguration>({
    id: '1',
    bannerEnabled: true,
    bannerMessage: 'Utilizamos cookies para mejorar tu experiencia en nuestro sitio web. Al continuar navegando, aceptas nuestro uso de cookies.',
    bannerPosition: 'bottom',
    bannerStyle: 'detailed',
    privacyPolicyUrl: '/politica-privacidad',
    cookiePolicyUrl: '/politica-cookies',
    consentDuration: 365,
    necessaryCookies: {
      enabled: true,
      description: 'Cookies esenciales para el funcionamiento básico del sitio web',
      cookies: ['session', 'csrf_token', 'cart_data']
    },
    analyticsCookies: {
      enabled: false,
      description: 'Cookies para análisis y métricas del sitio web',
      cookies: ['_ga', '_gid', '_gat'],
      googleAnalyticsId: ''
    },
    marketingCookies: {
      enabled: false,
      description: 'Cookies para publicidad y marketing dirigido',
      cookies: ['_fb', '_twitter', 'advertising_id']
    },
    preferencesCookies: {
      enabled: false,
      description: 'Cookies para recordar preferencias del usuario',
      cookies: ['theme', 'language', 'layout_preferences']
    }
  });

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      // Simular guardado en el servidor
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Guardar en localStorage para la demo
      localStorage.setItem('adminCookieConfig', JSON.stringify(config));
      
      toast({
        title: "Configuración guardada",
        description: "La configuración de cookies se ha guardado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración de cookies.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadConfiguration = async () => {
    setLoading(true);
    try {
      // Simular carga desde el servidor
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Cargar desde localStorage para la demo
      const savedConfig = localStorage.getItem('adminCookieConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      toast({
        title: "Error al cargar",
        description: "No se pudo cargar la configuración de cookies.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetConsent = () => {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookiePreferences');
    
    toast({
      title: "Consentimiento restablecido",
      description: "Se ha eliminado el consentimiento de cookies. Recarga la página para ver el banner nuevamente.",
    });
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  useEffect(() => {
    handleLoadConfiguration();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeTab="admin_cookie_settings" />
      
      <div className="flex-1 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Configuración de Cookies</h1>
              <p className="text-muted-foreground">
                Gestiona el consentimiento de cookies y las políticas de privacidad
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleLoadConfiguration}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Recargar
              </Button>
              <Button 
                onClick={handleSaveConfiguration}
                disabled={saving}
              >
                <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="appearance">Apariencia</TabsTrigger>
              <TabsTrigger value="tools">Herramientas</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuración General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar banner de cookies</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar el banner de consentimiento de cookies
                      </p>
                    </div>
                    <Switch
                      checked={config.bannerEnabled}
                      onCheckedChange={(checked) => updateConfig('bannerEnabled', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensaje del banner</Label>
                    <Textarea
                      value={config.bannerMessage}
                      onChange={(e) => updateConfig('bannerMessage', e.target.value)}
                      placeholder="Mensaje que aparecerá en el banner de cookies"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>URL de política de privacidad</Label>
                      <Input
                        value={config.privacyPolicyUrl}
                        onChange={(e) => updateConfig('privacyPolicyUrl', e.target.value)}
                        placeholder="/politica-privacidad"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL de política de cookies</Label>
                      <Input
                        value={config.cookiePolicyUrl}
                        onChange={(e) => updateConfig('cookiePolicyUrl', e.target.value)}
                        placeholder="/politica-cookies"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Duración del consentimiento (días)</Label>
                    <Input
                      type="number"
                      value={config.consentDuration}
                      onChange={(e) => updateConfig('consentDuration', parseInt(e.target.value))}
                      placeholder="365"
                      min="1"
                      max="1095"
                    />
                    <p className="text-sm text-muted-foreground">
                      Tiempo antes de que se vuelva a solicitar el consentimiento
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              <div className="grid gap-6">
                {/* Cookies Necesarias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Cookies Necesarias
                      <Badge variant="secondary">Siempre activas</Badge>
                    </CardTitle>
                  </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={config.necessaryCookies.description}
                    onChange={(e) => updateConfig('necessaryCookies.description', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cookies utilizadas</Label>
                  <Input
                    value={config.necessaryCookies.cookies.join(', ')}
                    onChange={(e) => updateConfig('necessaryCookies.cookies', e.target.value.split(', ').filter(Boolean))}
                    placeholder="session, csrf_token, cart_data"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cookies de Análisis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Cookies de Análisis
                  <Switch
                    checked={config.analyticsCookies.enabled}
                    onCheckedChange={(checked) => updateConfig('analyticsCookies.enabled', checked)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={config.analyticsCookies.description}
                    onChange={(e) => updateConfig('analyticsCookies.description', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Google Analytics ID (opcional)</Label>
                  <Input
                    value={config.analyticsCookies.googleAnalyticsId || ''}
                    onChange={(e) => updateConfig('analyticsCookies.googleAnalyticsId', e.target.value)}
                    placeholder="GA-XXXXXXXXX-X"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cookies utilizadas</Label>
                  <Input
                    value={config.analyticsCookies.cookies.join(', ')}
                    onChange={(e) => updateConfig('analyticsCookies.cookies', e.target.value.split(', ').filter(Boolean))}
                    placeholder="_ga, _gid, _gat"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cookies de Marketing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Cookies de Marketing
                  <Switch
                    checked={config.marketingCookies.enabled}
                    onCheckedChange={(checked) => updateConfig('marketingCookies.enabled', checked)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={config.marketingCookies.description}
                    onChange={(e) => updateConfig('marketingCookies.description', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cookies utilizadas</Label>
                  <Input
                    value={config.marketingCookies.cookies.join(', ')}
                    onChange={(e) => updateConfig('marketingCookies.cookies', e.target.value.split(', ').filter(Boolean))}
                    placeholder="_fb, _twitter, advertising_id"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cookies de Preferencias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-orange-600" />
                  Cookies de Preferencias
                  <Switch
                    checked={config.preferencesCookies.enabled}
                    onCheckedChange={(checked) => updateConfig('preferencesCookies.enabled', checked)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={config.preferencesCookies.description}
                    onChange={(e) => updateConfig('preferencesCookies.description', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cookies utilizadas</Label>
                  <Input
                    value={config.preferencesCookies.cookies.join(', ')}
                    onChange={(e) => updateConfig('preferencesCookies.cookies', e.target.value.split(', ').filter(Boolean))}
                    placeholder="theme, language, layout_preferences"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Apariencia del Banner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Posición del banner</Label>
                <Select 
                  value={config.bannerPosition} 
                  onValueChange={(value) => updateConfig('bannerPosition', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom">Parte inferior</SelectItem>
                    <SelectItem value="top">Parte superior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estilo del banner</Label>
                <Select 
                  value={config.bannerStyle} 
                  onValueChange={(value) => updateConfig('bannerStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimalista</SelectItem>
                    <SelectItem value="detailed">Detallado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Herramientas de Desarrollo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Restablecer consentimiento</p>
                  <p className="text-sm text-muted-foreground">
                    Elimina el consentimiento guardado para probar el banner nuevamente
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleResetConsent}
                  className="ml-auto"
                >
                  Restablecer
                </Button>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <Info className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Vista previa</p>
                  <p className="text-sm text-muted-foreground">
                    Los cambios se aplicarán automáticamente en el sitio web
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
      </div>
    </div>
  );
};

export default AdminCookieSettings;