import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Calendar, Clock, Target, Settings, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

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
}

interface PopupFormProps {
  popup?: Popup | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PopupForm: React.FC<PopupFormProps> = ({ popup, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: '',
    type: 'info' as const,
    position: 'center' as const,
    trigger: 'immediate' as const,
    triggerValue: 0,
    displayFrequency: 'always' as const,
    startDate: '',
    endDate: '',
    isActive: true,
    priority: 1,
    targetPages: [] as string[],
    excludePages: [] as string[],
    buttonText: 'Cerrar',
    buttonAction: 'close' as const,
    buttonUrl: '',
    showCloseButton: true,
    backdropClose: true,
  });

  const [targetPagesText, setTargetPagesText] = useState('');
  const [excludePagesText, setExcludePagesText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Función para manejar la subida de imagen
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen",
          variant: "destructive",
        });
        return;
      }
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error", 
          description: "La imagen debe ser menor a 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setImageFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cargar datos del popup si está editando
  useEffect(() => {
    if (popup) {
      setFormData({
        title: popup.title,
        content: popup.content,
        image: popup.image || '',
        type: popup.type,
        position: popup.position,
        trigger: popup.trigger,
        triggerValue: popup.triggerValue,
        displayFrequency: popup.displayFrequency,
        startDate: popup.startDate ? popup.startDate.split('T')[0] : '',
        endDate: popup.endDate ? popup.endDate.split('T')[0] : '',
        isActive: popup.isActive,
        priority: popup.priority,
        targetPages: popup.targetPages || [],
        excludePages: popup.excludePages || [],
        buttonText: popup.buttonText,
        buttonAction: popup.buttonAction,
        buttonUrl: popup.buttonUrl || '',
        showCloseButton: popup.showCloseButton,
        backdropClose: popup.backdropClose,
      });
      setTargetPagesText((popup.targetPages || []).join('\n'));
      setExcludePagesText((popup.excludePages || []).join('\n'));
      setImagePreview(popup.image || '');
    }
  }, [popup]);



  // Subir imagen al servidor
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Error al subir la imagen');
    }
    
    const data = await response.json();
    return data.url;
  };

  // Crear o actualizar popup
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = popup ? `/api/popups/${popup.id}` : '/api/popups';
      const method = popup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el pop-up');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: `Pop-up ${popup ? 'actualizado' : 'creado'} correctamente`,
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "El título es obligatorio",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "El contenido es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      let imageUrl = formData.image;
      
      // Subir imagen si hay una nueva
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Procesar arrays de páginas
      const targetPages = targetPagesText.trim() 
        ? targetPagesText.split('\n').map(p => p.trim()).filter(p => p.length > 0)
        : [];
      
      const excludePages = excludePagesText.trim()
        ? excludePagesText.split('\n').map(p => p.trim()).filter(p => p.length > 0)
        : [];

      const submitData = {
        ...formData,
        image: imageUrl,
        targetPages: targetPages.length > 0 ? targetPages : null,
        excludePages: excludePages.length > 0 ? excludePages : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      saveMutation.mutate(submitData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al subir la imagen",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {popup ? 'Editar Pop-up' : 'Nuevo Pop-up'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="behavior">Comportamiento</TabsTrigger>
              <TabsTrigger value="targeting">Segmentación</TabsTrigger>
              <TabsTrigger value="advanced">Avanzado</TabsTrigger>
            </TabsList>

            {/* Pestaña Básico */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Información Básica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Título del pop-up"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Contenido * (HTML permitido)</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Contenido del pop-up. Puedes usar HTML básico como <b>, <i>, <a>, etc."
                      rows={6}
                      required
                    />
                  </div>

                  {/* Campo de imagen */}
                  <div>
                    <Label htmlFor="image">Imagen (opcional)</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="image"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image')?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Subir imagen
                        </Button>
                        {imagePreview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setImagePreview('');
                              setImageFile(null);
                              setFormData(prev => ({ ...prev, image: '' }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {imagePreview && (
                        <div className="border rounded-lg p-2">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-full max-h-32 object-contain rounded"
                          />
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-500">
                        Formatos soportados: JPEG, PNG, GIF. Tamaño máximo: 5MB
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Información</SelectItem>
                          <SelectItem value="warning">Advertencia</SelectItem>
                          <SelectItem value="promotion">Promoción</SelectItem>
                          <SelectItem value="announcement">Anuncio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="position">Posición</Label>
                      <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="top">Arriba</SelectItem>
                          <SelectItem value="bottom">Abajo</SelectItem>
                          <SelectItem value="corner">Esquina</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="priority">Prioridad (1-10)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña Comportamiento */}
            <TabsContent value="behavior" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Comportamiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trigger">Activador</Label>
                      <Select value={formData.trigger} onValueChange={(value) => handleInputChange('trigger', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Inmediato</SelectItem>
                          <SelectItem value="delay">Retraso</SelectItem>
                          <SelectItem value="scroll">Al hacer scroll</SelectItem>
                          <SelectItem value="exit">Al intentar salir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.trigger === 'delay' || formData.trigger === 'scroll') && (
                      <div>
                        <Label htmlFor="triggerValue">
                          {formData.trigger === 'delay' ? 'Segundos de retraso' : 'Porcentaje de scroll'}
                        </Label>
                        <Input
                          id="triggerValue"
                          type="number"
                          min="0"
                          max={formData.trigger === 'scroll' ? "100" : undefined}
                          value={formData.triggerValue}
                          onChange={(e) => handleInputChange('triggerValue', parseInt(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="displayFrequency">Frecuencia de visualización</Label>
                    <Select value={formData.displayFrequency} onValueChange={(value) => handleInputChange('displayFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="always">Siempre</SelectItem>
                        <SelectItem value="once_per_session">Una vez por sesión</SelectItem>
                        <SelectItem value="once_per_user">Una vez por usuario</SelectItem>
                        <SelectItem value="daily">Una vez al día</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="buttonText">Texto del botón</Label>
                      <Input
                        id="buttonText"
                        value={formData.buttonText}
                        onChange={(e) => handleInputChange('buttonText', e.target.value)}
                        placeholder="Texto del botón"
                      />
                    </div>

                    <div>
                      <Label htmlFor="buttonAction">Acción del botón</Label>
                      <Select value={formData.buttonAction} onValueChange={(value) => handleInputChange('buttonAction', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="close">Cerrar</SelectItem>
                          <SelectItem value="redirect">Redireccionar</SelectItem>
                          <SelectItem value="external">Enlace externo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.buttonAction === 'redirect' || formData.buttonAction === 'external') && (
                      <div>
                        <Label htmlFor="buttonUrl">URL del botón</Label>
                        <Input
                          id="buttonUrl"
                          type="url"
                          value={formData.buttonUrl}
                          onChange={(e) => handleInputChange('buttonUrl', e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="showCloseButton"
                        checked={formData.showCloseButton}
                        onCheckedChange={(checked) => handleInputChange('showCloseButton', checked)}
                      />
                      <Label htmlFor="showCloseButton">Mostrar botón cerrar</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="backdropClose"
                        checked={formData.backdropClose}
                        onCheckedChange={(checked) => handleInputChange('backdropClose', checked)}
                      />
                      <Label htmlFor="backdropClose">Cerrar al hacer clic fuera</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña Segmentación */}
            <TabsContent value="targeting" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Segmentación de Páginas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="targetPages">Páginas objetivo (una por línea)</Label>
                    <Textarea
                      id="targetPages"
                      value={targetPagesText}
                      onChange={(e) => setTargetPagesText(e.target.value)}
                      placeholder={`/\n/piezas\n/vehiculos\n/contacto`}
                      rows={4}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Si está vacío, se mostrará en todas las páginas. Ejemplos: /, /piezas, /vehiculos
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="excludePages">Páginas excluidas (una por línea)</Label>
                    <Textarea
                      id="excludePages"
                      value={excludePagesText}
                      onChange={(e) => setExcludePagesText(e.target.value)}
                      placeholder={`/admin\n/login\n/checkout`}
                      rows={4}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Páginas donde NO se mostrará el pop-up. Ejemplos: /admin, /login
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pestaña Avanzado */}
            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Configuración Avanzada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Fecha de inicio</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="endDate">Fecha de fin</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive">Pop-up activo</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : popup ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PopupForm;