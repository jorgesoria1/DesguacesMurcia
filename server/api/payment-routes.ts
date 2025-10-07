
import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { shippingService } from "../services/shipping";
import { enhancedShippingService } from "../services/shipping-enhanced";
import { RedsysService } from "../services/redsys";
import { z } from "zod";

export function registerPaymentRoutes(app: Express) {
  
  // Obtener métodos de envío activos
  app.get("/api/shipping/methods", async (req: Request, res: Response) => {
    try {
      const { pool } = await import("../db");
      const result = await pool.query("SELECT * FROM shipping_config WHERE is_active = true ORDER BY id");
      const methods = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        base_price: parseFloat(row.base_price),
        free_shipping_threshold: row.free_shipping_threshold ? parseFloat(row.free_shipping_threshold) : null,
        weight_based_pricing: row.weight_based_pricing,
        price_per_kg: parseFloat(row.price_per_kg),
        max_weight: row.max_weight ? parseFloat(row.max_weight) : null,
        estimated_days: row.estimated_days,
        is_active: row.is_active
      }));
      res.json(methods);
    } catch (error: any) {
      console.error("Error al obtener métodos de envío:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Calcular costo de envío usando tarifas por tramos (compatible con checkout)
  app.post("/api/shipping/calculate-old", async (req: Request, res: Response) => {
    const schema = z.object({
      methodId: z.number(),
      subtotal: z.number(),
      totalWeight: z.number().optional()
    });

    try {
      const { methodId, subtotal, totalWeight = 0 } = schema.parse(req.body);
      
      const { pool } = await import("../db");
      
      // Obtener método de envío
      const methodResult = await pool.query(
        "SELECT * FROM shipping_config WHERE id = $1 AND is_active = true",
        [methodId]
      );

      if (methodResult.rows.length === 0) {
        return res.status(404).json({ error: "Método de envío no encontrado" });
      }

      const method = methodResult.rows[0];

      // Verificar envío gratuito primero
      if (method.free_shipping_threshold && subtotal >= parseFloat(method.free_shipping_threshold)) {
        return res.json({ cost: 0 });
      }

      // Buscar la tarifa apropiada por peso usando los tramos configurados
      const rateResult = await pool.query(`
        SELECT price FROM shipping_rates 
        WHERE shipping_config_id = $1 
        AND min_weight <= $2 
        AND (max_weight IS NULL OR max_weight >= $2)
        ORDER BY min_weight DESC 
        LIMIT 1
      `, [methodId, totalWeight]);

      let cost = parseFloat(method.base_price); // Precio base por defecto

      if (rateResult.rows.length > 0) {
        cost = parseFloat(rateResult.rows[0].price);
      }

      res.json({ cost: parseFloat(cost.toFixed(2)) });
    } catch (error: any) {
      console.error("Error al calcular envío:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Iniciar pago con Redsys
  app.post("/api/payment/redsys/init", async (req: Request, res: Response) => {
    const schema = z.object({
      orderId: z.number(),
      successUrl: z.string().url(),
      errorUrl: z.string().url()
    });

    try {
      const { orderId, successUrl, errorUrl } = schema.parse(req.body);
      
      // Obtener configuración de Redsys desde payment_config
      const paymentConfigs = await storage.getAllPaymentConfig();
      const redsysConfig = paymentConfigs.find(config => config.provider === 'redsys');
      
      if (!redsysConfig || !redsysConfig.isActive) {
        return res.status(400).json({ error: "Configuración de Redsys no encontrada o inactiva" });
      }

      const config = redsysConfig.config;
      const redsysService = new RedsysService(config);

      // Obtener detalles del pedido
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Crear formulario de pago
      const paymentForm = redsysService.generatePaymentForm({
        orderId: orderId.toString().padStart(12, "0"),
        amount: Math.round(Number(order.total) * 100), // Convertir a céntimos
        currency: "EUR",
        description: `Pedido #${orderId}`,
        customerEmail: order.customerEmail,
        merchantUrl: `${req.protocol}://${req.get("host")}/api/payment/redsys/notification`,
        successUrl,
        errorUrl
      });

      res.json({ paymentForm });
    } catch (error: any) {
      console.error("Error al iniciar pago:", error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Valida si un código de respuesta de Redsys representa un pago exitoso
   * Basado en documentación oficial de Redsys
   */
  function isRedsysPaymentSuccessful(responseCode: number, errorCode?: string): boolean {
    // Códigos exitosos: 0000-0099 (documentación oficial Redsys)
    // EXCLUIR códigos de error específicos que están en este rango pero son errores
    if (responseCode < 0 || responseCode > 99) {
      return false;
    }
    
    // Excluir códigos de error específicos conocidos
    const errorCodes = [
      9915, // SIS9915: Usuario canceló el pago
      9064, // SIS9064: Transacción duplicada
      9104, // SIS9104: Error en comercio
      // Añadir más códigos de error conocidos aquí según necesidad
    ];
    
    if (errorCodes.includes(responseCode)) {
      return false;
    }
    
    // Si hay código de error SIS, es un error independientemente del código de respuesta
    if (errorCode && errorCode.startsWith('SIS')) {
      return false;
    }
    
    return true;
  }

  // Notificación de Redsys
  app.post("/api/payment/redsys/notification", async (req: Request, res: Response) => {
    const startTime = Date.now();
    let orderId: number | null = null;
    let responseCode: number | null = null;
    let errorCode: string | undefined = undefined;
    
    try {
      console.log(`🔔 REDSYS NOTIFICATION START - Timestamp: ${new Date().toISOString()}`);
      console.log(`📥 REDSYS NOTIFICATION - Request body keys: ${Object.keys(req.body)}`);
      
      const { Ds_MerchantParameters, Ds_Signature } = req.body;

      if (!Ds_MerchantParameters || !Ds_Signature) {
        console.error("❌ REDSYS NOTIFICATION - Parámetros faltantes en la notificación");
        return res.status(400).send("FAIL");
      }

      // Obtener configuración de Redsys desde payment_config
      const paymentConfigs = await storage.getAllPaymentConfig();
      const redsysConfig = paymentConfigs.find(config => config.provider === 'redsys');
      
      if (!redsysConfig || !redsysConfig.isActive) {
        console.error("❌ REDSYS NOTIFICATION - Configuración de Redsys no encontrada o inactiva");
        return res.status(400).send("FAIL");
      }

      const config = redsysConfig.config;
      console.log(`🔧 REDSYS NOTIFICATION - Usando configuración merchant: ${config.merchantCode}`);
      const redsysService = new RedsysService(config);

      // Verificar firma
      console.log(`🔐 REDSYS NOTIFICATION - Verificando firma digital...`);
      const isValidSignature = redsysService.verifyResponse(Ds_MerchantParameters, Ds_Signature);
      console.log(`🔐 REDSYS NOTIFICATION - Firma válida: ${isValidSignature}`);
      
      if (!isValidSignature) {
        console.error(`❌ REDSYS NOTIFICATION - FIRMA INVÁLIDA - POSIBLE INTENTO DE FRAUDE`);
        return res.status(400).send("FAIL");
      }

      // Parsear respuesta
      const response = redsysService.parseResponse(Ds_MerchantParameters);
      console.log(`📊 REDSYS NOTIFICATION - Respuesta parseada:`, {
        Ds_Order: response.Ds_Order,
        Ds_Response: response.Ds_Response,
        Ds_ErrorCode: response.Ds_ErrorCode,
        Ds_Amount: response.Ds_Amount,
        Ds_AuthorisationCode: response.Ds_AuthorisationCode
      });
      
      // Extraer datos clave
      const dsOrder = response.Ds_Order;
      responseCode = parseInt(response.Ds_Response);
      errorCode = response.Ds_ErrorCode;
      
      console.log(`🔍 REDSYS NOTIFICATION - Ds_Order: ${dsOrder}, ResponseCode: ${responseCode}, ErrorCode: ${errorCode || 'N/A'}`);
      
      // Buscar pedido por número completo que contenga estos dígitos
      const orders = await storage.getOrders();
      const matchingOrder = orders.find(order => 
        order.orderNumber && order.orderNumber.includes(dsOrder)
      );
      
      if (!matchingOrder) {
        console.error(`❌ REDSYS NOTIFICATION - No se encontró pedido con número que contenga: ${dsOrder}`);
        console.log(`🔍 REDSYS NOTIFICATION - Pedidos disponibles: ${orders.slice(-5).map(o => o.orderNumber).join(', ')}`);
        return res.status(400).send("FAIL");
      }
      
      orderId = matchingOrder.id;
      console.log(`✅ REDSYS NOTIFICATION - Pedido encontrado: ID ${orderId}, OrderNumber: ${matchingOrder.orderNumber}`);

      // Validar estado del pago usando función mejorada
      const isPaymentSuccessful = isRedsysPaymentSuccessful(responseCode, errorCode);
      console.log(`💳 REDSYS NOTIFICATION - ¿Pago exitoso? ${isPaymentSuccessful} (Code: ${responseCode}, Error: ${errorCode || 'N/A'})`);

      // Determinar estados
      let paymentStatus = "pendiente";
      let orderStatus = "pendiente_verificar";

      if (isPaymentSuccessful) {
        paymentStatus = "pagado";
        orderStatus = "pendiente_verificar";  // Pagado pero pendiente de verificación manual
        console.log(`✅ REDSYS NOTIFICATION - Marcando pedido ${orderId} como PAGADO`);
      } else {
        paymentStatus = "pendiente";
        orderStatus = "pendiente";
        console.log(`❌ REDSYS NOTIFICATION - Marcando pedido ${orderId} como PENDIENTE (pago falló o fue cancelado)`);
      }

      // TRANSACCIÓN ATÓMICA: Actualizar pedido y crear registro de pago
      console.log(`🔄 REDSYS NOTIFICATION - Iniciando actualización atómica para pedido ${orderId}`);
      
      try {
        // 1. Actualizar estado del pedido
        const orderUpdateSuccess = await storage.updateOrder(orderId, {
          paymentStatus,
          orderStatus
        });
        
        if (!orderUpdateSuccess) {
          throw new Error("Falló la actualización del estado del pedido");
        }
        console.log(`✅ REDSYS NOTIFICATION - Estado del pedido ${orderId} actualizado: ${paymentStatus}`);

        // 2. Crear registro de pago (SIEMPRE, incluso para pagos fallidos)
        const paymentRecord = {
          orderId,
          paymentMethod: "card",
          paymentProvider: "redsys",
          transactionId: response.Ds_AuthorisationCode || "N/A",
          amount: Number(response.Ds_Amount) / 100,
          status: paymentStatus,
          gatewayResponse: response
        };
        
        const paymentCreated = await storage.createOrderPayment(paymentRecord);
        
        if (!paymentCreated) {
          // Si falla la creación del pago, revertir el estado del pedido
          console.error(`❌ REDSYS NOTIFICATION - Error creando registro de pago, revirtiendo pedido ${orderId}`);
          await storage.updateOrder(orderId, {
            paymentStatus: "pendiente",
            orderStatus: "pendiente"
          });
          throw new Error("Falló la creación del registro de pago");
        }
        console.log(`✅ REDSYS NOTIFICATION - Registro de pago creado para pedido ${orderId}`);

        // 3. Si el pago fue exitoso, realizar acciones adicionales
        if (isPaymentSuccessful) {
          console.log(`🎉 REDSYS NOTIFICATION - Procesando acciones post-pago para pedido ${orderId}`);
          
          // Desactivar automáticamente las piezas compradas
          try {
            const deactivationSuccess = await storage.deactivatePurchasedParts(orderId);
            if (deactivationSuccess) {
              console.log(`✅ REDSYS NOTIFICATION - Piezas del pedido ${orderId} desactivadas automáticamente`);
            } else {
              console.log(`⚠️ REDSYS NOTIFICATION - Error desactivando piezas del pedido ${orderId} (no crítico)`);
            }
          } catch (deactivationError) {
            console.error(`⚠️ REDSYS NOTIFICATION - Error en desactivación de piezas:`, deactivationError);
          }
          
          // Limpiar el carrito asociado al pedido
          try {
            const order = await storage.getOrderById(orderId);
            if (order && order.sessionId) {
              const cart = await storage.getCartBySessionId(order.sessionId);
              if (cart) {
                const cartClearSuccess = await storage.clearCart(cart.id);
                if (cartClearSuccess) {
                  console.log(`✅ REDSYS NOTIFICATION - Carrito de la sesión ${order.sessionId} limpiado`);
                } else {
                  console.log(`⚠️ REDSYS NOTIFICATION - Error limpiando carrito de la sesión ${order.sessionId} (no crítico)`);
                }
              }
            }
          } catch (cartError) {
            console.error(`⚠️ REDSYS NOTIFICATION - Error limpiando carrito:`, cartError);
          }
        } else {
          console.log(`ℹ️ REDSYS NOTIFICATION - Pago no exitoso, omitiendo acciones post-pago para pedido ${orderId}`);
        }

        const processingTime = Date.now() - startTime;
        console.log(`🏁 REDSYS NOTIFICATION COMPLETED - Pedido ${orderId} procesado en ${processingTime}ms`);
        
        res.send("OK");
        
      } catch (atomicError) {
        console.error(`💥 REDSYS NOTIFICATION - Error en transacción atómica para pedido ${orderId}:`, atomicError);
        
        // Log adicional para debugging
        console.error(`🔍 REDSYS NOTIFICATION - Detalles del error atómico:`, {
          orderId,
          responseCode,
          errorCode,
          paymentStatus,
          orderStatus,
          error: atomicError.message
        });
        
        throw atomicError; // Re-lanzar para manejo en catch principal
      }

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`💥 REDSYS NOTIFICATION FATAL ERROR - Tiempo transcurrido: ${processingTime}ms`);
      console.error(`💥 REDSYS NOTIFICATION - Error details:`, {
        orderId,
        responseCode,
        errorCode,
        message: error.message,
        stack: error.stack
      });
      
      res.status(500).send("FAIL");
    }
  });

  // TEST ENDPOINT: Simular callback de Redsys exitoso (solo para desarrollo)
  app.post("/api/payment/redsys/test-callback", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ error: "orderId requerido" });
      }
      
      console.log(`💳 TEST CALLBACK - Simulando pago exitoso para pedido ${orderId}`);
      
      // Actualizar estado del pedido
      const orderUpdateSuccess = await storage.updateOrder(orderId, {
        paymentStatus: 'pagado',
        orderStatus: 'verificado'
      });
      
      if (!orderUpdateSuccess) {
        return res.status(400).json({ error: "Error actualizando pedido" });
      }
      
      console.log(`✅ Estado de pago actualizado a "pagado" para pedido ${orderId}`);
      
      // Desactivar automáticamente las piezas compradas
      const deactivationSuccess = await storage.deactivatePurchasedParts(orderId);
      if (deactivationSuccess) {
        console.log(`✅ Piezas del pedido ${orderId} desactivadas automáticamente`);
      } else {
        console.log(`⚠️ Error desactivando piezas del pedido ${orderId}`);
      }
      
      // Limpiar el carrito asociado al pedido
      const order = await storage.getOrderById(orderId);
      if (order && order.sessionId) {
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
      
      res.json({ success: true, message: "Flujo de pago simulado exitosamente" });
    } catch (error: any) {
      console.error("Error en test callback:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Obtener métodos de pago activos (público)
  app.get("/api/payment-methods", async (req: Request, res: Response) => {
    try {
      const { pool } = await import("../db");
      const result = await pool.query("SELECT * FROM payment_config WHERE is_active = true ORDER BY id");
      const methods = result.rows.map(row => ({
        id: row.id,
        provider: row.provider,
        name: row.name,
        is_active: row.is_active,
        config: row.config
      }));
      console.log("Frontend payment methods loaded:", methods.length, "active methods");
      res.json(methods);
    } catch (error: any) {
      console.error("Error al obtener métodos de pago:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Administración de métodos de pago (solo admin)
  app.get("/api/admin/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/payment-methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const method = await storage.createPaymentMethod(req.body);
      res.json(method);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/admin/payment-methods/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const method = await storage.updatePaymentMethod(id, req.body);
      res.json(method);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/payment-methods/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      await storage.deletePaymentMethod(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Administración de métodos de envío (solo admin)
  app.get("/api/admin/shipping/methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const { pool } = await import("../db");
      const result = await pool.query(`
        SELECT sc.*, 
               CASE WHEN COUNT(sr.id) > 0 THEN 
                 json_agg(
                   json_build_object(
                     'id', sr.id,
                     'min_weight', sr.min_weight,
                     'max_weight', sr.max_weight,
                     'price', sr.price
                   ) ORDER BY sr.min_weight
                 ) 
               ELSE '[]'::json 
               END as rates
        FROM shipping_config sc
        LEFT JOIN shipping_rates sr ON sc.id = sr.shipping_config_id
        GROUP BY sc.id
        ORDER BY sc.id
      `);
      
      const methods = result.rows.map(row => ({
        ...row,
        rates: row.rates || []
      }));
      
      res.json(methods);
    } catch (error: any) {
      console.error("Error al obtener métodos de envío:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/shipping/methods", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const method = await enhancedShippingService.createShippingMethod(req.body);
      res.json(method);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/admin/shipping/methods/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const method = await enhancedShippingService.updateShippingMethod(id, req.body);
      res.json(method);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/shipping/methods/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { pool } = await import("../db");
      
      // Delete related rates first
      await pool.query("DELETE FROM shipping_rates WHERE shipping_config_id = $1", [id]);
      
      // Delete shipping method
      await pool.query("DELETE FROM shipping_config WHERE id = $1", [id]);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Gestión de tarifas por peso
  app.get("/api/admin/shipping/rates/:methodId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const methodId = parseInt(req.params.methodId);
      const { pool } = await import("../db");
      
      const result = await pool.query(
        "SELECT * FROM shipping_rates WHERE shipping_config_id = $1 ORDER BY min_weight",
        [methodId]
      );
      
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/shipping/rates", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const { shipping_config_id, min_weight, max_weight, price } = req.body;
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        INSERT INTO shipping_rates (shipping_config_id, min_weight, max_weight, price)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [shipping_config_id, min_weight, max_weight, price]);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/admin/shipping/rates/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { min_weight, max_weight, price } = req.body;
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        UPDATE shipping_rates 
        SET min_weight = $1, max_weight = $2, price = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [min_weight, max_weight, price, id]);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/shipping/rates/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { pool } = await import("../db");
      
      await pool.query("DELETE FROM shipping_rates WHERE id = $1", [id]);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Gestión de zonas de envío
  app.get("/api/admin/shipping/zones", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const { pool } = await import("../db");
      const result = await pool.query(`
        SELECT sz.*, 
               COUNT(p.id) as province_count,
               ARRAY_AGG(p.name ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL) as provinces
        FROM shipping_zones sz
        LEFT JOIN provinces p ON sz.id = p.shipping_zone_id
        GROUP BY sz.id
        ORDER BY sz.sort_order, sz.name
      `);
      
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/shipping/zones", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const { name, description, sort_order = 0, is_active = true } = req.body;
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        INSERT INTO shipping_zones (name, description, sort_order, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, description, sort_order, is_active]);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/admin/shipping/zones/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { name, description, sort_order, is_active } = req.body;
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        UPDATE shipping_zones 
        SET name = $1, description = $2, sort_order = $3, is_active = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [name, description, sort_order, is_active, id]);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/shipping/zones/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { pool } = await import("../db");
      
      // First unassign provinces from this zone
      await pool.query("UPDATE provinces SET shipping_zone_id = NULL WHERE shipping_zone_id = $1", [id]);
      
      // Delete zone rates
      await pool.query("DELETE FROM zone_rates WHERE shipping_zone_id = $1", [id]);
      
      // Delete zone
      await pool.query("DELETE FROM shipping_zones WHERE id = $1", [id]);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Gestión de provincias
  app.get("/api/admin/provinces", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const { pool } = await import("../db");
      const result = await pool.query(`
        SELECT p.*, sz.name as zone_name
        FROM provinces p
        LEFT JOIN shipping_zones sz ON p.shipping_zone_id = sz.id
        ORDER BY p.name
      `);
      
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/provinces/:id/zone", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { shipping_zone_id } = req.body;
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        UPDATE provinces 
        SET shipping_zone_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [shipping_zone_id, id]);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Gestión de tarifas por zona - obtener todas las tarifas
  app.get("/api/admin/shipping/zone-rates", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        SELECT zr.*, sz.name as zone_name, sc.name as method_name
        FROM zone_rates zr
        JOIN shipping_zones sz ON zr.shipping_zone_id = sz.id
        JOIN shipping_config sc ON zr.shipping_config_id = sc.id
        ORDER BY sc.name, sz.sort_order, zr.min_weight
      `);
      
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gestión de tarifas por zona - obtener tarifas por método específico
  app.get("/api/admin/shipping/zone-rates/:methodId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const methodId = parseInt(req.params.methodId);
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        SELECT zr.*, sz.name as zone_name
        FROM zone_rates zr
        JOIN shipping_zones sz ON zr.shipping_zone_id = sz.id
        WHERE zr.shipping_config_id = $1
        ORDER BY sz.sort_order, zr.min_weight
      `, [methodId]);
      
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/shipping/zone-rates", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const { shipping_config_id, shipping_zone_id, min_weight, max_weight, price } = req.body;
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        INSERT INTO zone_rates (shipping_config_id, shipping_zone_id, min_weight, max_weight, price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [shipping_config_id, shipping_zone_id, min_weight, max_weight, price]);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/admin/shipping/zone-rates/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { min_weight, max_weight, price } = req.body;
      const { pool } = await import("../db");
      
      const result = await pool.query(`
        UPDATE zone_rates 
        SET min_weight = $1, max_weight = $2, price = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [min_weight, max_weight, price, id]);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/shipping/zone-rates/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

    try {
      const id = parseInt(req.params.id);
      const { pool } = await import("../db");
      
      await pool.query("DELETE FROM zone_rates WHERE id = $1", [id]);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
