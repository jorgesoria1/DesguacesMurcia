import React, { useState, useEffect } from 'react';
import { OrderItemWithReferences } from '@/../../shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, Package, Truck, User, MapPin, CreditCard, AlertTriangle, CheckCircle, Clock, X, FileText, Download } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderDetailViewModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

// Estados de pago
const paymentStatusDetails = {
  pagado: {
    label: "Pagado",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  pendiente: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <Clock className="h-4 w-4" />,
  }
};

// Estados del pedido
const orderStatusDetails = {
  pendiente_verificar: {
    label: "Pendiente Verificar",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <CalendarClock className="h-4 w-4" />,
    description: "El pedido está pendiente de verificación"
  },
  verificado: {
    label: "Verificado",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <CheckCircle className="h-4 w-4" />,
    description: "El pedido ha sido verificado"
  },
  embalado: {
    label: "Embalado",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <Package className="h-4 w-4" />,
    description: "El pedido está embalado"
  },
  enviado: {
    label: "Enviado",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: <Truck className="h-4 w-4" />,
    description: "El pedido ha sido enviado"
  },
  incidencia: {
    label: "Incidencia",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertTriangle className="h-4 w-4" />,
    description: "Hay una incidencia con el pedido"
  }
};

// Estados legacy para compatibilidad
const statusDetails = {
  pending: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <CalendarClock className="h-4 w-4" />,
    description: "El pedido está pendiente de verificación"
  },
  processing: {
    label: "En Proceso",
    color: "bg-blue-100 text-blue-800 border-blue-200", 
    icon: <Package className="h-4 w-4" />,
    description: "El pedido está siendo procesado"
  },
  shipped: {
    label: "Enviado",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <Truck className="h-4 w-4" />,
    description: "El pedido ha sido enviado"
  },
  delivered: {
    label: "Entregado", 
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <Package className="h-4 w-4" />,
    description: "El pedido ha sido entregado"
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertTriangle className="h-4 w-4" />,
    description: "El pedido ha sido cancelado"
  }
};

export function OrderDetailViewModal({ order, isOpen, onClose }: OrderDetailViewModalProps) {
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState({
    shippingAddress: '',
    shippingCity: '',
    shippingProvince: '',
    shippingPostalCode: '',
    shippingCountry: ''
  });

  const fetchOrderDetail = async () => {
    if (!order?.id) return;
    

    setIsLoading(true);
    try {
      // Obtener datos del pedido con cache-busting
      const response = await fetch(`/api/admin/orders/${order.id}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Error al cargar detalles del pedido');
      }
      
      const data = await response.json();

      
      setOrderDetail(data);
      // Inicializar formulario de dirección con datos existentes
      setEditAddressForm({
        shippingAddress: data.shippingAddress || '',
        shippingCity: data.shippingCity || '',
        shippingProvince: data.shippingProvince || '',
        shippingPostalCode: data.shippingPostalCode || '',
        shippingCountry: data.shippingCountry || ''
      });
    } catch (error) {
      console.error('Error al cargar detalles del pedido:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transportAgency: orderDetail.transportAgency || '',
          expeditionNumber: orderDetail.expeditionNumber || '',
          adminObservations: orderDetail.adminObservations || '',
          documents: orderDetail.documents || [],
          invoicePdf: orderDetail.invoicePdf || '',
          shippingAddress: editAddressForm.shippingAddress,
          shippingCity: editAddressForm.shippingCity,
          shippingProvince: editAddressForm.shippingProvince,
          shippingPostalCode: editAddressForm.shippingPostalCode,
          shippingCountry: editAddressForm.shippingCountry
        })
      });

      if (response.ok) {
        setIsEditingAddress(false);
        fetchOrderDetail(); // Recargar datos
      } else {
        console.error('Error al actualizar dirección');
      }
    } catch (error) {
      console.error('Error al guardar dirección:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrderDetail();
    }
  }, [isOpen, order?.id]);

  // Refrescar cuando cambian los datos del pedido (por ejemplo, estado actualizado)
  useEffect(() => {
    if (isOpen && order) {
      fetchOrderDetail();
    }
  }, [order?.orderStatus, order?.paymentStatus, order?.updatedAt, order?._refetch]);

  if (!order) return null;

  // Obtener información de estados
  const paymentInfo = paymentStatusDetails[orderDetail?.paymentStatus as keyof typeof paymentStatusDetails] || 
                     paymentStatusDetails.pendiente;

  const orderStatusInfo = orderStatusDetails[orderDetail?.orderStatus as keyof typeof orderStatusDetails] || 
                         orderStatusDetails.pendiente_verificar;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Pedido #{order.orderNumber}</DialogTitle>
          <DialogDescription>
            Vista detallada del pedido con información del cliente, productos y estado actual
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : orderDetail ? (
          <div className="space-y-6">
            {/* Información general del pedido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <CalendarClock className="h-5 w-5 mr-2 text-gray-500" />
                    <h3 className="font-semibold">Fecha del Pedido</h3>
                  </div>
                  <p>{format(new Date(orderDetail.createdAt), "PPP", { locale: es })}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(orderDetail.createdAt), "p", { locale: es })}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Package className="h-5 w-5 mr-2 text-gray-500" />
                    <h3 className="font-semibold">Total del Pedido</h3>
                  </div>
                  <p className="text-2xl font-bold">{formatPrice(orderDetail.total, false)}</p>
                  <p className="text-sm text-gray-500">IVA incluido</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <CreditCard className="h-5 w-5 mr-2 text-gray-500" />
                    <h3 className="font-semibold">Estados del Pedido</h3>
                  </div>
                  
                  {/* Estado de Pago */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Estado del Pago:</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${paymentInfo.color}`}>
                      {paymentInfo.icon}
                      <span className="ml-2 font-medium">{paymentInfo.label}</span>
                    </div>
                  </div>
                  
                  {/* Estado del Pedido */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Estado del Pedido:</p>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${orderStatusInfo.color}`}>
                      {orderStatusInfo.icon}
                      <span className="ml-2 font-medium">{orderStatusInfo.label}</span>
                    </div>
                    {orderStatusInfo.description && (
                      <p className="text-sm text-gray-500 mt-2">{orderStatusInfo.description}</p>
                    )}
                  </div>


                </CardContent>
              </Card>
            </div>

            {/* Información del cliente y envío */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Nombre:</strong> {orderDetail?.customerName || "Sin especificar"}</p>
                    <p><strong>Email:</strong> {orderDetail?.customerEmail || "Sin especificar"}</p>
                    <p><strong>Teléfono:</strong> {orderDetail?.customerPhone || "Sin especificar"}</p>
                    <p><strong>NIF/CIF:</strong> {orderDetail?.customerNifCif || "Sin especificar"}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {orderDetail?.shippingMethodId === null || orderDetail?.paymentMethod?.provider === 'cash' ? 
                        'Recogida en Instalaciones' : 
                        'Dirección de Envío'
                      }
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                    >
                      {isEditingAddress ? 'Cancelar' : 'Editar'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditingAddress ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="editAddress">Dirección</Label>
                        <Input
                          id="editAddress"
                          value={editAddressForm.shippingAddress || ''}
                          onChange={(e) => setEditAddressForm(prev => ({...prev, shippingAddress: e.target.value}))}
                          placeholder="Dirección"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editCity">Ciudad</Label>
                          <Input
                            id="editCity"
                            value={editAddressForm.shippingCity || ''}
                            onChange={(e) => setEditAddressForm(prev => ({...prev, shippingCity: e.target.value}))}
                            placeholder="Ciudad"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editProvince">Provincia</Label>
                          <Input
                            id="editProvince"
                            value={editAddressForm.shippingProvince || ''}
                            onChange={(e) => setEditAddressForm(prev => ({...prev, shippingProvince: e.target.value}))}
                            placeholder="Provincia"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editPostalCode">Código Postal</Label>
                          <Input
                            id="editPostalCode"
                            value={editAddressForm.shippingPostalCode || ''}
                            onChange={(e) => setEditAddressForm(prev => ({...prev, shippingPostalCode: e.target.value}))}
                            placeholder="Código Postal"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editCountry">País</Label>
                          <Input
                            id="editCountry"
                            value={editAddressForm.shippingCountry || ''}
                            onChange={(e) => setEditAddressForm(prev => ({...prev, shippingCountry: e.target.value}))}
                            placeholder="País"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveAddress}>Guardar</Button>
                        <Button variant="outline" onClick={() => setIsEditingAddress(false)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Verificar si es recogida en instalaciones */}
                      {orderDetail.shippingMethodId === null || orderDetail.paymentMethod?.provider === 'cash' ? (
                        // Mostrar dirección de recogida en instalaciones
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center mb-2">
                            <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                            <strong className="text-blue-800">🏪 Recogida en nuestras instalaciones</strong>
                          </div>
                          <p className="text-blue-700">Desguace Murcia</p>
                          <p className="text-blue-700">Carretera Almuñecar, Km 1.5</p>
                          <p className="text-blue-700">18640 Granada, España</p>
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-sm text-blue-600"><strong>Tel:</strong> 958 790 858</p>
                            <p className="text-sm text-blue-600"><strong>Email:</strong> info@desguacemurcia.com</p>
                          </div>
                          <p className="text-sm text-green-700 font-medium mt-2">
                            <strong>Costo de envío:</strong> GRATIS (Sin gastos de envío)
                          </p>
                        </div>
                      ) : (
                        // Mostrar dirección de envío a domicilio
                        <div>
                          <p>{orderDetail.shippingAddress}</p>
                          <p>{orderDetail.shippingCity}{orderDetail.shippingProvince ? `, ${orderDetail.shippingProvince}` : ' (Sin provincia)'} {orderDetail.shippingPostalCode}</p>
                          <p>{orderDetail.shippingCountry}</p>
                          {orderDetail.shippingCost && (
                            <p><strong>Costo de envío:</strong> {formatPrice(orderDetail.shippingCost, false)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Información de transporte (si existe) */}
            {(orderDetail.transportAgency || orderDetail.expeditionNumber || orderDetail.adminObservations) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Información de Transporte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orderDetail.transportAgency && (
                    <div>
                      <span className="font-medium text-gray-700">Agencia de transporte:</span>
                      <p className="text-gray-900">{orderDetail.transportAgency}</p>
                    </div>
                  )}
                  {orderDetail.expeditionNumber && (
                    <div>
                      <span className="font-medium text-gray-700">Número de expedición:</span>
                      <p className="text-gray-900 font-mono">{orderDetail.expeditionNumber}</p>
                    </div>
                  )}
                  {orderDetail.adminObservations && (
                    <div>
                      <span className="font-medium text-gray-700">Observaciones:</span>
                      <p className="text-gray-900">{orderDetail.adminObservations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documentos del pedido */}
            {(orderDetail.documents && orderDetail.documents.length > 0) || orderDetail.invoicePdf ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentos del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Documentos generales */}
                  {orderDetail.documents && orderDetail.documents.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Documentos:</h4>
                      <div className="space-y-2">
                        {orderDetail.documents.map((doc: string, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-gray-500" />
                              <span className="text-sm">{doc.split('/').pop()}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Descargar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Factura */}
                  {orderDetail.invoicePdf && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Factura:</h4>
                      <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-blue-500" />
                          <span className="text-sm font-medium">{orderDetail.invoicePdf.split('/').pop()}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(orderDetail.invoicePdf, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Artículos del pedido */}
            <Card>
              <CardHeader>
                <CardTitle>Artículos del Pedido</CardTitle>
                <div className="text-xs text-gray-500">
                  {orderDetail.items?.length || 0} artículo(s) en este pedido
                </div>
              </CardHeader>
              <CardContent>
                {orderDetail.items && orderDetail.items.length > 0 ? (
                  <div className="space-y-4">
                    {orderDetail.items.map((item: any, index: number) => (
                        <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-gray-500" />
                              <h4 className="font-semibold">{item.partName || item.descripcionArticulo}</h4>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600">
                              {item.partFamily && (
                                <p><span className="font-medium">Familia:</span> {item.partFamily}</p>
                              )}
                              
                              {/* Referencias organizadas */}
                              <div className="bg-gray-50 p-2 rounded text-xs">
                                <p className="font-medium text-gray-700 mb-1">Referencias:</p>
                                {item.refLocal && (
                                  <p><span className="font-medium">Ref Principal:</span> {item.refLocal}</p>
                                )}
                                {item.partReference && (
                                  <p><span className="font-medium">Código:</span> {item.partReference}</p>
                                )}
                                {item.refPrincipal && (
                                  <p><span className="font-medium">Ref Fabricante:</span> {item.refPrincipal}</p>
                                )}
                              </div>

                              {/* Información del vehículo mejorada */}
                              {(item.vehicleBrand || item.vehicleModel || item.vehicleMarca || item.vehicleModelo || item.vehicleYear || item.vehicleVersion) && (
                                <div className="bg-blue-50 p-2 rounded text-xs">
                                  <p className="font-medium text-blue-700 mb-1">Vehículo compatible:</p>
                                  <div className="space-y-1">
                                    {(item.vehicleBrand || item.vehicleMarca) && (
                                      <p><span className="font-medium">Marca:</span> {item.vehicleBrand || item.vehicleMarca}</p>
                                    )}
                                    {(item.vehicleModel || item.vehicleModelo) && (
                                      <p><span className="font-medium">Modelo:</span> {item.vehicleModel || item.vehicleModelo}</p>
                                    )}
                                    {(item.vehicleYear || item.vehicleAnyo) && (
                                      <p><span className="font-medium">Año:</span> {item.vehicleYear || item.vehicleAnyo}</p>
                                    )}
                                    {item.vehicleVersion && (
                                      <p><span className="font-medium">Versión:</span> {item.vehicleVersion}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                          <p className="font-semibold">
                            {formatPrice(item.price, false)} × {item.quantity}
                          </p>
                          <p className="text-sm text-gray-500">
                            Total: {formatPrice((parseFloat(item.price) || 0) * item.quantity, false)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Resumen de precios */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal productos:</span>
                          <span>{formatPrice(orderDetail.subtotal || 0, false)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Gastos de envío:</span>
                          <span>{formatPrice(orderDetail.shippingCost || 0, false)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Total del pedido:</span>
                          <span>{formatPrice(orderDetail.total || 0, false)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron artículos en este pedido.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notas del pedido */}
            {orderDetail.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notas del Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{orderDetail.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se pudieron cargar los detalles del pedido</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}