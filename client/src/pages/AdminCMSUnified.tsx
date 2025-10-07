import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Settings,
  Globe,
  Phone,
  Mail,
  Clock,
  Layout,
  FileText,
  Users
} from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import Sidebar from '@/components/dashboard/Sidebar';

interface Page {
  id: number;
  slug: string;
  title: string;
  metaDescription: string | null;
  content: string;
  isPublished: boolean;
  isEditable: boolean;
  pageType: string;
  formConfig: any;
  createdAt: string;
  updatedAt: string;
}

interface FooterBlock {
  id: number;
  title: string;
  content: string;
  blockType: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SiteSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  type: string;
  category: string;
  updatedAt: string;
}

export default function AdminCMSUnified() {
  const [activeTab, setActiveTab] = useState('pages');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<FooterBlock | null>(null);
  const [editingPage, setEditingPage] = useState<Partial<Page>>({});
  const [editingBlock, setEditingBlock] = useState<Partial<FooterBlock>>({});
  const [newPage, setNewPage] = useState(false);
  const [newBlock, setNewBlock] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries con manejo de errores mejorado
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['/api/admin/cms/pages'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cms/pages', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar páginas');
      return response.json();
    }
  });

  const { data: footerBlocks, isLoading: blocksLoading } = useQuery({
    queryKey: ['/api/admin/cms/footer-blocks'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cms/footer-blocks', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar bloques');
      return response.json();
    }
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/cms/site-settings'],
    queryFn: async () => {
      const response = await fetch('/api/cms/site-settings', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar configuraciones');
      return response.json();
    }
  });

  // Función unificada para guardar configuraciones
  const handleSaveSetting = async (key: string, value: string) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(`/api/cms/site-settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value })
      });
      
      if (!response.ok) throw new Error('Error al actualizar configuración');
      
      queryClient.invalidateQueries({ queryKey: ['/api/cms/site-settings'] });
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      
      toast({ 
        title: "Configuración guardada", 
        description: "Los cambios se han guardado correctamente" 
      });
    } catch (error) {
      toast({ 
        title: "Error al guardar", 
        description: "No se pudo guardar la configuración",
        variant: "destructive" 
      });
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  // Manejar cambios pendientes en configuraciones
  const handleSettingChange = (key: string, value: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Página handlers
  const handleSavePage = async () => {
    setSaving(prev => ({ ...prev, page: true }));
    try {
      const method = selectedPage ? 'PUT' : 'POST';
      const url = selectedPage ? `/api/admin/cms/pages/${selectedPage.id}` : '/api/admin/cms/pages';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingPage)
      });

      if (!response.ok) throw new Error('Error al guardar página');
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      setSelectedPage(null);
      setEditingPage({});
      setNewPage(false);
      toast({ title: selectedPage ? "Página actualizada" : "Página creada" });
    } catch (error) {
      toast({ title: "Error al guardar página", variant: "destructive" });
    } finally {
      setSaving(prev => ({ ...prev, page: false }));
    }
  };

  // Footer block handlers
  const handleSaveBlock = async () => {
    setSaving(prev => ({ ...prev, block: true }));
    try {
      const method = selectedBlock ? 'PUT' : 'POST';
      const url = selectedBlock ? `/api/admin/cms/footer-blocks/${selectedBlock.id}` : '/api/admin/cms/footer-blocks';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingBlock)
      });

      if (!response.ok) throw new Error('Error al guardar bloque');
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/footer-blocks'] });
      setSelectedBlock(null);
      setEditingBlock({});
      setNewBlock(false);
      toast({ title: selectedBlock ? "Bloque actualizado" : "Bloque creado" });
    } catch (error) {
      toast({ title: "Error al guardar bloque", variant: "destructive" });
    } finally {
      setSaving(prev => ({ ...prev, block: false }));
    }
  };

  const handleDeleteBlock = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/cms/footer-blocks/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al eliminar bloque');
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/footer-blocks'] });
      toast({ title: "Bloque eliminado" });
    } catch (error) {
      toast({ title: "Error al eliminar bloque", variant: "destructive" });
    }
  };

  // Renderizar campo de configuración
  const renderSettingField = (setting: SiteSetting) => {
    const hasChanges = pendingChanges[setting.key] !== undefined;
    const currentValue = hasChanges ? pendingChanges[setting.key] : setting.value;
    const isLoading = saving[setting.key];

    return (
      <div key={setting.id} className="space-y-3 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.description || setting.key}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {setting.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {setting.type}
              </Badge>
            </div>
          </div>
          {hasChanges && (
            <Button
              size="sm"
              onClick={() => handleSaveSetting(setting.key, currentValue)}
              disabled={isLoading}
              className="ml-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
        
        {setting.type === 'boolean' ? (
          <div className="flex items-center space-x-2">
            <Switch
              id={setting.key}
              checked={currentValue === 'true'}
              onCheckedChange={(checked) => {
                handleSettingChange(setting.key, checked.toString());
              }}
              disabled={isLoading}
            />
            <Label htmlFor={setting.key} className="text-sm">
              {currentValue === 'true' ? 'Activado' : 'Desactivado'}
            </Label>
          </div>
        ) : setting.type === 'json' ? (
          <Textarea
            id={setting.key}
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            disabled={isLoading}
            rows={4}
            className="font-mono text-sm"
            placeholder="Formato JSON válido"
          />
        ) : setting.type === 'email' ? (
          <Input
            id={setting.key}
            type="email"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            disabled={isLoading}
            placeholder="correo@ejemplo.com"
          />
        ) : (
          <Input
            id={setting.key}
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            disabled={isLoading}
            placeholder={`Ingrese ${setting.description?.toLowerCase() || setting.key}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab="admin_cms" />
      
      <div className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sistema de Gestión de Contenido</h1>
          <p className="text-muted-foreground">
            Gestiona páginas, bloques del footer y configuraciones del sitio web
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Páginas
            </TabsTrigger>
            <TabsTrigger value="header" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Header
            </TabsTrigger>
            <TabsTrigger value="footer" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Footer
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuraciones
            </TabsTrigger>
          </TabsList>

          {/* Gestión de Páginas */}
          <TabsContent value="pages" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Gestión de Páginas</h2>
              <Button onClick={() => {
                setNewPage(true);
                setEditingPage({
                  slug: '',
                  title: '',
                  content: '',
                  metaDescription: '',
                  isPublished: false,
                  isEditable: true,
                  pageType: 'content'
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Página
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de páginas */}
              <Card>
                <CardHeader>
                  <CardTitle>Páginas del Sitio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pagesLoading ? (
                    <div>Cargando páginas...</div>
                  ) : (
                    pages?.map((page: Page) => (
                      <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h3 className="font-medium">{page.title}</h3>
                          <p className="text-sm text-muted-foreground">/{page.slug}</p>
                          <Badge variant={page.isPublished ? "default" : "secondary"}>
                            {page.isPublished ? "Publicado" : "Borrador"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPage(page);
                              setEditingPage(page);
                              setNewPage(false);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Editor de página */}
              {(selectedPage || newPage) && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {newPage ? "Nueva Página" : `Editando: ${selectedPage?.title}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="page-title">Título</Label>
                        <Input
                          id="page-title"
                          value={editingPage.title || ''}
                          onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                          placeholder="Título de la página"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="page-slug">URL (slug)</Label>
                        <Input
                          id="page-slug"
                          value={editingPage.slug || ''}
                          onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                          placeholder="url-de-la-pagina"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="page-meta">Meta descripción</Label>
                      <Textarea
                        id="page-meta"
                        value={editingPage.metaDescription || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, metaDescription: e.target.value })}
                        placeholder="Descripción para SEO (máx. 160 caracteres)"
                        maxLength={160}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="page-content">Contenido</Label>
                      <RichTextEditor
                        content={editingPage.content || ''}
                        onChange={(content) => setEditingPage({ ...editingPage, content })}
                        placeholder="Escriba el contenido de la página aquí..."
                        className="min-h-[400px]"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPublished"
                        checked={editingPage.isPublished || false}
                        onCheckedChange={(checked) => setEditingPage({ ...editingPage, isPublished: checked })}
                      />
                      <Label htmlFor="isPublished">Página publicada</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSavePage}
                        disabled={saving.page}
                      >
                        {saving.page ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedPage(null);
                          setEditingPage({});
                          setNewPage(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Gestión del Footer */}
          <TabsContent value="footer" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Gestión del Footer</h2>
              <Button onClick={() => {
                setNewBlock(true);
                setEditingBlock({
                  title: '',
                  content: '',
                  blockType: 'text',
                  sortOrder: 0,
                  isActive: true
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Bloque
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista de bloques */}
              <Card>
                <CardHeader>
                  <CardTitle>Bloques del Footer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blocksLoading ? (
                    <div>Cargando bloques...</div>
                  ) : (
                    footerBlocks?.map((block: FooterBlock) => (
                      <div key={block.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h3 className="font-medium">{block.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{block.content}</p>
                          <Badge variant={block.isActive ? "default" : "secondary"}>
                            {block.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBlock(block);
                              setEditingBlock(block);
                              setNewBlock(false);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteBlock(block.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Editor de bloque */}
              {(selectedBlock || newBlock) && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {newBlock ? "Nuevo Bloque" : `Editando: ${selectedBlock?.title}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="block-title">Título</Label>
                      <Input
                        id="block-title"
                        value={editingBlock.title || ''}
                        onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                        placeholder="Título del bloque"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="block-content">Contenido</Label>
                      <Textarea
                        id="block-content"
                        value={editingBlock.content || ''}
                        onChange={(e) => setEditingBlock({ ...editingBlock, content: e.target.value })}
                        placeholder="Contenido del bloque"
                        rows={6}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="block-type">Tipo de Bloque</Label>
                        <Input
                          id="block-type"
                          value={editingBlock.blockType || ''}
                          onChange={(e) => setEditingBlock({ ...editingBlock, blockType: e.target.value })}
                          placeholder="text, links, hours, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="block-order">Orden</Label>
                        <Input
                          id="block-order"
                          type="number"
                          value={editingBlock.sortOrder || 0}
                          onChange={(e) => setEditingBlock({ ...editingBlock, sortOrder: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="block-active"
                        checked={editingBlock.isActive || false}
                        onCheckedChange={(checked) => setEditingBlock({ ...editingBlock, isActive: checked })}
                      />
                      <Label htmlFor="block-active">Bloque activo</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveBlock}
                        disabled={saving.block}
                      >
                        {saving.block ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedBlock(null);
                          setEditingBlock({});
                          setNewBlock(false);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Configuración del Header */}
          <TabsContent value="header" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Configuración del Header</h2>
              <p className="text-muted-foreground">
                Gestiona los horarios de atención, información de contacto y otros elementos del header.
              </p>
            </div>

            {settingsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Horarios de Atención */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Horarios de Atención
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settings?.filter((setting: SiteSetting) => 
                      setting.category === 'header' && setting.key.includes('hours')
                    ).map(renderSettingField)}
                  </CardContent>
                </Card>

                {/* Información de Contacto Header */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Contacto del Header
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settings?.filter((setting: SiteSetting) => 
                      setting.category === 'header' && !setting.key.includes('hours')
                    ).map(renderSettingField)}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Configuraciones del Sitio */}
          <TabsContent value="settings" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Configuraciones del Sitio</h2>
              <p className="text-muted-foreground">
                Gestiona todas las configuraciones del sitio web de forma centralizada. 
                Los cambios se guardan automáticamente al hacer clic en el botón guardar.
              </p>
            </div>

            {settingsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Configuración General
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settings?.filter((setting: SiteSetting) => setting.category === 'general').map(renderSettingField)}
                  </CardContent>
                </Card>

                {/* Contact Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Información de Contacto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settings?.filter((setting: SiteSetting) => setting.category === 'contact').map(renderSettingField)}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Forms Settings - Full Width */}
            {settings?.filter((setting: SiteSetting) => setting.category === 'forms').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Configuración de Formularios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settings?.filter((setting: SiteSetting) => setting.category === 'forms').map(renderSettingField)}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}