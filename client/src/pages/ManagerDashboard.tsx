import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Users, TrendingUp, Clock, Search, Eye } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Types
interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  totalItems: number;
  createdAt: string;
  paymentMethodName?: string;
}

interface Client {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  role: string;
  orderCount: number;
  lastOrderDate?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  processing: "bg-blue-500", 
  shipped: "bg-purple-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500"
};

const statusTranslations: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  shipped: "Enviado", 
  delivered: "Entregado",
  cancelled: "Cancelado"
};

export default function ManagerDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    staleTime: 30000,
  });

  // Fetch clients
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
    staleTime: 30000,
  });

  // Filter orders based on search
  const filteredOrders = orders?.filter(order => 
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter clients based on search  
  const filteredClients = clients?.filter(client =>
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate stats
  const stats = {
    totalOrders: orders?.length || 0,
    totalClients: clients?.length || 0,
    pendingOrders: orders?.filter(o => o.status === 'pending').length || 0,
    totalRevenue: orders?.reduce((sum, order) => sum + order.totalAmount, 0) || 0,
    recentOrders: orders?.slice(0, 5) || [],
    recentClients: clients?.slice(0, 5) || []
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Gestión</h1>
        <p className="text-gray-600">Gestión de pedidos y clientes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue, false)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar pedidos o clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Pedidos</CardTitle>
              <CardDescription>
                Visualiza y gestiona todos los pedidos de la tienda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">Cargando pedidos...</div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? "No se encontraron pedidos con esa búsqueda" : "No hay pedidos registrados"}
                    </div>
                  ) : (
                    filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">#{order.orderNumber}</span>
                            <Badge 
                              variant="secondary" 
                              className={`${statusColors[order.status]} text-white`}
                            >
                              {statusTranslations[order.status]}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div><strong>Cliente:</strong> {order.customerName}</div>
                            <div><strong>Email:</strong> {order.customerEmail}</div>
                            <div><strong>Total:</strong> {formatPrice(order.totalAmount, false)}</div>
                            <div><strong>Artículos:</strong> {order.totalItems}</div>
                            <div><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString('es-ES')}</div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Clientes</CardTitle>
              <CardDescription>
                Visualiza y gestiona información de clientes registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="text-center py-8">Cargando clientes...</div>
              ) : (
                <div className="space-y-4">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? "No se encontraron clientes con esa búsqueda" : "No hay clientes registrados"}
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">{client.firstName} {client.lastName}</span>
                            <Badge variant="outline">
                              {client.role === 'customer' ? 'Cliente' : client.role}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div><strong>Usuario:</strong> {client.username}</div>
                            <div><strong>Email:</strong> {client.email}</div>
                            <div><strong>Teléfono:</strong> {client.phone || 'No disponible'}</div>
                            <div><strong>Ciudad:</strong> {client.city || 'No disponible'}</div>
                            <div><strong>Pedidos:</strong> {client.orderCount}</div>
                            <div><strong>Registrado:</strong> {new Date(client.createdAt).toLocaleDateString('es-ES')}</div>
                            {client.lastOrderDate && (
                              <div><strong>Último pedido:</strong> {new Date(client.lastOrderDate).toLocaleDateString('es-ES')}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Detalles del Pedido #{selectedOrder.orderNumber}</h2>
                <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                  ✕
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Información del Cliente</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Nombre:</strong> {selectedOrder.customerName}</div>
                    <div><strong>Email:</strong> {selectedOrder.customerEmail}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Información del Pedido</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Estado:</strong> 
                      <Badge className={`ml-2 ${statusColors[selectedOrder.status]} text-white`}>
                        {statusTranslations[selectedOrder.status]}
                      </Badge>
                    </div>
                    <div><strong>Total:</strong> {formatPrice(selectedOrder.totalAmount, false)}</div>
                    <div><strong>Artículos:</strong> {selectedOrder.totalItems}</div>
                    <div><strong>Fecha:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString('es-ES')}</div>
                    {selectedOrder.paymentMethodName && (
                      <div><strong>Método de pago:</strong> {selectedOrder.paymentMethodName}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}