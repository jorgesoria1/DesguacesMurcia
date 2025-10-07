import { Request, Response } from "express";
import { db } from "../db";
import { contactMessages } from "../../shared/schema";
import { desc, eq, and, or, ilike, sql } from "drizzle-orm";
import { isAuthenticated, isAdmin } from "../middleware/auth-middleware";

export function registerContactMessagesRoutes(app: any) {
  // DISABLED: Conflicts with admin-messages-routes.ts
  /*
  // Get contact messages with filtering and pagination
  app.get("/api/admin/contact-messages", async (req: Request, res: Response) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        formType, 
        search 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build filters
      const filters = [];
      
      if (status) {
        filters.push(eq(contactMessages.status, status as string));
      }
      
      if (formType) {
        filters.push(eq(contactMessages.formType, formType as string));
      }
      
      if (search) {
        const searchTerm = `%${search}%`;
        filters.push(
          or(
            ilike(contactMessages.name, searchTerm),
            ilike(contactMessages.email, searchTerm),
            ilike(contactMessages.subject, searchTerm),
            ilike(contactMessages.message, searchTerm)
          )
        );
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      // Get messages with pagination
      const messages = await db
        .select()
        .from(contactMessages)
        .where(whereClause)
        .orderBy(desc(contactMessages.createdAt))
        .limit(limitNum)
        .offset(offset);

      // Get total count for pagination
      let totalResult;
      if (whereClause) {
        totalResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(contactMessages)
          .where(whereClause);
      } else {
        totalResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(contactMessages);
      }
      
      const total = totalResult[0]?.count || 0;

      res.json({
        messages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: offset + messages.length < total
        }
      });
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // DISABLED: Conflicts with admin-messages-routes.ts
  /*
  // Get single contact message
  app.get("/api/admin/contact-messages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      
      const [message] = await db
        .select()
        .from(contactMessages)
        .where(eq(contactMessages.id, id));

      if (!message) {
        return res.status(404).json({ error: "Mensaje no encontrado" });
      }

      // Mark as read if it was unread
      if (message.status === 'unread') {
        await db
          .update(contactMessages)
          .set({ status: 'read' as any })
          .where(eq(contactMessages.id, id));
        
        message.status = 'read' as any;
      }

      res.json(message);
    } catch (error) {
      console.error("Error fetching contact message:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Update contact message status
  app.patch("/api/admin/contact-messages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const { status } = req.body;

      if (!['unread', 'read', 'replied'].includes(status)) {
        return res.status(400).json({ error: "Estado inválido" });
      }

      const [updatedMessage] = await db
        .update(contactMessages)
        .set({ status: status as any })
        .where(eq(contactMessages.id, id))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ error: "Mensaje no encontrado" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating contact message:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Delete contact message
  app.delete("/api/admin/contact-messages/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const [deletedMessage] = await db
        .delete(contactMessages)
        .where(eq(contactMessages.id, id))
        .returning();

      if (!deletedMessage) {
        return res.status(404).json({ error: "Mensaje no encontrado" });
      }

      res.json({ message: "Mensaje eliminado correctamente" });
    } catch (error) {
      console.error("Error deleting contact message:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // DISABLED: Now handled by admin-messages-routes.ts
  /*
  // Get message statistics
  app.get("/api/admin/contact-messages/stats", async (req: Request, res: Response) => {
    try {
      const [unreadCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contactMessages)
        .where(eq(contactMessages.status, 'unread'));

      const [totalCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contactMessages);

      const [contactCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contactMessages)
        .where(eq(contactMessages.formType, 'contact'));

      const [valuationCount] = await db
        .select({ count: sql<number>`count(*)` })  
        .from(contactMessages)
        .where(eq(contactMessages.formType, 'valuation'));

      res.json({
        unread: unreadCount?.count || 0,
        total: totalCount?.count || 0,
        contact: contactCount?.count || 0,
        valuation: valuationCount?.count || 0
      });
    } catch (error) {
      console.error("Error fetching message statistics:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  */

  // Endpoint for contact form submissions
  app.post('/api/contact', async (req: Request, res: Response) => {
    const { name, email, phone, message, subject } = req.body;
    
    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nombre, email y mensaje son requeridos' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    try {
      // Save message to database
      await db.insert(contactMessages).values({
        name,
        email,
        phone: phone || null,
        subject: subject || 'Mensaje de contacto',
        message,
        formType: 'contact' as any,
        status: 'unread' as any
      });
      
      // Send email notification in background
      setImmediate(async () => {
        try {
          const { emailService } = await import('../services/email');
          await emailService.sendContactFormNotification({
            name,
            email,
            phone,
            message,
            subject
          });
          console.log(`✅ Mensaje de contacto guardado y email enviado para ${email}`);
        } catch (error) {
          console.error('❌ Error al enviar email de contacto:', error);
        }
      });
      
      res.json({ message: 'Mensaje enviado correctamente' });
    } catch (error) {
      console.error('❌ Error al procesar mensaje de contacto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Endpoint for vehicle valuation requests
  app.post('/api/vehicle-valuation', async (req: Request, res: Response) => {
    const { name, email, phone, make, model, year, kilometer, fuel, condition, additional, images } = req.body;
    
    console.log('📋 Nueva solicitud de tasación recibida:', { name, email, make, model, year });
    
    // Basic validation
    if (!name || !email || !make || !model || !year || !condition) {
      return res.status(400).json({ error: 'Nombre, email, marca, modelo, año y condición son requeridos' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    try {
      // Create message content from valuation data
      const vehicleDetails = `Marca: ${make}, Modelo: ${model}, Año: ${year}, Kilómetros: ${kilometer}, Combustible: ${fuel}`;
      const fullMessage = `${condition}${additional ? `\n\nInformación adicional: ${additional}` : ''}${images && images.length > 0 ? `\n\nImágenes adjuntas: ${images.length}` : ''}`;
      
      // Save message to database
      await db.insert(contactMessages).values({
        name,
        email,
        phone: phone || null,
        subject: `Tasación ${make} ${model} ${year}`,
        message: `Datos del vehículo:\n${vehicleDetails}\n\nEstado y observaciones:\n${fullMessage}`,
        formType: 'valuation' as any,
        status: 'unread' as any,
        images: images || []
      });
      
      // Send email notification in background
      setImmediate(async () => {
        try {
          const { emailService } = await import('../services/email');
          await emailService.sendVehicleValuationNotification({
            name,
            email,
            phone,
            make,
            model,
            year,
            kilometer,
            fuel,
            condition,
            additional,
            images: images || []
          });
          console.log(`✅ Solicitud de tasación guardada y email enviado para ${email}`);
        } catch (error) {
          console.error('❌ Error al enviar email de tasación:', error);
        }
      });
      
      res.json({ message: 'Solicitud de tasación enviada correctamente' });
    } catch (error) {
      console.error('❌ Error al procesar solicitud de tasación:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
}