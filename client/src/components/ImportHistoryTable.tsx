import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Trash2, AlertTriangle, PlayCircle, PauseCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { formatDateTime } from "@/lib/utils";
import { ImportHistory, importApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ImportHistoryTableProps {
  history: ImportHistory[];
  isLoading: boolean;
  onDelete?: (id: number) => void;
  onResume?: (id: number) => void;
  onPause?: (id: number) => void;
  onCancel?: (id: number) => void;
  pageSize?: number;
  onDeleteAll?: () => void;
  onPauseAll?: () => void;
}

// Helper para obtener el color de la badge según el estado
const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "partial":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case "processing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
};

// Helper para obtener el nombre del tipo de importación en español
const getImportTypeName = (type: string) => {
  switch (type) {
    case "vehicles":
      return "Vehículos";
    case "parts":
      return "Piezas";
    case "all":
      return "Vehículos y Piezas";
    default:
      return type;
  }
};

// Helper para obtener el nombre del estado en español
const getStatusName = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "Completado";
    case "failed":
      return "Fallido";
    case "partial":
      return "Parcial";
    case "processing":
    case "in_progress":
      return "En progreso";
    case "paused":
      return "Pausado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
};

// Verificar si una importación puede ser continuada
const canResumeImport = (item: ImportHistory) => {
  return (item.status === "failed" || item.status === "partial" || item.status === "paused") && 
         item.details && 
         (item.details.lastId || 
          (item.details.vehicles && item.details.vehicles.lastId) || 
          (item.details.parts && item.details.parts.lastId));
};

// Verificar si una importación puede ser pausada
const canPauseImport = (item: ImportHistory) => {
  return item.status === "processing" || item.status === "in_progress";
};

// Verificar si una importación puede ser cancelada
const canCancelImport = (item: ImportHistory) => {
  return item.status === "processing" || item.status === "in_progress" || item.status === "paused";
};

const ImportHistoryTable: React.FC<ImportHistoryTableProps> = ({ 
  history, 
  isLoading, 
  onDelete,
  onResume,
  onPause,
  onCancel,
  pageSize = 10,
  onDeleteAll,
  onPauseAll
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedHistory = history.slice(startIndex, endIndex);
  const totalPages = Math.ceil(history.length / pageSize);

  // Función para manejar la pausa de todas las importaciones activas


  // Función para eliminar todas las importaciones
  const handleDeleteAll = async () => {
    if (actionInProgress === 'delete-all') return;
    setActionInProgress('delete-all');

    try {
      // Primero cancelar importaciones activas
      const activeImports = history.filter(item => 
        item.status === 'in_progress' || item.status === 'processing'
      );

      for (const item of activeImports) {
        try {
          await importApi.cancelImport(item.id);
        } catch (error) {
          console.error(`Error al cancelar importación ${item.id}:`, error);
        }
      }

      // Luego eliminar todo el historial
      const response = await fetch('/api/import/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Error al eliminar historial');

      const result = await response.json();
      toast({
        title: "Eliminado correctamente",
        description: result.message,
      });

      // Notificar al componente padre si existe el callback
      if (onDeleteAll) onDeleteAll();
    } catch (error) {
      console.error("Error al eliminar todas las importaciones:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el historial de importaciones",
        variant: "destructive"
      });
    }

    setActionInProgress(null);
  };

  const handlePauseAll = async () => {
    if (actionInProgress === 'pause-all') return;
    setActionInProgress('pause-all');

    try {
      const response = await fetch('/api/import/history/pause-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al pausar importaciones');

      const result = await response.json();
      toast({
        title: "Pausado correctamente",
        description: result.message,
      });

      // Notificar al componente padre si existe el callback
      if (onPauseAll) onPauseAll();
    } catch (error) {
      console.error("Error al pausar todas las importaciones:", error);
      toast({
        title: "Error",
        description: "No se pudieron pausar las importaciones",
        variant: "destructive"
      });
    }

    setActionInProgress(null);
  };

  // Función para manejar la selección de items
  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Función para seleccionar/deseleccionar todos
  const handleSelectAll = () => {
    if (selectedItems.length === history.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(history.map(item => item.id));
    }
  };

  // Función para eliminar múltiples registros
  const handleBulkDelete = async () => {
    setActionInProgress('bulk-delete');
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedItems) {
      try {
        await importApi.deleteHistoryItem(id);
        if (onDelete) {
          onDelete(id);
        }
        successCount++;
      } catch (error) {
        console.error(`Error al eliminar registro ${id}:`, error);
        errorCount++;
      }
    }

    toast({
      title: "Eliminación masiva completada",
      description: `${successCount} registros eliminados. ${errorCount} errores.`,
      variant: errorCount > 0 ? "destructive" : "default"
    });

    setSelectedItems([]);
    setBulkDeleteDialogOpen(false);
    setActionInProgress(null);
  };

  // Función para mostrar el diálogo de confirmación de borrado
  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Función para confirmar el borrado
  const confirmDelete = async () => {
    if (itemToDelete === null) return;

    try {
      await importApi.deleteHistoryItem(itemToDelete);

      // Notificar al componente padre
      if (onDelete) {
        onDelete(itemToDelete);
      }

      toast({
        title: "Eliminado correctamente",
        description: "El registro ha sido eliminado del historial",
      });

    } catch (error) {
      console.error("Error al eliminar registro:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el registro. Intente nuevamente.",
        variant: "destructive"
      });
    }

    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleResumeImport = async (id: number) => {
    setActionInProgress(`resume-${id}`);
    try {
      const response = await fetch(`/api/import/history/${id}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Importación reanudada",
          description: result.message || "La importación se ha reanudado correctamente",
        });
        await queryClient.invalidateQueries({ queryKey: ['/api/import/history'] });
      } else {
        throw new Error(result.message || 'Error al reanudar la importación');
      }
    } catch (error) {
      console.error('Error reanudando importación:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo reanudar la importación",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePauseImport = async (id: number) => {
    setActionInProgress(`pause-${id}`);
    try {
      const response = await fetch(`/api/import/history/${id}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Importación pausada",
          description: result.message || "La importación se ha pausado correctamente",
        });
        await queryClient.invalidateQueries({ queryKey: ['/api/import/history'] });
      } else {
        throw new Error(result.message || 'Error al pausar la importación');
      }
    } catch (error) {
      console.error('Error pausando importación:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo pausar la importación",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Función para cancelar una importación
  const handleCancelImport = async (id: number) => {
    if (actionInProgress === `cancel-${id}`) return;
    setActionInProgress(`cancel-${id}`);

    try {
      await importApi.cancelImport(id);

      toast({
        title: "Importación cancelada",
        description: "La importación se ha cancelado correctamente",
      });

      // Notificar al componente padre
      if (onCancel) {
        onCancel(id);
      }

    } catch (error) {
      console.error("Error al cancelar importación:", error);
      toast({
        title: "Error al cancelar",
        description: "No se pudo cancelar la importación. Intente nuevamente.",
        variant: "destructive"
      });
    }

    setActionInProgress(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Cargando historial de importaciones...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 border rounded-md">
        <p className="text-muted-foreground">No hay registros de importación todavía</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={handleDeleteAll}
            disabled={actionInProgress === 'delete-all' || history.length === 0}
            className="flex items-center"
          >
            {actionInProgress === 'delete-all' ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></span>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar todas
              </>
            )}
          </Button>

          <Button 
            variant="secondary"
            onClick={handlePauseAll}
            disabled={actionInProgress === 'pause-all' || !history.some(item => 
              item.status === 'in_progress' || item.status === 'processing'
            )}
            className="flex items-center"
          >
            {actionInProgress === 'pause-all' ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-secondary rounded-full"></span>
                Pausando...
              </>
            ) : (
              <>
                <PauseCircle className="h-4 w-4 mr-2" />
                Pausar todas
              </>
            )}
          </Button>
        </div>

        {selectedItems.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteDialogOpen(true)}
            disabled={actionInProgress === 'bulk-delete'}
          >
            {actionInProgress === 'bulk-delete' ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></span>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar seleccionados ({selectedItems.length})
              </>
            )}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedItems.length === history.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap">Fecha</TableHead>
              <TableHead className="whitespace-nowrap">Tipo</TableHead>
              <TableHead className="whitespace-nowrap">Elementos</TableHead>
              <TableHead className="whitespace-nowrap">Estado</TableHead>
              <TableHead className="whitespace-nowrap">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHistory.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleSelectItem(item.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(item.startTime)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{getImportTypeName(item.type)}</span>
                    <Badge variant="outline" className="w-fit mt-1">
                      {item.isFullImport ? "Completa" : "Incremental"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {item.newItems + item.updatedItems} elementos 
                  ({item.newItems} nuevos, {item.updatedItems} actualizados)
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(item.status)}>
                    {getStatusName(item.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" /> Ver detalles
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detalles de Importación</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground">Tipo</h4>
                              <p>{getImportTypeName(item.type)}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground">Estado</h4>
                              <Badge className={getStatusBadgeColor(item.status)}>
                                {getStatusName(item.status)}
                              </Badge>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground">Iniciado</h4>
                              <p>{formatDateTime(item.startTime)}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground">Finalizado</h4>
                              <p>{item.endTime ? formatDateTime(item.endTime) : "En proceso"}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground">Total Elementos</h4>
                              <p>{item.totalItems}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-muted-foreground">Nuevos / Actualizados</h4>
                              <p>{item.newItems} / {item.updatedItems}</p>
                            </div>
                          </div>

                          {item.errors && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">Errores</h4>
                              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-900">
                                {item.errors}
                              </div>
                            </div>
                          )}

                          {item.details && Object.keys(item.details).length > 0 && (
                            <Accordion type="single" collapsible>
                              <AccordionItem value="details">
                                <AccordionTrigger>Detalles adicionales</AccordionTrigger>
                                <AccordionContent>
                                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60">
                                    {JSON.stringify(item.details, null, 2)}
                                  </pre>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Botón reanudar importación */}
                    {canResumeImport(item) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-green-600 hover:text-green-800 hover:bg-green-50"
                        onClick={() => handleResumeImport(item.id)}
                        disabled={actionInProgress === `resume-${item.id}`}
                      >
                        {actionInProgress === `resume-${item.id}` ? (
                          <span className="flex items-center">
                            <span className="animate-spin h-4 w-4 mr-1 border-2 border-t-transparent border-green-600 rounded-full"></span>
                            Reanudando...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <PlayCircle className="h-4 w-4 mr-1" /> Continuar
                          </span>
                        )}
                      </Button>
                    )}

                    {/* Botón pausar importación */}
                    {canPauseImport(item) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                        onClick={() => handlePauseImport(item.id)}
                        disabled={actionInProgress === `pause-${item.id}`}
                      >
                        {actionInProgress === `pause-${item.id}` ? (
                          <span className="flex items-center">
                            <span className="animate-spin h-4 w-4 mr-1 border-2 border-t-transparent border-amber-600 rounded-full"></span>
                            Pausando...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <PauseCircle className="h-4 w-4 mr-1" /> Pausar
                          </span>
                        )}
                      </Button>
                    )}

                    {/* Botón cancelar importación */}
                    {canCancelImport(item) && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                        onClick={() => handleCancelImport(item.id)}
                        disabled={actionInProgress === `cancel-${item.id}`}
                      >
                        {actionInProgress === `cancel-${item.id}` ? (
                          <span className="flex items-center">
                            <span className="animate-spin h-4 w-4 mr-1 border-2 border-t-transparent border-orange-600 rounded-full"></span>
                            Cancelando...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <XCircle className="h-4 w-4 mr-1" /> Cancelar
                          </span>
                        )}
                      </Button>
                    )}

                    {/* Botón eliminar importación */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteClick(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginación mejorada */}
      {history.length > pageSize && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(endIndex, history.length)} de {history.length} registros
          </div>
          <nav aria-label="Paginación" className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="hidden sm:block"
            >
              Primera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="hidden sm:block"
            >
              Última
            </Button>
          </nav>
        </div>
      )}

      {/* Diálogo de confirmación para eliminación individual */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar este registro del historial de importaciones?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminación masiva */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación masiva</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar {selectedItems.length} registros del historial de importaciones?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={actionInProgress === 'bulk-delete'}
            >
              {actionInProgress === 'bulk-delete' ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></span>
                  Eliminando...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Eliminar {selectedItems.length} registros
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportHistoryTable;