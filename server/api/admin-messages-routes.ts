import { Express, Request, Response } from 'express';
import { db } from '../db';
import { contactMessages } from '../../shared/schema';
import { eq, and, or, ilike, desc, asc, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireManager } from '../middleware/auth';

export function registerAdminMessagesRoutes(app: Express) {
  
  // Get message statistics (MUST BE BEFORE :id route)
  app.get('/api/admin/contact-messages/stats', async (req: Request, res: Response) => {
    try {
      const stats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          unread: sql<number>`COUNT(CASE WHEN status = 'unread' THEN 1 END)`,
          read: sql<number>`COUNT(CASE WHEN status = 'read' THEN 1 END)`,
          archived: sql<number>`COUNT(CASE WHEN status = 'archived' THEN 1 END)`,
          contact: sql<number>`COUNT(CASE WHEN form_type = 'contact' THEN 1 END)`,
          valuation: sql<number>`COUNT(CASE WHEN form_type = 'valuation' THEN 1 END)`,
          quote: sql<number>`COUNT(CASE WHEN form_type = 'quote' THEN 1 END)`,
        })
        .from(contactMessages);

      const result = stats[0];
      
      console.log('📊 Estadísticas de mensajes:', result);
      res.json(result);
      
    } catch (error) {
      console.error('Error fetching message stats:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  });
  
  // Get all messages with filtering
  app.get('/api/admin/contact-messages', async (req: Request, res: Response) => {
    try {
      const { search, status, type, limit = '50', offset = '0', sortBy = 'created_at', sortOrder = 'desc' } = req.query;
      
      let query = db.select().from(contactMessages);
      
      // Build where conditions
      const whereConditions = [];
      
      if (search) {
        const searchTerm = `%${search}%`;
        whereConditions.push(
          or(
            ilike(contactMessages.name, searchTerm),
            ilike(contactMessages.email, searchTerm),
            ilike(contactMessages.message, searchTerm),
            ilike(contactMessages.subject, searchTerm)
          )
        );
      }
      
      if (status && status !== 'all') {
        whereConditions.push(eq(contactMessages.status, status as string));
      }
      
      if (type && type !== 'all') {
        whereConditions.push(eq(contactMessages.formType, type as string));
      }
      
      // Execute query with conditions
      let messages;
      if (whereConditions.length > 0) {
        messages = await db
          .select()
          .from(contactMessages)
          .where(and(...whereConditions))
          .orderBy(desc(contactMessages.createdAt))
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string));
      } else {
        messages = await db
          .select()
          .from(contactMessages)
          .orderBy(desc(contactMessages.createdAt))
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string));
      }
      
      // Process images field - handle PostgreSQL arrays
      const processedMessages = messages.map(message => {
        let parsedImages = [];
        if (message.images) {
          if (Array.isArray(message.images)) {
            // PostgreSQL arrays are returned as actual arrays
            parsedImages = message.images;
          } else if (typeof message.images === 'string') {
            try {
              // Fallback for JSON strings if needed
              parsedImages = JSON.parse(message.images);
            } catch (error) {
              console.warn(`Error parsing images for message ${message.id}:`, error);
              parsedImages = [];
            }
          } else {
            parsedImages = [];
          }
        }
        
        return {
          ...message,
          images: parsedImages
        };
      });

      console.log(`📬 Mensajes obtenidos: ${messages.length} mensajes`);
      res.json(processedMessages);
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Error al obtener mensajes' });
    }
  });


  // Get single message
  app.get('/api/admin/messages/:id', requireAuth, requireManager, async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.id);
      
      const message = await db
        .select()
        .from(contactMessages)
        .where(eq(contactMessages.id, messageId))
        .limit(1);

      if (message.length === 0) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      // Process images field for single message
      let parsedImages = [];
      if (message[0].images) {
        if (Array.isArray(message[0].images)) {
          // PostgreSQL arrays are returned as actual arrays
          parsedImages = message[0].images;
        } else if (typeof message[0].images === 'string') {
          try {
            // Fallback for JSON strings if needed
            parsedImages = JSON.parse(message[0].images);
          } catch (error) {
            console.warn(`Error parsing images for message ${message[0].id}:`, error);
            parsedImages = [];
          }
        } else {
          parsedImages = [];
        }
      }
      
      const processedMessage = {
        ...message[0],
        images: parsedImages
      };

      res.json(processedMessage);
      
    } catch (error) {
      console.error('Error fetching message:', error);
      res.status(500).json({ error: 'Error al obtener mensaje' });
    }
  });

  // Generic update message (PATCH) - add to existing contact-messages route
  app.patch('/api/admin/contact-messages/:id', async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['read', 'archived', 'unread'].includes(status)) {
        return res.status(400).json({ error: 'Estado válido requerido (read, archived, unread)' });
      }
      
      const result = await db
        .update(contactMessages)
        .set({ 
          status: status,
          updatedAt: sql`NOW()`
        })
        .where(eq(contactMessages.id, messageId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      console.log(`📝 Mensaje ${messageId} actualizado a estado: ${status}`);
      res.json({ message: `Mensaje marcado como ${status}`, data: result[0] });
      
    } catch (error) {
      console.error('Error updating message status:', error);
      res.status(500).json({ error: 'Error al actualizar estado del mensaje' });
    }
  });

  // Mark message as read
  app.put('/api/admin/messages/:id/read', requireAuth, requireManager, async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.id);
      
      const result = await db
        .update(contactMessages)
        .set({ 
          status: 'read',
          updatedAt: sql`NOW()`
        })
        .where(eq(contactMessages.id, messageId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      console.log(`📖 Mensaje ${messageId} marcado como leído`);
      res.json({ message: 'Mensaje marcado como leído', data: result[0] });
      
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Error al marcar mensaje como leído' });
    }
  });

  // Archive message
  app.put('/api/admin/messages/:id/archive', requireAuth, requireManager, async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.id);
      
      const result = await db
        .update(contactMessages)
        .set({ 
          status: 'archived',
          updatedAt: sql`NOW()`
        })
        .where(eq(contactMessages.id, messageId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      console.log(`📦 Mensaje ${messageId} archivado`);
      res.json({ message: 'Mensaje archivado', data: result[0] });
      
    } catch (error) {
      console.error('Error archiving message:', error);
      res.status(500).json({ error: 'Error al archivar mensaje' });
    }
  });

  // Delete message - add to existing contact-messages route
  app.delete('/api/admin/contact-messages/:id', async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.id);
      
      const result = await db
        .delete(contactMessages)
        .where(eq(contactMessages.id, messageId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Mensaje no encontrado' });
      }

      console.log(`🗑️ Mensaje ${messageId} eliminado`);
      res.json({ message: 'Mensaje eliminado correctamente' });
      
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Error al eliminar mensaje' });
    }
  });

  // Bulk operations
  app.post('/api/admin/messages/bulk', requireAuth, requireManager, async (req: Request, res: Response) => {
    try {
      const { action, messageIds } = req.body;
      
      if (!action || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ error: 'Acción y IDs de mensajes requeridos' });
      }

      let result;
      
      switch (action) {
        case 'mark_read':
          result = await db
            .update(contactMessages)
            .set({ 
              status: 'read',
              updatedAt: sql`NOW()`
            })
            .where(inArray(contactMessages.id, messageIds))
            .returning();
          break;
          
        case 'archive':
          result = await db
            .update(contactMessages)
            .set({ 
              status: 'archived',
              updatedAt: sql`NOW()`
            })
            .where(inArray(contactMessages.id, messageIds))
            .returning();
          break;
          
        case 'delete':
          result = await db
            .delete(contactMessages)
            .where(inArray(contactMessages.id, messageIds))
            .returning();
          break;
          
        default:
          return res.status(400).json({ error: 'Acción no válida' });
      }

      console.log(`📋 Operación masiva ${action} aplicada a ${result.length} mensajes`);
      res.json({ 
        message: `Operación ${action} aplicada correctamente`, 
        affected: result.length 
      });
      
    } catch (error) {
      console.error('Error in bulk operation:', error);
      res.status(500).json({ error: 'Error en operación masiva' });
    }
  });

  console.log('✅ Rutas de gestión de mensajes registradas');
}