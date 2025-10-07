import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Cookie, Settings, Shield, BarChart3, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const COOKIE_CONSENT_KEY = 'cookieConsent';
const COOKIE_PREFERENCES_KEY = 'cookiePreferences';

export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Siempre habilitadas
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Verificar si ya se dio consentimiento
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    
    if (!consent) {
      setShowBanner(true);
    } else if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setShowBanner(false);
    
    // Activar cookies según las preferencias
    activateCookies(allAccepted);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(necessaryOnly));
    setPreferences(necessaryOnly);
    setShowBanner(false);
    
    // Activar solo cookies necesarias
    activateCookies(necessaryOnly);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    setShowBanner(false);
    setShowSettings(false);
    
    // Activar cookies según las preferencias
    activateCookies(preferences);
  };

  const activateCookies = (prefs: CookiePreferences) => {
    // Aquí puedes activar/desactivar cookies según las preferencias
    if (prefs.analytics) {
      // Activar Google Analytics o similar
      console.log('Activando cookies de análisis');
    }
    
    if (prefs.marketing) {
      // Activar cookies de marketing
      console.log('Activando cookies de marketing');
    }
    
    if (prefs.preferences) {
      // Activar cookies de preferencias
      console.log('Activando cookies de preferencias');
    }
  };

  const handlePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'necessary') return; // No permitir cambiar cookies necesarias
    
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                <Cookie className="h-6 w-6 text-blue-600" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Utilizamos cookies para mejorar tu experiencia
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Este sitio web utiliza cookies para garantizar que obtengas la mejor experiencia en nuestro sitio. 
                  Las cookies necesarias son esenciales para el funcionamiento del sitio, mientras que otras nos ayudan 
                  a personalizar tu experiencia y analizar el tráfico.
                </p>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <Button 
                    onClick={handleAcceptAll}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Aceptar todas
                  </Button>
                  
                  <Button 
                    onClick={handleAcceptNecessary}
                    variant="outline"
                  >
                    Solo necesarias
                  </Button>
                  
                  <Dialog open={showSettings} onOpenChange={setShowSettings}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configuración de cookies</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        <div className="space-y-4">
                          {/* Cookies necesarias */}
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Shield className="h-5 w-5 text-green-600" />
                              <div>
                                <Label className="font-medium">Cookies necesarias</Label>
                                <p className="text-sm text-gray-600">
                                  Esenciales para el funcionamiento del sitio web
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={preferences.necessary}
                                disabled
                              />
                              <Badge variant="secondary">Siempre activas</Badge>
                            </div>
                          </div>

                          {/* Cookies de análisis */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <BarChart3 className="h-5 w-5 text-blue-600" />
                              <div>
                                <Label className="font-medium">Cookies de análisis</Label>
                                <p className="text-sm text-gray-600">
                                  Nos ayudan a entender cómo interactúas con nuestro sitio
                                </p>
                              </div>
                            </div>
                            <Switch 
                              checked={preferences.analytics}
                              onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                            />
                          </div>

                          {/* Cookies de marketing */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Target className="h-5 w-5 text-purple-600" />
                              <div>
                                <Label className="font-medium">Cookies de marketing</Label>
                                <p className="text-sm text-gray-600">
                                  Utilizadas para mostrar anuncios relevantes
                                </p>
                              </div>
                            </div>
                            <Switch 
                              checked={preferences.marketing}
                              onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                            />
                          </div>

                          {/* Cookies de preferencias */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Settings className="h-5 w-5 text-orange-600" />
                              <div>
                                <Label className="font-medium">Cookies de preferencias</Label>
                                <p className="text-sm text-gray-600">
                                  Recuerdan tus preferencias y configuraciones
                                </p>
                              </div>
                            </div>
                            <Switch 
                              checked={preferences.preferences}
                              onCheckedChange={(checked) => handlePreferenceChange('preferences', checked)}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowSettings(false)}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleSavePreferences}>
                            Guardar preferencias
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowBanner(false)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// Hook para usar las preferencias de cookies
export const useCookiePreferences = () => {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  const updatePreferences = (newPreferences: CookiePreferences) => {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(newPreferences));
    setPreferences(newPreferences);
  };

  return { preferences, updatePreferences };
};