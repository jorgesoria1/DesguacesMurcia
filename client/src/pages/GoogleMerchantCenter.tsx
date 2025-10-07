
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
  DollarSign,
  Copy,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedStats {
  totalParts: number;
  validParts: number;
  partsWithImages: number;
  partsWithPrice: number;
}

const GoogleMerchantCenter = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

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

  const handleCopyUrl = () => {
    const feedUrl = `${window.location.origin}/api/google-merchant/feed.xml`;
    navigator.clipboard.writeText(feedUrl);
    setUrlCopied(true);
    toast({
      title: "URL copiada",
      description: "La URL del feed se ha copiado al portapapeles"
    });
    
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const feedUrl = `${window.location.origin}/api/google-merchant/feed.xml`;
  const feedStats = stats?.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header de la página */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-montserrat font-bold text-gray-900 mb-4">
            Google Merchant Center
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sincroniza automáticamente tu inventario de piezas de recambio con Google Shopping
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-6">
          {/* Estadísticas principales */}
          {feedStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estadísticas del Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center mb-3">
                      <ShoppingCart className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {feedStats.totalParts.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Piezas</div>
                  </div>

                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-center mb-3">
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {feedStats.partsWithPrice.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Con Precio</div>
                  </div>

                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-center mb-3">
                      <Image className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {feedStats.partsWithImages.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Con Imágenes</div>
                  </div>

                  <div className="text-center p-6 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-center mb-3">
                      <CheckCircle className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {feedStats.validParts.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Válidas para Feed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* URL del Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                URL del Feed XML
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-sm font-mono bg-white p-3 rounded border">
                    {feedUrl}
                  </code>
                  <Button
                    onClick={handleCopyUrl}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    {urlCopied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Esta URL es pública</strong> y se actualiza automáticamente cada vez que cambia tu inventario. 
                  Úsala directamente en Google Merchant Center para mantener tu catálogo sincronizado.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones disponibles */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
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
                  Actualizar Estadísticas
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => window.open(feedUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Feed XML
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Guía de configuración */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración en Google Merchant Center</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Accede a tu cuenta de <strong>Google Merchant Center</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Ve a <strong>"Productos"</strong> → <strong>"Feeds"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Haz clic en <strong>"+ Agregar feed"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Selecciona <strong>"Programado"</strong> como método de entrada</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>Pega la URL del feed XML mostrada arriba</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  <span>Configura la frecuencia de actualización (<strong>recomendado: diaria</strong>)</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Indicadores de calidad */}
          {feedStats && (
            <Card>
              <CardHeader>
                <CardTitle>Calidad del Feed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Productos con precio válido:</span>
                    <Badge variant={feedStats.partsWithPrice / feedStats.totalParts > 0.8 ? "default" : "destructive"}>
                      {Math.round((feedStats.partsWithPrice / feedStats.totalParts) * 100)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Productos con imágenes:</span>
                    <Badge variant={feedStats.partsWithImages / feedStats.totalParts > 0.7 ? "default" : "destructive"}>
                      {Math.round((feedStats.partsWithImages / feedStats.totalParts) * 100)}%
                    </Badge>
                  </div>
                </div>
                
                {(feedStats.partsWithPrice / feedStats.totalParts < 0.8 || feedStats.partsWithImages / feedStats.totalParts < 0.7) && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <strong>Recomendación:</strong> Para mejorar la calidad del feed, asegúrate de que todas las piezas tengan 
                      precios válidos e imágenes. Esto aumentará la visibilidad en Google Shopping.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleMerchantCenter;
