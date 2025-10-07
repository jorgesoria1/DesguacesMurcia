import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Truck, CreditCard, Building2, MapPin, User, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { getGuestSessionId } from "@/lib/sessionUtils";

interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  subtotal: string;
  shippingCost: string;
  total: string;
  status: string;
  paymentStatus: string;
  notes: string;
  createdAt: string;
  paymentMethod?: {
    id: number;
    name: string;
    provider: string;
    config: any;
  };
  shippingMethod?: {
    id: number;
    name: string;
    description: string;
    estimatedDays: number;
  };
  items?: Array<{
    id: number;
    partId: number;
    quantity: number;
    price: string;
    partName: string;
    partFamily?: string;
    partReference?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehicleVersion?: string;
  }>;
}

interface OrderConfirmationProps {
  params: {
    orderId: string;
  };
}

export default function OrderConfirmation({ params }: OrderConfirmationProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<string>('');

  useEffect(() => {
    loadOrder();
    // Get payment type from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    setPaymentType(urlParams.get('payment') || '');
  }, [params.orderId]);

  const loadOrder = async () => {
    try {
      // Get sessionId from URL parameters or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const sessionIdFromUrl = urlParams.get('sessionId');
      const sessionIdFromStorage = getGuestSessionId();
      
      // Use sessionId from URL if available, otherwise use from localStorage
      const sessionId = sessionIdFromUrl || sessionIdFromStorage;
      
      let url = `/api/orders/${params.orderId}`;
      
      // Add sessionId as query parameter for guest users
      if (sessionId) {
        url += `?sessionId=${sessionId}`;
      }
      
      const response = await apiRequest("GET", url);
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar la información del pedido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading order:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del pedido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Cargando información del pedido...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Pedido no encontrado</h2>
            <p className="text-gray-600 mb-6">No se pudo encontrar el pedido solicitado</p>
            <Button onClick={() => setLocation("/")}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const estimatedDelivery = () => {
    if (order.shippingMethod?.estimatedDays) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + order.shippingMethod.estimatedDays);
      return deliveryDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return "Por determinar";
  };

  const getPaymentMethodName = (provider: string) => {
    const methodMap = {
      'stripe': 'Tarjeta de Crédito/Débito',
      'paypal': 'PayPal',
      'bank_transfer': 'Transferencia Bancaria',
      'redsys': 'Tarjeta (Redsys)',
      'cash': 'Pago en Efectivo',
      'cash_on_delivery': 'Pago contra reembolso'
    };
    
    return methodMap[provider as keyof typeof methodMap] || provider;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-montserrat font-semibold text-green-600 mb-2">¡Pedido confirmado!</h1>
          <p className="text-gray-600">Tu pedido #{order.orderNumber} ha sido procesado correctamente</p>
          <p className="text-sm text-gray-500 mt-2">
            Realizado el {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Productos del pedido</CardTitle>
              </CardHeader>
              <CardContent>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="border-b pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.partName}</p>
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              {item.partFamily && <p>Familia: {item.partFamily}</p>}
                              {item.partReference && <p>Referencia: {item.partReference}</p>}
                              {(item.vehicleBrand || item.vehicleModel) && (
                                <p>
                                  Vehículo: 
                                  {item.vehicleBrand && ` ${item.vehicleBrand}`}
                                  {item.vehicleModel && ` ${item.vehicleModel}`}
                                  {item.vehicleYear && ` (${item.vehicleYear})`}
                                </p>
                              )}
                              {item.vehicleVersion && <p>Versión: {item.vehicleVersion}</p>}
                              <p>Cantidad: {item.quantity}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{parseFloat(item.price).toFixed(2)} € × {item.quantity}</p>
                            <p className="text-sm text-gray-600">
                              Total: {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No se encontraron productos en este pedido</p>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información del cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.customerEmail}</p>
                  <p className="text-sm text-gray-600">{order.customerPhone}</p>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Dirección de envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{order.shippingAddress}</p>
                  <p className="text-sm text-gray-600">{order.shippingCity}{(order as any).shippingProvince ? `, ${(order as any).shippingProvince}` : ''} {order.shippingPostalCode}</p>
                </div>
                {order.shippingMethod && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-600">{order.shippingMethod.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{order.shippingMethod.description}</p>
                    <p className="text-sm text-blue-600 font-medium">
                      Entrega estimada: {estimatedDelivery()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Información de pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.paymentMethod && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {order.paymentMethod.provider === 'bank_transfer' && <Building2 className="w-5 h-5 text-green-600" />}
                      {order.paymentMethod.provider === 'stripe' && <CreditCard className="w-5 h-5 text-blue-600" />}
                      {order.paymentMethod.provider === 'paypal' && <CreditCard className="w-5 h-5 text-yellow-600" />}
                      <div>
                        <p className="font-medium">{getPaymentMethodName(order.paymentMethod.provider)}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {order.paymentStatus === 'pending' ? 'Pendiente' : 
                           order.paymentStatus === 'paid' ? 'Pagado' : 
                           order.paymentStatus === 'failed' ? 'Fallido' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>

                    {/* Bank Transfer Details */}
                    {order.paymentMethod.provider === 'bank_transfer' && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3">
                          Datos para transferencia bancaria
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Banco:</span> {order.paymentMethod.config.bank_name}
                          </div>
                          <div>
                            <span className="font-medium">Número de cuenta:</span> {order.paymentMethod.config.account_number}
                          </div>
                          <div>
                            <span className="font-medium">Concepto:</span> Pedido #{order.orderNumber}
                          </div>
                          <div>
                            <span className="font-medium">Importe:</span> {parseFloat(order.total).toFixed(2)} €
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                          <p className="text-sm text-blue-700">
                            <strong>Importante:</strong> Una vez realizada la transferencia, tu pedido será procesado. 
                            Guarda el justificante de la transferencia como comprobante.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stripe Payment Details */}
                    {order.paymentMethod.provider === 'stripe' && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-3">
                          Pago con tarjeta
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-green-700">
                            Tu pedido ha sido creado correctamente. El pago se procesará de forma segura.
                          </p>
                          <div className="mt-3 p-3 bg-green-100 rounded border border-green-300">
                            <p className="text-sm text-green-700">
                              <strong>Nota:</strong> Recibirás un email de confirmación una vez procesado el pago.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PayPal Payment Details */}
                    {order.paymentMethod.provider === 'paypal' && (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-3">
                          Pago con PayPal
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-yellow-700">
                            Tu pedido ha sido creado correctamente. El pago se procesará a través de PayPal.
                          </p>
                          <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                            <p className="text-sm text-yellow-700">
                              <strong>Nota:</strong> Recibirás un email de confirmación una vez procesado el pago.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notas del pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-gray-900 font-semibold">{parseFloat(order.subtotal).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="text-gray-900 font-semibold">{parseFloat(order.shippingCost).toFixed(2)} €</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-gray-900 font-semibold">{parseFloat(order.total).toFixed(2)} €</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Pedido confirmado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">En proceso</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-500">Enviado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-500">Entregado</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation("/")} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al catálogo
              </Button>
              
              <Button 
                onClick={() => window.print()} 
                variant="outline" 
                className="w-full"
              >
                Imprimir pedido
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}