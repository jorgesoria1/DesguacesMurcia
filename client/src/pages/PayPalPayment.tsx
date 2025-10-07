import { useEffect, useState } from 'react';
import { useLocation, useRouter } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

// PayPal Button Component
const PayPalButton = ({ amount, sessionId }: { amount: string; sessionId: string }) => {
  const { toast } = useToast();
  const [, navigate] = useRouter();
  const [loading, setLoading] = useState(true);

  const createOrder = async () => {
    try {
      const response = await apiRequest("POST", "/api/paypal/order", {
        amount: parseFloat(amount),
        currency: "EUR",
        intent: "CAPTURE",
      });
      
      if (response.ok) {
        const data = await response.json();
        return { orderId: data.id };
      }
      
      throw new Error('Failed to create PayPal order');
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      throw error;
    }
  };

  const captureOrder = async (orderId: string) => {
    try {
      const response = await apiRequest("POST", `/api/paypal/order/${orderId}/capture`);
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      throw new Error('Failed to capture PayPal order');
    } catch (error) {
      console.error('Error capturing PayPal order:', error);
      throw error;
    }
  };

  const onApprove = async (data: any) => {
    try {
      const orderData = await captureOrder(data.orderId);
      
      if (orderData.status === 'COMPLETED') {
        // Create the actual order in our system
        const pendingOrderData = JSON.parse(sessionStorage.getItem('pending_order_data') || '{}');
        
        const response = await apiRequest("POST", "/api/orders/local", {
          ...pendingOrderData,
          paymentTransactionId: orderData.id,
          paymentStatus: 'completed'
        });
        
        if (response.ok) {
          const order = await response.json();
          sessionStorage.removeItem('pending_order_data');
          navigate(`/order-confirmation/${order.id}?payment=paypal&sessionId=${sessionId}`);
        }
      }
    } catch (error) {
      toast({
        title: "Error en el pago",
        description: "Hubo un problema al procesar tu pago con PayPal",
        variant: "destructive",
      });
    }
  };

  const onCancel = () => {
    toast({
      title: "Pago cancelado",
      description: "El pago con PayPal fue cancelado",
      variant: "default",
    });
    navigate('/checkout');
  };

  const onError = (error: any) => {
    console.error('PayPal error:', error);
    toast({
      title: "Error en el pago",
      description: "Hubo un error al procesar el pago con PayPal",
      variant: "destructive",
    });
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = import.meta.env.PROD
            ? "https://www.paypal.com/web-sdk/v6/core"
            : "https://www.sandbox.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (error) {
        console.error("Failed to load PayPal SDK", error);
        setLoading(false);
      }
    };

    const initPayPal = async () => {
      try {
        const response = await apiRequest("GET", "/api/paypal/setup");
        const data = await response.json();
        
        const sdkInstance = await (window as any).paypal.createInstance({
          clientToken: data.clientToken,
          components: ["paypal-payments"],
        });

        const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
          onApprove,
          onCancel,
          onError,
        });

        const onClick = async () => {
          try {
            const checkoutOptionsPromise = createOrder();
            await paypalCheckout.start(
              { paymentFlow: "auto" },
              checkoutOptionsPromise,
            );
          } catch (error) {
            console.error('PayPal checkout error:', error);
            onError(error);
          }
        };

        const paypalButton = document.getElementById("paypal-button");
        if (paypalButton) {
          paypalButton.addEventListener("click", onClick);
        }

        setLoading(false);
      } catch (error) {
        console.error('PayPal initialization error:', error);
        setLoading(false);
      }
    };

    loadPayPalSDK();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando PayPal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-lg font-semibold">Total a pagar: {amount} €</p>
      </div>
      <div className="flex justify-center">
        <button
          id="paypal-button"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Pagar con PayPal
        </button>
      </div>
    </div>
  );
};

export default function PayPalPayment() {
  const [location] = useLocation();
  const [, navigate] = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1]);
    const amount_param = urlParams.get('amount');
    const session_id = urlParams.get('session_id');
    
    if (!amount_param || !session_id) {
      toast({
        title: "Error",
        description: "Faltan parámetros de pago",
        variant: "destructive",
      });
      navigate('/checkout');
      return;
    }

    setAmount(amount_param);
    setSessionId(session_id);
  }, [location, navigate, toast]);

  if (!amount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Pago con PayPal</CardTitle>
            <CardDescription>
              Completa tu pago de forma segura con PayPal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayPalButton amount={amount} sessionId={sessionId} />
            <div className="mt-6 text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/checkout')}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}