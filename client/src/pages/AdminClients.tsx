import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Search, Mail, Phone, MapPin, Calendar, Eye, Edit, Users, Package, Trash2, X, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/dashboard/Sidebar";

interface Client {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  province: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingPostalCode?: string;
  shippingProvince?: string;
  billingAddress?: string;
  billingCity?: string;
  billingPostalCode?: string;
  billingProvince?: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  totalOrders?: number;
  totalSpent?: number;
  orderCount?: number;
  lastOrderDate?: string;
}

interface GuestOrder {
  id: number;
  orderNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
  shippingAddress: string;
}

const AdminClients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProvince, setFilterProvince] = useState("all");
  const [guestSearchTerm, setGuestSearchTerm] = useState("");
  
  // Estados para modales
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGuestOrder, setSelectedGuestOrder] = useState<GuestOrder | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showGuestOrderModal, setShowGuestOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  
  // Estados para edición
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar clientes (usuarios con rol customer únicamente)
  const { data: clients, isLoading, error: clientsError } = useQuery({
    queryKey: ['/api/admin/clients'],
    queryFn: async () => {
      const response = await fetch('/api/admin/clients', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      const data = await response.json();
      // Filtrar solo usuarios con rol customer (excluir gestores y administradores)
      return data.filter((client: Client) => 
        client.role === 'customer' && !client.isAdmin
      );
    },
    retry: false,
  });

  // Cargar pedidos de invitados
  const { data: guestOrders, isLoading: isLoadingGuests, error: guestOrdersError } = useQuery({
    queryKey: ['/api/admin/guest-orders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/guest-orders', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Error al cargar pedidos de invitados');
      }
      return response.json();
    },
    retry: false,
    enabled: !!clients, // Solo cargar pedidos si ya tenemos clientes
  });

  // Filtrar clientes
  const filteredClients = clients?.filter((client: Client) => {
    const matchesSearch = 
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvince = filterProvince === "all" || client.province === filterProvince;

    return matchesSearch && matchesProvince;
  }) || [];

  // Filtrar pedidos de invitados
  const filteredGuestOrders = guestOrders?.filter((order: GuestOrder) => {
    const matchesSearch = 
      order.guestName.toLowerCase().includes(guestSearchTerm.toLowerCase()) ||
      order.guestEmail.toLowerCase().includes(guestSearchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(guestSearchTerm.toLowerCase());

    return matchesSearch;
  }) || [];

  // Obtener provincias únicas
  const provinces = [...new Set(clients?.map((client: Client) => client.province).filter(Boolean) || [])];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'secondary';
      case 'customer':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gestor';
      case 'customer':
        return 'Cliente';
      default:
        return role;
    }
  };

  // Mutation para actualizar cliente
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Client> }) => {
      // Preparar los datos con todos los campos necesarios
      const updatedData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        province: data.province,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingPostalCode: data.shippingPostalCode,
        shippingProvince: data.shippingProvince,
        billingAddress: data.billingAddress,
        billingCity: data.billingCity,
        billingPostalCode: data.billingPostalCode,
        billingProvince: data.billingProvince,
      };

      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar cliente');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      toast({
        title: "Cliente actualizado",
        description: "Los datos del cliente se han actualizado correctamente",
      });
      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente",
        variant: "destructive",
      });
      console.error('Error updating client:', error);
    },
  });

  // Mutation para eliminar cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await fetch(`/api/admin/users/${clientId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar cliente');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
      });
      setShowDeleteDialog(false);
      setClientToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      });
      console.error('Error deleting client:', error);
    },
  });

  // Funciones para manejar acciones
  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  // Función para ver pedido de invitado
  const handleViewGuestOrder = (order: GuestOrder) => {
    setSelectedGuestOrder(order);
    setShowGuestOrderModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      postalCode: client.postalCode,
      province: client.province,
      shippingAddress: client.shippingAddress || client.address,
      shippingCity: client.shippingCity || client.city,
      shippingPostalCode: client.shippingPostalCode || client.postalCode,
      shippingProvince: client.shippingProvince || client.province,
      billingAddress: client.billingAddress || client.address,
      billingCity: client.billingCity || client.city,
      billingPostalCode: client.billingPostalCode || client.postalCode,
      billingProvince: client.billingProvince || client.province,
    });
    setShowEditModal(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const handleUpdateClient = () => {
    if (!editingClient) return;
    
    updateClientMutation.mutate({
      id: editingClient.id,
      data: editForm,
    });
  };

  const handleConfirmDelete = () => {
    if (!clientToDelete) return;
    
    deleteClientMutation.mutate(clientToDelete.id);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-montserrat font-semibold">Gestión de Clientes</h1>
            <p className="text-muted-foreground">
              Administra los clientes registrados y pedidos de invitados
            </p>
          </div>
        </div>

        {/* Estadísticas de Clientes */}
        {clients && !clientsError && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total de Clientes Registrados */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Registrados</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{filteredClients.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total de usuarios registrados
                </p>
              </CardContent>
            </Card>

            {/* Total de Pedidos de Invitados */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Invitados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{guestOrders ? guestOrders.length : 0}</div>
                <p className="text-xs text-muted-foreground">
                  Compras sin registro
                </p>
              </CardContent>
            </Card>

            {/* Total de Clientes Activos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {clients ? clients.filter(c => c.totalOrders && c.totalOrders > 0).length : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Con al menos un pedido
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Clientes Registrados ({filteredClients.length})
            </TabsTrigger>
            <TabsTrigger value="guests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pedidos de Invitados ({filteredGuestOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-6">
            {/* Filtros para clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filtros de búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar cliente</Label>
                    <Input
                      id="search"
                      placeholder="Nombre, email o usuario..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia</Label>
                    <Select value={filterProvince} onValueChange={setFilterProvince}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las provincias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las provincias</SelectItem>
                        {provinces.map((province) => (
                          <SelectItem key={String(province)} value={String(province)}>
                            {String(province)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterProvince("all");
                      }}
                      className="w-full"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Lista de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron clientes</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Información de contacto</TableHead>
                          <TableHead>Dirección</TableHead>
                          <TableHead>Pedidos</TableHead>
                          <TableHead>Registro</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((client) => (
                          <TableRow key={client.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {(client.firstName && client.lastName) 
                                    ? `${client.firstName} ${client.lastName}`
                                    : <span className="text-red-500 italic">Datos incompletos</span>
                                  }
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  @{client.username}
                                </div>
                                {!(client.firstName && client.lastName) && (
                                  <Badge variant="destructive" className="mt-1 text-xs">
                                    Perfil incompleto
                                  </Badge>
                                )}
                                <Badge 
                                  variant={getRoleBadgeVariant(client.role)}
                                  className="mt-1 ml-1"
                                >
                                  {getRoleText(client.role)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {client.email || <span className="text-gray-400 italic">Sin email</span>}
                                </div>
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {client.phone || <span className="text-gray-400 italic">Sin teléfono</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {client.address || <span className="text-gray-400 italic">Sin dirección</span>}
                                </div>
                                {(client.city || client.province || client.postalCode) ? (
                                  <div>
                                    {client.city && client.city}{client.city && client.province && ', '}{client.province} {client.postalCode}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 italic">Sin ubicación</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-medium">
                                  {client.totalOrders || client.orderCount || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  pedidos
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {client.totalSpent ? `${Number(client.totalSpent).toFixed(2)}€` : '0.00€'}
                                </div>
                                {client.lastOrderDate && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Último: {new Date(client.lastOrderDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(client.createdAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewClient(client)}
                                  title="Ver detalles"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClient(client)}
                                  title="Editar cliente"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClient(client)}
                                  title="Eliminar cliente"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests" className="space-y-6">
            {/* Filtros para pedidos de invitados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar pedidos de invitados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guestSearch">Buscar pedido</Label>
                    <Input
                      id="guestSearch"
                      placeholder="Nombre, email o número de pedido..."
                      value={guestSearchTerm}
                      onChange={(e) => setGuestSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => setGuestSearchTerm("")}
                      className="w-full"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de pedidos de invitados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Pedidos de Invitados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingGuests ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : filteredGuestOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No se encontraron pedidos de invitados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Contacto</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGuestOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">#{order.orderNumber}</div>
                                <div className="text-sm text-muted-foreground">
                                  {order.itemCount} artículo(s)
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{order.guestName}</div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {order.guestEmail}
                                </div>
                                {order.guestPhone && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="h-3 w-3" />
                                    {order.guestPhone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{Number(order.total).toFixed(2)}€</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewGuestOrder(order)}
                                title="Ver detalles del pedido"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal de detalles del cliente - Diseño mejorado */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {selectedClient?.firstName} {selectedClient?.lastName}
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Información completa del cliente · ID: {selectedClient?.id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedClient && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6">
              {/* Columna izquierda */}
              <div className="space-y-6">
                {/* Información Personal */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Información Personal
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Nombre completo</span>
                      <span className="text-gray-900">{selectedClient.firstName} {selectedClient.lastName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Usuario</span>
                      <span className="text-gray-900 font-mono">@{selectedClient.username}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Email</span>
                      <span className="text-gray-900">{selectedClient.email}</span>
                    </div>
                    {selectedClient.phone && (
                      <div className="flex items-center justify-between py-2">
                        <span className="font-medium text-gray-600">Teléfono</span>
                        <span className="text-gray-900">{selectedClient.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dirección de Envío */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Dirección de Envío
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Dirección</span>
                      <span className="text-gray-900">{selectedClient.shippingAddress || selectedClient.address || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Ciudad</span>
                      <span className="text-gray-900">{selectedClient.shippingCity || selectedClient.city || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Provincia</span>
                      <span className="text-gray-900">{selectedClient.shippingProvince || selectedClient.province || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-600">Código Postal</span>
                      <span className="text-gray-900">{selectedClient.shippingPostalCode || selectedClient.postalCode || 'No especificado'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-6">
                {/* Dirección de Facturación */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Dirección de Facturación
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Dirección</span>
                      <span className="text-gray-900">{selectedClient.billingAddress || selectedClient.address || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Ciudad</span>
                      <span className="text-gray-900">{selectedClient.billingCity || selectedClient.city || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Provincia</span>
                      <span className="text-gray-900">{selectedClient.billingProvince || selectedClient.province || 'No especificada'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-600">Código Postal</span>
                      <span className="text-gray-900">{selectedClient.billingPostalCode || selectedClient.postalCode || 'No especificado'}</span>
                    </div>
                  </div>
                </div>

                {/* Información de Cuenta */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Información de Cuenta
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Rol</span>
                      <Badge variant={getRoleBadgeVariant(selectedClient.role)} className="px-3 py-1">
                        {getRoleText(selectedClient.role)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Fecha de registro</span>
                      <span className="text-gray-900">{new Date(selectedClient.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-600">Última actualización</span>
                      <span className="text-gray-900">{new Date(selectedClient.updatedAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                </div>

                {/* Estadísticas de Pedidos */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Estadísticas de Pedidos
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Total de pedidos</span>
                      <span className="text-xl font-semibold text-gray-900">
                        {selectedClient.totalOrders || selectedClient.orderCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Total gastado</span>
                      <span className="text-xl font-semibold text-gray-900">
                        {selectedClient.totalSpent ? `${Number(selectedClient.totalSpent).toFixed(2)}€` : '0.00€'}
                      </span>
                    </div>
                    {selectedClient.lastOrderDate && (
                      <div className="flex items-center justify-between py-2">
                        <span className="font-medium text-gray-600">Último pedido</span>
                        <span className="text-gray-900">{new Date(selectedClient.lastOrderDate).toLocaleDateString('es-ES')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setShowDetailsModal(false)}
            >
              Cerrar
            </Button>
            <Button 
              onClick={() => {
                setShowDetailsModal(false);
                if (selectedClient) handleEditClient(selectedClient);
              }}
            >
              Editar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de edición del cliente */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Modifica la información del cliente
            </DialogDescription>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-6">
              {/* Información Personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">Nombre</Label>
                  <Input
                    id="editFirstName"
                    value={editForm.firstName || ''}
                    onChange={(e) => setEditForm(prev => ({...prev, firstName: e.target.value}))}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Apellidos</Label>
                  <Input
                    id="editLastName"
                    value={editForm.lastName || ''}
                    onChange={(e) => setEditForm(prev => ({...prev, lastName: e.target.value}))}
                    placeholder="Apellidos"
                  />
                </div>
                <div>
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <Label htmlFor="editPhone">Teléfono</Label>
                  <Input
                    id="editPhone"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm(prev => ({...prev, phone: e.target.value}))}
                    placeholder="Teléfono"
                  />
                </div>
              </div>

              {/* Dirección de Envío */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Dirección de Envío</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editShippingAddress">Dirección de Envío</Label>
                    <Input
                      id="editShippingAddress"
                      value={editForm.shippingAddress || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, shippingAddress: e.target.value}))}
                      placeholder="Dirección de envío"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editShippingCity">Ciudad de Envío</Label>
                    <Input
                      id="editShippingCity"
                      value={editForm.shippingCity || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, shippingCity: e.target.value}))}
                      placeholder="Ciudad de envío"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editShippingProvince">Provincia de Envío</Label>
                    <Input
                      id="editShippingProvince"
                      value={editForm.shippingProvince || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, shippingProvince: e.target.value}))}
                      placeholder="Provincia de envío"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editShippingPostalCode">Código Postal de Envío</Label>
                    <Input
                      id="editShippingPostalCode"
                      value={editForm.shippingPostalCode || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, shippingPostalCode: e.target.value}))}
                      placeholder="Código postal de envío"
                    />
                  </div>
                </div>
              </div>

              {/* Dirección de Facturación */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Dirección de Facturación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editBillingAddress">Dirección de Facturación</Label>
                    <Input
                      id="editBillingAddress"
                      value={editForm.billingAddress || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, billingAddress: e.target.value}))}
                      placeholder="Dirección de facturación"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editBillingCity">Ciudad de Facturación</Label>
                    <Input
                      id="editBillingCity"
                      value={editForm.billingCity || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, billingCity: e.target.value}))}
                      placeholder="Ciudad de facturación"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editBillingProvince">Provincia de Facturación</Label>
                    <Input
                      id="editBillingProvince"
                      value={editForm.billingProvince || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, billingProvince: e.target.value}))}
                      placeholder="Provincia de facturación"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editBillingPostalCode">Código Postal de Facturación</Label>
                    <Input
                      id="editBillingPostalCode"
                      value={editForm.billingPostalCode || ''}
                      onChange={(e) => setEditForm(prev => ({...prev, billingPostalCode: e.target.value}))}
                      placeholder="Código postal de facturación"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateClient}
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente 
              {clientToDelete && ` "${clientToDelete.firstName} ${clientToDelete.lastName}"`} 
              y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de detalles del pedido de invitado */}
      <Dialog open={showGuestOrderModal} onOpenChange={setShowGuestOrderModal}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Pedido #{selectedGuestOrder?.orderNumber}
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Detalles del pedido de invitado · ID: {selectedGuestOrder?.id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedGuestOrder && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6">
              {/* Columna izquierda - Información del Cliente */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Información del Cliente
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Nombre</span>
                      <span className="text-gray-900">{selectedGuestOrder.guestName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Email</span>
                      <span className="text-gray-900">{selectedGuestOrder.guestEmail}</span>
                    </div>
                    {selectedGuestOrder.guestPhone && (
                      <div className="flex items-center justify-between py-2">
                        <span className="font-medium text-gray-600">Teléfono</span>
                        <span className="text-gray-900">{selectedGuestOrder.guestPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Dirección de Envío
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-600">Dirección</span>
                      <span className="text-gray-900">{selectedGuestOrder.shippingAddress || 'No especificada'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha - Información del Pedido */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Detalles del Pedido
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Número de Pedido</span>
                      <span className="text-gray-900 font-mono">#{selectedGuestOrder.orderNumber}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Artículos</span>
                      <span className="text-gray-900">{selectedGuestOrder.itemCount}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Total</span>
                      <span className="text-xl font-semibold text-gray-900">
                        {Number(selectedGuestOrder.total).toFixed(2)}€
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-600">Fecha</span>
                      <span className="text-gray-900">{new Date(selectedGuestOrder.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setShowGuestOrderModal(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClients;