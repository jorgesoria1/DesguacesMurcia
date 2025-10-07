import React from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Package2, AlertTriangle, CheckCircle, Clock, CalendarClock, Package, Truck } from "lucide-react";
import { useAuth } from "@/hooks/auth";
import { formatPrice } from "@/lib/utils";

// Tipo para el listado de pedidos
interface Order {
  id: number;
  orderNumber?: string;
  paymentStatus?: string;
  orderStatus?: string;
  createdAt: string;
  total: number;
  customerNifCif?: string;
}

// Estados de pago con colores consistentes
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

// Estados del pedido con colores consistentes
const orderStatusDetails = {
  pendiente_verificar: {
    label: "Pendiente Verificar",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  verificado: {
    label: "Verificado",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  embalado: {
    label: "Embalado",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <Package className="h-4 w-4" />,
  },
  enviado: {
    label: "Enviado",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: <Truck className="h-4 w-4" />,
  },
  incidencia: {
    label: "Incidencia",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <AlertTriangle className="h-4 w-4" />,
  }
};

const Orders: React.FC = () => {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [, setLocation] = useLocation();

  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user?.id,
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
            Debes iniciar sesión para ver tus pedidos.
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
        <h1 className="text-3xl font-montserrat font-semibold text-primary mb-6">Mis Pedidos</h1>
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-montserrat font-semibold text-primary mb-6">Mis Pedidos</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error al cargar pedidos</h2>
            <p className="text-gray-600 mb-6">
              No se pudieron cargar tus pedidos. Por favor, intenta de nuevo más tarde.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-montserrat font-semibold text-primary mb-6">Mis Pedidos</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <Package2 className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No tienes pedidos</h2>
            <p className="text-gray-600 mb-6">
              Aún no has realizado ningún pedido. ¡Empieza a comprar!
            </p>
            <Button onClick={() => setLocation("/")}>
              Ir a la tienda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-montserrat font-semibold text-primary mb-6">Mis Pedidos</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido #</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>DNI/CIF</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado Pago</TableHead>
                  <TableHead>Estado Pedido</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "PPP", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customerNifCif || "No disponible"}
                    </TableCell>
                    <TableCell>{formatPrice(order.total, false)}</TableCell>
                    <TableCell>
                      {(() => {
                        const paymentInfo = paymentStatusDetails[order.paymentStatus as keyof typeof paymentStatusDetails] || paymentStatusDetails.pendiente;
                        return (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${paymentInfo.color}`}>
                            {paymentInfo.icon}
                            <span className="ml-2 font-medium">{paymentInfo.label}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const orderInfo = orderStatusDetails[order.orderStatus as keyof typeof orderStatusDetails] || orderStatusDetails.pendiente_verificar;
                        return (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${orderInfo.color}`}>
                            {orderInfo.icon}
                            <span className="ml-2 font-medium">{orderInfo.label}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setLocation(`/pedidos/${order.id}`)}
                      >
                        Ver detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;