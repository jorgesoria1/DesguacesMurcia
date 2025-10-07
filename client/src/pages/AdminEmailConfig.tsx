import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Save, TestTube, CheckCircle, History, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/dashboard/Sidebar";

interface EmailConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  isActive: boolean;
}

interface EmailLog {
  id: number;
  recipientEmail: string;
  subject: string;
  emailType: string;
  transportMethod: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  sentAt?: string;
}

const AdminEmailConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("config");

  // Cargar configuración de correos
  const { data: emailConfigs, isLoading } = useQuery({
    queryKey: ['/api/admin/email-config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/email-config');
      if (!response.ok) {
        throw new Error('Error al cargar configuración de correos');
      }
      return response.json();
    }
  });

  // Cargar logs de correos
  const { data: emailLogs, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/admin/email-logs'],
    queryFn: async () => {
      const response = await fetch('/api/admin/email-logs?limit=50');
      if (!response.ok) {
        throw new Error('Error al cargar logs de correos');
      }
      return response.json();
    },
    enabled: activeTab === "history"
  });



  // Mutation para guardar configuración
  const saveMutation = useMutation({
    mutationFn: async (config: Partial<EmailConfig>) => {
      const response = await fetch('/api/admin/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar configuración');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración de correos se ha guardado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-config'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al guardar la configuración",
        variant: "destructive",
      });
    }
  });

  // Mutation para probar configuración
  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/email-config/test', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error al probar configuración');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prueba exitosa",
        description: "El correo de prueba se ha enviado correctamente",
      });
      // Actualizar logs después de la prueba
      if (activeTab === "history") {
        refetchLogs();
      }
    },
    onError: (error) => {
      toast({
        title: "Error en la prueba",
        description: "Error al enviar el correo de prueba",
        variant: "destructive",
      });
    }
  });

  // Mutation para eliminar log individual
  const deleteLogMutation = useMutation({
    mutationFn: async (logId: number) => {
      const response = await fetch(`/api/admin/email-logs/${logId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar log');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Log eliminado",
        description: "El log se ha eliminado correctamente",
      });
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al eliminar el log",
        variant: "destructive",
      });
    }
  });

  // Mutation para limpiar todo el historial
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/email-logs', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error al limpiar historial');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Historial limpiado",
        description: "Todo el historial de correos se ha eliminado",
      });
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al limpiar el historial",
        variant: "destructive",
      });
    }
  });

  const handleSave = (configKey: string, value: string) => {
    saveMutation.mutate({ key: configKey, value });
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await testMutation.mutateAsync();
    } finally {
      setIsTesting(false);
    }
  };

  const getConfigValue = (key: string) => {
    const config = emailConfigs?.find((c: EmailConfig) => c.key === key);
    return config?.value || '';
  };

  const getConfigStatus = (key: string) => {
    const config = emailConfigs?.find((c: EmailConfig) => c.key === key);
    return config?.isActive || false;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-100 text-green-800">Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact_form':
        return 'Formulario de contacto';
      case 'order_confirmation':
        return 'Confirmación de pedido';
      case 'order_notification':
        return 'Notificación de pedido';
      case 'test':
        return 'Prueba';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-bold">Configuración de Correos</h1>
            <p className="text-muted-foreground">
              Configura las direcciones de correo para notificaciones y formularios
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "history" && (
              <Button 
                onClick={() => refetchLogs()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            )}
            {activeTab === "messages" && (
              <Button 
                onClick={() => refetchMessages()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            )}
            <Button 
              onClick={handleTest}
              disabled={isTesting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {isTesting ? 'Probando...' : 'Probar configuración'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Configuración
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuración de pedidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notificaciones de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orders-admin-email">Email del administrador</Label>
                <Input
                  id="orders-admin-email"
                  type="email"
                  placeholder="admin@desguacesmurcia.es"
                  defaultValue={getConfigValue('orders_admin_email')}
                  onBlur={(e) => handleSave('orders_admin_email', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Correo donde se envían notificaciones de nuevos pedidos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orders-copy-email">Email de copia (opcional)</Label>
                <Input
                  id="orders-copy-email"
                  type="email"
                  placeholder="ventas@desguacesmurcia.es"
                  defaultValue={getConfigValue('orders_copy_email')}
                  onBlur={(e) => handleSave('orders_copy_email', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Correo adicional que recibirá copia de los pedidos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orders-subject">Asunto del correo</Label>
                <Input
                  id="orders-subject"
                  placeholder="Nuevo pedido #{orderNumber}"
                  defaultValue={getConfigValue('orders_subject') || 'Nuevo pedido #{orderNumber}'}
                  onBlur={(e) => handleSave('orders_subject', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Usa {'{orderNumber}'} para incluir el número de pedido
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="orders-enabled">Notificaciones activas</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones por email de nuevos pedidos
                  </p>
                </div>
                <Switch
                  id="orders-enabled"
                  checked={getConfigStatus('orders_notifications_enabled')}
                  onCheckedChange={(checked) => 
                    handleSave('orders_notifications_enabled', checked.toString())
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuración de formularios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Formularios de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="contact-admin-email">Email del administrador</Label>
                <Input
                  id="contact-admin-email"
                  type="email"
                  placeholder="contacto@desguacesmurcia.es"
                  defaultValue={getConfigValue('contact_admin_email')}
                  onBlur={(e) => handleSave('contact_admin_email', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Correo donde se envían los formularios de contacto
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-copy-email">Email de copia (opcional)</Label>
                <Input
                  id="contact-copy-email"
                  type="email"
                  placeholder="info@desguacesmurcia.es"
                  defaultValue={getConfigValue('contact_copy_email')}
                  onBlur={(e) => handleSave('contact_copy_email', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Correo adicional que recibirá copia de los formularios
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject">Asunto del correo</Label>
                <Input
                  id="contact-subject"
                  placeholder="Nuevo mensaje de contacto"
                  defaultValue={getConfigValue('contact_subject') || 'Nuevo mensaje de contacto'}
                  onBlur={(e) => handleSave('contact_subject', e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="contact-enabled">Notificaciones activas</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones por email de formularios de contacto
                  </p>
                </div>
                <Switch
                  id="contact-enabled"
                  checked={getConfigStatus('contact_notifications_enabled')}
                  onCheckedChange={(checked) => 
                    handleSave('contact_notifications_enabled', checked.toString())
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuración SMTP */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuración SMTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Servidor SMTP</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com"
                    defaultValue={getConfigValue('smtp_host')}
                    onBlur={(e) => handleSave('smtp_host', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Puerto</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                    defaultValue={getConfigValue('smtp_port')}
                    onBlur={(e) => handleSave('smtp_port', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuario SMTP</Label>
                  <Input
                    id="smtp-user"
                    type="email"
                    placeholder="tu-email@gmail.com"
                    defaultValue={getConfigValue('smtp_user')}
                    onBlur={(e) => handleSave('smtp_user', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">Contraseña SMTP</Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    placeholder="••••••••"
                    defaultValue={getConfigValue('smtp_pass')}
                    onBlur={(e) => handleSave('smtp_pass', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smtp-enabled">SMTP activo</Label>
                  <p className="text-sm text-muted-foreground">
                    Usar configuración SMTP personalizada
                  </p>
                </div>
                <Switch
                  id="smtp-enabled"
                  checked={getConfigStatus('smtp_enabled')}
                  onCheckedChange={(checked) => 
                    handleSave('smtp_enabled', checked.toString())
                  }
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Si no se configura SMTP, el sistema usará SendGrid si está disponible.
                  Para Gmail, necesitarás crear una contraseña de aplicación específica.
                </p>
              </div>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial de Correos
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchLogs()}
                      disabled={isLoadingLogs}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!emailLogs?.logs || emailLogs.logs.length === 0}
                        >
                          <Trash2 className="h-4 w-4" />
                          Limpiar Todo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Confirmar limpieza
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente todo el historial de correos.
                            No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => clearHistoryMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar Todo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emailLogs?.logs && emailLogs.logs.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Destinatario</TableHead>
                              <TableHead>Asunto</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Método</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Error</TableHead>
                              <TableHead className="w-20">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emailLogs.logs.map((log: EmailLog) => (
                              <TableRow key={log.id}>
                                <TableCell className="font-mono text-sm">
                                  {formatDate(log.createdAt)}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {log.recipientEmail}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {log.subject}
                                </TableCell>
                                <TableCell>
                                  {getTypeLabel(log.emailType)}
                                </TableCell>
                                <TableCell className="capitalize">
                                  {log.transportMethod}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(log.status)}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  {log.errorMessage && (
                                    <div className="text-red-600 text-sm truncate" title={log.errorMessage}>
                                      {log.errorMessage}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                        disabled={deleteLogMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Eliminar log</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          ¿Estás seguro de que quieres eliminar este log de correo?
                                          Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteLogMutation.mutate(log.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No hay correos registrados</p>
                        <p className="text-sm text-gray-400">
                          Los correos enviados aparecerán aquí
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
};

export default AdminEmailConfig;