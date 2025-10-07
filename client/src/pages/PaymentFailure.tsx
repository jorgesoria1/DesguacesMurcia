import React, { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, CreditCard, RefreshCw, Phone, Mail } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";

const PaymentFailure: React.FC = () => {
  const [location] = useLocation();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { items, setItems } = useCart();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const message = urlParams.get('message');
    
    setErrorCode(code);
    
    // Intentar restaurar el carrito desde el backup si está vacío
    if (items.length === 0) {
      const backupCartData = sessionStorage.getItem('backup_cart_data');
      if (backupCartData) {
        try {
          const backupItems = JSON.parse(backupCartData);
          if (Array.isArray(backupItems) && backupItems.length > 0) {
            setItems(backupItems);
          }
        } catch (error) {
        }
      }
    }
    
    if (message) {
      setErrorMessage(decodeURIComponent(message));
    } else {
      // Mensajes por código de error comunes de Redsys
      const errorMessages: { [key: string]: string } = {
        '101': 'Tarjeta caducada',
        '102': 'Tarjeta en lista de excepción transitoria o bajo sospecha de fraude',
        '106': 'Número de intentos de PIN excedido',
        '125': 'Tarjeta no efectiva',
        '129': 'Código de seguridad (CVV) incorrecto',
        '180': 'Tarjeta no válida',
        '184': 'Error en la autenticación del titular',
        '190': 'Denegación del emisor sin especificar motivo',
        '201': 'Tarjeta caducada',
        '202': 'Tarjeta en lista de excepción transitoria o bajo sospecha de fraude',
        '912': 'Emisor no disponible',
        '913': 'Pedido repetido',
        '944': 'Sesión incorrecta',
        '950': 'Operación de devolución no permitida',
        '9915': 'A petición del usuario se ha cancelado el pago'
      };
      
      setErrorMessage(code ? errorMessages[code] || 'Error no especificado en el procesamiento del pago' : 'Error en el procesamiento del pago');
    }
  }, [location]);

  const getErrorSolution = (code: string | null) => {
    if (!code) return "Intenta realizar el pago nuevamente o contacta con nosotros.";
    
    const solutions: { [key: string]: string } = {
      '101': 'Verifica la fecha de caducidad de tu tarjeta o usa otra tarjeta.',
      '102': 'Contacta con tu banco para verificar el estado de tu tarjeta.',
      '106': 'Has superado el número de intentos permitidos. Espera e intenta más tarde.',
      '125': 'Tu tarjeta no está activada. Contacta con tu banco.',
      '129': 'Verifica el código de seguridad (CVV) de tu tarjeta.',
      '180': 'Verifica los datos de tu tarjeta e intenta nuevamente.',
      '184': 'Error en la verificación. Asegúrate de introducir los datos correctos.',
      '190': 'Tu banco ha denegado la operación. Contacta con tu entidad bancaria.',
      '912': 'Servicio temporalmente no disponible. Intenta más tarde.',
      '9915': 'Ha cancelado el pago. Puede intentarlo nuevamente cuando guste.'
    };
    
    return solutions[code] || "Intenta realizar el pago nuevamente o contacta con nosotros.";
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-800">
              Error en el Procesamiento del Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-red-700 font-medium mb-2">
                No se pudo completar su pago con tarjeta
              </p>
              {errorCode && (
                <p className="text-sm text-red-600">
                  Código de error: {errorCode}
                </p>
              )}
            </div>

            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <strong>Motivo:</strong> {errorMessage}
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-red-800 mb-2">
                Solución recomendada:
              </h3>
              <p className="text-sm text-red-700">
                {getErrorSolution(errorCode)}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                Métodos de pago alternativos:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Transferencia bancaria</li>
                <li>• PayPal</li>
                <li>• Pago en efectivo (recogida en tienda)</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/checkout">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar Nuevamente
                </Button>
              </Link>
              <Link to="/contacto">
                <Button variant="outline">
                  <Phone className="w-4 h-4 mr-2" />
                  Contactar Soporte
                </Button>
              </Link>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                ¿Necesita ayuda?
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Teléfono: <strong>958 79 08 58</strong></p>
                <p>Email: <strong>info@desguacesmurcia.com</strong></p>
                <p>Horario: Lun-Vie: de 8:00h. a 13:30h. y de 16:00h. a 17:30h</p>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center pt-4 border-t border-red-200">
              Los pagos son procesados de forma segura por Redsys
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentFailure;