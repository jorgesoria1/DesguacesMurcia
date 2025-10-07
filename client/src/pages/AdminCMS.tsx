import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Tabs components removed - using custom button navigation
// Note: useState already imported at top
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Save, X, Settings, Globe, FileText, Layout } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ImageBlockEditor from "@/components/ImageBlockEditor";

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

interface HomepageBlock {
  id: number;
  blockType: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  image?: string;
  buttonText?: string;
  buttonUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCMS() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<FooterBlock | null>(null);
  const [editingPage, setEditingPage] = useState<Partial<Page>>({});
  const [editingBlock, setEditingBlock] = useState<Partial<FooterBlock>>({});
  const [newPage, setNewPage] = useState(false);
  const [newBlock, setNewBlock] = useState(false);
  const [editingImageBlock, setEditingImageBlock] = useState<HomepageBlock | null>(null);
  const [activeTab, setActiveTab] = useState('pages');

  // Debug del activeTab
  console.log('🎯 ADMIN CMS ACTIVE TAB:', activeTab, new Date().toISOString().split('T')[1]);

  // useEffect para debug y forzar query
  useEffect(() => {
    console.log('🔄 AdminCMS component mounted, forcing settings query...');
    // Fetch directo para test
    fetch('/api/cms/site-settings')
      .then(response => response.json())
      .then(data => console.log('✅ Direct fetch successful:', data.length, 'items'))
      .catch(error => console.error('❌ Direct fetch failed:', error));
    
    queryClient.invalidateQueries({ queryKey: ['/api/cms/site-settings'] });
  }, [queryClient]);

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

  // Nueva query para configuraciones del sistema
  const { data: systemSettings, isLoading: systemLoading, error: systemError } = useQuery({
    queryKey: ['/api/cms/site-settings-system'],
    queryFn: async () => {
      console.log('🚀 INICIANDO FETCH DE CONFIGURACIONES DEL SISTEMA...');
      try {
        const response = await fetch('/api/cms/site-settings', {
          credentials: 'include'
        });
        
        console.log('📡 System settings response:', response.status, response.ok);
        
        if (!response.ok) {
          console.error('❌ System settings error:', response.status, response.statusText);
          throw new Error(`Error al cargar configuraciones: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ System settings data received:', data.length, 'configuraciones');
        console.log('🔍 Configuraciones:', data.map(s => ({ key: s.key, category: s.category })));
        return data;
      } catch (error) {
        console.error('💥 System settings fetch error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 60000
  });

  // Query original para compatibilidad
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['/api/cms/site-settings'],
    queryFn: async () => {
      console.log('🚀 INICIANDO FETCH DE SITE SETTINGS...');
      try {
        const response = await fetch('/api/cms/site-settings', {
          credentials: 'include'
        });
        
        console.log('📡 Site settings response:', response.status, response.ok);
        
        if (!response.ok) {
          console.error('❌ Site settings error:', response.status, response.statusText);
          throw new Error(`Error al cargar configuraciones del sitio: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Site settings data received:', data.length, 'items');
        console.log('🔍 First 3 settings:', data.slice(0, 3));
        return data;
      } catch (error) {
        console.error('💥 Site settings fetch error:', error);
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
    gcTime: 0
  });

  const { data: homepageBlocks, isLoading: homepageBlocksLoading } = useQuery({
    queryKey: ['/api/admin/cms/homepage-blocks'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cms/homepage-blocks', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar bloques de portada');
      return response.json();
    }
  });

  // Mutations
  const createPageMutation = useMutation({
    mutationFn: async (pageData: Partial<Page>) => {
      const response = await fetch('/api/admin/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pageData)
      });
      if (!response.ok) throw new Error('Error al crear página');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      setNewPage(false);
      setEditingPage({});
      toast({ title: "Página creada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear página", variant: "destructive" });
    }
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, ...pageData }: Partial<Page> & { id: number }) => {
      const response = await fetch(`/api/admin/cms/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pageData)
      });
      if (!response.ok) throw new Error('Error al actualizar página');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      setSelectedPage(null);
      setEditingPage({});
      toast({ title: "Página actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar página", variant: "destructive" });
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/cms/pages/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/pages'] });
      toast({ title: "Página eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar página", variant: "destructive" });
    }
  });

  const createBlockMutation = useMutation({
    mutationFn: (blockData: Partial<FooterBlock>) => apiRequest('/api/admin/cms/footer-blocks', {
      method: 'POST',
      body: JSON.stringify(blockData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/footer-blocks'] });
      setNewBlock(false);
      setEditingBlock({});
      toast({ title: "Bloque creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear bloque", variant: "destructive" });
    }
  });

  const updateBlockMutation = useMutation({
    mutationFn: ({ id, ...blockData }: Partial<FooterBlock> & { id: number }) => 
      apiRequest(`/api/admin/cms/footer-blocks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(blockData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/footer-blocks'] });
      setSelectedBlock(null);
      setEditingBlock({});
      toast({ title: "Bloque actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar bloque", variant: "destructive" });
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/cms/footer-blocks/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/footer-blocks'] });
      toast({ title: "Bloque eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar bloque", variant: "destructive" });
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      apiRequest(`/api/admin/cms/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/settings'] });
      toast({ title: "Configuración actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar configuración", variant: "destructive" });
    }
  });

  const handleSavePage = () => {
    if (newPage) {
      createPageMutation.mutate(editingPage);
    } else if (selectedPage) {
      updatePageMutation.mutate({ ...editingPage, id: selectedPage.id });
    }
  };

  const handleSaveBlock = () => {
    if (newBlock) {
      createBlockMutation.mutate(editingBlock);
    } else if (selectedBlock) {
      updateBlockMutation.mutate({ ...editingBlock, id: selectedBlock.id });
    }
  };

  // Debug: Log tab structure
  console.log('🔧 ADMIN CMS TABS DEBUG:', {
    totalTabs: 5,
    tabValues: ['pages', 'homepage', 'footer', 'system', 'settings'],
    systemTabExists: true,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Sistema de Gestión de Contenido</h1>

      <div className="space-y-6">
        {/* Sistema de navegación por botones */}
        <div className="grid w-full grid-cols-5 gap-2 p-2 bg-muted rounded-md">
          <Button
            variant={activeTab === 'pages' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pages')}
            className="w-full"
          >
            Páginas
          </Button>
          <Button
            variant={activeTab === 'homepage' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('homepage')}
            className="w-full"
          >
            Bloques Portada
          </Button>
          <Button
            variant={activeTab === 'footer' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('footer')}
            className="w-full"
          >
            Footer
          </Button>
          <Button
            variant={activeTab === 'system' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('system')}
            className={`w-full font-bold ${activeTab === 'system' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            🔧 SISTEMA
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            onClick={() => {
              console.log('🔧 CLICKED CONFIGURACIONES TAB');
              setActiveTab('settings');
            }}
            className="w-full"
          >
            Configuraciones
          </Button>
        </div>

        {/* Gestión de Páginas */}
        {activeTab === 'pages' && (<div className="space-y-6">
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
                            onClick={() => deletePageMutation.mutate(page.id)}
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
                    <Label htmlFor="metaDescription">Meta Descripción</Label>
                    <Textarea
                      id="metaDescription"
                      value={editingPage.metaDescription || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, metaDescription: e.target.value })}
                      placeholder="Descripción para SEO (opcional)"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pageType">Tipo de Página</Label>
                    <Select
                      value={editingPage.pageType || 'static'}
                      onValueChange={(value) => setEditingPage({ ...editingPage, pageType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Página Estática</SelectItem>
                        <SelectItem value="contact">Contacto</SelectItem>
                        <SelectItem value="value-vehicle">Tasación de Vehículos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Contenido (HTML)</Label>
                    <Textarea
                      id="content"
                      value={editingPage.content || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                      placeholder="Contenido HTML de la página"
                      rows={8}
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
        </div>)}

        {/* Gestión de Bloques de Portada */}
        {activeTab === 'homepage' && (<div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Gestión de Bloques de Portada</h2>
            <Button onClick={() => navigate('/admin/homepage-blocks')}>
              <Edit className="w-4 h-4 mr-2" />
              Editor Avanzado
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bloques Actuales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {homepageBlocksLoading ? (
                <div>Cargando bloques...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homepageBlocks?.map((block: HomepageBlock) => {
                    console.log('Bloque renderizado:', block);
                    console.log('blockType:', block.blockType);
                    console.log('Es bloque de imagen?', block.blockType === 'why_choose_us_image');
                    return (
                      <div key={block.id} className="p-4 border rounded-lg">
                        <div className="space-y-2">
                          <h3 className="font-medium">{block.title}</h3>
                          <div className="flex gap-2">
                            <Badge variant="outline">{block.blockType}</Badge>
                            <Badge variant={block.isActive ? "default" : "secondary"}>
                              {block.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          {block.description && (
                            <p className="text-sm text-muted-foreground">{block.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Orden: {block.sortOrder}</p>
                          
                          {/* Botón especial para el bloque de imagen */}
                          {block.blockType === 'why_choose_us_image' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full mt-2"
                              onClick={() => {
                                console.log('Editando bloque de imagen:', block);
                                setEditingImageBlock(block);
                              }}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar Imagen
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>)}

        {/* Gestión del Footer */}
        {activeTab === 'footer' && (<div className="space-y-6">
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
                        <div className="flex gap-2">
                          <Badge variant="outline">{block.blockType}</Badge>
                          <Badge variant={block.isActive ? "default" : "secondary"}>
                            {block.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Orden: {block.sortOrder}</p>
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
                          onClick={() => deleteBlockMutation.mutate(block.id)}
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
                    <Label htmlFor="blockTitle">Título</Label>
                    <Input
                      id="blockTitle"
                      value={editingBlock.title || ''}
                      onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                      placeholder="Título del bloque"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blockType">Tipo de Bloque</Label>
                    <Select
                      value={editingBlock.blockType || 'text'}
                      onValueChange={(value) => setEditingBlock({ ...editingBlock, blockType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="links">Enlaces</SelectItem>
                        <SelectItem value="contact">Contacto</SelectItem>
                        <SelectItem value="social">Redes Sociales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Orden</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={editingBlock.sortOrder || 0}
                      onChange={(e) => setEditingBlock({ ...editingBlock, sortOrder: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blockContent">Contenido</Label>
                    <Textarea
                      id="blockContent"
                      value={editingBlock.content || ''}
                      onChange={(e) => setEditingBlock({ ...editingBlock, content: e.target.value })}
                      placeholder="Contenido del bloque (HTML o JSON según el tipo)"
                      rows={6}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="blockActive"
                      checked={editingBlock.isActive || false}
                      onCheckedChange={(checked) => setEditingBlock({ ...editingBlock, isActive: checked })}
                    />
                    <Label htmlFor="blockActive">Bloque activo</Label>
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
        </div>)}

        {/* Configuraciones del Sitio */}
        {activeTab === 'settings' && (() => {
          console.log('✅ RENDERIZANDO SECCIÓN CONFIGURACIONES');
          console.log('🔍 CONFIGURACIONES STATE:', { 
            settings: settings ? `${settings.length} items` : 'null/undefined', 
            settingsLoading, 
            settingsError: settingsError ? settingsError.message : 'null',
            hasData: !!settings,
            firstSetting: settings?.[0]
          });
          
          return (<div className="space-y-6">
            <h2 className="text-2xl font-semibold">Configuraciones del Sitio</h2>

          {settingsError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.069 0 1.942-.932 1.638-1.958L17.577 5.006c-.351-1.186-1.55-1.958-2.881-1.958H9.304c-1.331 0-2.53.772-2.881 1.958L3.423 19.042c-.304 1.026.569 1.958 1.638 1.958z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar configuraciones</h3>
                  <p className="text-gray-600 mb-6">
                    Error: {settingsError?.message || 'Error desconocido'}
                  </p>
                  <Button onClick={() => queryClient.invalidateQueries()}>
                    Recargar datos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuraciones Generales */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuraciones Generales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settingsLoading ? (
                    <div>Cargando configuraciones...</div>
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
                        {setting.type === 'email' ? (
                          <Input
                            id={setting.key}
                            type="email"
                            defaultValue={setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                updateSettingMutation.mutate({ key: setting.key, value: e.target.value });
                              }
                            }}
                          />
                        ) : setting.type === 'json' ? (
                          <Textarea
                            id={setting.key}
                            defaultValue={setting.value}
                            rows={3}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                updateSettingMutation.mutate({ key: setting.key, value: e.target.value });
                              }
                            }}
                          />
                        ) : (
                          <Input
                            id={setting.key}
                            defaultValue={setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                updateSettingMutation.mutate({ key: setting.key, value: e.target.value });
                              }
                            }}
                          />
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

            {/* Configuraciones del Footer */}
            <Card>
              <CardHeader>
                <CardTitle>Configuraciones del Footer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {settingsLoading ? (
                  <div>Cargando configuraciones...</div>
                ) : (
                  <>
                    {settings?.filter((setting: SiteSetting) => setting.category === 'footer').map((setting: SiteSetting) => (
                      <div key={setting.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor={setting.key}>
                              {setting.key === 'copyright_text' ? 'Texto del Copyright' : 
                               setting.key === 'footer_links' ? 'Enlaces del Footer' : setting.key}
                            </Label>
                            {setting.description && (
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            )}
                          </div>
                          <Badge variant="outline">{setting.category}</Badge>
                        </div>
                        {setting.type === 'json' ? (
                          <Textarea
                            id={setting.key}
                            defaultValue={setting.value}
                            rows={4}
                            placeholder={setting.key === 'footer_links' ? 
                              '{"enlaces": [{"text": "Política de Privacidad", "url": "/politica-privacidad"}]}' : 
                              setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                updateSettingMutation.mutate({ key: setting.key, value: e.target.value });
                              }
                            }}
                          />
                        ) : (
                          <Input
                            id={setting.key}
                            defaultValue={setting.value}
                            placeholder={setting.key === 'copyright_text' ? 
                              '© 2025 MRC Desguaces. Todos los derechos reservados.' : 
                              setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                updateSettingMutation.mutate({ key: setting.key, value: e.target.value });
                              }
                            }}
                          />
                        )}
                      </div>
                    ))}
                    
                    {/* Si no existen las configuraciones del footer, mostrar ayuda */}
                    {!settings?.some((s: SiteSetting) => s.key === 'copyright_text') && (
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-medium mb-2">Configuraciones del Footer</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Las configuraciones del footer se crearán automáticamente cuando actualices los valores.
                        </p>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="new-copyright">Texto del Copyright</Label>
                            <Input
                              id="new-copyright"
                              placeholder="© 2025 MRC Desguaces. Todos los derechos reservados."
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  updateSettingMutation.mutate({ key: 'copyright_text', value: e.target.value });
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor="new-footer-links">Enlaces del Footer (JSON)</Label>
                            <Textarea
                              id="new-footer-links"
                              placeholder='{"enlaces": [{"text": "Política de Privacidad", "url": "/politica-privacidad"}, {"text": "Aviso Legal", "url": "/aviso-legal"}]}'
                              rows={3}
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  updateSettingMutation.mutate({ key: 'footer_links', value: e.target.value });
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          )}
          </div>
        );
        })()}

        {/* Nuevo Tab Sistema */}
        {activeTab === 'system' && (() => {
          console.log('🔍 SYSTEM STATE:', { 
            systemSettings: systemSettings ? `${systemSettings.length} configuraciones` : 'null/undefined', 
            systemLoading, 
            systemError: systemError ? systemError.message : 'null',
            hasData: !!systemSettings,
            firstSetting: systemSettings?.[0]
          });

          return (<div className="space-y-6">
            <h2 className="text-2xl font-semibold">Configuraciones del Sistema</h2>

          {systemError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.069 0 1.942-.932 1.638-1.958L17.577 5.006c-.351-1.186-1.55-1.958-2.881-1.958H9.304c-1.331 0-2.53.772-2.881 1.958L3.423 19.042c-.304 1.026.569 1.958 1.638 1.958z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar configuraciones</h3>
                  <p className="text-gray-600 mb-6">
                    Error: {systemError?.message || 'Error desconocido'}
                  </p>
                  <Button onClick={() => queryClient.invalidateQueries()}>
                    Recargar datos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : systemLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Cargando configuraciones del sistema...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-green-800 mb-2">✅ Sistema Funcionando Correctamente</h3>
                <p className="text-green-700">
                  Se han cargado {systemSettings?.length || 0} configuraciones del sistema. El API está funcionando correctamente.
                </p>
              </div>

              {/* Configuraciones por categoría */}
              {systemSettings && systemSettings.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Configuraciones Generales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Configuraciones Generales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {systemSettings
                        .filter((setting: SiteSetting) => setting.category === 'general')
                        .map((setting: SiteSetting) => (
                          <div key={setting.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`system-${setting.key}`} className="font-medium">
                                {setting.key}
                              </Label>
                              <Badge variant="outline">{setting.category}</Badge>
                            </div>
                            {setting.description && (
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            )}
                            <Input
                              id={`system-${setting.key}`}
                              defaultValue={setting.value}
                              placeholder={setting.description || setting.key}
                              className="border-green-200 focus:border-green-500"
                            />
                          </div>
                        ))}
                    </CardContent>
                  </Card>

                  {/* Configuraciones de Contacto */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Información de Contacto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {systemSettings
                        .filter((setting: SiteSetting) => setting.category === 'contact')
                        .map((setting: SiteSetting) => (
                          <div key={setting.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`system-${setting.key}`} className="font-medium">
                                {setting.key}
                              </Label>
                              <Badge variant="outline">{setting.category}</Badge>
                            </div>
                            {setting.description && (
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            )}
                            <Input
                              id={`system-${setting.key}`}
                              type={setting.type === 'email' ? 'email' : 'text'}
                              defaultValue={setting.value}
                              placeholder={setting.description || setting.key}
                              className="border-blue-200 focus:border-blue-500"
                            />
                          </div>
                        ))}
                    </CardContent>
                  </Card>

                  {/* Configuraciones de Formularios */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Configuraciones de Formularios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {systemSettings
                        .filter((setting: SiteSetting) => setting.category === 'forms')
                        .map((setting: SiteSetting) => (
                          <div key={setting.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`system-${setting.key}`} className="font-medium">
                                {setting.key}
                              </Label>
                              <Badge variant="outline">{setting.category}</Badge>
                            </div>
                            {setting.description && (
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            )}
                            <Input
                              id={`system-${setting.key}`}
                              type={setting.type === 'email' ? 'email' : 'text'}
                              defaultValue={setting.value}
                              placeholder={setting.description || setting.key}
                              className="border-purple-200 focus:border-purple-500"
                            />
                          </div>
                        ))}
                    </CardContent>
                  </Card>

                  {/* Configuraciones del Footer */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layout className="w-5 h-5" />
                        Footer y Enlaces
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {systemSettings
                        .filter((setting: SiteSetting) => setting.category === 'footer')
                        .map((setting: SiteSetting) => (
                          <div key={setting.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`system-${setting.key}`} className="font-medium">
                                {setting.key}
                              </Label>
                              <Badge variant="outline">{setting.category}</Badge>
                            </div>
                            {setting.description && (
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            )}
                            {setting.type === 'json' ? (
                              <Textarea
                                id={`system-${setting.key}`}
                                defaultValue={setting.value}
                                placeholder={setting.description || setting.key}
                                rows={3}
                                className="border-orange-200 focus:border-orange-500 font-mono text-sm"
                              />
                            ) : (
                              <Input
                                id={`system-${setting.key}`}
                                defaultValue={setting.value}
                                placeholder={setting.description || setting.key}
                                className="border-orange-200 focus:border-orange-500"
                              />
                            )}
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Estado del sistema */}
              <Card>
                <CardHeader>
                  <CardTitle>Estado del Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {systemSettings?.length || 0}
                      </div>
                      <div className="text-sm text-green-700">Configuraciones Cargadas</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">✓</div>
                      <div className="text-sm text-blue-700">API Funcionando</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">
                        {systemSettings ? [...new Set(systemSettings.map(s => s.category))].length : 0}
                      </div>
                      <div className="text-sm text-purple-700">Categorías Disponibles</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>);
        })()}
      </div>

      {/* Modal para editar imagen del desguace */}
      {editingImageBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ImageBlockEditor
              block={editingImageBlock}
              onClose={() => setEditingImageBlock(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}