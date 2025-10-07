import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Package2, AlertTriangle, CreditCard, Truck, Search, Filter, Calendar, User, DollarSign, Edit, Eye, Trash2, ChevronRight, ChevronDown, MapPin, CalendarClock, Package, CheckCircle, Clock, Phone, TrendingUp, ShoppingCart, Euro, Users, ChevronLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { OrderEditModal } from "@/components/OrderEditModal";
import { OrderDetailViewModal } from "@/components/OrderDetailViewModal";
import { OrderItemWithReferences } from "../../../shared/schema";

// Interfaces para las estadísticas
interface OrderStats {
  general: {
    totalOrders: number;
    recentOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  orderStatus: {
    pendingVerification: number;
    verified: number;
    packed: number;
    shipped: number;
    incidents: number;
  };
  paymentStatus: {
    paid: number;
    pending: number;
  };
  customerTypes: {
    registered: number;
    guest: number;
  };
  topPaymentMethods: {
    method: string;
    count: number;
    revenue: number;
  }[];
}

// Estados del pago
type PaymentStatus = "pagado" | "pendiente";

// Función para traducir métodos de pago al español
const getPaymentMethodInSpanish = (method: string): string => {
  const translations: { [key: string]: string } = {
    'bank_transfer': 'Transferencia',
    'redsys': 'Redsys',
    'stripe': 'Tarjeta (Stripe)',
    'paypal': 'PayPal',
    'cash': 'Efectivo'
  };
  return translations[method] || method;
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
};

const paymentStatusVariants: Record<PaymentStatus, "default" | "success" | "destructive"> = {
  pagado: "success",
  pendiente: "default",
};

// Estados del pedido
type OrderStatus = "pendiente_verificar" | "verificado" | "embalado" | "enviado" | "incidencia";

const orderStatusLabels: Record<OrderStatus, string> = {
  pendiente_verificar: "Pendiente Verificar",
  verificado: "Verificado", 
  embalado: "Embalado",
  enviado: "Enviado",
  incidencia: "Incidencia",
};

const orderStatusVariants: Record<OrderStatus, "default" | "primary" | "secondary" | "success" | "destructive"> = {
  pendiente_verificar: "default",
  verificado: "primary",
  embalado: "secondary", 
  enviado: "success",
  incidencia: "destructive",
};

// Función para traducir métodos de pago a español
const translatePaymentMethod = (method: string | null | undefined): string => {
  if (!method) return "Sin especificar";
  
  const translations: { [key: string]: string } = {
    'stripe': 'Tarjeta de Crédito',
    'paypal': 'PayPal',
    'bank_transfer': 'Transferencia Bancaria',
    'transferencia_bancaria': 'Transferencia Bancaria',
    'tarjeta_credito': 'Tarjeta de Crédito',
    'redsys': 'Redsys',
    'cash_on_delivery': 'Contrareembolso',
    'cash': 'Efectivo',
    'efectivo': 'Efectivo',
    'bizum': 'Bizum'
  };
  
  return translations[method] || method;
};

const AdminOrders: React.FC = () => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 12;
  
  // Estado para los modales
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Estados para la vista expandida
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [orderDetails, setOrderDetails] = useState<{ [key: number]: any }>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());

  // Función para hacer scroll al inicio de la tabla
  const scrollToOrdersTable = () => {
    const tableElement = document.querySelector('[data-orders-table]');
    if (tableElement) {
      tableElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    } else {
      // Fallback: scroll al inicio de la página
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  };

  // Función para cambiar página con scroll
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Pequeño delay para que React actualice la página primero
    setTimeout(() => {
      scrollToOrdersTable();
    }, 100);
  };

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["/api/admin/orders"],
  });

  // Obtener estadísticas de pedidos
  const { data: orderStats, isLoading: isLoadingStats, error: statsError } = useQuery<OrderStats>({
    queryKey: ["/api/admin/orders/stats"],
    retry: 1,
    enabled: true, // Siempre intentar obtener estadísticas
  });

  // Obtener métodos de pago disponibles
  const { data: paymentMethods } = useQuery({
    queryKey: ["/api/admin/payment-methods"],
  });

  // Función para obtener métodos de pago únicos de los pedidos
  const uniquePaymentMethods = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    const methods = orders
      .map((order: any) => order.paymentMethod)
      .filter((method, index, self) => method && self.indexOf(method) === index)
      .sort();
    return methods;
  }, [orders]);



  // Función para filtrar pedidos
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    return orders.filter((order: any) => {
      // Filtro por término de búsqueda (email, nombre, ID)
      const matchesSearch = searchTerm === "" || 
        order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm) ||
        order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por estado de pago
      const matchesPaymentStatus = paymentStatusFilter === "all" || 
        order.paymentStatus === paymentStatusFilter;

      // Filtro por estado de pedido
      const matchesOrderStatus = orderStatusFilter === "all" || 
        order.orderStatus === orderStatusFilter;

      // Filtro por método de pago
      const matchesPaymentMethod = paymentMethodFilter === "all" || 
        order.paymentMethod === paymentMethodFilter;

      // Filtro por fecha
      const matchesDate = (() => {
        if (dateFilter === "all") return true;
        
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            return orderDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orderDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return orderDate >= monthAgo;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesPaymentStatus && matchesOrderStatus && matchesPaymentMethod && matchesDate;
    });
  }, [orders, searchTerm, paymentStatusFilter, orderStatusFilter, paymentMethodFilter, dateFilter]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentStatusFilter, orderStatusFilter, paymentMethodFilter, dateFilter]);

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ orderId, paymentStatus }: { orderId: number; paymentStatus: string }) => {
      return apiRequest(`/api/admin/orders/${orderId}/payment-status`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      // Si hay un modal abierto, forzar el refetch de los detalles
      if (viewingOrder) {
        setViewingOrder(prev => prev ? { ...prev, _refetch: Date.now() } : null);
      }
      // Limpiar detalles expandidos para forzar recarga
      setOrderDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[orderId];
        return newDetails;
      });
      toast({
        title: "Estado actualizado",
        description: "El estado del pago ha sido actualizado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del pago.",
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return apiRequest(`/api/admin/orders/${orderId}/order-status`, {
        method: "PATCH",
        body: JSON.stringify({ orderStatus: status }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      // Si hay un modal abierto, forzar el refetch de los detalles
      if (viewingOrder) {
        setViewingOrder(prev => prev ? { ...prev, _refetch: Date.now() } : null);
      }
      // Limpiar detalles expandidos para forzar recarga
      setOrderDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[orderId];
        return newDetails;
      });
      toast({
        title: "Estado actualizado",
        description: "El estado del pedido ha sido actualizado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado del pedido.",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Pedido eliminado",
        description: "El pedido ha sido eliminado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el pedido.",
        variant: "destructive",
      });
    },
  });

  const handlePaymentStatusChange = (orderId: number, paymentStatus: string) => {
    updatePaymentStatusMutation.mutate({ orderId, paymentStatus });
  };

  const handleOrderStatusChange = (orderId: number, status: string) => {
    updateOrderStatusMutation.mutate({ orderId, status });
  };



  // Función para abrir el modal de detalles
  const handleViewOrder = (order: any) => {
    setViewingOrder(order);
    setIsViewModalOpen(true);
  };

  // Función para manejar el cierre del modal de edición
  const handleEditModalClose = () => {
    if (editingOrder) {
      // Limpiar detalles expandidos para forzar recarga después de editar
      setOrderDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[editingOrder.id];
        return newDetails;
      });
    }
    setIsEditModalOpen(false);
    setEditingOrder(null);
  };

  // Función para alternar el estado expandido de una fila
  const toggleRowExpansion = async (orderId: number) => {
    const newExpandedRows = new Set(expandedRows);
    
    if (newExpandedRows.has(orderId)) {
      newExpandedRows.delete(orderId);
    } else {
      newExpandedRows.add(orderId);
      // Siempre recargar detalles para obtener datos frescos con referencias
      await fetchOrderDetails(orderId);
    }
    
    setExpandedRows(newExpandedRows);
  };

  // Función para cargar los detalles de un pedido
  const fetchOrderDetails = async (orderId: number) => {
    const newLoadingDetails = new Set(loadingDetails);
    newLoadingDetails.add(orderId);
    setLoadingDetails(newLoadingDetails);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Error al cargar detalles del pedido');
      }
      const data = await response.json();
      setOrderDetails(prev => ({ ...prev, [orderId]: data }));
    } catch (error) {
      console.error('Error al cargar detalles del pedido:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del pedido.",
        variant: "destructive",
      });
    } finally {
      const newLoadingDetails = new Set(loadingDetails);
      newLoadingDetails.delete(orderId);
      setLoadingDetails(newLoadingDetails);
    }
  };

  // Estados de pago para la vista expandida
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

  // Estados del pedido para la vista expandida
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

  const handleDeleteOrder = (orderId: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este pedido? Esta acción se puede revertir desde la papelera.")) {
      deleteOrderMutation.mutate(orderId);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold">Gestión de Pedidos</h1>
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold">Gestión de Pedidos</h1>
          <Card>
            <CardContent className="flex flex-col items-center py-10">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error al cargar pedidos</h2>
              <p className="text-gray-600 mb-6">
                No se pudieron cargar los pedidos. Por favor, intenta de nuevo más tarde.
              </p>
              <Button onClick={() => queryClient.invalidateQueries()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold">Gestión de Pedidos</h1>
          <Card>
            <CardContent className="flex flex-col items-center py-10">
              <Package2 className="h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No hay pedidos</h2>
              <p className="text-gray-600 mb-6">
                No se han recibido pedidos aún.
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Gestión de Pedidos</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Package2 className="h-4 w-4" />
            {filteredOrders.length} de {Array.isArray(orders) ? orders.length : 0} pedidos
            {totalPages > 1 && (
              <span className="text-xs text-gray-400 ml-2">
                (Página {currentPage} de {totalPages})
              </span>
            )}
          </div>
        </div>


        {/* Estadísticas de Pedidos */}
        {orderStats && !isLoadingStats && !statsError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total de Pedidos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pedidos (30d)</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{orderStats.general.totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {orderStats.general.recentOrders} en últimos 7 días
                </p>
              </CardContent>
            </Card>

            {/* Ingresos Totales */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatPrice(orderStats.general.totalRevenue)}</div>
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
                <div className="text-2xl font-semibold text-green-600">{orderStats.paymentStatus.paid}</div>
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
                <div className="text-2xl font-semibold text-blue-600">{orderStats.customerTypes.registered}</div>
                <p className="text-xs text-muted-foreground">
                  Registrados {orderStats.customerTypes.registered} y no registrados {orderStats.customerTypes.guest}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estados de Pedidos */}
        {orderStats && !isLoadingStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-semibold text-orange-600">{orderStats.orderStatus.pendingVerification}</div>
                <p className="text-sm text-orange-600">Pendiente Verificar</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-semibold text-blue-600">{orderStats.orderStatus.verified}</div>
                <p className="text-sm text-blue-600">Verificados</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-semibold text-purple-600">{orderStats.orderStatus.packed}</div>
                <p className="text-sm text-purple-600">Embalados</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-semibold text-green-600">{orderStats.orderStatus.shipped}</div>
                <p className="text-sm text-green-600">Enviados</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-semibold text-red-600">{orderStats.orderStatus.incidents}</div>
                <p className="text-sm text-red-600">Incidencias</p>
              </CardContent>
            </Card>
          </div>
        )}


        {/* Panel de filtros y búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Búsqueda por texto */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por email, nombre, ID o referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Filtro por forma de pago */}
              <div>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <SelectValue placeholder="Forma Pago" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las formas</SelectItem>
                    {uniquePaymentMethods.map(method => (
                      <SelectItem key={method} value={method}>
                        {getPaymentMethodInSpanish(method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por estado de pago */}
              <div>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <SelectValue placeholder="Estado Pago" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los pagos</SelectItem>
                    <SelectItem value="pagado">Pagado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por estado de pedido */}
              <div>
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <SelectValue placeholder="Estado Pedido" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pendiente_verificar">Pendiente Verificar</SelectItem>
                    <SelectItem value="verificado">Verificado</SelectItem>
                    <SelectItem value="embalado">Embalado</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="incidencia">Incidencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por fecha */}
              <div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <SelectValue placeholder="Período" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las fechas</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botón para limpiar filtros */}
            {(searchTerm || paymentStatusFilter !== "all" || orderStatusFilter !== "all" || paymentMethodFilter !== "all" || dateFilter !== "all") && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm("");
                    setPaymentStatusFilter("all");
                    setOrderStatusFilter("all");
                    setPaymentMethodFilter("all");
                    setDateFilter("all");
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tabla de pedidos con diseño responsive y filas expandibles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pedidos</span>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  Total: {formatPrice(filteredOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0), false)}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full table-fixed" data-orders-table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 px-2"></TableHead>
                    <TableHead className="w-24 px-2">Pedido</TableHead>
                    <TableHead className="w-48 px-2">Cliente</TableHead>
                    <TableHead className="w-28 hidden md:table-cell px-2">Fecha</TableHead>
                    <TableHead className="w-24 px-2">Total</TableHead>
                    <TableHead className="w-32 hidden md:table-cell px-2">Forma Pago</TableHead>
                    <TableHead className="w-28 hidden lg:table-cell px-2">Estado Pago</TableHead>
                    <TableHead className="w-32 hidden xl:table-cell px-2">Estado Pedido</TableHead>
                    <TableHead className="text-right w-28 px-2">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order: any) => (
                    <React.Fragment key={order.id}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell className="px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(order.id)}
                            className="w-6 h-6 p-0"
                          >
                            {expandedRows.has(order.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium px-2 text-sm">PED-{order.id}</TableCell>
                        <TableCell className="px-2">
                          <div>
                            <p className="font-medium text-sm truncate">{order.customerName || "N/A"}</p>
                            <p className="text-xs text-gray-500 truncate">{order.customerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell px-2">
                          <div className="text-xs">
                            <p>{format(new Date(order.createdAt), "dd/MM/yyyy", { locale: es })}</p>
                            <p className="text-xs text-gray-500">{format(new Date(order.createdAt), "HH:mm", { locale: es })}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold px-2 text-sm">{formatPrice(order.total, false)}</TableCell>
                        <TableCell className="hidden md:table-cell px-2">
                          <span className="text-xs truncate">
                            {order.paymentMethod ? getPaymentMethodInSpanish(order.paymentMethod) : "Sin especificar"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell px-2">
                          <Select
                            value={order.paymentStatus || "pendiente"}
                            onValueChange={(value) => handlePaymentStatusChange(order.id, value)}
                            disabled={updatePaymentStatusMutation.isPending}
                          >
                            <SelectTrigger className={`w-24 text-xs border ${
                              (order.paymentStatus || "pendiente") === "pagado" 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : "bg-yellow-100 text-yellow-800 border-yellow-200"
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="pagado">Pagado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell px-2">
                          <Select
                            value={order.orderStatus || "pendiente_verificar"}
                            onValueChange={(value) => handleOrderStatusChange(order.id, value)}
                            disabled={updateOrderStatusMutation.isPending}
                          >
                            <SelectTrigger className={`w-28 text-xs border ${
                              (() => {
                                const status = order.orderStatus || "pendiente_verificar";
                                switch (status) {
                                  case "pendiente_verificar": return "bg-orange-100 text-orange-800 border-orange-200";
                                  case "verificado": return "bg-blue-100 text-blue-800 border-blue-200";
                                  case "embalado": return "bg-purple-100 text-purple-800 border-purple-200";
                                  case "enviado": return "bg-indigo-100 text-indigo-800 border-indigo-200";
                                  case "incidencia": return "bg-red-100 text-red-800 border-red-200";
                                  default: return "bg-orange-100 text-orange-800 border-orange-200";
                                }
                              })()
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente_verificar">Pendiente</SelectItem>
                              <SelectItem value="verificado">Verificado</SelectItem>
                              <SelectItem value="embalado">Embalado</SelectItem>
                              <SelectItem value="enviado">Enviado</SelectItem>
                              <SelectItem value="incidencia">Incidencia</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right px-2">
                          <div className="flex items-center gap-0.5 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                              className="h-7 w-7 p-0"
                              title="Ver detalles"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingOrder(order);
                                setIsEditModalOpen(true);
                              }}
                              className="h-7 w-7 p-0"
                              title="Editar pedido"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={deleteOrderMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                              title="Eliminar pedido"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Fila expandida con detalles del pedido */}
                      {expandedRows.has(order.id) && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0 bg-gray-50">
                            <div className="p-3 border-t border-gray-200 overflow-x-auto">
                              {loadingDetails.has(order.id) ? (
                                <div className="flex items-center justify-center py-4">
                                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                                  <span className="ml-2 text-gray-600">Cargando detalles...</span>
                                </div>
                              ) : orderDetails[order.id] ? (
                                <div className="space-y-2 max-w-full">
                                  {/* Layout ultra-compacto de 2 columnas: Cliente | Productos */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {/* Columna Cliente */}
                                    <div className="bg-white p-2 rounded border text-xs">
                                      <div className="flex items-center gap-1 mb-1">
                                        <User className="h-3 w-3 text-blue-600" />
                                        <span className="font-medium text-blue-800 text-xs">Cliente</span>
                                      </div>
                                      <div className="space-y-0.5 text-xs">
                                        <p><strong>Nombre:</strong> {orderDetails[order.id].customerName}</p>
                                        <p><strong>Email:</strong> <span className="break-all">{orderDetails[order.id].customerEmail}</span></p>
                                        <p><strong>Teléfono:</strong> {orderDetails[order.id].customerPhone}</p>
                                        <p><strong>NIF/CIF:</strong> {orderDetails[order.id].customerNifCif || 'No especificado'}</p>
                                        <p><strong>Dirección:</strong> {orderDetails[order.id].shippingAddress}, {orderDetails[order.id].shippingCity}{orderDetails[order.id].shippingProvince ? `, ${orderDetails[order.id].shippingProvince}` : ''} {orderDetails[order.id].shippingPostalCode}</p>

                                      </div>
                                    </div>
                                    
                                    {/* Columna Productos */}
                                    <div className="bg-white p-2 rounded border text-xs">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Package className="h-3 w-3 text-green-600" />
                                        <span className="font-medium text-green-800 text-xs">Productos ({orderDetails[order.id].items?.length || 0})</span>
                                      </div>

                                      
                                      {orderDetails[order.id].items && Array.isArray(orderDetails[order.id].items) && orderDetails[order.id].items.length > 0 ? (
                                        <div className="space-y-1">
                                          {orderDetails[order.id].items.map((item: OrderItemWithReferences, index: number) => (
                                            <div key={index} className="flex justify-between items-start text-xs bg-gray-50 p-1.5 rounded">
                                              <div className="flex-1 pr-1 min-w-0">
                                                <p className="font-medium truncate text-xs">{item.partName || 'Producto'}</p>

                                                <div className="text-gray-600 text-xs space-y-0.5">
                                                  {item.refLocal && (
                                                    <p>Ref Principal: {item.refLocal}</p>
                                                  )}
                                                  {item.partReference && (
                                                    <p>Código: {item.partReference}</p>
                                                  )}
                                                  {item.refPrincipal && (
                                                    <p>Ref Fabricante: {item.refPrincipal}</p>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="text-right whitespace-nowrap text-xs">
                                                <p className="font-semibold">{formatPrice(item.price, false)} × {item.quantity}</p>
                                                <p className="text-gray-600">{formatPrice((parseFloat(item.price) || 0) * item.quantity, false)}</p>
                                              </div>
                                            </div>
                                          ))}
                                          
                                          {/* Resumen ultra-compacto */}
                                          <div className="border-t pt-1 mt-1 text-xs">
                                            <div className="flex justify-between">
                                              <span>Subtotal:</span>
                                              <span>{formatPrice(orderDetails[order.id].subtotal || 0, false)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Envío:</span>
                                              <span>{formatPrice(orderDetails[order.id].shippingCost || 0, false)}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold pt-0.5 border-t">
                                              <span>Total:</span>
                                              <span>{formatPrice(orderDetails[order.id].total || 0, false)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500">No hay productos</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Observaciones ultra-compactas */}
                                  <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                                    <div className="flex items-start gap-1">
                                      <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <span className="font-medium text-yellow-800 text-xs">Observaciones:</span>
                                        <p className="text-xs text-yellow-700 mt-0.5 break-words">
                                          {orderDetails[order.id].adminObservations || "Sin observaciones"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Acciones móviles */}
                                  <div className="flex gap-2 sm:hidden">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleViewOrder(order)}
                                      className="flex-1"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Ver
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setEditingOrder(order);
                                        setIsEditModalOpen(true);
                                      }}
                                      className="flex-1"
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Editar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <p className="text-sm text-gray-500">No se pudieron cargar los detalles del pedido</p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => fetchOrderDetails(order.id)}
                                    className="mt-2"
                                  >
                                    Reintentar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              
              {filteredOrders.length === 0 && (
                <div className="text-center py-8">
                  <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No se encontraron pedidos</h3>
                  <p className="text-gray-600">
                    {searchTerm || paymentStatusFilter !== "all" || orderStatusFilter !== "all" || dateFilter !== "all"
                      ? "Intenta ajustar los filtros de búsqueda"
                      : "No hay pedidos para mostrar"}
                  </p>
                </div>
              )}

              {/* Controles de paginación */}
              {filteredOrders.length > 0 && totalPages > 1 && (
                <div className="mt-8 mb-6 px-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} de {filteredOrders.length} pedidos
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Mostrar páginas cerca de la actual
                          return page === 1 || page === totalPages || 
                                 (page >= currentPage - 1 && page <= currentPage + 1);
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {/* Mostrar "..." si hay salto */}
                            {index > 0 && array[index - 1] < page - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Métodos de Pago Populares - Movido al final */}
              {orderStats?.topPaymentMethods && orderStats.topPaymentMethods.length > 0 && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Métodos de Pago Más Usados (30 días)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {orderStats.topPaymentMethods.map((method, index) => (
                        <div key={method.method} className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="font-semibold text-lg">{method.count}</div>
                          <div className="text-sm text-muted-foreground">{getPaymentMethodInSpanish(method.method)}</div>
                          <div className="text-xs text-green-600">{formatPrice(method.revenue)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalles de pedidos */}
      {isViewModalOpen && viewingOrder && (
        <OrderDetailViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingOrder(null);
          }}
          order={viewingOrder}
        />
      )}

      {/* Modal de edición de pedidos */}
      {isEditModalOpen && editingOrder && (
        <OrderEditModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          order={editingOrder}
        />
      )}
    </AdminLayout>
  );
};

export default AdminOrders;