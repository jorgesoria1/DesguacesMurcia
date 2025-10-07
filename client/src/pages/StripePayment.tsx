import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation, useRouter } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Load Stripe - the public key will be loaded from the server configuration
let stripePromise: Promise<any> | null = null;

const StripePaymentForm = ({ clientSecret, sessionId }: { clientSecret: string; sessionId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useRouter();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/stripe/success?session_id=${sessionId}`,
        },
      });

      if (error) {
        toast({
          title: "Error en el pago",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error en el pago",
        description: "Hubo un problema al procesar el pago",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Pago con Stripe</CardTitle>
        <CardDescription>
          Completa tu pago de forma segura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button 
            type="submit" 
            disabled={!stripe || processing} 
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Pagar ahora'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function StripePayment() {
  const [location] = useLocation();
  const [, navigate] = useRouter();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [stripePublicKey, setStripePublicKey] = useState("");

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        // Get Stripe configuration from server
        const response = await apiRequest("GET", "/api/payment-modules/stripe/config");
        const config = await response.json();
        
        if (!config.publicKey) {
          throw new Error('Stripe no configurado');
        }
        
        setStripePublicKey(config.publicKey);
        stripePromise = loadStripe(config.publicKey);
        
        // Get URL parameters
        const urlParams = new URLSearchParams(location.split('?')[1]);
        const client_secret = urlParams.get('client_secret');
        const session_id = urlParams.get('session_id');
        
        if (!client_secret || !session_id) {
          throw new Error('Faltan parámetros de pago');
        }

        setClientSecret(client_secret);
        setSessionId(session_id);
      } catch (error) {
        console.error('Error initializing Stripe:', error);
        toast({
          title: "Error",
          description: "Error al inicializar Stripe",
          variant: "destructive",
        });
        navigate('/checkout');
      }
    };

    initializeStripe();
  }, [location, navigate, toast]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm clientSecret={clientSecret} sessionId={sessionId} />
        </Elements>
      </div>
    </div>
  );
}