import { Express, Request, Response } from "express";
import { db } from "../db";
import { isAuthenticated, isAdmin, canManageClients } from "../auth";
import { users } from "../../shared/schema";
import { eq, desc, sql, like, or, and } from "drizzle-orm";

export function registerClientsRoutes(app: Express) {
  // Obtener todos los clientes (usuarios con rol customer) - acceso para managers y admins
  app.get("/api/admin/clients", isAuthenticated, canManageClients, async (req: Request, res: Response) => {
    try {
      // Obtener clientes con información adicional de pedidos usando Drizzle ORM
      const result = await db.execute(sql`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.address,
          u.city,
          u.postal_code as "postalCode",
          u.phone,
          u.province,
          u.shipping_address as "shippingAddress",
          u.shipping_city as "shippingCity",
          u.shipping_postal_code as "shippingPostalCode",
          u.shipping_province as "shippingProvince",
          u.billing_address as "billingAddress",
          u.billing_city as "billingCity",
          u.billing_postal_code as "billingPostalCode",
          u.billing_province as "billingProvince",
          u.role,
          u.is_admin as "isAdmin",
          u.created_at as "createdAt",
          u.updated_at as "updatedAt",
          COALESCE(o.order_count, 0) as "totalOrders",
          COALESCE(o.total_spent, 0) as "totalSpent",
          o.last_order_date as "lastOrderDate"
        FROM users u
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(*) as order_count,
            MAX(created_at) as last_order_date,
            SUM(total) as total_spent
          FROM orders
          WHERE is_deleted = false AND user_id IS NOT NULL
          GROUP BY user_id
          
          UNION ALL
          
          SELECT 
            u2.id as user_id,
            COUNT(*) as order_count,
            MAX(o2.created_at) as last_order_date,
            SUM(o2.total) as total_spent
          FROM orders o2
          JOIN users u2 ON o2.customer_email = u2.email
          WHERE o2.is_deleted = false AND o2.user_id IS NULL
          GROUP BY u2.id
        ) o ON u.id = o.user_id
        WHERE u.role = 'customer'
        ORDER BY u.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener cliente específico - acceso para managers y admins
  app.get("/api/admin/clients/:id", isAuthenticated, canManageClients, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await db.execute(sql`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.address,
          u.city,
          u.postal_code as "postalCode",
          u.phone,
          u.province,
          u.role,
          u.is_admin as "isAdmin",
          u.created_at as "createdAt",
          u.updated_at as "updatedAt",
          COALESCE(o.order_count, 0) as "totalOrders",
          COALESCE(o.total_spent, 0) as "totalSpent",
          o.last_order_date as "lastOrderDate"
        FROM users u
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(*) as order_count,
            MAX(created_at) as last_order_date,
            SUM(total) as total_spent
          FROM orders
          WHERE is_deleted = false AND user_id IS NOT NULL
          GROUP BY user_id
          
          UNION ALL
          
          SELECT 
            u2.id as user_id,
            COUNT(*) as order_count,
            MAX(o2.created_at) as last_order_date,
            SUM(o2.total) as total_spent
          FROM orders o2
          JOIN users u2 ON o2.customer_email = u2.email
          WHERE o2.is_deleted = false AND o2.user_id IS NULL
          GROUP BY u2.id
        ) o ON u.id = o.user_id
        WHERE u.id = ${parseInt(id)} AND u.role IN ('customer', 'manager')
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al obtener cliente:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener pedidos de un cliente específico - acceso para managers y admins
  app.get("/api/admin/clients/:id/orders", isAuthenticated, canManageClients, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const result = await db.execute(sql`
        SELECT 
          o.id,
          o.order_number as "orderNumber",
          o.status,
          o.total as "totalAmount",
          (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as "totalItems",
          o.customer_email as "customerEmail",
          o.customer_name as "customerName",
          o.payment_method as "paymentMethod",
          o.created_at as "createdAt",
          pm.name as "paymentMethodName"
        FROM orders o
        LEFT JOIN payment_methods pm ON o.payment_method = pm.code
        WHERE o.customer_id = ${id} AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `);

      // Obtener total de pedidos para paginación
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM orders
        WHERE customer_id = ${id} AND deleted_at IS NULL;
      `);

      const total = parseInt(countResult.rows[0].total as string);
      const totalPages = Math.ceil(total / limit);

      res.json({
        orders: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
        },
      });
    } catch (error) {
      console.error("Error al obtener pedidos del cliente:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Actualizar información de cliente
  app.put("/api/admin/clients/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        province,
        role,
      } = req.body;

      // Verificar que el cliente existe
      const existingClient = await db.execute(sql`
        SELECT id FROM users WHERE id = ${id} AND role IN ('customer', 'manager');
      `);

      if (existingClient.rows.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      // Actualizar cliente
      const result = await db.execute(sql`
        UPDATE users SET
          first_name = ${firstName},
          last_name = ${lastName},
          email = ${email},
          phone = ${phone},
          address = ${address},
          city = ${city},
          postal_code = ${postalCode},
          province = ${province},
          role = ${role},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING 
          id,
          username,
          email,
          first_name as "firstName",
          last_name as "lastName",
          address,
          city,
          postal_code as "postalCode",
          phone,
          province,
          role,
          is_admin as "isAdmin",
          created_at as "createdAt",
          updated_at as "updatedAt";
      `);

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Cambiar estado de cliente (activar/desactivar)
  app.patch("/api/admin/clients/:id/status", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // Actualizar estado del cliente
      const result = await db.execute(sql`
        UPDATE users SET
          is_admin = ${isActive},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND role IN ('customer', 'manager')
        RETURNING id, username, email, is_admin as "isAdmin";
      `);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error al cambiar estado del cliente:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener estadísticas de clientes
  app.get("/api/admin/clients/stats", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_clients,
          COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
          COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week
        FROM users
        WHERE role IN ('customer', 'manager');
      `);

      // Estadísticas de pedidos por clientes
      const orderStats = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT o.user_id) as clients_with_orders,
          COUNT(*) as total_orders,
          AVG(o.total) as avg_order_value
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE u.role IN ('customer', 'manager') AND o.is_deleted = false;
      `);

      res.json({
        clients: result.rows[0],
        orders: orderStats.rows[0],
      });
    } catch (error) {
      console.error("Error al obtener estadísticas de clientes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener clientes recientes (solo usuarios con rol 'customer') - acceso para managers y admins
  app.get("/api/clients/recent", isAuthenticated, canManageClients, async (req: Request, res: Response) => {
    try {
      console.log("🛍️ API /api/clients/recent llamada");

      const result = await db.execute(sql`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.first_name as "firstName",
          u.last_name as "lastName",
          u.address,
          u.city,
          u.postal_code as "postalCode",
          u.phone,
          u.province,
          u.shipping_address as "shippingAddress",
          u.shipping_city as "shippingCity",
          u.shipping_postal_code as "shippingPostalCode",
          u.shipping_province as "shippingProvince",
          u.billing_address as "billingAddress",
          u.billing_city as "billingCity",
          u.billing_postal_code as "billingPostalCode",
          u.billing_province as "billingProvince",
          u.role,
          u.created_at as "createdAt",
          u.updated_at as "updatedAt",
          COALESCE(o.order_count, 0) as "totalOrders",
          COALESCE(o.total_spent, 0) as "totalSpent",
          o.last_order_date as "lastOrderDate"
        FROM users u
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(*) as order_count,
            MAX(created_at) as last_order_date,
            SUM(total) as total_spent
          FROM orders
          WHERE is_deleted = false AND user_id IS NOT NULL
          GROUP BY user_id
          
          UNION ALL
          
          SELECT 
            u2.id as user_id,
            COUNT(*) as order_count,
            MAX(o2.created_at) as last_order_date,
            SUM(o2.total) as total_spent
          FROM orders o2
          JOIN users u2 ON o2.customer_email = u2.email
          WHERE o2.is_deleted = false AND o2.user_id IS NULL
          GROUP BY u2.id
        ) o ON u.id = o.user_id
        WHERE u.role = 'customer'
        ORDER BY u.created_at DESC
        LIMIT 10
      `);

      console.log(`Devolviendo ${result.rows.length} clientes`);
      console.log("Primer cliente:", JSON.stringify(result.rows[0], null, 2));
      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener clientes recientes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });



  // Sincronizar direcciones de pedidos con perfiles de usuario
  app.post("/api/admin/clients/sync-addresses", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("🔄 Sincronizando direcciones de pedidos con perfiles de usuario...");

      // Encontrar usuarios que tienen pedidos con direcciones pero perfil sin direcciones
      const result = await db.execute(sql`
        UPDATE users 
        SET 
          shipping_address = recent_order.shipping_address,
          shipping_city = recent_order.shipping_city,
          shipping_postal_code = recent_order.shipping_postal_code,
          updated_at = CURRENT_TIMESTAMP
        FROM (
          SELECT DISTINCT ON (user_id) 
            user_id,
            shipping_address,
            shipping_city,
            shipping_postal_code
          FROM orders 
          WHERE user_id IS NOT NULL 
            AND shipping_address IS NOT NULL 
            AND shipping_address != ''
          ORDER BY user_id, created_at DESC
        ) recent_order
        WHERE users.id = recent_order.user_id
          AND (users.shipping_address IS NULL OR users.shipping_address = '')
        RETURNING users.id, users.username, users.email
      `);

      console.log(`✅ Sincronización completada: ${result.rows.length} usuarios actualizados`);
      res.json({ 
        message: `Direcciones sincronizadas para ${result.rows.length} usuarios`,
        updatedUsers: result.rows 
      });
    } catch (error) {
      console.error("Error al sincronizar direcciones:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener pedidos de invitados (usuarios no registrados)
  app.get("/api/admin/guest-orders", isAuthenticated, canManageClients, async (req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          o.id,
          o.order_number as "orderNumber",
          o.customer_name as "guestName",
          o.customer_email as "guestEmail",
          o.customer_phone as "guestPhone",
          o.total as "total",
          o.status,
          o.created_at as "createdAt",
          COALESCE(item_count.count, 0) as "itemCount",
          CONCAT(o.shipping_address, ', ', o.shipping_city) as "shippingAddress"
        FROM orders o
        LEFT JOIN (
          SELECT order_id, COUNT(*) as count 
          FROM order_items 
          GROUP BY order_id
        ) item_count ON o.id = item_count.order_id
        WHERE o.user_id IS NULL 
          AND o.is_deleted = false
        ORDER BY o.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener pedidos de invitados:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  console.log("🔥 Rutas de clientes registradas");
}