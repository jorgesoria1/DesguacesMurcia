import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Trash2, 
  Database, 
  FileText, 
  Package, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/AdminLayout';

interface BackupInfo {
  id: string;
  name: string;
  type: 'database';
  size: number;
  sizeFormatted: string;
  createdAt: string;
  description: string;
}

const AdminBackups: React.FC = () => {
  const [newBackupName, setNewBackupName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener lista de backups
  const { data: backupsData, isLoading } = useQuery({
    queryKey: ['/api/backup/list'],
    queryFn: async () => {
      const response = await fetch('/api/backup/list', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al obtener backups');
      return response.json();
    }
  });

  // Crear backup de base de datos
  const createBackupMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name || undefined })
      });
      if (!response.ok) throw new Error('Error creando backup de base de datos');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
      setNewBackupName('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Restaurar backup
  const restoreMutation = useMutation({
    mutationFn: async ({ backupId }: { backupId: string }) => {
      const response = await fetch(`/api/backup/restore/${backupId}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error restaurando base de datos');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Eliminar backup
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await fetch(`/api/backup/${backupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error eliminando backup');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Subir backup
  const uploadBackupMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('backup', file);
      
      const response = await fetch('/api/backup/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) throw new Error('Error subiendo backup');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] });
      toast({
        title: "Éxito",
        description: data.message,
      });
      setUploadFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });



  const handleRestore = (backup: BackupInfo) => {
    const confirmMessage = `¿Estás seguro de que quieres restaurar la base de datos? Esta acción sobrescribirá los datos actuales.`;
    
    if (window.confirm(confirmMessage)) {
      restoreMutation.mutate({ backupId: backup.id });
    }
  };

  const handleDelete = (backup: BackupInfo) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el backup "${backup.name}"?`)) {
      deleteBackupMutation.mutate(backup.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const getTypeIcon = () => {
    return <Database className="h-4 w-4" />;
  };

  const getTypeColor = () => {
    return 'bg-blue-100 text-blue-800';
  };

  const getTypeName = () => {
    return 'Base de Datos';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando backups...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Backups</h1>
          <p className="text-gray-600">Crea y restaura copias de seguridad de tu sistema</p>
        </div>

        {/* Crear Backups */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Crear Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="backupName">Nombre del backup (opcional)</Label>
                <Input
                  id="backupName"
                  value={newBackupName}
                  onChange={(e) => setNewBackupName(e.target.value)}
                  placeholder="Mi backup personalizado"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => createBackupMutation.mutate(newBackupName)}
                  disabled={createBackupMutation.isPending}
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {createBackupMutation.isPending ? 'Creando...' : 'Crear Backup de Base de Datos'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Subir Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="uploadFile">Seleccionar archivo SQL (.sql)</Label>
                <Input
                  id="uploadFile"
                  type="file"
                  accept=".sql"
                  onChange={handleFileChange}
                />
              </div>
              
              {uploadFile && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    Archivo seleccionado: <strong>{uploadFile.name}</strong>
                  </p>
                  <p className="text-xs text-gray-500">
                    Tamaño: {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
              
              <Button
                onClick={() => uploadFile && uploadBackupMutation.mutate(uploadFile)}
                disabled={!uploadFile || uploadBackupMutation.isPending}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadBackupMutation.isPending ? 'Subiendo...' : 'Subir Backup'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Backups */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Backups Disponibles</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/backup/list'] })}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {backupsData?.backups?.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No hay backups disponibles</p>
                <p className="text-sm text-gray-400">Crea tu primer backup usando las opciones de arriba</p>
              </div>
            ) : (
              <div className="space-y-4">
                {backupsData?.backups?.map((backup: BackupInfo) => (
                  <div
                    key={backup.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            {getTypeIcon()}
                            <h3 className="font-medium">{backup.name}</h3>
                          </div>
                          <Badge className={getTypeColor()}>
                            {getTypeName()}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600">{backup.description}</p>
                        
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(backup.createdAt).toLocaleString()}
                          </span>
                          <span>Tamaño: {backup.sizeFormatted}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {/* Descargar backup */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/api/backup/download/${backup.id}`, '_blank')}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Descargar
                        </Button>
                        
                        {/* Restaurar backup */}
                        <Button
                          size="sm"
                          onClick={() => handleRestore(backup)}
                          disabled={restoreMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                        
                        {/* Eliminar backup */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(backup)}
                          disabled={deleteBackupMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advertencias */}
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Información importante:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Los backups incluyen solo la base de datos PostgreSQL</li>
                  <li>• Las restauraciones sobrescribirán los datos actuales</li>
                  <li>• Se recomienda crear un backup antes de restaurar</li>
                  <li>• Puedes descargar los backups para almacenarlos de forma segura</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBackups;