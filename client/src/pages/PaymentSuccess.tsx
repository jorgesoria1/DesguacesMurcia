import React, { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, CreditCard, Truck } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";

const PaymentSuccess: React.FC = () => {
  const [location] = useLocation();
  const [orderId, setOrderId] = useState<string | null>(null);
  const { clearCart } = useCart();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdParam = urlParams.get('orderId');
    const clearedParam = urlParams.get('cleared');
    
    if (orderIdParam) {
      setOrderId(orderIdParam);
      
      // LIMPIAR CARRITO SOLO DESPUÉS DEL PAGO EXITOSO
      clearCart();
      
      // Limpiar también datos temporales del pago
      sessionStorage.removeItem('redsysPaymentData');
      sessionStorage.removeItem('backup_cart_data');
      sessionStorage.removeItem('pendingPaymentData');
      
      // Log adicional si el servidor confirmó la limpieza
      if (clearedParam === 'true') {
      }
    }
  }, [location, clearCart]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-800">
              ¡Pago Procesado Exitosamente!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div>
              <p className="text-green-700 font-medium">
                Su pago con tarjeta ha sido procesado correctamente
              </p>
              {orderId && (
                <p className="text-sm text-green-600 mt-2">
                  Número de pedido: #{orderId}
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-center space-x-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <span>Pago Confirmado</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Procesando Pedido</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Truck className="w-4 h-4 text-gray-600" />
                  <span>Preparando Envío</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                ¿Qué sucede ahora?
              </h3>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Recibirá un email de confirmación en breve</li>
                <li>• Procesaremos su pedido en las próximas 24 horas</li>
                <li>• Le notificaremos cuando el pedido esté listo para envío</li>
                <li>• Puede seguir el estado de su pedido en su panel de usuario</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {orderId ? (
                <Link to={`/order-confirmation/${orderId}`}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Ver Detalles del Pedido
                  </Button>
                </Link>
              ) : (
                <Link to="/pedidos">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Ver Mis Pedidos
                  </Button>
                </Link>
              )}
              <Link to="/">
                <Button variant="outline">
                  Volver al Inicio
                </Button>
              </Link>
            </div>

            <div className="text-xs text-gray-500 pt-4 border-t border-green-200">
              Pago procesado de forma segura por Redsys
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;