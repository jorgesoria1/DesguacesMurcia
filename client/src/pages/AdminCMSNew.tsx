import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Settings, 
  FileText, 
  Image, 
  Users, 
  Mail,
  Globe,
  Wrench
} from 'lucide-react';

type SiteSetting = {
  id: number;
  key: string;
  value: string;
  type: 'text' | 'email' | 'number' | 'boolean' | 'textarea';
  category: string;
  description?: string;
};

type Page = {
  id: number;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type HomepageBlock = {
  id: number;
  blockType: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  orderIndex: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminCMSNew() {
  const [activeSection, setActiveSection] = useState('configuraciones');
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['/api/admin/cms/settings'],
    enabled: activeSection === 'configuraciones'
  });

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['/api/admin/cms/pages'],
    enabled: activeSection === 'paginas'
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['/api/admin/cms/homepage-blocks'],
    enabled: activeSection === 'bloques'
  });

  const { data: footerBlocks, isLoading: footerLoading } = useQuery({
    queryKey: ['/api/admin/cms/footer-blocks'],
    enabled: activeSection === 'footer'
  });

  // Mutation para guardar configuraciones
  const saveSettingMutation = useMutation({
    mutationFn: async (data: { id: number; value: string }) => {
      return apiRequest(`/api/admin/cms/settings/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({ value: data.value }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/settings'] });
      toast({ title: 'Configuración guardada correctamente' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al guardar', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  const handleSaveSetting = (setting: SiteSetting) => {
    const newValue = editingSettings[setting.id] || setting.value;
    saveSettingMutation.mutate({ id: setting.id, value: newValue });
  };

  const handleSettingChange = (settingId: number, value: string) => {
    setEditingSettings(prev => ({ ...prev, [settingId]: value }));
  };

  const renderConfiguraciones = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6" />
        <h2 className="text-3xl font-semibold">Configuraciones del Sitio</h2>
      </div>

      {settingsError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mb-4">
                <Wrench className="mx-auto h-12 w-12 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar configuraciones</h3>
              <p className="text-gray-600 mb-6">
                Error: {settingsError?.message || 'Error desconocido'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Recargar página
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuraciones Generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="text-center py-4">Cargando configuraciones...</div>
              ) : (
                settings?.filter((setting: SiteSetting) => setting.category !== 'footer').map((setting: SiteSetting) => (
                  <div key={setting.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={setting.key}>{setting.key}</Label>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">{setting.category}</Badge>
                    </div>
                    
                    {setting.type === 'boolean' ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={setting.key}
                          checked={editingSettings[setting.id] === 'true' || (editingSettings[setting.id] === undefined && setting.value === 'true')}
                          onCheckedChange={(checked) => handleSettingChange(setting.id, checked.toString())}
                        />
                        <Label htmlFor={setting.key}>
                          {editingSettings[setting.id] === 'true' || (editingSettings[setting.id] === undefined && setting.value === 'true') ? 'Activado' : 'Desactivado'}
                        </Label>
                      </div>
                    ) : setting.type === 'textarea' ? (
                      <Textarea
                        id={setting.key}
                        value={editingSettings[setting.id] || setting.value}
                        onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                        placeholder={`Ingrese ${setting.key}`}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={setting.key}
                        type={setting.type === 'number' ? 'number' : setting.type === 'email' ? 'email' : 'text'}
                        value={editingSettings[setting.id] || setting.value}
                        onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                        placeholder={`Ingrese ${setting.key}`}
                      />
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => handleSaveSetting(setting)}
                      disabled={saveSettingMutation.isPending}
                      className="mt-2"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Footer Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configuraciones del Footer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {footerLoading ? (
                <div className="text-center py-4">Cargando footer...</div>
              ) : (
                footerBlocks?.map((block: any) => (
                  <div key={block.id} className="space-y-2">
                    <Label>{block.title}</Label>
                    <Textarea
                      value={block.content}
                      readOnly
                      rows={3}
                      className="bg-gray-50"
                    />
                    <Badge variant="secondary">Footer Block</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderPaginas = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6" />
        <h2 className="text-3xl font-semibold">Gestión de Páginas</h2>
      </div>

      {pagesLoading ? (
        <div className="text-center py-8">Cargando páginas...</div>
      ) : (
        <div className="grid gap-4">
          {pages?.map((page: Page) => (
            <Card key={page.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{page.title}</CardTitle>
                  <Badge variant={page.published ? 'default' : 'secondary'}>
                    {page.published ? 'Publicada' : 'Borrador'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Slug: /{page.slug}</p>
                  <p className="text-sm line-clamp-2">{page.content}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                    <Button size="sm" variant="outline">
                      Ver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderBloques = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Image className="w-6 h-6" />
        <h2 className="text-3xl font-semibold">Bloques de Contenido</h2>
      </div>

      {blocksLoading ? (
        <div className="text-center py-8">Cargando bloques...</div>
      ) : (
        <div className="grid gap-4">
          {blocks?.map((block: HomepageBlock) => (
            <Card key={block.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{block.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{block.blockType}</Badge>
                    <Badge variant={block.active ? 'default' : 'secondary'}>
                      {block.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm line-clamp-2">{block.content}</p>
                  {block.imageUrl && (
                    <p className="text-sm text-muted-foreground">Imagen: {block.imageUrl}</p>
                  )}
                  {block.linkUrl && (
                    <p className="text-sm text-muted-foreground">Enlace: {block.linkUrl}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                    <Button size="sm" variant="outline">
                      {block.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Sistema de Gestión de Contenidos</h1>
          <p className="text-gray-600 mt-2">Administra el contenido y configuraciones del sitio web</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-64 space-y-2">
            <Button
              variant={activeSection === 'configuraciones' ? 'default' : 'ghost'}
              onClick={() => setActiveSection('configuraciones')}
              className="w-full justify-start"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuraciones
            </Button>
            
            <Button
              variant={activeSection === 'paginas' ? 'default' : 'ghost'}
              onClick={() => setActiveSection('paginas')}
              className="w-full justify-start"
            >
              <FileText className="w-4 h-4 mr-2" />
              Páginas
            </Button>
            
            <Button
              variant={activeSection === 'bloques' ? 'default' : 'ghost'}
              onClick={() => setActiveSection('bloques')}
              className="w-full justify-start"
            >
              <Image className="w-4 h-4 mr-2" />
              Bloques
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeSection === 'configuraciones' && renderConfiguraciones()}
            {activeSection === 'paginas' && renderPaginas()}
            {activeSection === 'bloques' && renderBloques()}
          </div>
        </div>
      </div>
    </div>
  );
}