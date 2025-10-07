import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/components/cart/CartContext";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Building2, Truck, MapPin, User, Phone, Mail, UserCheck, UserX, LogIn, UserPlus, Banknote } from "lucide-react";
import { useLocation } from "wouter";
import { getGuestSessionId } from "@/lib/sessionUtils";
import DOMPurify from 'dompurify';

interface PaymentMethod {
  provider: string;
  name: string;
  config: any;
  isConfigured?: boolean;
  needsConfiguration?: boolean;
}

interface ShippingMethod {
  id: number;
  name: string;
  description: string;
  cost: number;
  originalCost: number;
  estimatedDays: number;
  zoneName: string;
  isFreeShipping: boolean;
  freeShippingThreshold: number;
  weightRange: {
    min: number;
    max: number | null;
  };
}

interface OrderFormData {
  customerName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  customerNifCif: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  billingAddress: string;
  billingCity: string;
  billingProvince: string;
  billingPostalCode: string;
  useSameAddress: boolean;
  shippingType: string; // "pickup" o "shipping"
  paymentMethodId: string;
  shippingMethodId: string;
  notes: string;
  createAccount: boolean;
  password: string;
}

export default function Checkout() {
  const { toast } = useToast();
  const { items, clearCart, setItems } = useCart();
  const [, setLocation] = useLocation();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shippingOptions, setShippingOptions] = useState<ShippingMethod[]>([]);
  const [provinces, setProvinces] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("guest");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "",
    customerLastName: "",
    customerEmail: "",
    customerPhone: "",
    customerNifCif: "",
    shippingAddress: "",
    shippingCity: "",
    shippingProvince: "",
    shippingPostalCode: "",
    billingAddress: "",
    billingCity: "",
    billingProvince: "",
    billingPostalCode: "",
    useSameAddress: true,
    shippingType: "", // Vacío inicialmente para que el usuario elija
    paymentMethodId: "",
    shippingMethodId: "",
    notes: "",
    createAccount: false,
    password: ""
  });

  useEffect(() => {
    loadPaymentMethodsAndProvinces();
    checkUserAuth();
    
    // Restaurar carrito si está vacío y hay un backup (usuario volvió de pago fallido)
    if (items.length === 0) {
      const backupCartData = sessionStorage.getItem('backup_cart_data');
      if (backupCartData) {
        try {
          const backupItems = JSON.parse(backupCartData);
          if (Array.isArray(backupItems) && backupItems.length > 0) {
            console.log('🔄 Restaurando carrito desde backup en checkout:', backupItems.length, 'items');
            setItems(backupItems);
            // Limpiar el backup después de restaurar
            sessionStorage.removeItem('backup_cart_data');
          }
        } catch (error) {
          console.error('Error restaurando carrito en checkout:', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (formData.shippingProvince && items.length > 0 && formData.shippingType) {
      if (formData.shippingType === 'pickup') {
        // Para recogida en instalaciones, establecer método de recogida y costo 0
        setFormData(prev => ({ ...prev, shippingMethodId: 'pickup' }));
        setShippingCost(0);
        setShippingOptions([]);
      } else if (formData.shippingType === 'shipping') {
        // Para envío a domicilio, calcular opciones normales
        calculateShippingOptions();
      }
    }
  }, [formData.shippingProvince, items, formData.shippingType]);

  const checkUserAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Get user permissions
        const permissionsResponse = await fetch('/api/user/permissions', {
          credentials: 'include'
        });
        if (permissionsResponse.ok) {
          const permissions = await permissionsResponse.json();
          setUserPermissions(permissions);
        }
        
        // If user is authenticated, auto-fill form with their data
        if (userData) {
          setFormData(prev => ({
            ...prev,
            customerName: userData.firstName || "",
            customerLastName: userData.lastName || "",
            customerEmail: userData.email || "",
            customerPhone: userData.phone || "",
            customerNifCif: userData.nifCif || "",
            shippingAddress: userData.address || "",
            shippingCity: userData.city || "",
            shippingProvince: userData.province || "",
            shippingPostalCode: userData.postalCode || "",
            billingAddress: userData.billingAddress || userData.address || "",
            billingCity: userData.billingCity || userData.city || "",
            billingProvince: userData.billingProvince || userData.province || "",
            billingPostalCode: userData.billingPostalCode || userData.postalCode || "",
            useSameAddress: !userData.billingAddress // Use same address if no billing address is set
          }));
          setActiveTab("authenticated");
        }
      }
    } catch (error) {
      console.error('Error checking user auth:', error);
    }
  };

  // Filtrar métodos de pago según el tipo de envío
  const getAvailablePaymentMethods = () => {
    if (formData.shippingType === 'pickup') {
      // Para recogida en instalaciones: pago en efectivo y otros métodos online
      return paymentMethods;
    } else if (formData.shippingType === 'shipping') {
      // Para envío a domicilio: solo métodos de pago online (sin efectivo)
      return paymentMethods.filter(method => method.provider !== 'cash');
    }
    return []; // Sin tipo de envío seleccionado, no mostrar métodos de pago
  };

  const loadPaymentMethodsAndProvinces = async () => {
    try {
      const [paymentResponse, provincesResponse] = await Promise.all([
        apiRequest("GET", "/api/payment-methods"),
        apiRequest("GET", "/api/provinces")
      ]);

      const paymentData = await paymentResponse.json();
      const provincesData = await provincesResponse.json();

      // Payment methods are already filtered to active ones in the API
      setPaymentMethods(paymentData);
      setProvinces(provincesData);

      // Set default payment method
      if (paymentData.length > 0) {
        setFormData(prev => ({ ...prev, paymentMethodId: paymentData[0].provider }));
      }
    } catch (error) {
      console.error("Error loading methods:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de pago y provincias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateShippingOptions = async () => {
    if (!formData.shippingProvince || items.length === 0) return;

    setCalculatingShipping(true);
    console.log(`🚚 Calculando envío para ${items.length} items distintos:`);
    items.forEach(item => {
      console.log(`  - ID: ${item.partId}, Código: ${item.partCode}, Cantidad: ${item.quantity}, Peso almacenado: ${item.partWeight}g`);
    });
    
    try {
      // For items without weight (backward compatibility), we'll fetch from API or use default
      const cartItems = await Promise.all(items.map(async (item) => {
        let weight = item.partWeight; // Weight in grams
        console.log(`Pieza ${item.partId} (${item.partCode}) - peso almacenado: ${weight}g`);
        
        // If no weight is stored, try to fetch from API or search by part code
        if (!weight || weight === 500) { // Always fetch real weight from API instead of using 500g default
          try {
            // First try to get part by ID
            let response = await fetch(`/api/parts/${item.partId}`);
            let partData = null;
            
            if (response.ok) {
              partData = await response.json();
            } else if (item.partCode) {
              // If direct ID lookup fails, try searching by part code
              console.log(`Buscando pieza por código: ${item.partCode}`);
              response = await fetch(`/api/search-parts?search=${encodeURIComponent(item.partCode)}&limit=1`);
              if (response.ok) {
                const searchData = await response.json();
                if (searchData.data && searchData.data.length > 0) {
                  partData = searchData.data[0];
                  console.log(`Encontrada pieza por código ${item.partCode}: ID ${partData.id}, peso ${partData.peso}g`);
                }
              }
            }
            
            if (partData) {
              const apiWeight = partData.peso ? parseInt(partData.peso.toString()) : null;
              console.log(`Pieza ${item.partId} - peso de API: ${apiWeight}g`);
              weight = apiWeight || 500; // Use API weight or fallback to 500g
            } else {
              console.log(`Pieza ${item.partId} - no encontrada, usando 500g por defecto`);
              weight = 500; // Default 500g for small parts
            }
          } catch (error) {
            console.error('Error fetching part weight:', error);
            weight = 500; // Default fallback
          }
        }
        
        const totalWeightForItem = weight * item.quantity;
        console.log(`Pieza ${item.partId} - peso final: ${weight}g × ${item.quantity} = ${totalWeightForItem}g`);
        return {
          partId: item.partId,
          quantity: item.quantity,
          price: item.price,
          peso: weight // Keep weight in grams per unit for server calculation
        };
      }));

      console.log("📤 Enviando datos al servidor para cálculo de envío:");
      console.log("  - Provincia:", formData.shippingProvince);
      console.log("  - Items del carrito:", cartItems);
      console.log("  - Total items:", cartItems.length);
      cartItems.forEach((item, index) => {
        console.log(`    [${index}] ID: ${item.partId}, Cantidad: ${item.quantity}, Peso unitario: ${item.peso}g, Peso total: ${item.peso * item.quantity}g`);
      });

      const response = await apiRequest("POST", "/api/shipping/calculate", {
        province: formData.shippingProvince,
        cartItems,
        postalCode: formData.shippingPostalCode
      });

      const data = await response.json();
      
      if (data.shippingOptions) {
        setShippingOptions(data.shippingOptions);
        
        // Auto-select the cheapest option
        if (data.shippingOptions.length > 0) {
          const cheapestOption = data.shippingOptions[0];
          setFormData(prev => ({ ...prev, shippingMethodId: cheapestOption.id.toString() }));
          setShippingCost(cheapestOption.cost);
        }
      }
    } catch (error) {
      console.error("Error calculating shipping options:", error);
      toast({
        title: "Error",
        description: "No se pudieron calcular las opciones de envío",
        variant: "destructive",
      });
      setShippingOptions([]);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true); // Show validation errors when user tries to submit
    setSubmitting(true);

    // Check if form is valid before proceeding
    if (!isFormValid()) {
      setSubmitting(false);
      toast({
        title: "Error en el formulario",
        description: "Por favor, completa todos los campos obligatorios antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      
      // Find selected payment method to handle different payment types
      const selectedPaymentMethod = paymentMethods.find(method => 
        method.provider === formData.paymentMethodId
      );

      if (!selectedPaymentMethod) {
        throw new Error("Método de pago no seleccionado");
      }

      // Get session ID to ensure consistency
      const sessionId = getGuestSessionId();
      
      const orderData = {
        customerName: formData.customerName,
        customerLastName: formData.customerLastName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerNifCif: formData.customerNifCif,
        shippingAddress: formData.shippingAddress,
        shippingCity: formData.shippingCity,
        shippingProvince: formData.shippingProvince,
        shippingPostalCode: formData.shippingPostalCode,
        shippingCountry: "España",
        billingAddress: formData.useSameAddress ? formData.shippingAddress : formData.billingAddress,
        billingCity: formData.useSameAddress ? formData.shippingCity : formData.billingCity,
        billingProvince: formData.useSameAddress ? formData.shippingProvince : formData.billingProvince,
        billingPostalCode: formData.useSameAddress ? formData.shippingPostalCode : formData.billingPostalCode,
        paymentMethodId: formData.paymentMethodId,
        shippingMethodId: formData.shippingType === 'pickup' ? 'pickup' : parseInt(formData.shippingMethodId),
        notes: formData.notes,
        items: items.map(item => ({
          partId: item.partId,
          quantity: item.quantity,
          price: item.price,
          partName: item.partName
        })),
        subtotal: totalPrice.toString(),
        shippingCost: shippingCost.toString(),
        total: (totalPrice + shippingCost).toString(),
        shippingType: formData.shippingType,
        createAccount: formData.createAccount,
        password: formData.password,
        sessionId: sessionId
      };

      // Debug: Log order data being sent
      console.log('🔍 Order data being sent:', orderData);

      // Handle different payment methods with proper flows
      if (selectedPaymentMethod.provider === 'stripe') {
        // Create Stripe Payment Intent using the new module system
        const paymentOrder = {
          amount: parseFloat(orderData.total),
          currency: 'EUR',
          description: `Pedido - Desguace Murcia`,
          customerEmail: orderData.customerEmail,
          customerName: `${orderData.customerName} ${orderData.customerLastName}`,
          metadata: { sessionId: sessionId }
        };
        
        const stripeResponse = await apiRequest("POST", "/api/payment/stripe/process", paymentOrder);
        
        if (stripeResponse.ok) {
          const stripeData = await stripeResponse.json();
          if (stripeData.success) {
            // Store order data in session for later use
            sessionStorage.setItem('pending_order_data', JSON.stringify(orderData));
            // Redirect to Stripe payment page
            window.location.href = `${stripeData.data.redirectUrl}&session_id=${sessionId}`;
            return;
          }
        }
      } else if (selectedPaymentMethod.provider === 'paypal') {
        // Create PayPal Order using the new module system
        const paymentOrder = {
          amount: parseFloat(orderData.total),
          currency: 'EUR',
          description: `Pedido - Desguace Murcia`,
          customerEmail: orderData.customerEmail,
          customerName: `${orderData.customerName} ${orderData.customerLastName}`,
          metadata: { sessionId: sessionId }
        };
        
        const paypalResponse = await apiRequest("POST", "/api/payment/paypal/process", paymentOrder);
        
        if (paypalResponse.ok) {
          const paypalData = await paypalResponse.json();
          if (paypalData.success) {
            // Store order data in session for later use
            sessionStorage.setItem('pending_order_data', JSON.stringify(orderData));
            // Redirect to PayPal payment page
            window.location.href = `${paypalData.data.redirectUrl}&session_id=${sessionId}`;
            return;
          }
        }
      } else if (selectedPaymentMethod.provider === 'redsys') {
        // Para Redsys, guardamos el carrito en sessionStorage ANTES de crear el pedido
        // para restaurarlo si el pago falla
        sessionStorage.setItem('backup_cart_data', JSON.stringify(items));
        
        // First create the order
        const response = await apiRequest("POST", "/api/orders/local", orderData);
        
        if (response.ok) {
          const order = await response.json();
          
          // Now process the payment with Redsys
          const paymentOrder = {
            id: order.id,
            orderNumber: order.orderNumber,
            amount: parseFloat(orderData.total),
            currency: 'EUR',
            description: `Pedido #${order.orderNumber} - Desguace Murcia`,
            customerEmail: orderData.customerEmail,
            customerName: `${orderData.customerName} ${orderData.customerLastName}`,
            returnUrl: `${window.location.origin}/order-confirmation/${order.id}?payment=redsys&sessionId=${sessionId}`,
            cancelUrl: `${window.location.origin}/checkout?error=payment_cancelled`,
            metadata: { orderId: order.id }
          };
          
          const paymentResponse = await apiRequest("POST", `/api/payment/redsys/process`, paymentOrder);
          
          if (paymentResponse.ok) {
            const paymentResult = await paymentResponse.json();
            
            if (paymentResult.success && paymentResult.data.formHtml) {
              // ✅ ENVÍO DIRECTO A REDSYS SIN PÁGINA INTERMEDIA
              console.log('🚨 CHECKOUT DEBUG - Enviando directamente a Redsys:', {
                success: paymentResult.success,
                hasFormHtml: !!paymentResult.data.formHtml,
                actionUrl: paymentResult.data.actionUrl,
                orderNumber: paymentResult.data.orderNumber,
                redsysOrderNumber: paymentResult.data.redsysOrderNumber,
                amount: paymentResult.data.amount
              });
              
              // Crear un contenedor temporal para el formulario (XSS-safe)
              const tempDiv = document.createElement('div');
              // Sanitize HTML content to prevent XSS vulnerabilities
              const sanitizedHtml = DOMPurify.sanitize(paymentResult.data.formHtml);
              tempDiv.innerHTML = sanitizedHtml;
              tempDiv.style.display = 'none';
              document.body.appendChild(tempDiv);
              
              // Buscar el formulario y enviarlo automáticamente
              const form = tempDiv.querySelector('form');
              if (form) {
                console.log('🚨 FORM FOUND - Submitting directly to Redsys');
                // Añadir el formulario al documento y enviarlo
                document.body.appendChild(form);
                form.submit();
              } else {
                console.error('❌ No se encontró el formulario en el HTML generado');
                throw new Error('Error en la configuración del pago');
              }
              
              return; // Exit here as we're redirecting to Redsys
            } else {
              throw new Error('Error al procesar el pago con Redsys');
            }
          } else {
            throw new Error('Error al procesar el pago con Redsys');
          }
        } else {
          const errorData = await response.json();
          
          // Handle specific validation errors
          if (response.status === 400 && errorData.error) {
            let friendlyMessage = "Por favor, completa todos los campos obligatorios";
            
            if (errorData.error.includes("customerPhone")) {
              friendlyMessage = "El teléfono es obligatorio y debe tener un formato válido";
            } else if (errorData.error.includes("customerName")) {
              friendlyMessage = "El nombre es obligatorio";
            } else if (errorData.error.includes("customerLastName")) {
              friendlyMessage = "Los apellidos son obligatorios";
            } else if (errorData.error.includes("customerEmail")) {
              friendlyMessage = "El email es obligatorio y debe tener un formato válido";
            } else if (errorData.error.includes("shippingAddress")) {
              friendlyMessage = "La dirección de envío es obligatoria";
            } else if (errorData.error.includes("shippingCity")) {
              friendlyMessage = "La ciudad es obligatoria";
            } else if (errorData.error.includes("shippingProvince")) {
              friendlyMessage = "La provincia es obligatoria";
            } else if (errorData.error.includes("shippingPostalCode")) {
              friendlyMessage = "El código postal es obligatorio";
            } else if (errorData.error.includes("paymentMethodId")) {
              friendlyMessage = "Debe seleccionar un método de pago";
            } else if (errorData.error.includes("shippingMethodId")) {
              friendlyMessage = "Debe seleccionar un método de envío";
            }
            
            throw new Error(friendlyMessage);
          }
          
          throw new Error(errorData.error || "Error al crear el pedido");
        }
      } else {
        // For other payment methods, create order first
        const response = await apiRequest("POST", "/api/orders/local", orderData);

        if (response.ok) {
          const order = await response.json();
          
          // Get guest session ID for navigation
          const sessionId = getGuestSessionId();
          
          // Handle different payment methods
          if (selectedPaymentMethod.provider === 'bank_transfer') {
            // For bank transfer, show bank details
            toast({
              title: "¡Pedido creado!",
              description: `Tu pedido #${order.orderNumber} ha sido creado. Consulta los datos de transferencia en la página de confirmación.`,
            });
            
            clearCart();
            setLocation(`/order-confirmation/${order.id}?payment=bank_transfer&sessionId=${sessionId}`);
          } else if (selectedPaymentMethod.provider === 'stripe') {
            // For Stripe, redirect to payment gateway
            toast({
              title: "¡Pedido creado!",
              description: `Tu pedido #${order.orderNumber} ha sido creado. Serás redirigido al pago.`,
            });
            
            clearCart();
            setLocation(`/order-confirmation/${order.id}?payment=stripe&sessionId=${sessionId}`);
          } else if (selectedPaymentMethod.provider === 'paypal') {
            // For PayPal, redirect to payment gateway
            toast({
              title: "¡Pedido creado!",
              description: `Tu pedido #${order.orderNumber} ha sido creado. Serás redirigido al pago con PayPal.`,
            });
            
            clearCart();
            setLocation(`/order-confirmation/${order.id}?payment=paypal&sessionId=${sessionId}`);
          } else {
            // Default behavior
            toast({
              title: "¡Pedido creado!",
              description: `Tu pedido #${order.orderNumber} ha sido creado correctamente`,
            });

            clearCart();
            setLocation(`/order-confirmation/${order.id}?sessionId=${sessionId}`);
          }
        } else {
          const errorData = await response.json();
          
          // Handle specific validation errors
          if (response.status === 400 && errorData.error) {
            let friendlyMessage = "Por favor, completa todos los campos obligatorios";
            
            if (errorData.error.includes("customerPhone")) {
              friendlyMessage = "El teléfono es obligatorio y debe tener un formato válido";
            } else if (errorData.error.includes("customerName")) {
              friendlyMessage = "El nombre es obligatorio";
            } else if (errorData.error.includes("customerLastName")) {
              friendlyMessage = "Los apellidos son obligatorios";
            } else if (errorData.error.includes("customerEmail")) {
              friendlyMessage = "El email es obligatorio y debe tener un formato válido";
            } else if (errorData.error.includes("shippingAddress")) {
              friendlyMessage = "La dirección de envío es obligatoria";
            } else if (errorData.error.includes("shippingCity")) {
              friendlyMessage = "La ciudad es obligatoria";
            } else if (errorData.error.includes("shippingProvince")) {
              friendlyMessage = "La provincia es obligatoria";
            } else if (errorData.error.includes("shippingPostalCode")) {
              friendlyMessage = "El código postal es obligatorio";
            } else if (errorData.error.includes("paymentMethodId")) {
              friendlyMessage = "Debe seleccionar un método de pago";
            } else if (errorData.error.includes("shippingMethodId")) {
              friendlyMessage = "Debe seleccionar un método de envío";
            }
            
            throw new Error(friendlyMessage);
          }
          
          throw new Error(errorData.error || "Error al crear el pedido");
        }
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar el pedido. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validation helper function
  const validateField = (field: keyof OrderFormData, value: string): string | null => {
    // Only show validation errors if showValidation is true or if the field has content
    if (!showValidation && (!value || value.trim().length === 0)) {
      return null;
    }
    
    switch (field) {
      case 'customerName':
        if (!value || value.trim().length === 0) return 'El nombre es obligatorio';
        return value.trim().length < 2 ? 'El nombre debe tener al menos 2 caracteres' : null;
      case 'customerLastName':
        if (!value || value.trim().length === 0) return 'Los apellidos son obligatorios';
        return value.trim().length < 2 ? 'Los apellidos deben tener al menos 2 caracteres' : null;
      case 'customerEmail':
        if (!value || value.trim().length === 0) return 'El email es obligatorio';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'El email debe tener un formato válido' : null;
      case 'customerPhone':
        if (!value || value.trim().length === 0) return 'El teléfono es obligatorio';
        return value.trim().length < 9 ? 'El teléfono debe tener al menos 9 dígitos' : null;
      case 'customerNifCif':
        if (!value || value.trim().length === 0) return 'El NIF/CIF es obligatorio';
        return value.trim().length < 9 ? 'El NIF/CIF debe tener al menos 9 caracteres' : null;
      case 'shippingAddress':
        if (!value || value.trim().length === 0) return 'La dirección es obligatoria';
        return value.trim().length < 5 ? 'La dirección debe tener al menos 5 caracteres' : null;
      case 'shippingCity':
        if (!value || value.trim().length === 0) return 'La ciudad es obligatoria';
        return value.trim().length < 2 ? 'La ciudad debe tener al menos 2 caracteres' : null;
      case 'shippingPostalCode':
        if (!value || value.trim().length === 0) return 'El código postal es obligatorio';
        return value.trim().length < 5 ? 'El código postal debe tener al menos 5 caracteres' : null;
      case 'billingAddress':
        if (!value || value.trim().length === 0) return 'La dirección de facturación es obligatoria';
        return value.trim().length < 5 ? 'La dirección debe tener al menos 5 caracteres' : null;
      case 'billingCity':
        if (!value || value.trim().length === 0) return 'La ciudad de facturación es obligatoria';
        return value.trim().length < 2 ? 'La ciudad debe tener al menos 2 caracteres' : null;
      case 'billingPostalCode':
        if (!value || value.trim().length === 0) return 'El código postal de facturación es obligatorio';
        return value.trim().length < 5 ? 'El código postal debe tener al menos 5 caracteres' : null;
      default:
        return null;
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    const requiredFields: (keyof OrderFormData)[] = [
      'customerName', 'customerLastName', 'customerEmail', 'customerPhone', 'customerNifCif',
      'shippingAddress', 'shippingCity', 'shippingProvince', 'shippingPostalCode'
    ];
    
    // Add billing address fields if not using same address
    if (!formData.useSameAddress) {
      requiredFields.push('billingAddress', 'billingCity', 'billingProvince', 'billingPostalCode');
    }
    
    return requiredFields.every(field => {
      const value = formData[field];
      return value && typeof value === 'string' && value.trim().length > 0 && !validateField(field, value);
    }) && formData.shippingType && formData.paymentMethodId && (
      formData.shippingType === 'pickup' ? 
        formData.shippingMethodId === 'pickup' : 
        formData.shippingMethodId
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        email: loginEmail,
        password: loginPassword
      });

      if (response.ok) {
        const userData = await response.json();
        toast({
          title: "¡Bienvenido!",
          description: `Has iniciado sesión como ${userData.firstName || loginEmail}`,
        });
        
        // Auto-fill form with user data if available
        if (userData.firstName && userData.lastName) {
          setFormData(prev => ({ 
            ...prev, 
            customerName: userData.firstName,
            customerLastName: userData.lastName,
            customerEmail: userData.email || loginEmail,
            customerPhone: userData.phone || "",
            shippingAddress: userData.address || "",
            shippingCity: userData.city || "",
            shippingPostalCode: userData.postalCode || "",
            billingAddress: userData.billingAddress || userData.address || "",
            billingCity: userData.billingCity || userData.city || "",
            billingProvince: userData.billingProvince || userData.province || "",
            billingPostalCode: userData.billingPostalCode || userData.postalCode || "",
            useSameAddress: !userData.billingAddress // Use same address if no billing address is set
          }));
        }
        
        setActiveTab("guest"); // Switch to checkout form
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en el inicio de sesión");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar sesión. Verifica tus credenciales.",
        variant: "destructive",
      });
    } finally {
      setLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Cargando opciones de pago y envío...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Carrito vacío</h2>
            <p className="text-gray-600 mb-6">Añade productos a tu carrito para proceder con la compra</p>
            <Button onClick={() => setLocation("/parts")}>
              Ver productos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Form */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${user ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="guest" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Comprar como invitado
              </TabsTrigger>
              {!user && (
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Iniciar sesión
                </TabsTrigger>
              )}
              {user && (
                <TabsTrigger value="authenticated" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Usar mis datos
                </TabsTrigger>
              )}
              {user && userPermissions?.isAdmin && (
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Pedido administrativo
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    Iniciar sesión
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="loginEmail">Email *</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="loginPassword">Contraseña *</Label>
                      <Input
                        id="loginPassword"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        placeholder="Tu contraseña"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={loggingIn} className="flex-1">
                        {loggingIn ? "Iniciando sesión..." : "Iniciar sesión"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setActiveTab("guest")}
                      >
                        Continuar como invitado
                      </Button>
                    </div>
                  </form>
                  <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Ventajas de iniciar sesión:</p>
                    <ul className="space-y-1">
                      <li>• Formulario auto-completado con tus datos</li>
                      <li>• Historial de pedidos</li>
                      <li>• Proceso de compra más rápido</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="authenticated" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    Bienvenido, {user?.firstName} {user?.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-green-800">
                      <strong>Perfecto!</strong> Tu información está completada automáticamente. 
                      Puedes modificar cualquier campo si es necesario.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Email de contacto</Label>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                      </div>
                      <div>
                        <Label>Rol de usuario</Label>
                        <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        onClick={() => setActiveTab("guest")}
                        className="w-full"
                      >
                        Continuar con el pedido
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="admin" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Pedido administrativo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Modo administrativo:</strong> Estás realizando un pedido como administrador. 
                      Tus datos se usarán automáticamente y tendrás acceso a opciones especiales.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Administrador</Label>
                        <p className="text-sm text-gray-600">{user?.firstName} {user?.lastName}</p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p className="text-sm text-gray-600">{user?.email}</p>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Permisos especiales:</strong> Como administrador, puedes gestionar este pedido 
                        desde el panel de administración una vez creado.
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        onClick={() => setActiveTab("guest")}
                        className="w-full"
                      >
                        Continuar con el pedido administrativo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="guest" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Información del cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerName">Nombre *</Label>
                        <Input
                          id="customerName"
                          value={formData.customerName}
                          onChange={(e) => updateFormData("customerName", e.target.value)}
                          required
                          placeholder="Tu nombre"
                          className={validateField("customerName", formData.customerName) ? "border-red-500" : ""}
                        />
                        {validateField("customerName", formData.customerName) && (
                          <p className="text-sm text-red-600 mt-1">
                            {validateField("customerName", formData.customerName)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="customerLastName">Apellidos *</Label>
                        <Input
                          id="customerLastName"
                          value={formData.customerLastName}
                          onChange={(e) => updateFormData("customerLastName", e.target.value)}
                          required
                          placeholder="Tus apellidos"
                          className={validateField("customerLastName", formData.customerLastName) ? "border-red-500" : ""}
                        />
                        {validateField("customerLastName", formData.customerLastName) && (
                          <p className="text-sm text-red-600 mt-1">
                            {validateField("customerLastName", formData.customerLastName)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="customerEmail">Email *</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) => updateFormData("customerEmail", e.target.value)}
                          required
                          placeholder="tu@email.com"
                          className={validateField("customerEmail", formData.customerEmail) ? "border-red-500" : ""}
                        />
                        {validateField("customerEmail", formData.customerEmail) && (
                          <p className="text-sm text-red-600 mt-1">
                            {validateField("customerEmail", formData.customerEmail)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="customerPhone">Teléfono *</Label>
                        <Input
                          id="customerPhone"
                          value={formData.customerPhone}
                          onChange={(e) => updateFormData("customerPhone", e.target.value)}
                          required
                          placeholder="123 456 789"
                          className={validateField("customerPhone", formData.customerPhone) ? "border-red-500" : ""}
                        />
                        {validateField("customerPhone", formData.customerPhone) && (
                          <p className="text-sm text-red-600 mt-1">
                            {validateField("customerPhone", formData.customerPhone)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="customerNifCif">NIF/CIF *</Label>
                      <Input
                        id="customerNifCif"
                        value={formData.customerNifCif}
                        onChange={(e) => updateFormData("customerNifCif", e.target.value)}
                        required
                        placeholder="12345678Z / A12345678"
                        className={validateField("customerNifCif", formData.customerNifCif) ? "border-red-500" : ""}
                        data-testid="input-nif-cif"
                      />
                      {validateField("customerNifCif", formData.customerNifCif) && (
                        <p className="text-sm text-red-600 mt-1">
                          {validateField("customerNifCif", formData.customerNifCif)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Account Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      Opciones de cuenta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="createAccount"
                        checked={formData.createAccount}
                        onChange={(e) => setFormData(prev => ({ ...prev, createAccount: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="createAccount" className="text-sm font-medium">
                        Crear cuenta para futuras compras
                      </Label>
                    </div>
                    
                    {formData.createAccount && (
                      <div>
                        <Label htmlFor="password">Contraseña *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => updateFormData("password", e.target.value)}
                          required={formData.createAccount}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium mb-1">Opciones de compra:</p>
                      <ul className="space-y-1">
                        <li>• <strong>Invitado:</strong> Compra rápida sin crear cuenta</li>
                        <li>• <strong>Cuenta nueva:</strong> Guarda tu información para futuras compras</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Dirección de envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shippingAddress">Dirección *</Label>
                  <Input
                    id="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={(e) => updateFormData("shippingAddress", e.target.value)}
                    required
                    placeholder="Calle, número, piso, puerta"
                    className={validateField("shippingAddress", formData.shippingAddress) ? "border-red-500" : ""}
                  />
                  {validateField("shippingAddress", formData.shippingAddress) && (
                    <p className="text-sm text-red-600 mt-1">
                      {validateField("shippingAddress", formData.shippingAddress)}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="shippingCity">Ciudad *</Label>
                    <Input
                      id="shippingCity"
                      value={formData.shippingCity}
                      onChange={(e) => updateFormData("shippingCity", e.target.value)}
                      required
                      placeholder="Tu ciudad"
                      className={validateField("shippingCity", formData.shippingCity) ? "border-red-500" : ""}
                    />
                    {validateField("shippingCity", formData.shippingCity) && (
                      <p className="text-sm text-red-600 mt-1">
                        {validateField("shippingCity", formData.shippingCity)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="shippingProvince">Provincia *</Label>
                    <Select
                      value={formData.shippingProvince}
                      onValueChange={(value) => updateFormData("shippingProvince", value)}
                    >
                      <SelectTrigger className={(!formData.shippingProvince && showValidation) ? "border-red-500" : ""}>
                        <SelectValue placeholder="Selecciona provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={province.name}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!formData.shippingProvince && showValidation && (
                      <p className="text-sm text-red-600 mt-1">
                        La provincia es obligatoria
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="shippingPostalCode">Código postal *</Label>
                    <Input
                      id="shippingPostalCode"
                      value={formData.shippingPostalCode}
                      onChange={(e) => updateFormData("shippingPostalCode", e.target.value)}
                      required
                      placeholder="12345"
                      className={validateField("shippingPostalCode", formData.shippingPostalCode) ? "border-red-500" : ""}
                    />
                    {validateField("shippingPostalCode", formData.shippingPostalCode) && (
                      <p className="text-sm text-red-600 mt-1">
                        {validateField("shippingPostalCode", formData.shippingPostalCode)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Dirección de facturación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useSameAddress"
                    checked={formData.useSameAddress}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => ({ 
                        ...prev, 
                        useSameAddress: checked,
                        billingAddress: checked ? prev.shippingAddress : "",
                        billingCity: checked ? prev.shippingCity : "",
                        billingProvince: checked ? prev.shippingProvince : "",
                        billingPostalCode: checked ? prev.shippingPostalCode : ""
                      }));
                    }}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="useSameAddress" className="text-sm font-medium">
                    Usar misma dirección que la de envío
                  </Label>
                </div>
                
                {!formData.useSameAddress && (
                  <>
                    <div>
                      <Label htmlFor="billingAddress">Dirección de facturación *</Label>
                      <Input
                        id="billingAddress"
                        value={formData.billingAddress}
                        onChange={(e) => updateFormData("billingAddress", e.target.value)}
                        required={!formData.useSameAddress}
                        placeholder="Calle, número, piso, puerta"
                        className={validateField("billingAddress", formData.billingAddress) && !formData.useSameAddress ? "border-red-500" : ""}
                      />
                      {validateField("billingAddress", formData.billingAddress) && !formData.useSameAddress && (
                        <p className="text-sm text-red-600 mt-1">
                          {validateField("billingAddress", formData.billingAddress)}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="billingCity">Ciudad *</Label>
                        <Input
                          id="billingCity"
                          value={formData.billingCity}
                          onChange={(e) => updateFormData("billingCity", e.target.value)}
                          required={!formData.useSameAddress}
                          placeholder="Tu ciudad"
                          className={validateField("billingCity", formData.billingCity) && !formData.useSameAddress ? "border-red-500" : ""}
                        />
                        {validateField("billingCity", formData.billingCity) && !formData.useSameAddress && (
                          <p className="text-sm text-red-600 mt-1">
                            {validateField("billingCity", formData.billingCity)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="billingProvince">Provincia *</Label>
                        <Select
                          value={formData.billingProvince}
                          onValueChange={(value) => updateFormData("billingProvince", value)}
                        >
                          <SelectTrigger className={(!formData.billingProvince && showValidation && !formData.useSameAddress) ? "border-red-500" : ""}>
                            <SelectValue placeholder="Selecciona provincia" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((province) => (
                              <SelectItem key={province.id} value={province.name}>
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!formData.billingProvince && showValidation && !formData.useSameAddress && (
                          <p className="text-sm text-red-600 mt-1">
                            La provincia es obligatoria
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="billingPostalCode">Código postal *</Label>
                        <Input
                          id="billingPostalCode"
                          value={formData.billingPostalCode}
                          onChange={(e) => updateFormData("billingPostalCode", e.target.value)}
                          required={!formData.useSameAddress}
                          placeholder="12345"
                          className={validateField("billingPostalCode", formData.billingPostalCode) && !formData.useSameAddress ? "border-red-500" : ""}
                        />
                        {validateField("billingPostalCode", formData.billingPostalCode) && !formData.useSameAddress && (
                          <p className="text-sm text-red-600 mt-1">
                            {validateField("billingPostalCode", formData.billingPostalCode)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {formData.useSameAddress && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Dirección de facturación:</strong> Se utilizará la misma dirección de envío para la facturación.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Tipo de entrega *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.shippingType}
                  onValueChange={(value) => {
                    updateFormData("shippingType", value);
                    // Reset payment method when changing shipping type
                    updateFormData("paymentMethodId", "");
                    updateFormData("shippingMethodId", "");
                    setShippingCost(0);
                  }}
                >
                  {/* Opción 1: Recogida en instalaciones */}
                  <div className="flex items-center space-x-2 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">🏪 Recogida en nuestras instalaciones</p>
                          <p className="text-sm text-gray-600">Desguace Murcia - Carretera Almuñecar, Km 1.5, 18640 Granada</p>
                          <p className="text-xs text-gray-500">Tel: 958 790 858 | Email: info@desguacemurcia.com</p>
                          <p className="text-xs text-blue-600 font-medium">Pago en efectivo disponible</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">GRATIS</p>
                          <p className="text-xs text-green-500">Sin gastos de envío</p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Opción 2: Envío a domicilio */}
                  <div className="flex items-center space-x-2 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                    <RadioGroupItem value="shipping" id="shipping" />
                    <Label htmlFor="shipping" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">🚚 Envío a domicilio</p>
                          <p className="text-sm text-gray-600">Recibe tu pedido en la dirección indicada</p>
                          <p className="text-xs text-gray-500">Entregas en 24-48h laborables</p>
                          <p className="text-xs text-orange-600 font-medium">Solo pago online</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600">Calculado según zona</p>
                          <p className="text-xs text-blue-500">Ver opciones disponibles</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Mostrar error si no se ha seleccionado tipo de envío */}
                {!formData.shippingType && showValidation && (
                  <p className="text-sm text-red-600 mt-2">
                    Debe seleccionar un tipo de entrega
                  </p>
                )}

                {/* Mostrar detalles específicos según el tipo de envío seleccionado */}
                {formData.shippingType === 'shipping' && formData.shippingProvince && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Opciones de envío disponibles</h4>
                    {calculatingShipping ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600">Calculando opciones de envío...</p>
                      </div>
                    ) : shippingOptions.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600">No hay opciones de envío disponibles para esta provincia</p>
                      </div>
                    ) : (
                      <div>
                        <RadioGroup
                          value={formData.shippingMethodId}
                          onValueChange={(value) => {
                            updateFormData("shippingMethodId", value);
                            const selectedOption = shippingOptions.find(opt => opt.id.toString() === value);
                            if (selectedOption) {
                              setShippingCost(selectedOption.cost);
                            }
                          }}
                        >
                        {shippingOptions.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                            <RadioGroupItem value={option.id.toString()} id={`shipping-${option.id}`} />
                            <Label htmlFor={`shipping-${option.id}`} className="flex-1">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{option.name}</p>
                                  <p className="text-sm text-gray-600">{option.description}</p>
                                  <p className="text-xs text-gray-500">{option.estimatedDays} días estimados</p>
                                  <p className="text-xs text-gray-500">Zona: {option.zoneName}</p>
                                </div>
                                <div className="text-right">
                                  {option.isFreeShipping ? (
                                    <div>
                                      <p className="text-sm font-medium text-green-600">GRATIS</p>
                                      <p className="text-xs text-gray-500">Precio normal: <span className="text-gray-900">€{option.originalCost.toFixed(2)}</span></p>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium text-gray-900">€{option.cost.toFixed(2)}</p>
                                  )}
                                </div>
                              </div>
                            </Label>
                          </div>
                        ))}
                        </RadioGroup>
                        {!formData.shippingMethodId && showValidation && (
                          <p className="text-sm text-red-600 mt-2">
                            Debe seleccionar un método de envío
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Método de pago *
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!formData.shippingType ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">Primero selecciona el tipo de entrega para ver los métodos de pago disponibles</p>
                  </div>
                ) : (
                  <div>
                    <RadioGroup
                      value={formData.paymentMethodId}
                      onValueChange={(value) => updateFormData("paymentMethodId", value)}
                    >
                    {getAvailablePaymentMethods().map((method) => (
                    <div key={method.provider} className={`flex items-center space-x-2 p-3 border rounded-lg ${method.needsConfiguration ? 'border-orange-200 bg-orange-50' : ''}`}>
                      <RadioGroupItem 
                        value={method.provider} 
                        id={`payment-${method.provider}`}
                        disabled={method.needsConfiguration}
                      />
                      <Label htmlFor={`payment-${method.provider}`} className="flex items-center gap-3">
                        {method.provider === 'stripe' && <CreditCard className="w-5 h-5 text-blue-600" />}
                        {method.provider === 'bank_transfer' && <Building2 className="w-5 h-5 text-green-600" />}
                        {method.provider === 'paypal' && <CreditCard className="w-5 h-5 text-yellow-600" />}
                        {method.provider === 'redsys' && <CreditCard className="w-5 h-5 text-red-600" />}
                        {method.provider === 'cash' && <Banknote className="w-5 h-5 text-orange-600" />}
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          {method.provider === 'bank_transfer' && !method.needsConfiguration && (
                            <p className="text-sm text-gray-600">
                              Los datos bancarios se mostrarán después de confirmar el pedido
                            </p>
                          )}
                          {method.needsConfiguration && (
                            <p className="text-sm text-orange-600">
                              Necesita configuración en el panel de administración
                            </p>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                    </RadioGroup>
                    {!formData.paymentMethodId && showValidation && (
                      <p className="text-sm text-red-600 mt-2">
                        Debe seleccionar un método de pago
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notas adicionales</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full p-3 border rounded-md"
                  rows={3}
                  placeholder="Instrucciones especiales para la entrega..."
                  value={formData.notes}
                  onChange={(e) => updateFormData("notes", e.target.value)}
                />
              </CardContent>
            </Card>
          </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumen del pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.partName}</p>
                    <p className="text-xs text-gray-600">{item.partFamily}</p>
                    {(item.partReference || item.partCode) && (
                      <div className="flex gap-1 mt-1">
                        {item.partReference && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                            Ref: {item.partReference}
                          </span>
                        )}
                        {item.partCode && (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                            Cód: {item.partCode}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs mt-1">Cantidad: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-900">€{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-gray-900 font-semibold">{items.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span className="text-gray-900 font-semibold">{shippingCost.toFixed(2)} €</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span className="text-gray-900 font-semibold">{(items.reduce((total, item) => total + (item.price * item.quantity), 0) + shippingCost).toFixed(2)} €</span>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitting || !isFormValid()}
                onClick={handleSubmit}
              >
                {submitting ? "Procesando..." : "Finalizar pedido"}
              </Button>
              
              {!isFormValid() && !submitting && showValidation && (
                <p className="text-xs text-red-600 text-center mt-2">
                  Por favor, completa todos los campos obligatorios y corrige los errores antes de continuar
                </p>
              )}

              <p className="text-xs text-gray-600 text-center">
                Al finalizar el pedido aceptas nuestros términos y condiciones
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}