/**
 * API para gestión de módulos de pago
 */

import { Express, Request, Response } from 'express';
import { paymentModuleManager } from '../payment-modules/payment-module-manager';
import { storage } from '../storage';
import { db } from '../db';
import { orders } from '../../shared/schema';
import { sql, ilike } from 'drizzle-orm';

export function registerPaymentModuleRoutes(app: Express) {
  
  /**
   * Debug endpoint - temporal para testear sin autenticación
   */
  app.get('/api/debug/payment-modules', async (req: Request, res: Response) => {
    try {
      console.log('DEBUG: Obteniendo módulos de pago...');
      
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      console.log('DEBUG: Configuraciones encontradas:', paymentConfigs.length);
      
      await paymentModuleManager.initializeModules(paymentConfigs);
      
      const modulesInfo = paymentModuleManager.getModulesInfo();
      console.log('DEBUG: Módulos info:', modulesInfo);
      
      res.json(modulesInfo);
    } catch (error) {
      console.error('DEBUG: Error getting payment modules:', error);
      res.status(500).json({ error: 'Error al obtener módulos de pago' });
    }
  });
  
  /**
   * Obtener todos los módulos de pago y su configuración
   */
  app.get('/api/admin/payment-modules', async (req: Request, res: Response) => {
    try {
      console.log('🔧 ADMIN PAYMENT MODULES: Endpoint llamado');
      
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      console.log('🔧 ADMIN PAYMENT MODULES: Configuraciones cargadas:', paymentConfigs.length);
      
      await paymentModuleManager.initializeModules(paymentConfigs);
      
      const modulesInfo = paymentModuleManager.getModulesInfo();
      console.log('🔧 ADMIN PAYMENT MODULES: Módulos info:', modulesInfo.length);
      console.log('🔧 ADMIN PAYMENT MODULES: Primer módulo:', modulesInfo[0]);
      
      res.json(modulesInfo);
    } catch (error) {
      console.error('🔧 ADMIN PAYMENT MODULES: Error getting payment modules:', error);
      res.status(500).json({ error: 'Error al obtener módulos de pago' });
    }
  });

  /**
   * Obtener módulos de pago activos para el checkout
   */
  app.get('/api/payment-modules', async (req: Request, res: Response) => {
    try {
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);
      
      // Usar el método específico para checkout que devuelve solo módulos activos
      const checkoutModules = paymentModuleManager.getCheckoutModules();
      
      res.json(checkoutModules);
    } catch (error) {
      console.error('Error getting active payment modules:', error);
      res.status(500).json({ error: 'Error al obtener módulos de pago activos' });
    }
  });

  // Endpoint para obtener módulos incluyendo no configurados (para demo)
  app.get('/api/payment-modules/demo', async (req: Request, res: Response) => {
    try {
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);
      
      const checkoutModules = paymentModuleManager.getCheckoutModulesForDemo();
      res.json(checkoutModules);
    } catch (error) {
      console.error('Error getting payment modules for demo:', error);
      res.status(500).json({ error: 'Error al obtener módulos de pago' });
    }
  });

  /**
   * Obtener configuración específica de un módulo
   */
  app.get('/api/admin/payment-modules/:provider', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);
      
      const module = paymentModuleManager.getModule(provider);
      if (!module) {
        return res.status(404).json({ error: 'Módulo no encontrado' });
      }

      res.json({
        provider,
        name: module.getName(),
        isActive: module.isConfigured(),
        configFields: module.getConfigFields(),
        config: module.getConfig()
      });
    } catch (error) {
      console.error('Error getting payment module:', error);
      res.status(500).json({ error: 'Error al obtener módulo de pago' });
    }
  });

  /**
   * Actualizar configuración de un módulo
   */
  app.put('/api/admin/payment-modules/:provider', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { config, isActive } = req.body;

      // Actualizar en la base de datos
      const updated = await storage.updatePaymentConfig(provider, config, isActive);
      
      if (!updated) {
        return res.status(404).json({ error: 'Módulo no encontrado' });
      }

      // Recargar configuración en el manager
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);

      res.json({ message: 'Configuración actualizada correctamente' });
    } catch (error) {
      console.error('Error updating payment module:', error);
      res.status(500).json({ error: 'Error al actualizar módulo de pago' });
    }
  });

  // Ruta para obtener configuración pública de Stripe
  app.get("/api/payment-modules/stripe/config", async (req: Request, res: Response) => {
    try {
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);

      const stripeModule = paymentModuleManager.getModule('stripe');
      
      if (!stripeModule || !stripeModule.isConfigured()) {
        return res.status(404).json({ error: 'Stripe no está configurado o activo' });
      }

      const config = stripeModule.getConfig();
      res.json({
        publicKey: config.publicKey,
        environment: config.environment
      });
    } catch (error) {
      console.error('Error getting Stripe config:', error);
      res.status(500).json({ error: 'Error al obtener configuración de Stripe' });
    }
  });

  // Ruta para obtener configuración pública de PayPal
  app.get("/api/payment-modules/paypal/config", async (req: Request, res: Response) => {
    try {
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);

      const paypalModule = paymentModuleManager.getModule('paypal');
      
      if (!paypalModule || !paypalModule.isConfigured()) {
        return res.status(404).json({ error: 'PayPal no está configurado o activo' });
      }

      const config = paypalModule.getConfig();
      res.json({
        clientId: config.clientId,
        environment: config.environment
      });
    } catch (error) {
      console.error('Error getting PayPal config:', error);
      res.status(500).json({ error: 'Error al obtener configuración de PayPal' });
    }
  });

  /**
   * Toggle activación/desactivación de un módulo
   */
  app.post('/api/admin/payment-modules/:provider/toggle', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { isActive } = req.body;

      // Obtener configuración actual
      const paymentConfigs = await storage.getAllPaymentConfig();
      const currentConfig = paymentConfigs.find(config => config.provider === provider);
      
      // Actualizar en la base de datos manteniendo la configuración existente
      const updated = await storage.updatePaymentConfig(provider, currentConfig?.config || {}, isActive);
      
      if (!updated) {
        return res.status(404).json({ error: 'Módulo no encontrado' });
      }

      // Recargar configuración en el manager
      const updatedPaymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(updatedPaymentConfigs);

      res.json({ message: 'Estado del módulo actualizado correctamente', isActive });
    } catch (error) {
      console.error('Error toggling payment module:', error);
      res.status(500).json({ error: 'Error al cambiar estado del módulo' });
    }
  });

  /**
   * Endpoint específico para procesar pagos con Redsys
   * Mantiene compatibilidad con el frontend existente
   * IMPORTANTE: Debe estar ANTES del endpoint genérico para evitar conflictos de rutas
   */
  app.post('/api/payment/redsys/process', async (req: Request, res: Response) => {
    try {
      console.log('🚨🚨🚨 MI ENDPOINT ESPECÍFICO SE EJECUTA 🚨🚨🚨');
      console.log('🔧 ===== ENDPOINT REDSYS PROCESS CALLED =====');
      console.log('🔧 ENDPOINT REDSYS - Datos recibidos:', req.body);
      
      // Mapear los datos recibidos al formato esperado por el PaymentModuleManager
      const orderData = {
        id: req.body.orderId,
        orderNumber: req.body.orderNumber,
        amount: req.body.amount,
        currency: 'EUR',
        customerEmail: req.body.customerEmail,
        customerName: req.body.customerName,
        description: `Compra en Desguace Murcia - Pedido ${req.body.orderNumber}`,
        returnUrl: req.body.returnUrl || `${req.protocol}://${req.get('host')}/payment/success`,
        cancelUrl: req.body.cancelUrl || `${req.protocol}://${req.get('host')}/payment/failure`,
        metadata: req.body.metadata || { orderId: req.body.orderId }
      };

      console.log('🔧 ENDPOINT MAPEO - Debug completo:', {
        'req.body.orderId': req.body.orderId,
        'typeof req.body.orderId': typeof req.body.orderId,
        'orderData.id': orderData.id,
        'typeof orderData.id': typeof orderData.id,
        orderData
      });

      // Cargar configuración actual desde la base de datos
      console.log('🔧 ENDPOINT - Cargando configuración de pago...');
      const paymentConfigs = await storage.getAllPaymentConfig();
      console.log('🔧 ENDPOINT - Configuraciones cargadas:', paymentConfigs.length);
      
      await paymentModuleManager.initializeModules(paymentConfigs);
      console.log('🔧 ENDPOINT - Módulos inicializados');
      
      console.log('🔧 ENDPOINT - Llamando a processPayment con provider "redsys"');
      const result = await paymentModuleManager.processPayment('redsys', orderData);
      console.log('🔧 ENDPOINT - Resultado recibido:', { success: result.success, hasData: !!result.data });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error processing Redsys payment:', error);
      res.status(500).json({ 
        success: false, 
        errorMessage: 'Error interno del servidor' 
      });
    }
  });

  /**
   * Callback para Redsys
   */
  app.post('/api/payment/redsys/callback', async (req: Request, res: Response) => {
    try {
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);

      const result = await paymentModuleManager.handleCallback('redsys', req.body, req.headers);
      
      if (result.success) {
        // Actualizar estado del pedido
        const orderData = JSON.parse(req.body.Ds_MerchantParameters ? 
          Buffer.from(req.body.Ds_MerchantParameters, 'base64').toString('utf8') : '{}');
        
        console.log('💳 REDSYS CALLBACK SUCCESS - Datos del pedido:', orderData);
        
        // Obtener orderId del número de pedido de Redsys
        let orderId = null;
        
        if (orderData.Ds_Order) {
          console.log(`🔍 REDSYS CALLBACK - Ds_Order recibido: ${orderData.Ds_Order}`);
          
          // Buscar pedido por número completo que contenga estos dígitos
          try {
            // Usar storage para obtener todos los pedidos y filtrar
            const allOrders = await storage.getOrders();
            console.log(`🔍 REDSYS CALLBACK - Buscando en ${allOrders.length} pedidos`);
            
            // Buscar por coincidencia: usar los últimos 4-6 dígitos del número de Redsys
            const lastDigits = orderData.Ds_Order.slice(-4); // Últimos 4 dígitos
            console.log(`🔍 REDSYS CALLBACK - Buscando pedidos que terminen en: ${lastDigits}`);
            
            const matchingOrder = allOrders.find(order => 
              order.orderNumber && order.orderNumber.endsWith(lastDigits)
            );
            
            if (matchingOrder) {
              orderId = matchingOrder.id;
              console.log(`🔍 REDSYS CALLBACK - Pedido encontrado: ID ${orderId}, OrderNumber: ${matchingOrder.orderNumber}`);
            } else {
              console.log(`⚠️ No se encontró pedido con número que contenga: ${orderData.Ds_Order}`);
              console.log(`🔍 Primeros 3 pedidos para debug:`, allOrders.slice(0, 3).map(o => ({ id: o.id, orderNumber: o.orderNumber })));
            }
          } catch (error) {
            console.log(`❌ Error buscando pedido: ${error}`);
          }
        }
        
        // También intentar obtener de Ds_MerchantData si existe y no tenemos orderId
        if (!orderId && orderData.Ds_MerchantData) {
          try {
            const metadata = JSON.parse(orderData.Ds_MerchantData);
            if (metadata.orderId) {
              orderId = parseInt(metadata.orderId, 10);
              console.log(`🔍 REDSYS CALLBACK - OrderId desde MerchantData: ${orderId}`);
            }
          } catch (e) {
            console.log('⚠️ No se pudo parsear Ds_MerchantData');
          }
        }
        
        if (orderId) {
          console.log(`💳 REDSYS CALLBACK - Procesando pago exitoso para pedido ${orderId}`);
          
          // 1. Actualizar estado del pedido y del pago
          const orderUpdateSuccess = await storage.updateOrder(orderId, {
            paymentStatus: 'pagado',
            orderStatus: 'pendiente_verificar'  // Pagado pero pendiente de verificación manual
          });
          if (orderUpdateSuccess) {
            console.log(`✅ Estado de pago actualizado a "pagado" para pedido ${orderId}`);
          } else {
            console.log(`❌ Error actualizando estado de pago del pedido ${orderId}`);
          }
          
          // 2. Registrar información del pago
          try {
            await storage.createOrderPayment({
              orderId,
              paymentMethod: "card",
              paymentProvider: "redsys",
              transactionId: orderData.Ds_AuthorisationCode || orderData.DS_AUTHORISATION_CODE,
              amount: Number(orderData.Ds_Amount || orderData.DS_AMOUNT) / 100,
              status: "pagado",
              gatewayResponse: orderData
            });
            console.log(`✅ Información de pago registrada para pedido ${orderId}`);
          } catch (paymentError) {
            console.log(`⚠️ Error registrando información de pago para pedido ${orderId}:`, paymentError);
          }

          // 3. Desactivar automáticamente las piezas compradas
          const deactivationSuccess = await storage.deactivatePurchasedParts(orderId);
          if (deactivationSuccess) {
            console.log(`✅ Piezas del pedido ${orderId} desactivadas automáticamente`);
          } else {
            console.log(`⚠️ Error desactivando piezas del pedido ${orderId}`);
          }
          
          // 4. Obtener el pedido completo para limpiar el carrito
          const order = await storage.getOrderById(orderId);
          if (order && order.sessionId) {
            // Limpiar el carrito asociado a la sesión del pedido
            const cart = await storage.getCartBySessionId(order.sessionId);
            if (cart) {
              const cartClearSuccess = await storage.clearCart(cart.id);
              if (cartClearSuccess) {
                console.log(`✅ Carrito de la sesión ${order.sessionId} limpiado exitosamente`);
              } else {
                console.log(`⚠️ Error limpiando carrito de la sesión ${order.sessionId}`);
              }
            }
          }
          
          // 5. Redirigir a página de éxito con ID del pedido
          res.redirect(`/payment/success?orderId=${orderId}&cleared=true`);
        } else {
          console.log('⚠️ No se pudo obtener orderId del callback de Redsys');
          // Si no hay orderId, usar página genérica de éxito
          res.redirect('/payment/success');
        }
      } else {
        // Decodificar parámetros para obtener información del error
        const orderData = JSON.parse(req.body.Ds_MerchantParameters ? 
          Buffer.from(req.body.Ds_MerchantParameters, 'base64').toString('utf8') : '{}');
        
        const errorCode = orderData.Ds_Response || 'unknown';
        const errorMessage = result.errorMessage ? encodeURIComponent(result.errorMessage) : '';
        
        // Redirigir a página de fallo con código de error
        res.redirect(`/payment/failure?code=${errorCode}&message=${errorMessage}`);
      }
    } catch (error) {
      console.error('Error handling Redsys callback:', error);
      res.redirect('/payment/failure?code=system_error&message=' + encodeURIComponent('Error del sistema durante el procesamiento del pago'));
    }
  });

  /**
   * Callback para PayPal Success
   */
  app.get('/api/payment/paypal/success', async (req: Request, res: Response) => {
    try {
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);

      const result = await paymentModuleManager.handleCallback('paypal', req.query, req.headers);
      
      if (result.success) {
        // Actualizar estado del pedido basado en custom_id
        const customId = result.data?.payerInfo?.custom_id;
        if (customId) {
          const orderId = parseInt(customId);
          
          // Actualizar estado del pedido a "pagado"
          await storage.updateOrderPaymentStatus(orderId, 'pagado');
          console.log(`✅ Estado de pago actualizado a "pagado" para pedido ${orderId}`);
          
          // Desactivar automáticamente las piezas compradas
          const deactivationSuccess = await storage.deactivatePurchasedParts(orderId);
          if (deactivationSuccess) {
            console.log(`✅ Piezas del pedido ${orderId} desactivadas automáticamente`);
          } else {
            console.log(`⚠️ Error desactivando piezas del pedido ${orderId}`);
          }
        }
        
        res.redirect('/order-confirmation/' + customId);
      } else {
        res.redirect('/checkout?error=payment_failed');
      }
    } catch (error) {
      console.error('Error handling PayPal success:', error);
      res.redirect('/checkout?error=payment_error');
    }
  });

  /**
   * Callback para PayPal Cancel
   */
  app.get('/api/payment/paypal/cancel', async (req: Request, res: Response) => {
    res.redirect('/checkout?error=payment_cancelled');
  });

  /**
   * Webhook para Stripe
   */
  app.post('/api/payment/stripe/webhook', async (req: Request, res: Response) => {
    try {
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);

      const result = await paymentModuleManager.handleCallback('stripe', req.body, req.headers);
      
      if (result.success && result.data?.metadata?.orderId) {
        const orderId = parseInt(result.data.metadata.orderId);
        
        // Actualizar estado del pedido a "pagado"
        await storage.updateOrderPaymentStatus(orderId, 'pagado');
        console.log(`✅ Estado de pago actualizado a "pagado" para pedido ${orderId}`);
        
        // Desactivar automáticamente las piezas compradas
        const deactivationSuccess = await storage.deactivatePurchasedParts(orderId);
        if (deactivationSuccess) {
          console.log(`✅ Piezas del pedido ${orderId} desactivadas automáticamente`);
        } else {
          console.log(`⚠️ Error desactivando piezas del pedido ${orderId}`);
        }
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      res.status(400).json({ error: 'Webhook error' });
    }
  });

  /**
   * Obtener módulos activos para el checkout
   */
  app.get('/api/payment-modules/active', async (req: Request, res: Response) => {
    try {
      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);
      
      const activeModules = paymentModuleManager.getCheckoutModules();
      res.json(activeModules);
    } catch (error) {
      console.error('Error getting active payment modules:', error);
      res.status(500).json({ error: 'Error al obtener módulos de pago activos' });
    }
  });

  /**
   * Verificar transacción
   */
  app.post('/api/payment/:provider/verify', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { transactionId } = req.body;

      // Cargar configuración actual desde la base de datos
      const paymentConfigs = await storage.getAllPaymentConfig();
      await paymentModuleManager.initializeModules(paymentConfigs);

      const result = await paymentModuleManager.verifyTransaction(provider, transactionId);
      res.json(result);
    } catch (error) {
      console.error('Error verifying transaction:', error);
      res.status(500).json({ 
        success: false, 
        errorMessage: 'Error al verificar transacción' 
      });
    }
  });

  /**
   * Endpoint de prueba para desactivar piezas de un pedido manualmente
   */
  app.post('/api/admin/deactivate-order-parts/:orderId', async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de pedido inválido' 
        });
      }

      console.log(`🛒 Desactivando piezas del pedido ${orderId} manualmente...`);
      
      // Usar la función de desactivación
      const result = await storage.deactivatePurchasedParts(orderId);
      
      if (result) {
        res.json({ 
          success: true, 
          message: `Piezas del pedido ${orderId} desactivadas correctamente` 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Error al desactivar las piezas' 
        });
      }
    } catch (error) {
      console.error('Error deactivating order parts:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  });
}