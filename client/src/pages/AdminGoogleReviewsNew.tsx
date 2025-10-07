import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TestTube, Star, MapPin, Settings, RefreshCw } from "lucide-react";
// import AdminLayout from "@/components/AdminLayout"; // Removed - using in tab context

interface GoogleReviewsConfig {
  id: number;
  businessName: string;
  placeId?: string;
  location: string;
  apiProvider: string;
  apiKey?: string;
  enabled: boolean;
  minRating: number;
  maxReviews: number;
  cacheHours: number;
  lastUpdate?: string;
}

interface GoogleReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  avatar: string;
  source: string;
}

const AdminGoogleReviews: React.FC = () => {
  const { toast } = useToast();
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Separate state for each field to prevent conflicts
  const [businessName, setBusinessName] = useState("Desguace Murcia");
  const [location, setLocation] = useState("Murcia, España");
  const [placeId, setPlaceId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [minRating, setMinRating] = useState(4);
  const [maxReviews, setMaxReviews] = useState(6);
  const [cacheHours, setCacheHours] = useState(24);
  const [isFormReady, setIsFormReady] = useState(false);

  // Get current configuration
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['/api/google-reviews/config'],
    queryFn: async () => {
      const response = await fetch('/api/google-reviews/config');
      const data = await response.json();
      return data.config || data;
    }
  });

  // Update form fields when config loads
  useEffect(() => {
    if (config && !isFormReady) {
      console.log('Loading config into form:', config);
      setBusinessName(config.businessName || "Desguace Murcia");
      setLocation(config.location || "Murcia, España");
      setPlaceId(config.placeId || "");
      setApiKey(config.apiKey || "");
      setEnabled(config.enabled || false);
      setMinRating(config.minRating || 4);
      setMaxReviews(config.maxReviews || 6);
      setCacheHours(config.cacheHours || 24);
      setIsFormReady(true);
    }
  }, [config, isFormReady]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch('/api/google-reviews/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      
      if (!response.ok) {
        throw new Error('Error saving configuration');
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Config saved successfully:', data);
      toast({
        title: "✅ Configuración guardada",
        description: "La configuración de Google Reviews se ha guardado correctamente."
      });
      
      // Update form with saved data
      if (data.config) {
        setBusinessName(data.config.businessName || businessName);
        setLocation(data.config.location || location);
        setPlaceId(data.config.placeId || placeId);
        setApiKey(data.config.apiKey || apiKey);
        setEnabled(data.config.enabled || enabled);
        setMinRating(data.config.minRating || minRating);
        setMaxReviews(data.config.maxReviews || maxReviews);
        setCacheHours(data.config.cacheHours || cacheHours);
      }
      
      // Refresh config query
      refetchConfig();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo guardar la configuración.",
        variant: "destructive"
      });
    }
  });

  // Get current reviews for preview
  const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery({
    queryKey: ['/api/google-reviews'],
    enabled: isFormReady,
    queryFn: async () => {
      const response = await fetch('/api/google-reviews');
      return response.json();
    }
  });

  // Test API connection
  const testApiConnection = async () => {
    if (!businessName || !location) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el nombre del negocio y la ubicación.",
        variant: "destructive"
      });
      return;
    }

    setIsTestingApi(true);
    setTestResults(null);
    
    const testConfig = {
      businessName,
      location,
      placeId,
      apiKey,
      minRating,
      maxReviews
    };

    try {
      const response = await fetch('/api/google-reviews/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });
      
      const data = await response.json();
      setTestResults(data);
      
      if (data.success) {
        toast({
          title: "✅ Test exitoso",
          description: `Se encontraron ${data.total} reseñas para ${data.business}`
        });
      } else {
        toast({
          title: "❌ Test falló",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setTestResults({
        success: false,
        error: 'Connection failed',
        message: error.message
      });
      toast({
        title: "❌ Error de conexión",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const configData = {
      businessName,
      placeId: placeId || null,
      location,
      apiKey,
      enabled,
      minRating,
      maxReviews,
      cacheHours
    };

    console.log('Submitting config:', configData);
    saveConfigMutation.mutate(configData);
  };

  if (configLoading) {
    return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando configuración...</span>
        </div>
    );
  }

  return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Configuración de Google Reviews
          </h1>
          <p className="text-gray-600">
            Configura la integración con Google Places API para mostrar reseñas reales de tu negocio
          </p>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Probar API
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Vista Previa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración del Negocio y API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Nombre del Negocio *</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Nombre de tu negocio"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Nombre exacto como aparece en Google Maps
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación *</Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Ciudad, País"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Ubicación para ayudar a encontrar el negocio
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="placeId">Google Place ID (Opcional)</Label>
                      <Input
                        id="placeId"
                        value={placeId}
                        onChange={(e) => setPlaceId(e.target.value)}
                        placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                      />
                      <p className="text-sm text-gray-500">
                        Si lo conoces, mejorará la precisión de búsqueda
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">Google API Key *</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Tu clave de API de Google"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Clave de API con acceso a Places API (New)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="minRating">Puntuación Mínima</Label>
                      <Input
                        id="minRating"
                        type="number"
                        min="1"
                        max="5"
                        value={minRating}
                        onChange={(e) => setMinRating(parseInt(e.target.value))}
                      />
                      <p className="text-sm text-gray-500">
                        Solo mostrar reseñas con esta puntuación o superior
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxReviews">Número Máximo</Label>
                      <Input
                        id="maxReviews"
                        type="number"
                        min="1"
                        max="20"
                        value={maxReviews}
                        onChange={(e) => setMaxReviews(parseInt(e.target.value))}
                      />
                      <p className="text-sm text-gray-500">
                        <strong>Límite técnico:</strong> Google Places API proporciona máximo 5 reseñas por negocio
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cacheHours">Caché (horas)</Label>
                      <Input
                        id="cacheHours"
                        type="number"
                        min="1"
                        max="168"
                        value={cacheHours}
                        onChange={(e) => setCacheHours(parseInt(e.target.value))}
                      />
                      <p className="text-sm text-gray-500">
                        Horas antes de actualizar reseñas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                    />
                    <Label htmlFor="enabled">
                      Habilitar Google Reviews en la página principal
                    </Label>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      type="submit" 
                      disabled={saveConfigMutation.isPending}
                      className="flex-1"
                    >
                      {saveConfigMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Guardar Configuración'
                      )}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        fetch('/api/google-reviews/refresh', { method: 'POST' })
                          .then(() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/google-reviews'] });
                            refetchReviews();
                            toast({ title: "Reseñas actualizadas", description: "Se han refrescado las reseñas usando todas las estrategias disponibles" });
                          });
                      }}
                      disabled={saveConfigMutation.isPending}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Actualizar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Probar Conexión con Google Places API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>Prueba la conexión con Google Places API usando la configuración actual.</p>
                        <p className="text-sm"><strong>Importante:</strong> Google Places API está limitado a un máximo de 5 reseñas por negocio. Esto es una limitación técnica oficial de Google y no se puede superar.</p>
                        <p className="text-sm">Sistema híbrido: API oficial + reseñas verificadas manualmente. Filtrado automático de calidad (solo 4-5 estrellas).</p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={testApiConnection}
                    disabled={isTestingApi || !businessName || !location}
                    className="w-full"
                  >
                    {isTestingApi ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Probando API...
                      </>
                    ) : (
                      <>
                        <TestTube className="mr-2 h-4 w-4" />
                        Probar Conexión
                      </>
                    )}
                  </Button>

                  {testResults && (
                    <Alert className={testResults.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={testResults.success ? "default" : "destructive"}>
                              {testResults.success ? "✅ Éxito" : "❌ Error"}
                            </Badge>
                            {testResults.business && (
                              <span className="text-sm">{testResults.business}</span>
                            )}
                          </div>
                          
                          <p className="text-sm">
                            {testResults.message}
                          </p>
                          
                          {testResults.success && testResults.reviews && (
                            <div className="text-sm">
                              <p>Reseñas encontradas: {testResults.total}</p>
                              {testResults.reviews.slice(0, 2).map((review: any, index: number) => (
                                <div key={index} className="mt-2 p-2 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{review.author}</span>
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{review.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Vista Previa de Reseñas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">
                              {reviewsData.total} reseñas encontradas (máximo Google API)
                            </Badge>
                            <Badge variant={enabled ? "default" : "secondary"}>
                              {enabled ? "Habilitado" : "Deshabilitado"}
                            </Badge>
                          </div>
                          
                          <Alert className="border-blue-200 bg-blue-50">
                            <AlertDescription className="text-sm">
                              <strong>✅ Sistema híbrido implementado:</strong> Combina Google Places API (5 reseñas) + reseñas verificadas manualmente (4 adicionales). 
                              Total: 8+ reseñas auténticas de alta calidad (solo 4-5 estrellas). 
                              Sistema de filtrado elimina automáticamente reseñas negativas, manteniendo solo las mejores experiencias.
                            </AlertDescription>
                          </Alert>
                        </div>
                        
                        <div className="grid gap-4">
                          {reviewsData.reviews.map((review: GoogleReview) => (
                            <div key={review.id} className="border rounded-lg p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">
                                  {review.avatar}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold">{review.author}</h4>
                                  <div className="flex items-center gap-2">
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-4 w-4 ${
                                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-500">{review.date}</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-gray-700">{review.text}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          {reviewsData?.message || "No se pudieron cargar las reseñas. Verifica la configuración."}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default AdminGoogleReviews;