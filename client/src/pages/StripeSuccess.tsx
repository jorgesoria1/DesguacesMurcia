import { useEffect, useState } from 'react';
import { useLocation, useRouter } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

export default function StripeSuccess() {
  const [location] = useLocation();
  const [, navigate] = useRouter();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        const urlParams = new URLSearchParams(location.split('?')[1]);
        const sessionId = urlParams.get('session_id');
        const paymentIntentId = urlParams.get('payment_intent');
        
        if (!sessionId || !paymentIntentId) {
          throw new Error('Missing required parameters');
        }

        // Get pending order data from session storage
        const pendingOrderData = JSON.parse(sessionStorage.getItem('pending_order_data') || '{}');
        
        if (!pendingOrderData.customerEmail) {
          throw new Error('No pending order data found');
        }

        // Create the order in our system
        const response = await apiRequest("POST", "/api/orders/local", {
          ...pendingOrderData,
          paymentTransactionId: paymentIntentId,
          paymentStatus: 'completed'
        });
        
        if (response.ok) {
          const order = await response.json();
          
          // Clear pending order data
          sessionStorage.removeItem('pending_order_data');
          
          // Redirect to order confirmation
          navigate(`/order-confirmation/${order.id}?payment=stripe&sessionId=${sessionId}`);
        } else {
          throw new Error('Failed to create order');
        }
      } catch (error) {
        console.error('Error processing payment success:', error);
        toast({
          title: "Error",
          description: "Hubo un problema al procesar tu pago. Por favor contacta con nosotros.",
          variant: "destructive",
        });
        navigate('/checkout');
      } finally {
        setProcessing(false);
      }
    };

    processPaymentSuccess();
  }, [location, navigate, toast]);

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Procesando pago...
              </CardTitle>
              <CardDescription>
                Estamos confirmando tu pago con Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-gray-600">
                  Por favor, no cierres esta ventana...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="mr-2 h-5 w-5" />
              Pago exitoso
            </CardTitle>
            <CardDescription>
              Tu pago ha sido procesado correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">
                Redirigiendo a la confirmación del pedido...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}