import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from '@/lib/queryClient';

export default function ImportRecoveryPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recovering, setRecovering] = useState(false);

  // Obtener el historial de importaciones
  const { data: importHistory, isLoading, error } = useQuery({
    queryKey: ['/api/import/history'],
    select: (data) => data || []
  });

  // Mutación para recuperar todas las importaciones bloqueadas
  const recoverAllMutation = useMutation({
    mutationFn: async () => {
      setRecovering(true);
      const response = await apiRequest('/api/import/recovery', {
        method: 'GET'
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Importaciones recuperadas",
        description: data.message || `Se han corregido ${data.recoveredImports?.length || 0} importaciones`,
      });
      // Refrescar la lista de importaciones
      queryClient.invalidateQueries({ queryKey: ['/api/import/history'] });
      setRecovering(false);
    },
    onError: (error) => {
      console.error('Error al recuperar importaciones:', error);
      toast({
        title: "Error",
        description: "No se pudieron recuperar las importaciones",
        variant: "destructive"
      });
      setRecovering(false);
    }
  });

  // Mutación para marcar una importación como completada
  const completeImportMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/import/recovery/${id}`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Importación completada",
        description: `La importación ${data.importId} ha sido marcada como completada`,
      });
      // Refrescar la lista de importaciones
      queryClient.invalidateQueries({ queryKey: ['/api/import/history'] });
    },
    onError: (error) => {
      console.error('Error al marcar importación como completada:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar la importación como completada",
        variant: "destructive"
      });
    }
  });

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES');
  };

  // Función para calcular duración entre dos fechas
  const calculateDuration = (start: string, end?: string) => {
    if (!start) return 'N/A';
    
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMin = Math.floor(durationMs / 60000);
    const durationHours = Math.floor(durationMin / 60);
    
    if (durationHours > 0) {
      return `${durationHours}h ${durationMin % 60}m`;
    } else {
      return `${durationMin}m`;
    }
  };

  // Filtrar importaciones en progreso que pueden estar bloqueadas (más de 30 minutos)
  const stuckImports = importHistory?.filter(imp => 
    imp.status === 'running' && 
    new Date(imp.startTime).getTime() < Date.now() - 30 * 60 * 1000
  ) || [];

  const handleRecoverAll = () => {
    recoverAllMutation.mutate();
  };

  const handleCompleteImport = (id: number) => {
    completeImportMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No se pudo cargar el historial de importaciones
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recuperación de Importaciones</CardTitle>
        <CardDescription>
          Gestiona las importaciones que se han quedado en estado "en progreso"
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stuckImports.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>¡Todo en orden!</AlertTitle>
            <AlertDescription>
              No hay importaciones bloqueadas en este momento.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="warning" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Importaciones bloqueadas</AlertTitle>
              <AlertDescription>
                Se han detectado {stuckImports.length} importaciones que llevan más de 30 minutos en estado "en progreso"
              </AlertDescription>
            </Alert>
            
            <Table>
              <TableCaption>Importaciones bloqueadas en estado "en progreso"</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stuckImports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell>{imp.id}</TableCell>
                    <TableCell className="font-medium">
                      {imp.type === 'vehicles' ? 'Vehículos' : 
                       imp.type === 'parts' ? 'Piezas' : 
                       imp.type === 'all' ? 'Completa' : imp.type}
                    </TableCell>
                    <TableCell>{formatDate(imp.startTime)}</TableCell>
                    <TableCell>{calculateDuration(imp.startTime, imp.endTime)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">
                        En progreso
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleCompleteImport(imp.id)}
                        disabled={completeImportMutation.isPending}
                      >
                        {completeImportMutation.isPending && completeImportMutation.variables === imp.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Marcar como completada
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/import/history'] })}
        >
          Actualizar lista
        </Button>
        <Button 
          onClick={handleRecoverAll}
          disabled={recovering || stuckImports.length === 0}
        >
          {recovering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Recuperar todas
        </Button>
      </CardFooter>
    </Card>
  );
}