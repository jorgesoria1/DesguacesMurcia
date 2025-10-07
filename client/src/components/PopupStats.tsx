import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Eye, MousePointer, XCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PopupStatsProps {
  popupId: number;
  onClose: () => void;
}

const PopupStats: React.FC<PopupStatsProps> = ({ popupId, onClose }) => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: [`/api/popups/${popupId}/stats`],
    queryFn: async () => {
      const response = await fetch(`/api/popups/${popupId}/stats`);
      if (!response.ok) throw new Error('Error al obtener estadísticas');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const { summary = {}, stats = [] } = statsData || {};

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estadísticas del Pop-up
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{summary.totalViews || 0}</div>
                <div className="text-sm text-gray-600">Visualizaciones</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MousePointer className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{summary.totalClicks || 0}</div>
                <div className="text-sm text-gray-600">Clics</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{summary.totalCloses || 0}</div>
                <div className="text-sm text-gray-600">Cierres</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {summary.clickRate ? `${summary.clickRate.toFixed(1)}%` : '0%'}
                </div>
                <div className="text-sm text-gray-600">Tasa de clics</div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas adicionales */}
          {summary.totalViews > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Tasa de interacción</div>
                    <div className="text-lg font-semibold">
                      {((summary.totalClicks + summary.totalCloses) / summary.totalViews * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tasa de cierre</div>
                    <div className="text-lg font-semibold">
                      {summary.closeRate ? `${summary.closeRate.toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial detallado */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Interacciones</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay datos de interacciones disponibles
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.map((stat: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {stat.action === 'viewed' && <Eye className="h-4 w-4 text-blue-600" />}
                        {stat.action === 'clicked' && <MousePointer className="h-4 w-4 text-green-600" />}
                        {stat.action === 'closed' && <XCircle className="h-4 w-4 text-red-600" />}
                        {stat.action === 'ignored' && <div className="h-4 w-4 rounded-full bg-gray-400" />}
                        
                        <div>
                          <div className="font-medium">
                            {stat.action === 'viewed' && 'Visualizado'}
                            {stat.action === 'clicked' && 'Botón presionado'}
                            {stat.action === 'closed' && 'Cerrado'}
                            {stat.action === 'ignored' && 'Ignorado'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {stat.page} • {stat.sessionId ? `Sesión: ${stat.sessionId.slice(0, 8)}...` : 'Usuario anónimo'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(stat.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card>
            <CardHeader>
              <CardTitle>Páginas más activas</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const pageStats = stats.reduce((acc: any, stat: any) => {
                  acc[stat.page] = (acc[stat.page] || 0) + 1;
                  return acc;
                }, {});
                
                const sortedPages = Object.entries(pageStats)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 5);

                return sortedPages.length > 0 ? (
                  <div className="space-y-2">
                    {sortedPages.map(([page, count]) => (
                      <div key={page} className="flex justify-between items-center">
                        <span className="text-sm font-mono">{page}</span>
                        <span className="text-sm text-gray-600">{count} interacciones</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No hay datos de páginas disponibles
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PopupStats;