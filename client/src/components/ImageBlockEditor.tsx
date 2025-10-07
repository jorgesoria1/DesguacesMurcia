import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, X, Image as ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface HomepageBlock {
  id: number;
  blockType: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  image: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ImageBlockEditorProps {
  block: HomepageBlock;
  onClose: () => void;
}

const ImageBlockEditor: React.FC<ImageBlockEditorProps> = ({ block, onClose }) => {
  const [title, setTitle] = useState(block.title || '');
  const [description, setDescription] = useState(block.description || '');
  const [currentImage, setCurrentImage] = useState(block.image || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateBlockMutation = useMutation({
    mutationFn: (updateData: Partial<HomepageBlock>) => 
      apiRequest(`/api/admin/cms/homepage-blocks/${block.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cms/homepage-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cms/homepage-blocks'] });
      toast({ title: "Bloque actualizado exitosamente" });
      onClose();
    },
    onError: () => {
      toast({ title: "Error al actualizar bloque", variant: "destructive" });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!selectedFile) throw new Error('No hay archivo seleccionado');

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/admin/cms/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al subir imagen');
      }

      const result = await response.json();
      return result.imageUrl;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      let imageUrl = currentImage;
      
      // Si hay una nueva imagen seleccionada, subirla primero
      if (selectedFile) {
        imageUrl = await uploadImage();
        setCurrentImage(imageUrl);
      }

      // Actualizar el bloque con los nuevos datos
      updateBlockMutation.mutate({
        title,
        description,
        image: imageUrl
      });
    } catch (error) {
      console.error('Error al guardar:', error);
      toast({ 
        title: "Error al subir imagen", 
        description: "Inténtalo de nuevo",
        variant: "destructive" 
      });
    }
  };

  const getImageUrl = () => {
    if (previewUrl) return previewUrl;
    if (currentImage && currentImage !== '/api/placeholder/600/400') {
      return currentImage.startsWith('/') ? currentImage : `/${currentImage}`;
    }
    return null;
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Editor de Imagen del Desguace
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Imagen Actual */}
        <div className="space-y-2">
          <Label>Imagen Actual</Label>
          <div className="border rounded-lg p-4 bg-gray-50">
            {getImageUrl() ? (
              <div className="space-y-2">
                <img
                  src={getImageUrl()}
                  alt={title || "Imagen del desguace"}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-gray-600 text-center">
                  {selectedFile ? `Nueva imagen: ${selectedFile.name}` : 'Imagen actual'}
                </p>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>No hay imagen configurada</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subir Nueva Imagen */}
        <div className="space-y-2">
          <Label htmlFor="image-upload">Subir Nueva Imagen</Label>
          <div className="flex items-center gap-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => document.getElementById('image-upload')?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB
          </p>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del bloque"
          />
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            value={description || ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del bloque (opcional)"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={updateBlockMutation.isPending || isUploading}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isUploading ? 'Subiendo...' : updateBlockMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageBlockEditor;