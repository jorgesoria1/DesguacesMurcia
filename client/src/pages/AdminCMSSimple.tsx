import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Save, X, Settings, Globe, Phone, Layout, Mail } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { RichTextEditor } from "@/components/RichTextEditor";

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

export default function AdminCMSSimple() {
  const [activeTab, setActiveTab] = useState('pages');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<FooterBlock | null>(null);
  const [editingPage, setEditingPage] = useState<Partial<Page>>({});
  const [editingBlock, setEditingBlock] = useState<Partial<FooterBlock>>({});
  const [newPage, setNewPage] = useState(false);
  const [newBlock, setNewBlock] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
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

  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['/api/cms/site-settings'],
    queryFn: async () => {
      const response = await fetch('/api/cms/site-settings', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar configuraciones');
      return response.json();
    }
  });

  // Page handlers
  const handleSavePage = async () => {
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
      toast({ title: selectedPage ? "Página actualizada exitosamente" : "Página creada exitosamente" });
    } catch (error) {
      toast({ title: "Error al guardar página", variant: "destructive" });
    }
  };

  const handleDeletePage = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/cms/pages/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al eliminar página');
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      toast({ title: "Página eliminada exitosamente" });
    } catch (error) {
      toast({ title: "Error al eliminar página", variant: "destructive" });
    }
  };

  // Block handlers
  const handleSaveBlock = async () => {
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
      toast({ title: selectedBlock ? "Bloque actualizado exitosamente" : "Bloque creado exitosamente" });
    } catch (error) {
      toast({ title: "Error al guardar bloque", variant: "destructive" });
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
      toast({ title: "Bloque eliminado exitosamente" });
    } catch (error) {
      toast({ title: "Error al eliminar bloque", variant: "destructive" });
    }
  };

  // Settings handler
  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const response = await fetch(`/api/cms/site-settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value })
      });
      if (!response.ok) throw new Error('Error al actualizar configuración');
      
      queryClient.invalidateQueries({ queryKey: ['/api/cms/site-settings'] });
      toast({ title: "Configuración actualizada exitosamente" });
    } catch (error) {
      toast({ title: "Error al actualizar configuración", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab="admin_cms" />
      
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-8">Sistema de Gestión de Contenido</h1>

        {/* Navegación con botones */}
        <div className="flex space-x-2 mb-6 border-b pb-4">
          <Button
            variant={activeTab === 'pages' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pages')}
          >
            Páginas
          </Button>
          <Button
            variant={activeTab === 'footer' ? 'default' : 'outline'}
            onClick={() => setActiveTab('footer')}
          >
            Footer
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('settings')}
          >
            Configuraciones
          </Button>
        </div>

        {/* Gestión de Páginas */}
        {activeTab === 'pages' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Gestión de Páginas</h2>
              <Button onClick={() => {
                setNewPage(true);
                setEditingPage({
                  title: '',
                  slug: '',
                  content: '',
                  metaDescription: '',
                  isPublished: true,
                  isEditable: true,
                  pageType: 'static'
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
                  <CardTitle>Páginas Existentes</CardTitle>
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
                          <div className="flex gap-2">
                            <Badge variant={page.isPublished ? "default" : "secondary"}>
                              {page.isPublished ? "Publicada" : "Borrador"}
                            </Badge>
                            <Badge variant="outline">{page.pageType}</Badge>
                          </div>
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
                          {page.isEditable && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeletePage(page.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={editingPage.title || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                        placeholder="Título de la página"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug (URL)</Label>
                      <Input
                        id="slug"
                        value={editingPage.slug || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                        placeholder="url-de-la-pagina"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Contenido</Label>
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
                      <Button onClick={handleSavePage}>
                        <Save className="w-4 h-4 mr-2" />
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
          </div>
        )}

        {/* Gestión del Footer */}
        {activeTab === 'footer' && (
          <div className="space-y-6">
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

                    <div className="flex gap-2">
                      <Button onClick={handleSaveBlock}>
                        <Save className="w-4 h-4 mr-2" />
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
          </div>
        )}

        {/* Configuraciones del Sitio */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Configuraciones del Sitio</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuraciones del Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuración del Header
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settingsLoading ? (
                    <div>Cargando configuraciones...</div>
                  ) : (
                    settings?.filter((setting: SiteSetting) => setting.category === 'header').map((setting: SiteSetting) => (
                      <div key={setting.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
                          </div>
                          <Badge variant="outline">header</Badge>
                        </div>
                        
                        {setting.type === 'boolean' ? (
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={setting.key}
                              defaultChecked={setting.value === 'true'}
                              onCheckedChange={(checked) => {
                                handleUpdateSetting(setting.key, checked.toString());
                              }}
                            />
                            <Label htmlFor={setting.key}>
                              {setting.value === 'true' ? 'Activado' : 'Desactivado'}
                            </Label>
                          </div>
                        ) : (
                          <Input
                            id={setting.key}
                            defaultValue={setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                handleUpdateSetting(setting.key, e.target.value);
                              }
                            }}
                            className="bg-gray-50"
                          />
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Configuraciones Generales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Configuración General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settingsLoading ? (
                    <div>Cargando configuraciones...</div>
                  ) : (
                    settings?.filter((setting: SiteSetting) => setting.category === 'general').map((setting: SiteSetting) => (
                      <div key={setting.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
                          </div>
                          <Badge variant="outline">general</Badge>
                        </div>
                        
                        {setting.type === 'json' ? (
                          <Textarea
                            id={setting.key}
                            defaultValue={setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                handleUpdateSetting(setting.key, e.target.value);
                              }
                            }}
                            rows={4}
                            className="bg-gray-50 font-mono text-sm"
                          />
                        ) : (
                          <Input
                            id={setting.key}
                            defaultValue={setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                handleUpdateSetting(setting.key, e.target.value);
                              }
                            }}
                            className="bg-gray-50"
                          />
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Configuraciones de Contacto */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Información de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings?.filter((setting: SiteSetting) => setting.category === 'contact').map((setting: SiteSetting) => (
                    <div key={setting.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
                        </div>
                        <Badge variant="outline">contacto</Badge>
                      </div>
                      
                      <Input
                        id={setting.key}
                        type={setting.type === 'email' ? 'email' : 'text'}
                        defaultValue={setting.value}
                        onBlur={(e) => {
                          if (e.target.value !== setting.value) {
                            handleUpdateSetting(setting.key, e.target.value);
                          }
                        }}
                        className="bg-gray-50"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Configuraciones de Footer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="w-5 h-5" />
                    Configuración del Footer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings?.filter((setting: SiteSetting) => setting.category === 'footer').map((setting: SiteSetting) => (
                    <div key={setting.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
                        </div>
                        <Badge variant="outline">footer</Badge>
                      </div>
                      
                      {setting.type === 'json' ? (
                        <Textarea
                          id={setting.key}
                          defaultValue={setting.value}
                          onBlur={(e) => {
                            if (e.target.value !== setting.value) {
                              handleUpdateSetting(setting.key, e.target.value);
                            }
                          }}
                          rows={4}
                          className="bg-gray-50 font-mono text-sm"
                        />
                      ) : (
                        <Input
                          id={setting.key}
                          defaultValue={setting.value}
                          onBlur={(e) => {
                            if (e.target.value !== setting.value) {
                              handleUpdateSetting(setting.key, e.target.value);
                            }
                          }}
                          className="bg-gray-50"
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Configuraciones de Formularios - Ancho completo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Configuración de Formularios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settings?.filter((setting: SiteSetting) => setting.category === 'forms').map((setting: SiteSetting) => (
                    <div key={setting.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={setting.key}>{setting.description || setting.key}</Label>
                        </div>
                        <Badge variant="outline">formularios</Badge>
                      </div>
                      
                      <Input
                        id={setting.key}
                        type="email"
                        defaultValue={setting.value}
                        onBlur={(e) => {
                          if (e.target.value !== setting.value) {
                            handleUpdateSetting(setting.key, e.target.value);
                          }
                        }}
                        className="bg-gray-50"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}