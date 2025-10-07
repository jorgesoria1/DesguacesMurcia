import React, { useState, useRef } from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiImageUploadProps {
  value: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

export function MultiImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  className,
  disabled = false,
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed maxImages
    if (previews.length + files.length > maxImages) {
      alert(`Solo se pueden subir un máximo de ${maxImages} imágenes`);
      return;
    }

    setIsUploading(true);

    try {
      const newImages: string[] = [];
      const newPreviews: string[] = [];

      for (const file of files) {
        // Validate file type
        if (!acceptedTypes.includes(file.type)) {
          alert(`Tipo de archivo no válido: ${file.type}. Solo se permiten: ${acceptedTypes.join(', ')}`);
          continue;
        }

        // Validate file size
        if (file.size > maxSizeBytes) {
          alert(`El archivo ${file.name} es demasiado grande. Máximo: ${maxSizeBytes / (1024 * 1024)}MB`);
          continue;
        }

        // Create preview
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);

        // Upload file
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          newImages.push(result.imageUrl);
        } else {
          console.error('Error uploading image:', file.name);
          URL.revokeObjectURL(previewUrl);
        }
      }

      const updatedImages = [...value, ...newImages];
      const updatedPreviews = [...previews, ...newPreviews];

      onChange(updatedImages);
      setPreviews(updatedPreviews);

    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = value.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke preview URL if it's a blob URL
    const previewUrl = previews[index];
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    onChange(updatedImages);
    setPreviews(updatedPreviews);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload area */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Subir imágenes del vehículo ({previews.length}/{maxImages})
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled || isUploading || previews.length >= maxImages}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              disabled={disabled || isUploading || previews.length >= maxImages}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Subiendo..." : "Seleccionar imágenes"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Máximo {maxImages} imágenes, {maxSizeBytes / (1024 * 1024)}MB por imagen
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Image previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <Card>
                <CardContent className="p-2">
                  <div className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Imagen ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                      disabled={disabled || isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}