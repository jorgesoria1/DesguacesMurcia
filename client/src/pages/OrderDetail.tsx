import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowLeft, Truck, Package, CheckCircle, CalendarClock, Clock, FileText, Download } from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { formatPrice } from "@/lib/utils";

// Tipo del pedido con items incluidos
interface OrderWithItems {
  id: number;
  orderNumber?: string;
  paymentStatus?: string;
  orderStatus?: string;
  status?: string;
  createdAt: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNifCif?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  transportAgency?: string;
  expeditionNumber?: string;
  adminObservations?: string;
  shippingCost?: number;
  documents?: string[];
  invoicePdf?: string;
  items?: any[];
  notes?: string;
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
    description: "Tu pedido está pendiente de verificación"
  },
  verificado: {
    label: "Verificado",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <CheckCircle className="h-4 w-4" />,
    description: "Tu pedido ha sido verificado"
  },
  embalado: {
    label: "Embalado",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <Package className="h-4 w-4" />,
    description: "Tu pedido está embalado"
  },
  enviado: {
    label: "Enviado",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: <Truck className="h-4 w-4" />,
    description: "Tu pedido ha sido enviado"
  },
  incidencia: {
    label: "Incidencia",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertTriangle className="h-4 w-4" />,
    description: "Hay una incidencia con tu pedido"
  }
};

// Estados legacy para compatibilidad
const statusDetails = {
  pending: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <CalendarClock className="h-4 w-4" />,
    description: "Tu pedido está pendiente de verificación"
  },
  processing: {
    label: "En Proceso",
    color: "bg-blue-100 text-blue-800 border-blue-200", 
    icon: <Package className="h-4 w-4" />,
    description: "Tu pedido está siendo procesado"
  },
  shipped: {
    label: "Enviado",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <Truck className="h-4 w-4" />,
    description: "Tu pedido ha sido enviado"
  },
  delivered: {
    label: "Entregado", 
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <Package className="h-4 w-4" />,
    description: "Tu pedido ha sido entregado"
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertTriangle className="h-4 w-4" />,
    description: "Tu pedido ha sido cancelado"
  }
};

const OrderDetail: React.FC = () => {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const orderId = parseInt(params.id);

  const { data: order, isLoading, error } = useQuery<OrderWithItems>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!user?.id && !isNaN(orderId),
  });

  if (isLoadingAuth) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-10">
          <h1 className="text-3xl font-montserrat font-semibold mb-4">Acceso no autorizado</h1>
          <p className="text-gray-600 mb-6">
            Debes iniciar sesión para ver los detalles de tu pedido.
          </p>
          <Button onClick={() => setLocation("/login")}>
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/pedidos")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <h1 className="text-3xl font-montserrat font-semibold text-primary">Detalles del Pedido</h1>
        </div>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/pedidos")} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <h1 className="text-3xl font-montserrat font-semibold text-primary">Detalles del Pedido</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error al cargar el pedido</h2>
            <p className="text-gray-600 mb-6">
              No se pudieron cargar los detalles del pedido. Por favor, intenta de nuevo más tarde.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Obtener información de estados
  const paymentInfo = paymentStatusDetails[order.paymentStatus as keyof typeof paymentStatusDetails] || 
                     paymentStatusDetails.pendiente;

  const orderStatusInfo = orderStatusDetails[order.orderStatus as keyof typeof orderStatusDetails] || 
                         statusDetails[order.status as keyof typeof statusDetails] ||
                         orderStatusDetails.pendiente_verificar;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/pedidos")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <h1 className="text-3xl font-montserrat font-semibold text-primary">Pedido #{order.id}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center mb-4">
              <CalendarClock className="h-5 w-5 mr-2 text-gray-500" />
              <h3 className="font-semibold">Fecha del Pedido</h3>
            </div>
            <p>{format(new Date(order.createdAt), "PPP", { locale: es })}</p>
            <p className="text-sm text-gray-500">
              {format(new Date(order.createdAt), "p", { locale: es })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center mb-4">
              <Package className="h-5 w-5 mr-2 text-gray-500" />
              <h3 className="font-semibold">Total del Pedido</h3>
            </div>
            <p className="text-2xl font-semibold">{formatPrice(order.total, false)}</p>
            <p className="text-sm text-gray-500">IVA incluido</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center mb-4">
              <Truck className="h-5 w-5 mr-2 text-gray-500" />
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
            <div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{order.customerName}</p>
            <p>{order.customerEmail}</p>
            <p>{order.customerPhone}</p>
            {order.customerNifCif && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">DNI/CIF:</span> {order.customerNifCif}
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Dirección de Envío</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{order.shippingAddress}</p>
            <p>{order.shippingCity}{(order as any).shippingProvince ? `, ${(order as any).shippingProvince}` : ''} {order.shippingPostalCode}</p>
            <p>{order.shippingCountry}</p>
          </CardContent>
        </Card>
      </div>

      {/* Información de transporte/envío */}
      {(order.transportAgency || order.expeditionNumber || order.adminObservations) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Información de Transporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.transportAgency && (
              <div>
                <span className="font-medium text-gray-700">Agencia de transporte:</span>
                <p className="text-gray-900">{order.transportAgency}</p>
              </div>
            )}
            {order.expeditionNumber && (
              <div>
                <span className="font-medium text-gray-700">Número de expedición:</span>
                <p className="text-gray-900 font-mono">{order.expeditionNumber}</p>
              </div>
            )}
            {order.adminObservations && (
              <div>
                <span className="font-medium text-gray-700">Observaciones:</span>
                <p className="text-gray-900">{order.adminObservations}</p>
              </div>
            )}
            {order.shippingCost && (
              <div>
                <span className="font-medium text-gray-700">Costo de envío:</span>
                <p className="text-gray-900">{formatPrice(order.shippingCost, false)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documentos del pedido */}
      {(order.documents && order.documents.length > 0) || order.invoicePdf ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Documentos generales */}
            {order.documents && order.documents.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Documentos:</h4>
                <div className="space-y-2">
                  {order.documents.map((doc: string, index: number) => (
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
            {order.invoicePdf && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Factura:</h4>
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="text-sm font-medium">{order.invoicePdf.split('/').pop()}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(order.invoicePdf, '_blank')}
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Artículos del Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-4">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <h4 className="font-semibold">{item.partName}</h4>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {item.partFamily && (
                        <p><span className="font-medium">Familia:</span> {item.partFamily}</p>
                      )}
                      {item.partReference && (
                        <p><span className="font-medium">Referencia:</span> {item.partReference}</p>
                      )}
                      {(item.vehicleBrand || item.vehicleModel) && (
                        <p>
                          <span className="font-medium">Vehículo:</span> 
                          {item.vehicleBrand && ` ${item.vehicleBrand}`}
                          {item.vehicleModel && ` ${item.vehicleModel}`}
                          {item.vehicleYear && ` (${item.vehicleYear})`}
                        </p>
                      )}
                      {item.vehicleVersion && (
                        <p><span className="font-medium">Versión:</span> {item.vehicleVersion}</p>
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
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total del Pedido:</span>
                <span className="text-lg font-semibold">{formatPrice(order.total, false)}</span>
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

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderDetail;