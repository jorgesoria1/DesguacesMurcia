import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { 
  Save, 
  TestTube, 
  AlertCircle, 
  CheckCircle, 
  Star, 
  Globe, 
  Key,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const googleReviewsSchema = z.object({
  businessName: z.string().min(1, "El nombre del negocio es obligatorio"),
  location: z.string().default("Murcia, España"),
  apiProvider: z.enum(["serpapi", "google_places", "custom"]).default("serpapi"),
  apiKey: z.string().optional(),
  enabled: z.boolean().default(false),
  minRating: z.number().min(1).max(5).default(4),
  maxReviews: z.number().min(1).max(20).default(6),
  cacheHours: z.number().min(1).max(168).default(24)
});

type GoogleReviewsConfig = z.infer<typeof googleReviewsSchema>;

const GoogleReviewsConfigForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Obtener configuración actual
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/google-reviews/config'],
    queryFn: async () => {
      const response = await fetch('/api/google-reviews/config');
      if (!response.ok) {
        throw new Error('Error al obtener configuración');
      }
      return response.json();
    }
  });

  // Obtener estado actual de las reseñas
  const { data: reviewsStatus } = useQuery({
    queryKey: ['/api/google-reviews/status'],
    queryFn: async () => {
      const response = await fetch('/api/google-reviews/status');
      if (!response.ok) {
        throw new Error('Error al obtener estado');
      }
      return response.json();
    },
    refetchInterval: 30000 // Actualizar cada 30 segundos
  });

  const form = useForm<GoogleReviewsConfig>({
    resolver: zodResolver(googleReviewsSchema),
    defaultValues: {
      businessName: "Desguace Murcia",
      location: "Murcia, España",
      apiProvider: "serpapi",
      apiKey: "",
      enabled: false,
      minRating: 4,
      maxReviews: 6,
      cacheHours: 24
    }
  });

  // Actualizar formulario cuando lleguen los datos
  React.useEffect(() => {
    if (config) {
      form.reset(config);
    }
  }, [config, form]);

  // Mutación para guardar configuración
  const saveConfigMutation = useMutation({
    mutationFn: async (data: GoogleReviewsConfig) => {
      const response = await fetch('/api/google-reviews/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al guardar configuración');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración de Google Reviews se ha guardado correctamente.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/google-reviews/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/google-reviews/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  });

  // Función para probar la API
  const testApiConnection = async () => {
    setIsTestingApi(true);
    setTestResults(null);

    try {
      const currentValues = form.getValues();
      const response = await fetch('/api/google-reviews/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentValues),
      });

      const result = await response.json();
      setTestResults(result);

      if (result.success) {
        toast({
          title: "Conexión exitosa",
          description: `Se obtuvieron ${result.reviewsCount || 0} reseñas de prueba`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error en la prueba",
          description: result.error || "No se pudo conectar con la API",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al probar la conexión",
        variant: "destructive",
      });
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsTestingApi(false);
    }
  };

  const onSubmit = (data: GoogleReviewsConfig) => {
    saveConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado actual */}
      {reviewsStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Estado Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {reviewsStatus.reviewsCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Reseñas activas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {reviewsStatus.averageRating || 0}
                </div>
                <div className="text-sm text-muted-foreground">Promedio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {reviewsStatus.lastUpdate ? 'Activo' : 'Inactivo'}
                </div>
                <div className="text-sm text-muted-foreground">Estado</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {reviewsStatus.cacheAge || 0}h
                </div>
                <div className="text-sm text-muted-foreground">Cache</div>
              </div>
            </div>
            
            {reviewsStatus.lastUpdate && (
              <div className="mt-4 text-sm text-muted-foreground">
                Última actualización: {new Date(reviewsStatus.lastUpdate).toLocaleString('es-ES')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulario de configuración */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configuración del Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Negocio</FormLabel>
                    <FormControl>
                      <Input placeholder="Desguace Murcia" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nombre exacto del negocio tal como aparece en Google Maps
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <Input placeholder="Murcia, España" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ciudad y país para acotar la búsqueda
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configuración de API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="apiProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor de API</FormLabel>
                    <FormControl>
                      <select 
                        className="w-full p-2 border rounded-md"
                        {...field}
                      >
                        <option value="serpapi">SerpApi (Recomendado)</option>
                        <option value="google_places">Google Places API</option>
                        <option value="custom">API Personalizada</option>
                      </select>
                    </FormControl>
                    <FormDescription>
                      SerpApi es la opción más fácil para obtener reseñas de Google Maps
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Ingrese su API key aquí"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Su clave de API para acceder al servicio seleccionado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testApiConnection}
                  disabled={isTestingApi}
                >
                  {isTestingApi ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Probar Conexión
                </Button>
              </div>

              {testResults && (
                <Alert variant={testResults.success ? "default" : "destructive"}>
                  {testResults.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {testResults.success 
                      ? `Conexión exitosa. Se obtuvieron ${testResults.reviewsCount} reseñas.`
                      : `Error: ${testResults.error}`
                    }
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración de Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calificación Mínima</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="5" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Solo mostrar reseñas con esta calificación o superior
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxReviews"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Reseñas</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="20" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Número máximo de reseñas a mostrar
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cacheHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caché (horas)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="168" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Tiempo en horas para mantener las reseñas en caché
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Activar Google Reviews
                      </FormLabel>
                      <FormDescription>
                        Mostrar reseñas de Google en la página principal
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/google-reviews/config'] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
            <Button 
              type="submit" 
              disabled={saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar Configuración
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default GoogleReviewsConfigForm;