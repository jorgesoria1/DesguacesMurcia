import React, { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { configApi } from "./lib/api";
import { showBrowserWarning, safeHistoryPushState, safeDispatchEvent, safeAddEventListener, safeRemoveEventListener } from "@/utils/browserCompatibility";
// Sistema de placeholders SEO eliminado - Solo títulos dinámicos
// Usamos la implementación de autenticación de lib/auth
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/components/cart/CartContext";
import { CookieConsent } from "@/components/CookieConsent";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MaintenanceAlert from "@/components/MaintenanceAlert";
import Home from "@/pages/Home";
import Vehicles from "@/pages/Vehicles";
import VehicleDetail from "@/pages/VehicleDetail";
import VehicleSearch from "@/pages/VehicleSearch";
import Parts from "@/pages/Parts";
import PartDetail from "@/pages/PartDetail";
import ValueYourVehicle from "@/pages/ValueYourVehicle";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminImports from "@/pages/AdminImports";
import AdminSettings from "@/pages/AdminSettings";
import AdminVehicles from "@/pages/AdminVehicles";
import AdminParts from "@/pages/AdminParts";
import AdminUsers from "@/pages/AdminUsers";
import AdminClients from "@/pages/AdminClients";
import AdminOrders from "@/pages/AdminOrders";
import AdminPayments from "@/pages/AdminPayments";
import AdminPaymentMethods from "@/pages/AdminPaymentMethods";
import PaymentModules from "@/pages/admin/PaymentModules";
import AdminShipping from "@/pages/AdminShipping";
import AdminEmailConfig from "@/pages/AdminEmailConfig";
import AdminCookieSettings from "@/pages/AdminCookieSettings";
import ApiTester from "@/pages/ApiTester";
import Checkout from "@/pages/Checkout";
import Cart from "./pages/Cart";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import UserPanel from "@/pages/UserPanel";
import VehicleMatchingTest from "@/pages/VehicleMatchingTest";
import TestPaymentModules from "@/pages/TestPaymentModules";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import GoogleMerchantCenter from "@/pages/GoogleMerchantCenter";
import AdminImportOptimized from "@/pages/AdminImportOptimized";
import AdminCMSSimple from "@/pages/AdminCMSSimple";
import RedsysRedirect from "@/pages/RedsysRedirect";
import AdminCMSNew from "@/pages/AdminCMSNew";
import AdminCMSUnified from "@/pages/AdminCMSUnified";
import TestTabs from "@/pages/TestTabs";
import StripePayment from "@/pages/StripePayment";
import StripeSuccess from "@/pages/StripeSuccess";
import PayPalPayment from "@/pages/PayPalPayment";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import ManagerDashboard from "@/pages/ManagerDashboard";
import AdminPopups from "@/pages/AdminPopups";
import AdminBackups from "@/pages/AdminBackups";
import AdminMessages from "@/pages/AdminMessages";
import AdminGoogleReviewsNew from "@/pages/AdminGoogleReviewsNew";
import PopupManager from "@/components/PopupManager";

import DynamicPage from "@/pages/DynamicPage";
import { lazy } from "react";

// Componente principal del Router que decide qué versión mostrar
function Router() {
  // Hook global para scroll al inicio en navegación
  useScrollToTop();

  // Implementación simplificada para detectar modo móvil (sin cabecera/pie)
  const [isMobileView, setIsMobileView] = useState(false);

  // Efecto para detectar el parámetro mobile en la URL
  useEffect(() => {
    // Función para verificar si la URL tiene el parámetro platform=mobile
    function checkIsMobileView() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('platform') === 'mobile';
    }

    // Establecer estado según el parámetro URL
    setIsMobileView(checkIsMobileView());

    // Agregar un manejador global para todos los enlaces
    function handleClick(e: MouseEvent) {
      if (!isMobileView) return; // Solo actuar en modo móvil

      try {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');

        // Ignorar si no es un enlace o si es enlace externo
        if (!anchor || !anchor.href || anchor.target === '_blank' ||
            anchor.getAttribute('href')?.startsWith('http') &&
            !anchor.href.includes(window.location.hostname)) {
          return;
        }

        // Si el enlace no tiene ya el parámetro platform=mobile, agregarlo
        if (!anchor.href.includes('platform=mobile')) {
          e.preventDefault();

          // Extraer la parte de la ruta y los parámetros existentes
          const url = new URL(anchor.href);
          url.searchParams.set('platform', 'mobile');

          // Usar history.pushState para una navegación más rápida sin recargar toda la página
          const newUrl = url.toString();

          // Usar función segura para pushState
          safeHistoryPushState({}, '', newUrl);

          // Disparar un evento de cambio de URL para que los componentes detecten la navegación
          safeDispatchEvent(new Event('popstate'));
        }
      } catch (error) {
        console.warn('Error handling click navigation:', error);
      }
    }

    // Solo agregar el manejador en modo móvil usando función segura
    if (isMobileView) {
      safeAddEventListener(document, 'click', handleClick);
    }

    return () => {
      safeRemoveEventListener(document, 'click', handleClick);
    };
  }, [isMobileView]);

  // Renderizar con o sin cabecera/pie según sea móvil o no
  return (
    <div className="flex flex-col min-h-screen">
      {/* Alerta de mantenimiento - solo visible para administradores */}
      <MaintenanceAlert />

      {!isMobileView && <Header />}
      <main className={`flex-grow ${isMobileView ? 'mobile-view' : ''}`}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/vehiculos" component={Vehicles} />
          <Route path="/vehiculos/buscar" component={VehicleSearch} />
          {/* Ruta de detalle de vehículo individual (slug con ID) */}
          <Route path="/vehiculos/detalle/:slug" component={VehicleDetail} />
          {/* URLs amigables para vehículos - las más específicas primero */}
          <Route path="/vehiculos/buscar/:search" component={Vehicles} />
          <Route path="/vehiculos/:brand/:model/:year/:fuel/:power" component={Vehicles} />
          <Route path="/vehiculos/:brand/:model/:year/:fuel" component={Vehicles} />
          <Route path="/vehiculos/:brand/:model/:year" component={Vehicles} />
          <Route path="/vehiculos/:brand/:model" component={Vehicles} />
          <Route path="/vehiculos/:brand" component={Vehicles} />
          <Route path="/piezas" component={Parts} />
          <Route path="/piezas/buscar" component={Parts} />
          {/* Ruta de detalle de pieza individual (slug con ID) */}
          <Route path="/piezas/detalle/:slug" component={PartDetail} />
          {/* URLs amigables para piezas - las más específicas primero */}
          <Route path="/piezas/buscar/:search" component={Parts} />
          <Route path="/piezas/:brand/:model/:family/:year/:fuel" component={Parts} />
          <Route path="/piezas/:brand/:model/:family/:year" component={Parts} />
          <Route path="/piezas/:brand/:model/:family" component={Parts} />
          <Route path="/piezas/:brand/:model/:year" component={Parts} />
          <Route path="/piezas/:brand/:model" component={Parts} />
          <Route path="/piezas/:brand" component={Parts} />
          <Route path="/parts" component={Parts} />
          <Route path="/parts/:slug" component={PartDetail} />
          <Route path="/tasamos-tu-vehiculo" component={ValueYourVehicle} />
          <Route path="/contacto" component={Contact} />
          <Route path="/prueba-matching" component={VehicleMatchingTest} />
          <Route path="/admin" component={Admin} />

          {/* Rutas de autenticación */}
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />

          {/* Rutas de e-commerce */}
          <Route path="/checkout" component={Checkout} />
          <Route path="/cart" component={Cart} />
          <Route path="/redsys-redirect" component={RedsysRedirect} />
          <Route path="/order-confirmation/:orderId" component={OrderConfirmation} />

          {/* Rutas de pago */}
          <Route path="/payment/stripe" component={StripePayment} />
          <Route path="/payment/stripe/success" component={StripeSuccess} />
          <Route path="/payment/paypal" component={PayPalPayment} />
          <Route path="/payment/success" component={PaymentSuccess} />
          <Route path="/payment/failure" component={PaymentFailure} />
          <ProtectedRoute path="/panel" component={UserPanel} />
          <ProtectedRoute path="/pedidos" component={Orders} />
          <ProtectedRoute path="/pedidos/:id" component={OrderDetail} />

          {/* Rutas de manager - acceso limitado */}
          <ProtectedRoute path="/manager" component={ManagerDashboard} />
          <ProtectedRoute path="/manager/dashboard" component={ManagerDashboard} />

          {/* Antiguas rutas admin - mantenemos para compatibilidad */}
          <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} />

          {/* Nuevas rutas admin */}
          <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} />
          <ProtectedRoute path="/admin/imports" component={AdminImports} />
          <ProtectedRoute path="/admin/import-optimized" component={AdminImportOptimized} />
          <ProtectedRoute path="/admin/settings" component={AdminSettings} />
          <ProtectedRoute path="/admin/vehicles" component={AdminVehicles} />
          <ProtectedRoute path="/admin/vehicles/new" component={AdminVehicles} />
          <ProtectedRoute path="/admin/vehicles/edit/:id" component={AdminVehicles} />
          <ProtectedRoute path="/admin/parts" component={AdminParts} />
          <ProtectedRoute path="/admin/parts/new" component={AdminParts} />
          <ProtectedRoute path="/admin/parts/edit/:id" component={AdminParts} />
          <ProtectedRoute path="/admin/orders" component={AdminOrders} />
          <ProtectedRoute path="/admin/pedidos" component={AdminOrders} />
          <ProtectedRoute path="/admin/users" component={AdminUsers} />
          <ProtectedRoute path="/admin/clients" component={AdminClients} />
          <ProtectedRoute path="/admin/payments" component={AdminPayments} />
          <ProtectedRoute path="/admin/payment-methods" component={AdminPaymentMethods} />
          <ProtectedRoute path="/admin/payment-modules" component={PaymentModules} />
          <ProtectedRoute path="/admin/shipping" component={AdminShipping} />
          <ProtectedRoute path="/admin/cms" component={AdminCMSUnified} />
          <ProtectedRoute path="/admin-cms-simple" component={AdminCMSSimple} />
          <ProtectedRoute path="/admin/popups" component={AdminPopups} />
          <ProtectedRoute path="/admin/backups" component={AdminBackups} />
          <ProtectedRoute path="/admin/messages" component={AdminMessages} />
          <ProtectedRoute path="/admin/email-config" component={AdminEmailConfig} />
          <ProtectedRoute path="/admin/cookie-settings" component={AdminCookieSettings} />
          <ProtectedRoute path="/admin/api-tester" component={ApiTester} />
          <ProtectedRoute path="/admin/part-lookup" component={lazy(() => import("@/pages/PartLookup"))} />
          <ProtectedRoute path="/admin/email-config" component={AdminEmailConfig} />
          <ProtectedRoute path="/admin/vehicle-matching-test" component={VehicleMatchingTest} />
          <Route path="/test-payment-modules" component={TestPaymentModules} />
          <Route path="/test-tabs" component={TestTabs} />
          <Route path="/google-merchant-center" component={GoogleMerchantCenter} />

          {/* Rutas dinámicas del CMS - específicas primero */}
          <Route path="/nosotros" component={DynamicPage} />
          <Route path="/aviso-legal" component={DynamicPage} />
          <Route path="/politica-privacidad" component={DynamicPage} />
          <Route path="/politica-cookies" component={DynamicPage} />
          <Route path="/terminos-condiciones" component={DynamicPage} />
          <Route path="/formas-pago" component={DynamicPage} />
          <Route path="/politica-envios" component={DynamicPage} />
          <Route path="/condiciones-compra" component={DynamicPage} />
          <Route path="/:slug" component={DynamicPage} />

          <Route component={NotFound} />
        </Switch>
      </main>
      {!isMobileView && <Footer />}
      <CookieConsent />

      {/* Sistema de Pop-ups - mostrar en todas las páginas */}
      <PopupManager />
    </div>
  );
}

function App() {
  useEffect(() => {
    // Verificar compatibilidad del navegador al cargar la aplicación
    showBrowserWarning();

    const fetchChatbotCode = async () => {
      try {
        const response = await fetch("/api/config/chatbot");
        const data = await response.json();

        // Usar chatbotCode en lugar de code
        if (data.chatbotCode) {
          // Limpiar script existente si existe
          const existingScript = document.getElementById("voiceflow-chatbot");
          if (existingScript) {
            existingScript.remove();
          }

          // Validar que el código no esté vacío y sea una cadena
          if (data.chatbotCode && typeof data.chatbotCode === 'string' && data.chatbotCode.trim() !== '') {
            try {
              // Crear nuevo script
              const script = document.createElement('script');
              script.id = "voiceflow-chatbot";
              script.type = "text/javascript";

              // Extraer solo el contenido JavaScript del script, eliminando las etiquetas <script>
              const scriptContent = data.chatbotCode.replace(/<script[^>]*>|<\/script>/gi, '');

              // Validar que el contenido del script sea seguro
              if (scriptContent.trim() && !scriptContent.includes('eval(') && !scriptContent.includes('Function(')) {
                // Usar textContent en lugar de innerHTML para mayor seguridad
                script.textContent = scriptContent;

                // Añadir el script al documento
                document.body.appendChild(script);

                console.log("✅ Chatbot Voiceflow cargado correctamente");
              } else {
                console.warn("⚠️ Código del chatbot contiene contenido inseguro, no se cargará");
              }
            } catch (error) {
              console.error("❌ Error al cargar el chatbot:", error);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error cargando código del chatbot:", error);
      }
    };

    fetchChatbotCode();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Router />
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;