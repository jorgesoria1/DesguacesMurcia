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

interface BackupInfo {
  id: string;
  name: string;
  type: 'database';
  size: number;
  sizeFormatted: string;
  createdAt: string;
  description: string;
}

const BackupsConfigForm: React.FC = () => {
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
      if (!response.ok) throw new Error('Error obteniendo backups');
      return response.json();
    }
  });

  // Crear backup de base de datos
  const createDbBackupMutation = useMutation({
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
    mutationFn: async (backupId: string) => {
      const response = await fetch(`/api/backup/restore/database/${backupId}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error restaurando backup de base de datos');
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

  const handleRestore = (backup: BackupInfo) => {
    const confirmMessage = `¿Estás seguro de que quieres restaurar la base de datos desde el backup "${backup.name}"? Esta acción sobrescribirá los datos actuales.`;
    
    if (window.confirm(confirmMessage)) {
      restoreMutation.mutate(backup.id);
    }
  };

  const handleDelete = (backup: BackupInfo) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el backup "${backup.name}"?`)) {
      deleteBackupMutation.mutate(backup.id);
    }
  };

  const getTypeIcon = () => {
    return <Database className="h-4 w-4" />;
  };

  const getTypeName = () => {
    return 'Base de Datos';
  };

  const getTypeColor = () => {
    return 'bg-blue-100 text-blue-800';
  };

  if (isLoading) {
    return <div className="animate-pulse">Cargando backups...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Crear Backup de Base de Datos */}
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Crear Backup de Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="backupName">Nombre del backup (opcional)</Label>
              <Input
                id="backupName"
                placeholder="Mi backup personalizado"
                value={newBackupName}
                onChange={(e) => setNewBackupName(e.target.value)}
              />
            </div>
            <Button
              onClick={() => createDbBackupMutation.mutate(newBackupName)}
              disabled={createDbBackupMutation.isPending}
              className="w-full"
            >
              <Database className="h-4 w-4 mr-2" />
              {createDbBackupMutation.isPending ? 'Creando...' : 'Crear Backup BD'}
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

      {/* Información importante */}
      <Card className="border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">Información importante:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
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
  );
};

export default BackupsConfigForm;