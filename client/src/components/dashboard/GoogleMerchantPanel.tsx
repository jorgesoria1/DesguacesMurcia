
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  ExternalLink, 
  Eye, 
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Image,
  DollarSign 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedStats {
  totalParts: number;
  validParts: number;
  partsWithImages: number;
  partsWithPrice: number;
}

const GoogleMerchantPanel = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Obtener estadísticas del feed
  const { 
    data: stats, 
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useQuery<{ success: boolean; data: FeedStats }>({
    queryKey: ['/api/google-merchant/stats'],
    queryFn: () => fetch('/api/google-merchant/stats').then(res => res.json()),
  });

  const handleDownloadFeed = async () => {
    try {
      setIsGenerating(true);
      
      toast({
        title: "Generando feed",
        description: "Creando archivo XML para Google Merchant Center..."
      });

      const response = await fetch('/api/google-merchant/feed.xml');
      
      if (!response.ok) {
        throw new Error('Error al generar el feed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `google-merchant-feed-${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Feed descargado",
        description: "El archivo XML se ha descargado correctamente"
      });
    } catch (error) {
      console.error('Error al descargar feed:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el feed XML",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewFeed = async () => {
    try {
      const response = await fetch('/api/google-merchant/preview');
      
      if (!response.ok) {
        throw new Error('Error al generar vista previa');
      }

      const xmlContent = await response.text();
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Vista previa - Google Merchant Feed</title>
              <style>
                body { font-family: monospace; padding: 20px; }
                pre { white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h2>Vista previa del Feed XML (primeros 10 productos)</h2>
              <pre>${xmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error al mostrar vista previa:', error);
      toast({
        title: "Error",
        description: "No se pudo mostrar la vista previa",
        variant: "destructive"
      });
    }
  };

  // Construir la URL del feed usando la URL actual
  const currentUrl = window.location.origin;
  const feedUrl = `${currentUrl}/api/google-merchant/feed.xml`;

  if (isLoadingStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Cargando estadísticas...
          </div>
        </CardContent>
      </Card>
    );
  }

  const feedStats = stats?.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Google Merchant Center Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estadísticas */}
          {feedStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {feedStats.totalParts}
                </div>
                <div className="text-sm text-gray-600">Total Piezas</div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {feedStats.partsWithPrice}
                </div>
                <div className="text-sm text-gray-600">Con Precio</div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Image className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {feedStats.partsWithImages}
                </div>
                <div className="text-sm text-gray-600">Con Imágenes</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {feedStats.validParts}
                </div>
                <div className="text-sm text-gray-600">Válidas para Feed</div>
              </div>
            </div>
          )}

          {/* URL del Feed */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL del Feed XML:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={feedUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(feedUrl);
                  toast({
                    title: "Copiado",
                    description: "URL copiada al portapapeles"
                  });
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Esta URL es pública y puede usarse directamente en Google Merchant Center
            </p>
          </div>

          {/* Enlace a página dedicada */}
          <div className="mb-4">
            <Button 
              onClick={() => window.open('/google-merchant-center', '_blank')}
              variant="default"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ver página completa de Google Merchant Center
            </Button>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleDownloadFeed}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Descargar Feed XML
            </Button>

            <Button 
              variant="outline"
              onClick={handlePreviewFeed}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Vista Previa
            </Button>

            <Button 
              variant="outline"
              onClick={() => refetchStats()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar Stats
            </Button>
          </div>

          {/* Información sobre Google Merchant Center */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Configuración en Google Merchant Center:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Accede a tu cuenta de Google Merchant Center</li>
              <li>Ve a "Productos" → "Feeds"</li>
              <li>Haz clic en "+ Agregar feed"</li>
              <li>Selecciona "Programado" como método de entrada</li>
              <li>Pega la URL del feed XML mostrada arriba</li>
              <li>Configura la frecuencia de actualización (recomendado: diaria)</li>
            </ol>
          </div>

          {/* Métricas de calidad */}
          {feedStats && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Calidad del Feed:</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Productos con precio válido:</span>
                  <Badge variant={feedStats.partsWithPrice / feedStats.totalParts > 0.8 ? "default" : "destructive"}>
                    {Math.round((feedStats.partsWithPrice / feedStats.totalParts) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Productos con imágenes:</span>
                  <Badge variant={feedStats.partsWithImages / feedStats.totalParts > 0.7 ? "default" : "destructive"}>
                    {Math.round((feedStats.partsWithImages / feedStats.totalParts) * 100)}%
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleMerchantPanel;
