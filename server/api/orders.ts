import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertOrderSchema } from "../../shared/schema";
import { emailService } from "../services/email";
import { isAuthenticated, isAdmin, canManageOrders } from "../auth";

/**
 * Registra las rutas relacionadas con los pedidos
 */
export function registerOrderRoutes(app: Express) {
  /**
   * Obtiene pedidos eliminados (papelera) - acceso para managers y administradores
   * IMPORTANTE: Esta ruta debe ir ANTES que /api/orders/:id para evitar conflictos
   */
  app.get("/api/admin/orders/trash", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {

    
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      const deletedOrders = await storage.getDeletedOrdersWithItems(undefined, limit);

      return res.json(deletedOrders);
    } catch (error: any) {
      console.error("Error al obtener pedidos eliminados:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Elimina un pedido (eliminación suave) - Solo administradores
   */
  app.delete("/api/admin/orders/:id", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }

    try {

      
      // Verificar que el pedido existe antes de eliminar
      const existingOrder = await storage.getOrderById(orderId);
      if (!existingOrder) {

        return res.status(404).json({ error: "Pedido no encontrado" });
      }



      // Realizar eliminación suave
      const deleted = await storage.softDeleteOrder(orderId, req.user!.id);

      if (!deleted) {
        console.error(`Error: softDeleteOrder retornó false para pedido ${orderId}`);
        return res.status(500).json({ error: "Error al eliminar el pedido" });
      }


      return res.json({
        message: "Pedido eliminado correctamente",
        orderId: orderId
      });

    } catch (error: any) {
      console.error(`Error al eliminar pedido ${orderId}:`, error);
      return res.status(500).json({ 
        error: "Error interno del servidor",
        details: error.message 
      });
    }
  });

  /**
   * Restaura un pedido eliminado - Solo administradores
   */
  app.patch("/api/admin/orders/:id/restore", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }

    try {


      const restored = await storage.restoreOrder(orderId);

      if (!restored) {
        console.error(`Error: restoreOrder retornó false para pedido ${orderId}`);
        return res.status(500).json({ error: "Error al restaurar el pedido" });
      }


      return res.json({
        message: "Pedido restaurado correctamente",
        orderId: orderId
      });

    } catch (error: any) {
      console.error(`Error al restaurar pedido ${orderId}:`, error);
      return res.status(500).json({ 
        error: "Error interno del servidor",
        details: error.message 
      });
    }
  });

  /**
   * Actualiza información adicional de un pedido (solo administradores)
   */
  app.patch("/api/admin/orders/:id/update-admin-info", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }

    try {
      const { 
        transportAgency, 
        expeditionNumber, 
        adminObservations, 
        documents, 
        invoicePdf,
        shippingAddress,
        shippingCity,
        shippingProvince,
        shippingPostalCode,
        shippingCountry
      } = req.body;
      
      // Verificar que el pedido existe antes de actualizar
      const existingOrder = await storage.getOrderById(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      const updatedOrder = await storage.updateOrderAdminInfo(orderId, {
        transportAgency: transportAgency || '',
        expeditionNumber: expeditionNumber || '',
        adminObservations: adminObservations || '',
        documents: documents || [],
        invoicePdf: invoicePdf || '',
        shippingAddress,
        shippingCity,
        shippingProvince,
        shippingPostalCode,
        shippingCountry
      });

      if (!updatedOrder) {

        return res.status(500).json({ error: "Error al actualizar la información del pedido" });
      }


      return res.json({
        message: "Información adicional actualizada correctamente",
        order: updatedOrder
      });

    } catch (error: any) {
      console.error(`Error al actualizar información adicional del pedido ${orderId}:`, error);
      return res.status(500).json({ 
        error: "Error interno del servidor",
        details: error.message 
      });
    }
  });

  /**
   * Obtiene los pedidos del usuario autenticado o invitado
   */
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      // Determinar si es un usuario autenticado o invitado
      if (req.isAuthenticated()) {
        // Usuario registrado
        const userId = req.user!.id;
        const orders = await storage.getOrders(userId);
        return res.json(orders);
      } else {
        // Usuario invitado - obtener pedidos por sessionId
        const sessionId = req.session.id || req.query.sessionId;
        
        if (!sessionId) {
          return res.status(400).json({ error: "No se pudo identificar la sesión" });
        }
        
        // Añadir método para obtener pedidos por sessionId
        const orders = await storage.getOrdersBySessionId(sessionId as string);
        return res.json(orders);
      }
    } catch (error: any) {
      console.error("Error al obtener pedidos:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Actualiza el estado de pago de un pedido
   */
  app.patch("/api/admin/orders/:id/payment-status", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }

    try {
      const { paymentStatus } = req.body;
      
      if (!paymentStatus || !["pagado", "pendiente"].includes(paymentStatus)) {
        return res.status(400).json({ error: "Estado de pago inválido" });
      }

      // Obtener el pedido actual para comparar el estado anterior
      const currentOrder = await storage.getOrderById(orderId);
      if (!currentOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      const previousPaymentStatus = currentOrder.paymentStatus;
      const success = await storage.updateOrderPaymentStatus(orderId, paymentStatus);

      if (!success) {
        return res.status(404).json({ error: "Error al actualizar estado de pago" });
      }



      // Si el estado cambió a "pagado", desactivar automáticamente las piezas
      if (paymentStatus === "pagado" && previousPaymentStatus !== "pagado") {

        const deactivationSuccess = await storage.deactivatePurchasedParts(orderId);
        if (deactivationSuccess) {

        } else {

        }
      }

      // Enviar notificación por email al cliente si el estado de pago ha cambiado
      if (previousPaymentStatus !== paymentStatus && currentOrder.customerEmail) {
        try {
          const emailData = {
            orderId: currentOrder.id,
            orderReference: currentOrder.orderNumber,
            customerName: currentOrder.customerName,
            customerEmail: currentOrder.customerEmail,
            newPaymentStatus: paymentStatus,
            previousPaymentStatus: previousPaymentStatus
          };

          await emailService.sendPaymentStatusChangeNotification(emailData);

        } catch (emailError: any) {
          console.error(`Error al enviar notificación de cambio de estado de pago:`, emailError);
          // No falla la operación si el email falla
        }
      }

      return res.json({ message: "Estado de pago actualizado correctamente" });

    } catch (error: any) {
      console.error(`Error al actualizar estado de pago del pedido ${orderId}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Actualiza el estado del pedido
   */
  app.patch("/api/admin/orders/:id/status", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }

    try {
      const { status } = req.body;
      
      const validStatuses = ["pendiente_verificar", "verificado", "embalado", "enviado", "incidencia"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Estado de pedido inválido" });
      }

      // Obtener el pedido actual para comparar el estado anterior
      const currentOrder = await storage.getOrderById(orderId);
      if (!currentOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      const previousStatus = currentOrder.status;
      const updatedOrder = await storage.updateOrder(orderId, { status });

      if (!updatedOrder) {
        return res.status(404).json({ error: "Error al actualizar el pedido" });
      }



      // Enviar notificación por email al cliente si el estado ha cambiado
      if (previousStatus !== status && currentOrder.customerEmail) {
        try {
          const emailData = {
            orderId: currentOrder.id,
            orderReference: currentOrder.orderNumber,
            customerName: currentOrder.customerName,
            customerEmail: currentOrder.customerEmail,
            newStatus: status,
            previousStatus: previousStatus,
            transportAgency: currentOrder.transportAgency || '',
            expeditionNumber: currentOrder.expeditionNumber || '',
            adminObservations: currentOrder.adminObservations || ''
          };

          await emailService.sendOrderStatusChangeNotification(emailData);

        } catch (emailError: any) {
          console.error(`Error al enviar notificación de cambio de estado:`, emailError);
          // No falla la operación si el email falla
        }
      }

      return res.json({ 
        message: "Estado de pedido actualizado correctamente",
        order: updatedOrder
      });

    } catch (error: any) {
      console.error(`Error al actualizar estado del pedido ${orderId}:`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Obtiene un pedido específico por ID
   * Los administradores pueden ver cualquier pedido
   * Los usuarios regulares solo pueden ver sus propios pedidos
   * Los usuarios invitados pueden ver los pedidos asociados a su sessionId
   */
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    try {
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Verificar permisos según tipo de usuario
      if (req.isAuthenticated()) {
        // Usuario autenticado
        const userId = req.user!.id;
        const isAdmin = req.user!.isAdmin;
        
        // Si no es admin y el pedido no es del usuario, devolvemos 403
        if (!isAdmin && order.userId !== userId) {
          return res.status(403).json({ error: "No autorizado para ver este pedido" });
        }
      } else {
        // Usuario invitado - verificar si el pedido pertenece a la sesión actual
        const sessionId = req.query.sessionId as string || req.session.id;
        

        
        if (!sessionId || order.sessionId !== sessionId) {

          return res.status(403).json({ error: "No autorizado para ver este pedido" });
        }
      }
      
      // Obtener items del pedido
      const orderItems = await storage.getOrderItems(orderId);
      
      // Incluir los items en la respuesta
      const orderWithItems = {
        ...order,
        items: orderItems
      };
      
      return res.json(orderWithItems);
    } catch (error: any) {
      console.error("Error al obtener pedido:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Obtener estadísticas generales de pedidos para el dashboard de admin
   * IMPORTANTE: Esta ruta debe ir ANTES que /api/admin/orders/:id para evitar conflictos
   */
  app.get("/api/admin/orders/stats", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const user = req.user as any;
    if (!user.isAdmin && user.role !== 'manager' && user.role !== 'admin') {
      return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador o manager." });
    }

    try {
      // Obtener todas las órdenes usando métodos existentes
      const allOrders = await storage.getOrdersWithItems();
      
      // Filtrar órdenes de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = allOrders.filter(order => 
        new Date(order.createdAt) >= thirtyDaysAgo
      );
      
      // Calcular estadísticas
      const totalOrders = recentOrders.length;
      const activeOrders = recentOrders.filter(o => !o.isDeleted).length;
      const paidOrders = recentOrders.filter(o => o.paymentStatus === 'pagado').length;
      const pendingOrders = recentOrders.filter(o => o.paymentStatus === 'pendiente').length;
      
      const pendingVerification = recentOrders.filter(o => o.orderStatus === 'pendiente_verificar').length;
      const verifiedOrders = recentOrders.filter(o => o.orderStatus === 'verificado').length;
      const packedOrders = recentOrders.filter(o => o.orderStatus === 'embalado').length;
      const shippedOrders = recentOrders.filter(o => o.orderStatus === 'enviado').length;
      const incidentOrders = recentOrders.filter(o => o.orderStatus === 'incidencia').length;
      
      const activeOrdersWithTotal = recentOrders.filter(o => !o.isDeleted && o.total);
      const totalRevenue = activeOrdersWithTotal.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
      const averageOrderValue = activeOrdersWithTotal.length > 0 ? totalRevenue / activeOrdersWithTotal.length : 0;
      
      const registeredCustomerOrders = recentOrders.filter(o => o.userId).length;
      const guestOrders = recentOrders.filter(o => !o.userId).length;
      
      // Obtener métodos de pago más usados
      const paymentMethods = recentOrders.reduce((acc, order) => {
        if (order.paymentMethod) {
          if (!acc[order.paymentMethod]) {
            acc[order.paymentMethod] = { count: 0, revenue: 0 };
          }
          acc[order.paymentMethod].count++;
          acc[order.paymentMethod].revenue += parseFloat(order.total || '0');
        }
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);
      
      const topPaymentMethods = Object.entries(paymentMethods)
        .map(([method, stats]) => ({
          method,
          count: stats.count,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Obtener pedidos recientes (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentOrdersCount = allOrders.filter(order => 
        !order.isDeleted && new Date(order.createdAt) >= sevenDaysAgo
      ).length;

      const response = {
        general: {
          totalOrders: totalOrders,
          activeOrders: activeOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          recentOrders: recentOrdersCount
        },
        paymentStatus: {
          paid: paidOrders,
          pending: pendingOrders
        },
        orderStatus: {
          pendingVerification: pendingVerification,
          verified: verifiedOrders,
          packed: packedOrders,
          shipped: shippedOrders,
          incidents: incidentOrders
        },
        customerTypes: {
          registered: registeredCustomerOrders,
          guest: guestOrders
        },
        topPaymentMethods: topPaymentMethods
      };

      return res.json(response);
    } catch (error) {
      console.error("Error al obtener estadísticas de pedidos:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  /**
   * Endpoint específico para administradores y managers para obtener detalles completos del pedido
   * Incluye toda la información necesaria para el modal del dashboard
   * CORREGIDO: Ahora usa la misma lógica exitosa que storage.getOrderById()
   */
  app.get("/api/admin/orders/:id", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    try {
      // USAR LA LÓGICA CORRECTA: storage.getOrderById() que ya funciona perfectamente
      const orderDetail = await storage.getOrderById(orderId);
      
      if (!orderDetail) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      

      
      return res.json(orderDetail);
    } catch (error: any) {
      console.error("Error al obtener detalles del pedido para admin:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Crea un nuevo pedido a partir de datos locales del carrito (sin carrito en BD)
   */
  app.post("/api/orders/local", async (req: Request, res: Response) => {

    
    try {
      const validationResult = createOrderSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error("Order validation failed:", validationResult.error);
        return res.status(400).json({ error: validationResult.error.message });
      }

      const { items, total, ...orderData } = req.body;

      // Verificar que hay items en el pedido
      if (!items || items.length === 0) {
        return res.status(400).json({ error: "El pedido está vacío" });
      }

      // Determinar si es un usuario autenticado o invitado
      const isAuthenticated = req.isAuthenticated();
      let userId = null;
      let sessionId = null;
      let userEmail = orderData.customerEmail; // Email por defecto del formulario

      if (isAuthenticated) {
        userId = req.user!.id;
        userEmail = (req.user as any)?.email || orderData.customerEmail; // Usar email real del usuario autenticado
        sessionId = req.body.sessionId || req.session.id || `auth_${userId}_${Date.now()}`; // Siempre guardar sessionId

      } else {
        // Usuario invitado - verificar si quiere crear cuenta
        if (orderData.createAccount && orderData.password) {
          try {
            // Verificar si el email ya existe
            const existingUser = await storage.getUserByEmail(orderData.customerEmail);
            if (existingUser) {
              return res.status(400).json({ error: 'Ya existe una cuenta con este email' });
            }

            // Crear nuevo usuario
            const { hashPassword } = await import('../auth');
            const hashedPassword = await hashPassword(orderData.password);
            
            const newUser = await storage.createUser({
              username: orderData.customerEmail, // Usar email como username
              password: hashedPassword,
              email: orderData.customerEmail,
              firstName: orderData.customerName || '',
              lastName: orderData.customerLastName || '',
              phone: orderData.customerPhone || '',
              address: orderData.shippingAddress || '',
              city: orderData.shippingCity || '',
              province: orderData.shippingProvince || '',
              postalCode: orderData.shippingPostalCode || '',
              role: 'customer'
            });

            // Usar el ID del nuevo usuario
            userId = newUser.id;
            userEmail = newUser.email;
            sessionId = req.body.sessionId || req.session.id || `new_user_${userId}_${Date.now()}`;
            
            console.log(`👤 Nuevo usuario creado desde checkout: ${newUser.email} (ID: ${newUser.id})`);
            
          } catch (error) {
            console.error('Error creando usuario desde checkout:', error);
            return res.status(500).json({ error: 'Error al crear la cuenta de usuario' });
          }
        } else {
          // Usuario invitado normal - usar sessionId del frontend si está disponible
          sessionId = req.body.sessionId || req.session.id || `guest_${Date.now()}`;
          userEmail = orderData.customerEmail; // Usar email del formulario para invitados
        }
      }

      // Get payment method info to store provider
      const paymentMethodInfo = await storage.getPaymentMethodByProvider(orderData.paymentMethodId);
      
      // Calcular el total correctamente - PAGO EN EFECTIVO NO TIENE GASTOS DE ENVÍO
      const subtotalAmount = parseFloat(orderData.subtotal || "0");
      let shippingAmount = parseFloat(orderData.shippingCost || "0");
      
      // Si el método de pago es efectivo, eliminar gastos de envío
      if (paymentMethodInfo && paymentMethodInfo.provider === 'cash') {
        shippingAmount = 0;
      }
      
      const totalAmount = subtotalAmount + shippingAmount;
      

      
      // Determinar estado del pago basado en el método de pago
      let paymentStatus = "pendiente"; // Por defecto pendiente
      
      // Si es un método de pago automático (tarjeta, PayPal), marcar como pagado al crear el pedido
      if (paymentMethodInfo && (paymentMethodInfo.provider === 'stripe' || paymentMethodInfo.provider === 'paypal')) {
        paymentStatus = "pagado";
      }
      


      // Crear el pedido con el sistema dual de estados
      const order = await storage.createOrder({
        userId: userId || null,
        sessionId: sessionId, // Siempre guardar sessionId para poder limpiar carrito
        cartId: null, // No hay carrito en BD para pedidos locales
        status: "pending", // Legacy field - mantener por compatibilidad
        paymentStatus: paymentStatus, // Pagado | Pendiente
        orderStatus: "pendiente_verificar", // Siempre empieza en pendiente de verificar
        subtotal: subtotalAmount,
        shippingCost: shippingAmount,
        total: totalAmount,
        shippingAddress: orderData.shippingAddress,
        shippingCity: orderData.shippingCity,
        shippingProvince: orderData.shippingProvince,
        shippingPostalCode: orderData.shippingPostalCode,
        shippingCountry: orderData.shippingCountry || "España",
        customerName: `${orderData.customerName} ${orderData.customerLastName}`.trim(),
        customerEmail: userEmail, // Usar email correcto según tipo de usuario
        customerPhone: orderData.customerPhone,
        customerNifCif: isAuthenticated && req.user ? (req.user as any).nifCif || orderData.customerNifCif || "" : orderData.customerNifCif || "",
        notes: orderData.notes || "",
        paymentMethod: paymentMethodInfo?.provider || "unknown",
        shippingMethodId: orderData.shippingMethodId === "pickup" ? null : orderData.shippingMethodId
      });

      // Crear los items del pedido con información del vehículo
      for (const item of items) {
        // Obtener información completa de la pieza y vehículo
        const partDetails = await storage.getPartById(item.partId);
        let vehicleInfo = null;
        
        if (partDetails && partDetails.idVehiculo) {
          vehicleInfo = await storage.getVehicleByIdLocal(partDetails.idVehiculo);
        }
        
        await storage.createOrderItem({
          orderId: order.id,
          partId: item.partId,
          quantity: item.quantity,
          price: item.price,
          partName: item.partName || partDetails?.descripcionArticulo || `Pieza #${item.partId}`,
          partFamily: item.partFamily || partDetails?.descripcionFamilia || "Pieza de repuesto",
          partReference: partDetails?.codArticulo || null,
          vehicleBrand: vehicleInfo?.marca || null,
          vehicleModel: vehicleInfo?.modelo || null,
          vehicleYear: vehicleInfo?.anyo || null,
          vehicleVersion: vehicleInfo?.version || null
        });
      }

      // Send email notifications
      try {
        // Get payment method details for email
        const paymentMethod = await storage.getPaymentMethodByProvider(orderData.paymentMethodId);
        
        // USAR LA LÓGICA CORRECTA: getOrderById() que incluye todas las referencias
        const orderWithCompleteItems = await storage.getOrderById(order.id);
        
        // Determinar si es recogida en instalaciones
        const isPickup = orderData.shippingType === 'pickup' || orderData.shippingMethodId === 'pickup';
        
        const emailData = {
          customerName: `${orderData.customerName} ${orderData.customerLastName}`,
          customerEmail: userEmail, // Usar email correcto según tipo de usuario
          customerPhone: orderData.customerPhone,
          orderId: order.id,
          orderReference: `PED-${order.id.toString().padStart(6, '0')}`,
          items: orderWithCompleteItems?.items?.map(item => ({
            partName: item.partName,
            partFamily: item.partFamily || 'Pieza de repuesto',
            partReference: item.partReference || '', // Código interno
            partCode: item.partReference || '',
            refLocal: item.refLocal || '',           // ✅ CORREGIDO: Referencia principal (número)
            refPrincipal: item.refPrincipal || '',   // ✅ CORREGIDO: Referencia fabricante (string)
            quantity: item.quantity,
            price: item.price,
            subtotal: Number(item.price) * Number(item.quantity),
            vehicleBrand: item.vehicleBrand || '',
            vehicleModel: item.vehicleModel || '',
            vehicleYear: item.vehicleYear || '',
            vehicleVersion: item.vehicleVersion || '',
            vehicleInfo: [item.vehicleBrand, item.vehicleModel, item.vehicleVersion, item.vehicleYear].filter(Boolean).join(' ')
          })) || [],
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          total: order.total,
          // Usar dirección real del negocio si es recogida, sino usar dirección del cliente
          shippingAddress: isPickup ? 'Carretera Almuñecar, Km 1.5' : orderData.shippingAddress,
          shippingCity: isPickup ? 'Granada' : orderData.shippingCity,
          shippingProvince: isPickup ? 'Granada' : orderData.shippingProvince,
          shippingPostalCode: isPickup ? '18640' : orderData.shippingPostalCode,
          shippingCountry: orderData.shippingCountry || 'España',
          paymentMethod: paymentMethod || { name: 'Método de pago', provider: 'unknown', config: {} },
          notes: orderData.notes || '',
          isPickup: isPickup // Añadir flag para que el template pueda diferenciarlo
        };

        // Send emails asynchronously using setImmediate to prevent blocking
        setImmediate(async () => {
          try {

            
            const { emailService } = await import('../services/email');
            await emailService.sendOrderConfirmationToCustomer(emailData);
            await emailService.sendOrderNotificationToAdmin(emailData);

          } catch (emailError) {
            console.error('Error enviando emails de confirmación:', emailError);
          }
        });
      } catch (emailError) {
        console.error("Error sending email notifications:", emailError);
        // Don't fail the order creation if email fails
      }

      return res.json({ 
        id: order.id, 
        orderNumber: order.orderNumber,
        message: "Pedido creado correctamente" 
      });
    } catch (error: any) {
      console.error("Error al crear pedido local:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Crea un nuevo pedido a partir del carrito actual
   */
  const createOrderSchema = z.object({
    shippingAddress: z.string().min(1, "La dirección de envío es obligatoria"),
    shippingCity: z.string().min(1, "La ciudad es obligatoria"),
    shippingProvince: z.string().optional(),
    shippingPostalCode: z.string().min(1, "El código postal es obligatorio"),
    shippingCountry: z.string().default("España"),
    customerName: z.string().min(1, "El nombre es obligatorio"),
    customerLastName: z.string().min(1, "Los apellidos son obligatorios"),
    customerEmail: z.string().email("Email inválido"),
    customerPhone: z.string().min(1, "El teléfono es obligatorio"),
    customerNifCif: z.string().min(1, "El NIF/CIF es obligatorio"),
    notes: z.string().optional(),
    subtotal: z.string().min(1, "El subtotal es obligatorio"),
    shippingCost: z.string().min(1, "El costo de envío es obligatorio"),
    total: z.string().min(1, "El total es obligatorio"),
    items: z.array(z.object({
      partId: z.number(),
      quantity: z.number(),
      price: z.number(),
      partName: z.string()
    })).min(1, "El pedido debe tener al menos un item"),
    shippingType: z.enum(["pickup", "shipping"]),
    paymentMethodId: z.string(),
    shippingMethodId: z.union([z.number(), z.literal("pickup")]),
    createAccount: z.boolean().optional(),
    password: z.string().optional(),
    sessionId: z.string().optional()
  });
  
  app.post("/api/orders", async (req: Request, res: Response) => {
    // Determinar si es un usuario autenticado o invitado
    const isAuthenticated = req.isAuthenticated();
    let userId = null;
    let sessionId = null;
    let cartWithItems = null;
    
    try {
      const validationResult = createOrderSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.message });
      }
      
      // Obtener información del carrito según el tipo de usuario
      let userEmail = req.body.customerEmail; // Email por defecto del formulario
      
      if (isAuthenticated) {
        // Usuario registrado
        userId = req.user!.id;
        sessionId = req.body.sessionId || req.session.id || `auth_${userId}_${Date.now()}`; // Siempre guardar sessionId
        cartWithItems = await storage.getCartWithItems(userId);
        
        // Para usuarios autenticados, usar su email real de la base de datos
        userEmail = (req.user as any)?.email || req.body.customerEmail;
        
        // Actualizamos el usuario con los datos de envío (sin cambiar el email)
        await storage.updateUser(userId, {
          firstName: req.body.customerName.split(' ')[0],
          lastName: req.body.customerName.split(' ').slice(1).join(' '),
          phone: req.body.customerPhone,
          address: req.body.shippingAddress,
          city: req.body.shippingCity,
          postalCode: req.body.shippingPostalCode,
        });
      } else {
        // Usuario invitado - PRIORIZAR sessionId del body si se envía
        sessionId = req.body.sessionId || req.session.id || `guest_${Date.now()}`;
        
        // Verificar que existe sesión
        if (!sessionId) {
          return res.status(400).json({ error: "No se pudo identificar la sesión del usuario" });
        }
        
        // Obtener carrito del invitado usando sessionId
        cartWithItems = await storage.getCartWithItemsBySessionId(sessionId);
        // Para usuarios invitados, usar el email del formulario
        userEmail = req.body.customerEmail;
      }
      
      // Verificar que el carrito existe y tiene items
      if (!cartWithItems || cartWithItems.items.length === 0) {
        return res.status(400).json({ error: "El carrito está vacío" });
      }
      
      // Calculamos el subtotal del pedido (sin envío)
      const subtotal = cartWithItems.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Obtener información del método de pago para verificar si es efectivo
      const paymentMethodInfo = await storage.getPaymentMethodByProvider(req.body.paymentMethodId);
      
      // Obtener costo de envío del body o calcular - PAGO EN EFECTIVO NO TIENE GASTOS DE ENVÍO
      let shippingCost = parseFloat(req.body.shippingCost || "0");
      
      // Si el método de pago es efectivo, eliminar gastos de envío
      if (paymentMethodInfo && paymentMethodInfo.provider === 'cash') {
        shippingCost = 0;
      }
      
      // Calcular total final
      const total = subtotal + shippingCost;
      

      
      // Creamos el pedido
      const order = await storage.createOrder({
        userId: userId || null, // Puede ser null para invitados
        sessionId: sessionId, // Siempre guardar sessionId para poder limpiar carrito
        cartId: cartWithItems.cart.id,
        status: "pending",
        subtotal,
        shippingCost,
        total,
        shippingAddress: req.body.shippingAddress,
        shippingCity: req.body.shippingCity,
        shippingProvince: req.body.shippingProvince,
        shippingPostalCode: req.body.shippingPostalCode,
        shippingCountry: req.body.shippingCountry || "España",
        customerName: req.body.customerName,
        customerEmail: userEmail, // Usar email correcto según tipo de usuario
        customerPhone: req.body.customerPhone,
        notes: req.body.notes || "",
      });
      
      // Crear los items del pedido con información del vehículo
      for (const item of cartWithItems.items) {
        // Obtener información completa de la pieza y vehículo
        const partDetails = await storage.getPartById(item.partId);
        let vehicleInfo = null;
        
        if (partDetails && partDetails.idVehiculo) {
          vehicleInfo = await storage.getVehicleByIdLocal(partDetails.idVehiculo);
        }
        
        await storage.createOrderItem({
          orderId: order.id,
          partId: item.partId,
          quantity: item.quantity,
          price: item.price,
          partName: partDetails?.descripcionArticulo || `Pieza #${item.partId}`,
          partFamily: partDetails?.descripcionFamilia || "Pieza de repuesto",
          partReference: partDetails?.codArticulo || null,
          vehicleBrand: vehicleInfo?.marca || null,
          vehicleModel: vehicleInfo?.modelo || null,
          vehicleYear: vehicleInfo?.anyo || null,
          vehicleVersion: vehicleInfo?.version || null
        });
      }
      
      // Marcamos el carrito como completado y lo limpiamos
      await storage.updateCart(cartWithItems.cart.id, {
        checkedOut: true,
      });
      
      // IMPORTANTE: Limpiar el carrito después de crear el pedido exitosamente

      const cartCleared = await storage.clearCart(cartWithItems.cart.id);
      
      if (cartCleared) {

      } else {

      }
      
      return res.json(order);
    } catch (error: any) {
      console.error("Error al crear pedido:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Actualiza el estado de un pedido (managers y administradores)
   */
  app.patch("/api/orders/:id", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {

    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    try {
      const validationResult = z.object({
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
      }).safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.message });
      }
      
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Actualizamos el estado del pedido
      const updatedOrder = await storage.updateOrder(orderId, {
        status: req.body.status,
      });
      
      return res.json(updatedOrder);
    } catch (error: any) {
      console.error("Error al actualizar pedido:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Obtiene todos los pedidos (managers y administradores)
   */
  app.get("/api/admin/orders", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    
    try {
      const includeDeleted = req.query.includeDeleted === "true";
      const orders = await storage.getOrdersWithItems(undefined, undefined, includeDeleted);
      return res.json(orders);
    } catch (error: any) {
      console.error("Error al obtener todos los pedidos:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Elimina un pedido (soft delete) - solo administradores completos
   */
  app.delete("/api/admin/orders/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {

    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    try {
      const success = await storage.softDeleteOrder(orderId, req.user!.id);
      
      if (!success) {
        return res.status(404).json({ error: "Pedido no encontrado o ya fue eliminado" });
      }
      
      return res.json({ message: "Pedido movido a la papelera correctamente" });
    } catch (error: any) {
      console.error("Error al eliminar pedido:", error);
      return res.status(500).json({ error: error.message });
    }
  });



  /**
   * Restaura un pedido desde la papelera - solo administradores
   */
  app.post("/api/admin/orders/:id/restore", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (!req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado para restaurar pedidos" });
    }

    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    try {
      const success = await storage.restoreOrder(orderId);
      
      if (!success) {
        return res.status(404).json({ error: "Pedido no encontrado en la papelera" });
      }
      
      return res.json({ message: "Pedido restaurado correctamente" });
    } catch (error: any) {
      console.error("Error al restaurar pedido:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Elimina permanentemente un pedido - solo administradores
   */
  app.delete("/api/admin/orders/:id/permanent", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (!req.user!.isAdmin) {
      return res.status(403).json({ error: "No autorizado para eliminar permanentemente pedidos" });
    }

    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    try {
      const success = await storage.hardDeleteOrder(orderId);
      
      if (!success) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      return res.json({ message: "Pedido eliminado permanentemente" });
    } catch (error: any) {
      console.error("Error al eliminar pedido permanentemente:", error);
      return res.status(500).json({ error: error.message });
    }
  });







  /**
   * Actualiza el estado del pedido - managers y administradores
   */
  app.patch("/api/admin/orders/:id/order-status", isAuthenticated, canManageOrders, async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id);
    const { orderStatus } = req.body;
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID de pedido inválido" });
    }
    
    if (!orderStatus || !["pendiente_verificar", "verificado", "embalado", "enviado", "incidencia"].includes(orderStatus)) {
      return res.status(400).json({ error: "Estado de pedido inválido" });
    }
    
    try {
      // Obtener el pedido antes de actualizar para obtener el estado anterior
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      const previousStatus = order.orderStatus;
      
      // Actualizar el estado del pedido
      const updated = await storage.updateOrderStatus(orderId, orderStatus);
      if (!updated) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      

      
      // Enviar notificación por email al cliente
      try {
        const orderReference = `PED-${orderId.toString().padStart(6, '0')}`;
        const customerName = order.customerName;
        
        const emailData = {
          customerName,
          customerEmail: order.customerEmail,
          orderReference,
          orderId,
          newStatus: orderStatus,
          previousStatus
        };
        
        await emailService.sendOrderStatusChangeNotification(emailData);

      } catch (emailError) {
        console.error("Error enviando notificación de cambio de estado:", emailError);
        // No fallar la actualización si falla el email
      }
      
      return res.json({ message: "Estado de pedido actualizado correctamente" });
    } catch (error: any) {
      console.error("Error al actualizar estado de pedido:", error);
      return res.status(500).json({ error: error.message });
    }
  });

}