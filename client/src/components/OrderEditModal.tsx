import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, Download } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface OrderEditModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

interface OrderUpdateData {
  transportAgency: string;
  expeditionNumber: string;
  adminObservations: string;
  documents: string[];
  invoicePdf: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
}

export function OrderEditModal({ order, isOpen, onClose }: OrderEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  // Estado del formulario
  const [formData, setFormData] = useState<OrderUpdateData>({
    transportAgency: order?.transportAgency || '',
    expeditionNumber: order?.expeditionNumber || '',
    adminObservations: order?.adminObservations || '',
    documents: order?.documents || [],
    invoicePdf: order?.invoicePdf || '',
    shippingAddress: order?.shippingAddress || '',
    shippingCity: order?.shippingCity || '',
    shippingProvince: order?.shippingProvince || '',
    shippingPostalCode: order?.shippingPostalCode || '',
    shippingCountry: order?.shippingCountry || 'España',
  });

  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Mutación para actualizar el pedido
  const updateOrderMutation = useMutation({
    mutationFn: (data: OrderUpdateData) => {
      console.log('🚀 Frontend: Enviando actualización de pedido:', {
        orderId: order.id,
        url: `/api/admin/orders/${order.id}/update-admin-info`,
        data: data
      });
      
      return apiRequest('PATCH', `/api/admin/orders/${order.id}/update-admin-info`, data);
    },
    onSuccess: (response) => {
      console.log('✅ Frontend: Actualización exitosa:', response);
      toast({
        title: "Pedido actualizado",
        description: "La información adicional se ha guardado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Frontend: Error al actualizar pedido:', error);
      console.error('❌ Frontend: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "No se pudo actualizar el pedido.",
        variant: "destructive",
      });
    },
  });

  // Función para subir archivos
  const uploadFile = async (file: File, type: 'document' | 'invoice') => {
    console.log('📤 Iniciando upload de archivo:', { 
      fileName: file.name, 
      fileSize: file.size, 
      orderId: order.id, 
      type 
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', order.id.toString());
    formData.append('type', type);

    try {
      const response = await fetch('/api/upload/order-document', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin', // Incluir credenciales de sesión
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Upload error:', { status: response.status, error: errorData });
        throw new Error(errorData.error || `Error HTTP ${response.status}: No se pudo subir el archivo`);
      }

      const result = await response.json();
      console.log('✅ Upload exitoso:', result);
      return result.filePath;
    } catch (error: any) {
      console.error('❌ Error en uploadFile:', error);
      throw new Error(error.message || 'Error al subir archivo');
    }
  };

  // Manejar subida de documentos
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadFile(file, 'document'));
      const filePaths = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...filePaths]
      }));

      toast({
        title: "Documentos subidos",
        description: `Se han subido ${files.length} documento(s) correctamente.`,
      });
    } catch (error: any) {
      console.error('❌ Error en handleDocumentUpload:', error);
      toast({
        title: "Error",
        description: error.message || "Error al subir los documentos.",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Manejar subida de factura
  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos PDF e imágenes (JPG, PNG) para la factura.",
        variant: "destructive",
      });
      return;
    }

    setUploadingFiles(true);
    try {
      const filePath = await uploadFile(file, 'invoice');
      setFormData(prev => ({
        ...prev,
        invoicePdf: filePath
      }));

      toast({
        title: "Factura subida",
        description: "La factura se ha subido correctamente.",
      });
    } catch (error: any) {
      console.error('❌ Error en handleInvoiceUpload:', error);
      toast({
        title: "Error",
        description: error.message || "Error al subir la factura.",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(false);
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
    }
  };

  // Eliminar documento
  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  // Eliminar factura
  const removeInvoice = () => {
    setFormData(prev => ({
      ...prev,
      invoicePdf: ''
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrderMutation.mutate(formData);
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Información Adicional - Pedido {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Actualiza la información de transporte y documentos del pedido
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Cliente */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Información del Pedido</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Cliente:</span> {order.customerName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {order.customerEmail}
              </div>
              <div>
                <span className="font-medium">NIF/CIF:</span> {order.customerNifCif || 'No especificado'}
              </div>
              <div>
                <span className="font-medium">Total:</span> {order.total}€
              </div>
              <div>
                <span className="font-medium">Estado:</span> {order.orderStatus}
              </div>
            </div>
          </div>

          {/* Dirección de Envío */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Dirección de Envío</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="shippingAddress">Dirección</Label>
                <Input
                  id="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                  placeholder="Calle, número, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="shippingCity">Ciudad</Label>
                <Input
                  id="shippingCity"
                  value={formData.shippingCity}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingCity: e.target.value }))}
                  placeholder="Ciudad"
                />
              </div>
              
              <div>
                <Label htmlFor="shippingProvince">Provincia</Label>
                <Input
                  id="shippingProvince"
                  value={formData.shippingProvince}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingProvince: e.target.value }))}
                  placeholder="Provincia"
                />
              </div>
              
              <div>
                <Label htmlFor="shippingPostalCode">Código Postal</Label>
                <Input
                  id="shippingPostalCode"
                  value={formData.shippingPostalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingPostalCode: e.target.value }))}
                  placeholder="12345"
                />
              </div>
              
              <div>
                <Label htmlFor="shippingCountry">País</Label>
                <Input
                  id="shippingCountry"
                  value={formData.shippingCountry}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingCountry: e.target.value }))}
                  placeholder="España"
                />
              </div>
            </div>
          </div>

          {/* Campos del formulario */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="transportAgency">Agencia de Transporte</Label>
              <Input
                id="transportAgency"
                value={formData.transportAgency}
                onChange={(e) => setFormData(prev => ({ ...prev, transportAgency: e.target.value }))}
                placeholder="Nombre de la agencia de transporte"
              />
            </div>

            <div>
              <Label htmlFor="expeditionNumber">Número de Expedición</Label>
              <Input
                id="expeditionNumber"
                value={formData.expeditionNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, expeditionNumber: e.target.value }))}
                placeholder="Número de seguimiento o expedición"
              />
            </div>

            <div>
              <Label htmlFor="adminObservations">Observaciones</Label>
              <Textarea
                id="adminObservations"
                value={formData.adminObservations}
                onChange={(e) => setFormData(prev => ({ ...prev, adminObservations: e.target.value }))}
                placeholder="Observaciones adicionales para el cliente..."
                rows={4}
              />
            </div>

            {/* Documentos */}
            <div>
              <Label>Documentos</Label>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  className="mb-3"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFiles ? 'Subiendo...' : 'Subir Documentos'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                
                {/* Lista de documentos */}
                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          <span className="text-sm">{doc.split('/').pop()}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Factura PDF */}
            <div>
              <Label>Factura (PDF o Imagen)</Label>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => invoiceInputRef.current?.click()}
                  disabled={uploadingFiles}
                  className="mb-3"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFiles ? 'Subiendo...' : 'Subir Factura (PDF/Imagen)'}
                </Button>
                <input
                  ref={invoiceInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleInvoiceUpload}
                  className="hidden"
                />
                
                {/* Factura actual */}
                {formData.invoicePdf && (
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="text-sm">{formData.invoicePdf.split('/').pop()}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeInvoice}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateOrderMutation.isPending || uploadingFiles}
            >
              {updateOrderMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}