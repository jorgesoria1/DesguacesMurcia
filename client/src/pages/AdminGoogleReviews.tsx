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
import AdminLayout from "@/components/AdminLayout";

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
  const [isEnabled, setIsEnabled] = useState(false);
  const [formData, setFormData] = useState({
    businessName: 'Desguace Murcia',
    location: 'Murcia, España', 
    placeId: '',
    apiKey: '',
    minRating: 4,
    maxReviews: 6,
    cacheHours: 24
  });

  // Get current configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['/api/google-reviews/config'],
    queryFn: async () => {
      console.log('AdminGoogleReviews - Fetching config...');
      const response = await fetch('/api/google-reviews/config');
      const data = await response.json();
      console.log('AdminGoogleReviews - Raw response:', data);
      return data.config || data; // Handle both response formats
    }
  });

  // Update local state when config data changes
  useEffect(() => {
    console.log('AdminGoogleReviews - Config data changed:', config);
    if (config && !saveConfigMutation.isPending) {
      console.log('AdminGoogleReviews - Setting form data:', {
        businessName: config.businessName,
        location: config.location,
        enabled: config.enabled
      });
      setIsEnabled(config.enabled || false);
      setFormData({
        businessName: config.businessName || 'Desguace Murcia',
        location: config.location || 'Murcia, España',
        placeId: config.placeId || '',
        apiKey: config.apiKey || '',
        minRating: config.minRating || 4,
        maxReviews: config.maxReviews || 6,
        cacheHours: config.cacheHours || 24
      });
    }
  }, [config, saveConfigMutation.isPending]);

  // Get current reviews for preview
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['/api/google-reviews'],
    queryFn: async () => {
      const response = await fetch('/api/google-reviews');
      return response.json();
    }
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<GoogleReviewsConfig>) => {
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
      console.log('SaveConfig - Success response:', data);
      toast({
        title: "Configuración guardada",
        description: "La configuración de Google Reviews se ha guardado correctamente."
      });
      queryClient.invalidateQueries(['/api/google-reviews/config']);
      queryClient.invalidateQueries(['/api/google-reviews']);
      
      // Mantener los datos del formulario después de guardar
      setTimeout(() => {
        if (data?.config) {
          console.log('Updating form with saved data:', data.config);
          setFormData(prev => ({
            ...prev,
            businessName: data.config.businessName || prev.businessName,
            location: data.config.location || prev.location,
            placeId: data.config.placeId || prev.placeId,
            apiKey: data.config.apiKey || prev.apiKey,
            minRating: data.config.minRating || prev.minRating,
            maxReviews: data.config.maxReviews || prev.maxReviews,
            cacheHours: data.config.cacheHours || prev.cacheHours
          }));
          setIsEnabled(data.config.enabled || false);
        }
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Test API connection
  const testApiConnection = async (testConfig: Partial<GoogleReviewsConfig>) => {
    setIsTestingApi(true);
    setTestResults(null);
    
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
          title: "Test exitoso",
          description: `Se encontraron ${data.total} reseñas para ${data.business}`
        });
      } else {
        toast({
          title: "Test falló",
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
        title: "Error de conexión",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Refresh reviews cache
  const refreshReviewsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-reviews/refresh', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Error refreshing reviews');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Caché actualizada",
        description: "Las reseñas se han actualizado correctamente."
      });
      queryClient.invalidateQueries(['/api/google-reviews']);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const configData = {
      businessName: formData.businessName,
      placeId: formData.placeId || null,
      location: formData.location,
      apiKey: formData.apiKey,
      enabled: isEnabled,
      minRating: formData.minRating,
      maxReviews: formData.maxReviews,
      cacheHours: formData.cacheHours
    };

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
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
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
                      name="businessName"
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({...prev, businessName: e.target.value}))}
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
                      name="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
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
                      name="placeId"
                      value={formData.placeId}
                      onChange={(e) => setFormData(prev => ({...prev, placeId: e.target.value}))}
                      placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                    />
                    <p className="text-sm text-gray-500">
                      Si lo conoces, mejorará la precisión de búsqueda
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">Google Places API Key *</Label>
                    <Input
                      id="apiKey"
                      name="apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({...prev, apiKey: e.target.value}))}
                      placeholder="AIza..."
                      required
                    />
                    <p className="text-sm text-gray-500">
                      Clave de API de Google Places con Places API habilitada
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minRating">Rating Mínimo</Label>
                    <Input
                      id="minRating"
                      name="minRating"
                      type="number"
                      min="1"
                      max="5"
                      value={formData.minRating}
                      onChange={(e) => setFormData(prev => ({...prev, minRating: parseInt(e.target.value) || 4}))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxReviews">Máximo de Reseñas</Label>
                    <Input
                      id="maxReviews"
                      name="maxReviews"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.maxReviews}
                      onChange={(e) => setFormData(prev => ({...prev, maxReviews: parseInt(e.target.value) || 6}))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cacheHours">Caché (horas)</Label>
                    <Input
                      id="cacheHours"
                      name="cacheHours"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.cacheHours}
                      onChange={(e) => setFormData(prev => ({...prev, cacheHours: parseInt(e.target.value) || 24}))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    name="enabled"
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                  />
                  <Label htmlFor="enabled">Activar Google Reviews</Label>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={saveConfigMutation.isPending}
                  >
                    {saveConfigMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Guardar Configuración
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => refreshReviewsMutation.mutate()}
                    disabled={refreshReviewsMutation.isPending}
                  >
                    {refreshReviewsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Actualizar Caché
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
                Probar Conexión API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  Prueba la conexión con Google Places API antes de guardar la configuración.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => testApiConnection({
                  businessName: config?.businessName || "Desguace Murcia",
                  location: config?.location || "Murcia, España",
                  placeId: config?.placeId,
                  apiKey: config?.apiKey
                })}
                disabled={isTestingApi || !config?.apiKey}
              >
                {isTestingApi ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Probar API
              </Button>

              {testResults && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={testResults.success ? "default" : "destructive"}>
                          {testResults.success ? "Éxito" : "Error"}
                        </Badge>
                        <span className="font-medium">{testResults.message}</span>
                      </div>

                      {testResults.success && testResults.reviews && (
                        <div className="space-y-2">
                          <h4 className="font-semibold">Muestra de reseñas encontradas:</h4>
                          {testResults.reviews.map((review: GoogleReview, index: number) => (
                            <div key={index} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                                  {review.avatar}
                                </div>
                                <span className="font-medium">{review.author}</span>
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
                              </div>
                              <p className="text-sm text-gray-600">{review.text}</p>
                              <p className="text-xs text-gray-400 mt-1">{review.date}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
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
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Cargando reseñas...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsData?.success ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {reviewsData.business} - {reviewsData.location}
                        </span>
                        <Badge variant="secondary">{reviewsData.total} reseñas</Badge>
                      </div>
                      
                      <div className="grid gap-4">
                        {reviewsData.reviews?.map((review: GoogleReview) => (
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
    </AdminLayout>
  );
};

export default AdminGoogleReviews;