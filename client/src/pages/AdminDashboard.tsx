import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Package, Clock, CheckCircle2, AlertCircle, ShoppingCart, Users, RefreshCw, CalendarClock, CreditCard, CheckCircle, Truck, User, X, ShoppingBag, LogOut, Eye, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import Sidebar from "@/components/dashboard/Sidebar";
import ApiStatsCard from "@/components/dashboard/ApiStatsCard";
import SyncStatus from "@/components/dashboard/SyncStatus";
import { configApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/utils";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { isAdmin } from "@/utils/roleUtils";

// Interfaces para estadísticas de pedidos
interface OrderStats {
  general: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    recentOrders: number;
  };
  paymentStatus: {
    paid: number;
    pending: number;
  };
  customerTypes: {
    registered: number;
    guest: number;
  };
  orderStatus: {
    pendingVerification: number;
    verified: number;
    packed: number;
    shipped: number;
    incidents: number;
  };
  topPaymentMethods: {
    method: string;
    count: number;
    revenue: number;
  }[];
}

// Estados de pago para el dashboard
const paymentStatusDetails = {
  pagado: {
    label: "Pagado",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  pendiente: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: <Clock className="h-4 w-4" />,
  }
};

// Estados del pedido para el dashboard
const orderStatusDetails = {
  pendiente_verificar: {
    label: "Pendiente Verificar",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <Clock className="h-4 w-4" />,
    description: "El pedido está pendiente de verificación"
  },
  verificado: {
    label: "Verificado",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <CheckCircle2 className="h-4 w-4" />,
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
    icon: <AlertCircle className="h-4 w-4" />,
    description: "Hay una incidencia con el pedido"
  }
};

// Componente para el modal de detalles del pedido
const OrderDetailModal = ({ order, variant = "icon" }: { order: any, variant?: "icon" | "button" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrderDetail = async (orderId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Error al cargar detalles del pedido');
      }
      const data = await response.json();
      setOrderDetail(data);
    } catch (error) {
      console.error('Error al cargar detalles del pedido:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    fetchOrderDetail(order.id);
  };

  if (!order) return null;

  // Obtener información de estados
  const paymentInfo = paymentStatusDetails[orderDetail?.paymentStatus as keyof typeof paymentStatusDetails] || 
                     paymentStatusDetails.pendiente;

  const orderStatusInfo = orderStatusDetails[orderDetail?.orderStatus as keyof typeof orderStatusDetails] || 
                         orderStatusDetails.pendiente_verificar;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenModal}
          >
            Ver último pedido
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenModal}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Pedido #{order.orderNumber}</DialogTitle>
          <DialogDescription>
            Información completa del pedido incluyendo productos, pagos y estado de envío
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

            {/* Información de envío */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Dirección de Envío</h3>
                <div className="space-y-1">
                  <p>{orderDetail.shippingAddress}</p>
                  <p>{orderDetail.shippingCity}{orderDetail.shippingProvince ? `, ${orderDetail.shippingProvince}` : ''} {orderDetail.shippingPostalCode}</p>
                  <p>{orderDetail.shippingCountry}</p>
                  {orderDetail.shippingCost && (
                    <p><strong>Costo envío:</strong> {formatPrice(orderDetail.shippingCost, false)}</p>
                  )}
                </div>
              </div>
              
              {/* Información de transporte (si existe) */}
              {(orderDetail.transportAgency || orderDetail.expeditionNumber || orderDetail.adminObservations) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Información de Transporte</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    {orderDetail.transportAgency && (
                      <p><strong>Agencia:</strong> {orderDetail.transportAgency}</p>
                    )}
                    {orderDetail.expeditionNumber && (
                      <p><strong>Nº Expedición:</strong> <span className="font-mono">{orderDetail.expeditionNumber}</span></p>
                    )}
                    {orderDetail.adminObservations && (
                      <p><strong>Observaciones:</strong> {orderDetail.adminObservations}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Artículos del pedido */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Artículos del Pedido ({orderDetail.items?.length || 0})</h3>
              {orderDetail.items && orderDetail.items.length > 0 ? (
                <div className="space-y-3">
                  {orderDetail.items.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.descripcionArticulo || item.partName}</p>
                          <p className="text-sm text-gray-600">
                            {(item.vehicleMarca || item.vehicleBrand)} {(item.vehicleModelo || item.vehicleModel)} 
                            {(item.vehicleAnyo || item.vehicleYear) && ` (${item.vehicleAnyo || item.vehicleYear})`}
                          </p>
                          {(item.refLocal || item.partReference) && (
                            <p className="text-xs text-gray-500">Ref: {item.refLocal || item.partReference}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(item.price, false)} × {item.quantity}</p>
                          <p className="text-sm text-gray-600">
                            Total: {formatPrice((parseFloat(item.price) || 0) * item.quantity, false)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total del Pedido:</span>
                      <span>{formatPrice(orderDetail.total, false)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay artículos en este pedido</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se pudieron cargar los detalles del pedido</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Componente para mostrar pedidos recientes
const RecentOrdersCard = () => {
  const [, navigate] = useLocation();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/orders?limit=10'); // Solo cargar 10 pedidos recientes
      if (!response.ok) {
        throw new Error('Error al cargar pedidos');
      }
      return response.json();
    },
    refetchInterval: 60000, // Actualizar cada 60 segundos para reducir carga
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'shipped':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'shipped':
        return 'secondary';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'processing':
        return 'Procesando';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  // Mostrar solo los últimos 5 pedidos
  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Últimos Pedidos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pedidos más recientes del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/orders")}
            >
              Ver todos
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">No hay pedidos recientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="font-medium">Pedido #{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.customerEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(order.total, false)}</p>
                    <Badge variant={getStatusBadgeVariant(order.orderStatus || order.status)}>
                      {getStatusText(order.orderStatus || order.status)}
                    </Badge>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Funciones auxiliares para roles y badges (copiado de AdminClients)
const getRoleText = (role: string) => {
  switch (role) {
    case 'customer': return 'Cliente';
    case 'manager': return 'Gestor';
    case 'admin': return 'Administrador';
    default: return role;
  }
};



// Componente para mostrar los últimos clientes
const RecentClientsCard = () => {
  const [, navigate] = useLocation();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/clients/recent'],
    queryFn: async () => {
      const response = await fetch('/api/clients/recent');
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      return response.json();
    },
    refetchInterval: 120000, // Actualizar cada 2 minutos para reducir carga
  });

  // Mostrar solo los últimos 5 clientes
  const recentClients = clients?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Últimos Clientes
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Clientes registrados recientemente
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/clients")}
          >
            Ver todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : recentClients.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">No hay clientes recientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentClients.map((client: any) => (
              <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{client.firstName} {client.lastName}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {getRoleText(client.role)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Función para traducir métodos de pago al español
const getPaymentMethodInSpanish = (method: string): string => {
  const translations: { [key: string]: string } = {
    "stripe": "Tarjeta (Stripe)",
    "paypal": "PayPal",
    "bank_transfer": "Transferencia",
    "cash_on_delivery": "Contra reembolso",
    "cash_pickup": "Efectivo en tienda",
    "redsys": "Tarjeta (Redsys)"
  };
  return translations[method] || method;
};

// Componente para mostrar estadísticas de pedidos
const OrderStatsCards = () => {
  const { data: orderStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/orders/stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/orders/stats');
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }
      return response.json();
    },
    refetchInterval: 300000, // Actualizar cada 5 minutos
  });

  if (isLoadingStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!orderStats) {
    return null;
  }

  return (
    <div className="space-y-8 mb-8">
      {/* Estadísticas principales */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Estadísticas de Pedidos (30 días)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Pedidos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderStats.general.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {orderStats.general.recentOrders} en últimos 7 días
              </p>
            </CardContent>
          </Card>

          {/* Ingresos Totales */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(orderStats.general.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Promedio: {formatPrice(orderStats.general.averageOrderValue)}
              </p>
            </CardContent>
          </Card>

          {/* Estado de Pagos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado de Pagos</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{orderStats.paymentStatus.paid}</div>
              <p className="text-xs text-muted-foreground">
                Pagados {orderStats.paymentStatus.paid} y no pagados {orderStats.paymentStatus.pending}
              </p>
            </CardContent>
          </Card>

          {/* Tipos de Cliente */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tipos de Cliente</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{orderStats.customerTypes.registered}</div>
              <p className="text-xs text-muted-foreground">
                Registrados {orderStats.customerTypes.registered} y no registrados {orderStats.customerTypes.guest}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Estados de Pedidos */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Estados de Pedidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{orderStats.orderStatus.pendingVerification}</div>
              <p className="text-sm text-orange-600">Pendiente Verificar</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{orderStats.orderStatus.verified}</div>
              <p className="text-sm text-blue-600">Verificados</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{orderStats.orderStatus.packed}</div>
              <p className="text-sm text-purple-600">Embalados</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{orderStats.orderStatus.shipped}</div>
              <p className="text-sm text-green-600">Enviados</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{orderStats.orderStatus.incidents}</div>
              <p className="text-sm text-red-600">Incidencias</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métodos de Pago Populares */}
      {orderStats?.topPaymentMethods && orderStats.topPaymentMethods.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Métodos de Pago Más Usados</h3>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {orderStats.topPaymentMethods.map((method, index) => (
                  <div key={method.method} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="font-bold text-lg">{method.count}</div>
                    <div className="text-sm text-muted-foreground">{getPaymentMethodInSpanish(method.method)}</div>
                    <div className="text-xs text-green-600">{formatPrice(method.revenue)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  // Solo cargar configuración de API para administradores
  const { 
    data: apiConfig, 
    isLoading: isLoadingConfig,
    refetch: refetchConfig
  } = useQuery({
    queryKey: ['/api/config'],
    queryFn: () => configApi.getConfig(),
    enabled: isAdmin(user), // Solo cargar para administradores
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Solo mostrar loading para administradores
  if (isLoadingConfig && isAdmin(user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-semibold">Panel Principal</h1>
            <p className="text-muted-foreground">
              Resumen de datos y estadísticas
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

        {/* Estadísticas de Pedidos - Visible para administradores y gestores */}
        <OrderStatsCards />

        {/* Estadísticas de API - Solo para administradores */}
        {isAdmin(user) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Tarjeta de estadísticas */}
            <div className="w-full">
              <ApiStatsCard />
            </div>

            {/* Estado de sincronización */}
            <div className="w-full">
              <SyncStatus refreshInterval={20000} />
            </div>
          </div>
        )}

        {/* Últimos pedidos y clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Últimos pedidos */}
          <RecentOrdersCard />

          {/* Últimos clientes */}
          <RecentClientsCard />
        </div>

        {/* Configuración de importaciones automáticas - Solo para administradores */}
        {isAdmin(user) && (
          <div className="grid grid-cols-1 gap-8 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Importaciones Automáticas</h3>
                    <p className="text-muted-foreground">Configurar horarios de sincronización</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/admin/import-optimized")}
                  >
                    <BarChart className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Desde aquí puedes acceder a la configuración completa de importaciones programadas, 
                  historial de sincronizaciones y herramientas de mantenimiento.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;