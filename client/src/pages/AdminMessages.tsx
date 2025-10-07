import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Mail,
  MailOpen,
  Search,
  Car,
  MessageSquare,
  FileText,
  Phone,
  User,
  Calendar,
  Filter,
  Eye,
  Archive,
  CheckCircle,
  Trash2,
  AlertCircle,
  CheckSquare,
  Square
} from "lucide-react";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  formType: 'contact' | 'valuation';
  status: 'unread' | 'read' | 'replied';
  images: string[];
  createdAt: string;
  updatedAt: string;
}

interface MessageStats {
  total: number;
  unread: number;
  contact: number;
  valuation: number;
}

const AdminMessages = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Safe date formatting function
  const formatMessageDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: es 
      });
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Fecha inválida';
    }
  };

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['contact-messages', searchTerm, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('formType', typeFilter);
      
      const response = await fetch(`/api/admin/contact-messages?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar mensajes');
      return response.json();
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['contact-messages-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/contact-messages/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar estadísticas');
      return response.json();
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'read' }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al marcar como leído');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages/stats'] });
      toast({
        title: "Éxito",
        description: "Mensaje marcado como leído",
      });
    },
  });

  // Archive message mutation
  const replyMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'replied' }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al marcar como respondido');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages/stats'] });
      toast({
        title: "Éxito",
        description: "Mensaje marcado como respondido",
      });
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al eliminar mensaje');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages/stats'] });
      setIsDetailsOpen(false);
      toast({
        title: "Éxito",
        description: "Mensaje eliminado",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (messageIds: number[]) => {
      // Delete messages one by one since there's no bulk endpoint
      const results = await Promise.allSettled(
        messageIds.map(id => 
          fetch(`/api/admin/contact-messages/${id}`, { method: 'DELETE', credentials: 'include' })
        )
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        throw new Error(`Error al eliminar ${failed} mensaje${failed > 1 ? 's' : ''}`);
      }
      
      return { deleted: messageIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-messages/stats'] });
      setSelectedMessages([]);
      toast({
        title: "Éxito",
        description: "Mensajes eliminados",
      });
    },
  });

  // Selection handlers
  const handleSelectMessage = (messageId: number, checked: boolean) => {
    if (checked) {
      setSelectedMessages(prev => [...prev, messageId]);
    } else {
      setSelectedMessages(prev => prev.filter(id => id !== messageId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(filteredMessages.map(m => m.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedMessages.length === 0) return;
    
    const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedMessages.length} mensaje${selectedMessages.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`;
    
    if (confirm(confirmMessage)) {
      bulkDeleteMutation.mutate(selectedMessages);
    }
  };

  const getFormTypeLabel = (type: string) => {
    switch (type) {
      case 'contact': return 'Contacto';
      case 'valuation': return 'Tasación';
      default: return type;
    }
  };

  const getFormTypeIcon = (type: string) => {
    switch (type) {
      case 'contact': return MessageSquare;
      case 'valuation': return Car;
      default: return Mail;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-red-100 text-red-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'replied': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unread': return 'Sin leer';
      case 'read': return 'Leído';
      case 'replied': return 'Respondido';
      default: return status;
    }
  };

  const handleViewMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setIsDetailsOpen(true);
    
    // Mark as read if unread
    if (message.status === 'unread') {
      markAsReadMutation.mutate(message.id);
    }
  };

  const filteredMessages = messages;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Mensajes Recibidos</h1>
            <p className="text-gray-600">Gestiona los mensajes de contacto y solicitudes de tasación</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MailOpen className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600">Sin leer</p>
                    <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Car className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Tasaciones</p>
                    <p className="text-2xl font-bold">{stats.valuation || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Contactos</p>
                    <p className="text-2xl font-bold">{stats.contact || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, email o mensaje..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="unread">Sin leer</option>
                  <option value="read">Leídos</option>
                  <option value="replied">Respondidos</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="contact">Contacto</option>
                  <option value="valuation">Tasación</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Mensajes ({filteredMessages.length})
              </div>
              
              {selectedMessages.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedMessages.length} seleccionado{selectedMessages.length > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar seleccionados
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay mensajes que mostrar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All Checkbox */}
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-600">Seleccionar todos</span>
                </div>

                {filteredMessages.map((message) => {
                  const FormIcon = getFormTypeIcon(message.formType);
                  const isUnread = message.status === 'unread';
                  const isSelected = selectedMessages.includes(message.id);
                  
                  return (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        isSelected ? 'bg-blue-100 border-blue-300' : 
                        isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectMessage(message.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <FormIcon className={`h-5 w-5 mt-1 ${isUnread ? 'text-blue-600' : 'text-gray-400'}`} />
                          
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleViewMessage(message)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className={`font-medium ${isUnread ? 'text-blue-900' : 'text-gray-900'}`}>
                                {message.name}
                              </h3>
                              <Badge variant="outline" className={getStatusColor(message.status)}>
                                {getStatusLabel(message.status)}
                              </Badge>
                              <Badge variant="secondary">
                                {getFormTypeLabel(message.formType)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{message.email}</p>
                            
                            {message.subject && (
                              <p className={`text-sm mb-2 ${isUnread ? 'text-blue-800' : 'text-gray-700'}`}>
                                <strong>Asunto:</strong> {message.subject}
                              </p>
                            )}
                            
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {message.message}
                            </p>
                            
                            {/* Show images indicator */}
                            {message.images && message.images.length > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-blue-600 font-medium">
                                  {message.images.length} imagen{message.images.length > 1 ? 'es' : ''} adjunta{message.images.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <span className="text-xs text-gray-500">
                            {formatMessageDate(message.createdAt)}
                          </span>
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewMessage(message);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {message.status !== 'replied' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  replyMutation.mutate(message.id);
                                }}
                                disabled={replyMutation.isPending}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.')) {
                                  deleteMutation.mutate(message.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedMessage && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {React.createElement(getFormTypeIcon(selectedMessage.formType), { className: "h-5 w-5" })}
                    {getFormTypeLabel(selectedMessage.formType)} - {selectedMessage.name}
                  </DialogTitle>
                  <DialogDescription>
                    Detalles del mensaje recibido el {new Date(selectedMessage.createdAt).toLocaleDateString('es-ES')}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(selectedMessage.status)}>
                      {getStatusLabel(selectedMessage.status)}
                    </Badge>
                    <Badge variant="secondary">
                      {getFormTypeLabel(selectedMessage.formType)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Nombre:</span>
                        <span>{selectedMessage.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Email:</span>
                        <span>{selectedMessage.email}</span>
                      </div>
                      
                      {selectedMessage.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Teléfono:</span>
                          <span>{selectedMessage.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Recibido:</span>
                        <span>{formatMessageDate(selectedMessage.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedMessage.subject && (
                    <div>
                      <h4 className="font-medium mb-2">Asunto:</h4>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedMessage.subject}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Mensaje:</h4>
                    <div className="text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap">
                      {selectedMessage.message}
                    </div>
                  </div>

                  {/* Images Section */}
                  {selectedMessage.images && selectedMessage.images.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">
                        Imágenes adjuntas ({selectedMessage.images.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedMessage.images.map((imagePath, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imagePath.startsWith('http') ? imagePath : `${window.location.origin}${imagePath}`}
                              alt={`Imagen ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(imagePath.startsWith('http') ? imagePath : `${window.location.origin}${imagePath}`, '_blank')}
                              onError={(e) => {
                                console.error(`Error loading image: ${imagePath}`);
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                // Add placeholder div after the broken image
                                const placeholder = document.createElement('div');
                                placeholder.className = 'w-full h-32 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center text-red-500 text-sm';
                                placeholder.innerHTML = `<div class="text-center"><div class="mb-1">❌</div>Imagen no disponible<br/><span class="text-xs">archivo ${index + 1}</span></div>`;
                                target.parentNode?.appendChild(placeholder);
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                                Ver imagen
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    {selectedMessage.status !== 'replied' && (
                      <Button
                        variant="outline"
                        onClick={() => replyMutation.mutate(selectedMessage.id)}
                        disabled={replyMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marcar como Respondido
                      </Button>
                    )}
                    
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(selectedMessage.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;