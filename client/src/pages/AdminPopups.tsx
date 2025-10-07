import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';
import PopupForm from '@/components/PopupForm';
import PopupStats from '@/components/PopupStats';
import DOMPurify from 'dompurify';

interface Popup {
  id: number;
  title: string;
  content: string;
  image?: string;
  type: 'info' | 'warning' | 'promotion' | 'announcement';
  position: 'center' | 'top' | 'bottom' | 'corner';
  trigger: 'immediate' | 'delay' | 'scroll' | 'exit';
  triggerValue: number;
  displayFrequency: 'always' | 'once_per_session' | 'once_per_user' | 'daily';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  priority: number;
  targetPages?: string[];
  excludePages?: string[];
  buttonText: string;
  buttonAction: 'close' | 'redirect' | 'external';
  buttonUrl?: string;
  showCloseButton: boolean;
  backdropClose: boolean;
  createdAt: string;
  updatedAt: string;
}

const AdminPopups: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [statsPopupId, setStatsPopupId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener pop-ups
  const { data: popupsData, isLoading } = useQuery({
    queryKey: ['/api/popups'],
    queryFn: async () => {
      const response = await fetch('/api/popups');
      if (!response.ok) throw new Error('Error al obtener pop-ups');
      return response.json();
    }
  });

  // Activar/Desactivar pop-up
  const togglePopupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/popups/${id}/toggle`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Error al cambiar estado del pop-up');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/popups'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del pop-up",
        variant: "destructive",
      });
    }
  });

  // Eliminar pop-up
  const deletePopupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/popups/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Error al eliminar pop-up');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/popups'] });
      toast({
        title: "Éxito",
        description: "Pop-up eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el pop-up",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este pop-up?')) {
      deletePopupMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPopup(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'promotion': return 'bg-green-100 text-green-800';
      case 'announcement': return 'bg-blue-100 text-blue-800';
      case 'info':
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTriggerLabel = (trigger: string, triggerValue: number) => {
    switch (trigger) {
      case 'immediate': return 'Inmediato';
      case 'delay': return `Después de ${triggerValue}s`;
      case 'scroll': return `Al scroll ${triggerValue}%`;
      case 'exit': return 'Al intentar salir';
      default: return trigger;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'always': return 'Siempre';
      case 'once_per_session': return 'Una vez por sesión';
      case 'once_per_user': return 'Una vez por usuario';
      case 'daily': return 'Una vez al día';
      default: return frequency;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando pop-ups...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Pop-ups</h1>
          <p className="text-gray-600">Administra los pop-ups que se muestran en tu sitio web</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pop-up
        </Button>
      </div>

      {/* Lista de Pop-ups */}
      <div className="grid gap-6">
        {popupsData?.popups?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No hay pop-ups configurados</p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer pop-up
              </Button>
            </CardContent>
          </Card>
        ) : (
          popupsData?.popups?.map((popup: Popup) => (
            <Card key={popup.id} className={popup.isActive ? 'border-green-200' : 'border-gray-200'}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{popup.title}</CardTitle>
                      <Badge className={getTypeColor(popup.type)}>
                        {popup.type}
                      </Badge>
                      <Badge variant={popup.isActive ? 'default' : 'secondary'}>
                        {popup.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      <span>📍 {popup.position}</span>
                      <span>⚡ {getTriggerLabel(popup.trigger, popup.triggerValue)}</span>
                      <span>🔄 {getFrequencyLabel(popup.displayFrequency)}</span>
                      <span>🎯 Prioridad: {popup.priority}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setStatsPopupId(popup.id)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => togglePopupMutation.mutate(popup.id)}
                    >
                      {popup.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(popup)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDelete(popup.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="text-sm text-gray-600 mb-4 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(popup.content.slice(0, 200) + (popup.content.length > 200 ? '...' : ''), {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'div', 'span'],
                    ALLOWED_ATTR: ['href', 'target', 'rel']
                  }) }}
                />
                
                {/* Imagen del popup */}
                {popup.image && (
                  <div className="mb-4">
                    <img
                      src={popup.image}
                      alt={popup.title}
                      className="w-full max-w-xs h-32 object-cover rounded-md border"
                    />
                  </div>
                )}
                
                {(popup.targetPages?.length || popup.excludePages?.length) && (
                  <div className="space-y-2 text-xs">
                    {popup.targetPages?.length > 0 && (
                      <div>
                        <span className="font-medium text-green-700">Páginas objetivo:</span>
                        <span className="ml-2 text-gray-600">{popup.targetPages.join(', ')}</span>
                      </div>
                    )}
                    {popup.excludePages?.length > 0 && (
                      <div>
                        <span className="font-medium text-red-700">Páginas excluidas:</span>
                        <span className="ml-2 text-gray-600">{popup.excludePages.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex justify-between text-xs text-gray-500">
                  <span>Creado: {new Date(popup.createdAt).toLocaleDateString()}</span>
                  <span>Actualizado: {new Date(popup.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de formulario */}
      {isFormOpen && (
        <PopupForm
          popup={editingPopup}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose();
            queryClient.invalidateQueries({ queryKey: ['/api/popups'] });
          }}
        />
      )}

      {/* Modal de estadísticas */}
      {statsPopupId && (
        <PopupStats
          popupId={statsPopupId}
          onClose={() => setStatsPopupId(null)}
        />
      )}
    </div>
    </AdminLayout>
  );
};

export default AdminPopups;