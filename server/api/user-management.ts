import type { Express } from "express";
import { db } from "../db";
import { users, UserRole } from "../../shared/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, requireManager, canPerformAction } from "../middleware/auth";
import bcrypt from "bcrypt";

export function registerUserManagementRoutes(app: Express) {
  // Obtener perfil del usuario actual
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, req.user!.id)).then(rows => rows[0]);
      
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // No enviar la contraseña
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error("Error al obtener perfil:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Actualizar perfil del usuario actual
  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { firstName, lastName, email, address, city, postalCode, phone, province } = req.body;
      
      const updatedUser = await db.update(users)
        .set({
          firstName,
          lastName,
          email,
          address,
          city,
          postalCode,
          phone,
          province,
          updatedAt: new Date()
        })
        .where(eq(users.id, req.user!.id))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const { password, ...userProfile } = updatedUser[0];
      res.json(userProfile);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener todos los usuarios (solo admin)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        address: users.address,
        city: users.city,
        postalCode: users.postalCode,
        phone: users.phone,
        province: users.province,
        shippingAddress: users.shippingAddress,
        shippingCity: users.shippingCity,
        shippingPostalCode: users.shippingPostalCode,
        shippingProvince: users.shippingProvince,
        billingAddress: users.billingAddress,
        billingCity: users.billingCity,
        billingPostalCode: users.billingPostalCode,
        billingProvince: users.billingProvince,
        role: users.role,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }).from(users);

      res.json(allUsers);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener usuarios recientes (solo admin y manager)
  app.get("/api/users/recent", requireManager, async (req, res) => {
    try {
      const recentUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt
      }).from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

      res.json(recentUsers);
    } catch (error) {
      console.error("Error al obtener usuarios recientes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener clientes recientes (solo usuarios con rol 'customer')
  app.get("/api/clients/recent", requireManager, async (req, res) => {
    try {
      const recentClients = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt
      }).from(users)
      .where(eq(users.role, 'customer'))
      .orderBy(desc(users.createdAt))
      .limit(10);

      console.log("🛍️ API /api/clients/recent llamada");
      console.log(`Devolviendo ${recentClients.length} clientes`);

      res.json(recentClients);
    } catch (error) {
      console.error("Error al obtener clientes recientes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Crear nuevo usuario (solo admin)
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, address, city, postalCode, phone, province, role } = req.body;
      
      // Validar que el rol sea válido
      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ error: "Rol inválido" });
      }

      // Verificar si el usuario ya existe
      const existingUser = await db.select().from(users).where(eq(users.username, username)).then(rows => rows[0]);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya existe" });
      }

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await db.insert(users).values({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        address,
        city,
        postalCode,
        phone,
        province,
        role,
        isAdmin: role === UserRole.ADMIN
      }).returning();

      const { password: _, ...userProfile } = newUser[0];
      res.status(201).json(userProfile);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Actualizar usuario (admin y manager)
  app.put("/api/admin/users/:id", requireManager, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { 
        username, 
        email, 
        firstName, 
        lastName, 
        address, 
        city, 
        postalCode, 
        phone, 
        province, 
        shippingAddress,
        shippingCity,
        shippingPostalCode,
        shippingProvince,
        billingAddress,
        billingCity,
        billingPostalCode,
        billingProvince,
        role 
      } = req.body;
      
      // Validar que el rol sea válido
      if (role && !Object.values(UserRole).includes(role)) {
        return res.status(400).json({ error: "Rol inválido" });
      }

      const updatedUser = await db.update(users)
        .set({
          username,
          email,
          firstName,
          lastName,
          address,
          city,
          postalCode,
          phone,
          province,
          shippingAddress,
          shippingCity,
          shippingPostalCode,
          shippingProvince,
          billingAddress,
          billingCity,
          billingPostalCode,
          billingProvince,
          role,
          isAdmin: role === UserRole.ADMIN,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const { password, ...userProfile } = updatedUser[0];
      res.json(userProfile);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Cambiar contraseña (solo admin)
  app.put("/api/admin/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updatedUser = await db.update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser.length) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Eliminar usuario (solo admin)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // No permitir eliminar el usuario actual
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "No puedes eliminar tu propio usuario" });
      }

      const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning();

      if (!deletedUser.length) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      res.json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener gestores (solo admin)
  app.get("/api/admin/managers", requireAdmin, async (req, res) => {
    try {
      const managers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt
      }).from(users)
        .where(or(eq(users.role, UserRole.MANAGER), eq(users.role, UserRole.ADMIN)));

      res.json(managers);
    } catch (error) {
      console.error("Error al obtener gestores:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener clientes (gestores y admin)
  app.get("/api/manager/customers", requireManager, async (req, res) => {
    try {
      const customers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        city: users.city,
        province: users.province,
        role: users.role,
        createdAt: users.createdAt
      }).from(users)
        .where(eq(users.role, UserRole.CUSTOMER));

      res.json(customers);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Verificar permisos del usuario
  app.get("/api/user/permissions", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      const permissions = {
        canViewProducts: canPerformAction(user.role, 'view_products'),
        canPlaceOrder: canPerformAction(user.role, 'place_order'),
        canViewAllOrders: canPerformAction(user.role, 'view_all_orders'),
        canManageInventory: canPerformAction(user.role, 'manage_inventory'),
        canManageUsers: canPerformAction(user.role, 'manage_users'),
        canManagePayments: canPerformAction(user.role, 'manage_payments'),
        canViewAdminPanel: canPerformAction(user.role, 'view_admin_panel'),
        canManageSystemSettings: canPerformAction(user.role, 'manage_system_settings'),
        role: user.role,
        isAdmin: user.isAdmin
      };

      res.json(permissions);
    } catch (error) {
      console.error("Error al verificar permisos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
}