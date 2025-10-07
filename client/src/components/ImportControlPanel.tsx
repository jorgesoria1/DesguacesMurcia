import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Pause, Play, Square, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { ImportHistory } from "@/lib/api";

interface ImportControlPanelProps {
  importHistory: ImportHistory[];
  onControlImport: (importId: number, action: 'pause' | 'resume' | 'cancel' | 'delete') => void;
  onDeleteAllHistory?: () => void;
}

export const ImportControlPanel: React.FC<ImportControlPanelProps> = ({
  importHistory,
  onControlImport,
  onDeleteAllHistory
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
      case 'processing':
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      in_progress: "secondary",
      processing: "secondary",
      running: "secondary",
      paused: "outline"
    };
    
    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'vehicles':
        return 'Vehículos';
      case 'parts':
        return 'Piezas';
      case 'all':
        return 'Todo';
      default:
        return type;
    }
  };

  const activeImports = importHistory.filter(item => 
    item.status === 'in_progress' || item.status === 'processing' || item.status === 'running'
  );

  const completedImports = importHistory.filter(item => 
    item.status === 'completed' || item.status === 'failed' || item.status === 'paused'
  );

  return (
    <div className="space-y-6">
      {/* Importaciones activas */}
      {activeImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Importaciones en Curso ({activeImports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeImports.map((importItem) => (
              <div key={importItem.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {getTypeText(importItem.type)} - {importItem.isFullImport ? 'Completa' : 'Incremental'}
                      </h4>
                      {getStatusBadge(importItem.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Iniciada: {format(new Date(importItem.startTime), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                    {importItem.processingItem && (
                      <p className="text-sm text-blue-600">{importItem.processingItem}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onControlImport(importItem.id, 'pause')}
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onControlImport(importItem.id, 'cancel')}
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {importItem.progress !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span>{Math.round(importItem.progress)}%</span>
                    </div>
                    <Progress value={importItem.progress} className="h-2" />
                  </div>
                )}

                {(importItem.processedItems !== undefined && importItem.totalItems !== undefined) && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Procesados:</span>
                      <p className="font-medium">{importItem.processedItems}/{importItem.totalItems}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nuevos:</span>
                      <p className="font-medium text-green-600">{importItem.newItems || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actualizados:</span>
                      <p className="font-medium text-blue-600">{importItem.updatedItems || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Historial de importaciones */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Importaciones</CardTitle>
            {onDeleteAllHistory && completedImports.length > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDeleteAllHistory}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Eliminar Todo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {completedImports.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay importaciones completadas
            </p>
          ) : (
            completedImports.map((importItem) => (
              <div key={importItem.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {getTypeText(importItem.type)} - {importItem.isFullImport ? 'Completa' : 'Incremental'}
                      </h4>
                      {getStatusBadge(importItem.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(importItem.startTime), "dd/MM/yyyy HH:mm", { locale: es })}
                      {importItem.endTime && (
                        <> - {format(new Date(importItem.endTime), "HH:mm", { locale: es })}</>
                      )}
                    </p>
                    
                    {(importItem.newItems !== undefined || importItem.updatedItems !== undefined) && (
                      <div className="flex gap-4 text-sm">
                        {importItem.newItems !== undefined && (
                          <span className="text-green-600">+{importItem.newItems} nuevos</span>
                        )}
                        {importItem.updatedItems !== undefined && (
                          <span className="text-blue-600">~{importItem.updatedItems} actualizados</span>
                        )}
                      </div>
                    )}

                    {importItem.errors && importItem.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        {importItem.errors.length} error(es)
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {importItem.status === 'paused' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onControlImport(importItem.id, 'resume')}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        console.log('Intentando eliminar importación:', importItem.id, importItem);
                        if (importItem.id) {
                          onControlImport(importItem.id, 'delete');
                        } else {
                          console.error('ID de importación no encontrado:', importItem);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};