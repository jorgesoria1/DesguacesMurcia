import { Express, Request, Response } from "express";
import { db } from "../db";
import { isAuthenticated, isAdmin } from "../middleware/auth-middleware";
import { z } from "zod";
import { emailConfig, insertEmailConfigSchema, emailLogs } from "../../shared/schema";
import { eq, inArray, sql, desc } from "drizzle-orm";

// Schema para la configuración de correos
const emailConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

// Configuración por defecto de correos
const defaultEmailConfig = [
  {
    key: "orders_admin_email",
    value: "admin@desguacesmurcia.es",
    description: "Email del administrador para notificaciones de pedidos",
    isActive: true,
  },
  {
    key: "orders_copy_email",
    value: "",
    description: "Email de copia para notificaciones de pedidos",
    isActive: false,
  },
  {
    key: "orders_subject",
    value: "Nuevo pedido #{orderNumber}",
    description: "Asunto del correo para pedidos",
    isActive: true,
  },
  {
    key: "orders_notifications_enabled",
    value: "true",
    description: "Activar notificaciones de pedidos",
    isActive: true,
  },
  {
    key: "contact_admin_email",
    value: "contacto@desguacesmurcia.es",
    description: "Email del administrador para formularios de contacto",
    isActive: true,
  },
  {
    key: "contact_copy_email",
    value: "",
    description: "Email de copia para formularios de contacto",
    isActive: false,
  },
  {
    key: "contact_subject",
    value: "Nuevo mensaje de contacto",
    description: "Asunto del correo para formularios de contacto",
    isActive: true,
  },
  {
    key: "contact_notifications_enabled",
    value: "true",
    description: "Activar notificaciones de formularios de contacto",
    isActive: true,
  },
  {
    key: "smtp_host",
    value: "",
    description: "Servidor SMTP",
    isActive: false,
  },
  {
    key: "smtp_port",
    value: "587",
    description: "Puerto SMTP",
    isActive: false,
  },
  {
    key: "smtp_user",
    value: "",
    description: "Usuario SMTP",
    isActive: false,
  },
  {
    key: "smtp_pass",
    value: "",
    description: "Contraseña SMTP",
    isActive: false,
  },
  {
    key: "smtp_enabled",
    value: "false",
    description: "Activar SMTP personalizado",
    isActive: false,
  },
  {
    key: "sendgrid_enabled",
    value: "false",
    description: "Activar SendGrid",
    isActive: false,
  },
  {
    key: "sendgrid_api_key",
    value: "",
    description: "API Key de SendGrid",
    isActive: false,
  },
];

export function registerEmailConfigRoutes(app: Express) {
  // Obtener configuración de correos
  app.get("/api/admin/email-config", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Obtener configuración actual
      let configs = await db.select().from(emailConfig).orderBy(emailConfig.key);

      // Si no hay configuración, insertar la configuración por defecto
      if (configs.length === 0) {
        for (const config of defaultEmailConfig) {
          await db.insert(emailConfig).values({
            key: config.key,
            value: config.value,
            description: config.description,
            isActive: config.isActive,
          }).onConflictDoNothing();
        }
        
        // Obtener la configuración recién insertada
        configs = await db.select().from(emailConfig).orderBy(emailConfig.key);
      }

      res.json(configs);
    } catch (error) {
      console.error("Error al obtener configuración de correos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Guardar configuración de correos
  app.post("/api/admin/email-config", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { key, value, description, isActive } = req.body;

      if (!key) {
        return res.status(400).json({ error: "La clave es requerida" });
      }

      // Actualizar o insertar configuración usando Drizzle ORM
      const result = await db.insert(emailConfig).values({
        key,
        value: value || '',
        description: description || null,
        isActive: isActive ?? true,
      }).onConflictDoUpdate({
        target: emailConfig.key,
        set: {
          value: value || '',
          description: description || null,
          isActive: isActive ?? true,
          updatedAt: new Date(),
        },
      }).returning();

      res.json(result[0]);
    } catch (error) {
      console.error("Error al guardar configuración de correos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Probar configuración de correos
  app.post("/api/admin/email-config/test", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Obtener configuración actual
      const configKeys = ['orders_admin_email', 'smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'sendgrid_enabled', 'sendgrid_api_key'];
      const configResults = await db.select({
        key: emailConfig.key,
        value: emailConfig.value,
        isActive: emailConfig.isActive
      }).from(emailConfig).where(inArray(emailConfig.key, configKeys));

      const config = configResults.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {} as Record<string, string>);

      // Simular envío de correo de prueba
      const testEmail = {
        to: config.orders_admin_email || "admin@desguacesmurcia.es",
        subject: "Prueba de configuración de correos - Desguace Murcia",
        text: "Este es un correo de prueba para verificar la configuración de correos.",
        html: `
          <h2>Prueba de configuración de correos</h2>
          <p>Este es un correo de prueba para verificar que la configuración de correos está funcionando correctamente.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Sistema:</strong> Desguace Murcia</p>
        `,
      };

      // Enviar correo de prueba usando el servicio de email
      console.log("Envío de correo de prueba:", testEmail);
      
      try {
        const { emailService } = await import('../services/email');
        
        // Usar el sistema de logging para enviar el correo de prueba
        const result = await emailService.sendEmailWithLogging(
          testEmail.to,
          testEmail.subject,
          testEmail.html,
          testEmail.text,
          'test',
          { testType: 'configuration_test' }
        );

        res.json({ 
          success: result.success, 
          message: result.success ? "Correo de prueba enviado correctamente" : "Error al enviar correo de prueba: " + result.error,
          config: {
            adminEmail: config.orders_admin_email,
            smtpEnabled: config.smtp_enabled === "true",
            sendgridEnabled: config.sendgrid_enabled === "true",
          },
          logId: result.logId
        });
      } catch (emailError) {
        console.error("Error al enviar correo de prueba:", emailError);
        res.json({ 
          success: false, 
          message: "Error al enviar correo de prueba: " + emailError.message,
          config: {
            adminEmail: config.orders_admin_email,
            smtpEnabled: config.smtp_enabled === "true",
            sendgridEnabled: config.sendgrid_enabled === "true",
          }
        });
      }
    } catch (error) {
      console.error("Error al probar configuración de correos:", error);
      res.status(500).json({ error: "Error al enviar correo de prueba" });
    }
  });

  // Obtener configuración específica por clave
  app.get("/api/admin/email-config/:key", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;

      const result = await db.select().from(emailConfig).where(eq(emailConfig.key, key));

      if (result.length === 0) {
        return res.status(404).json({ error: "Configuración no encontrada" });
      }

      res.json(result[0]);
    } catch (error) {
      console.error("Error al obtener configuración específica:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener logs de correos enviados
  app.get("/api/admin/email-logs", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50, status, email_type } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = db.select().from(emailLogs);

      // Filtros opcionales
      if (status) {
        query = query.where(eq(emailLogs.status, status as string));
      }
      if (email_type) {
        query = query.where(eq(emailLogs.emailType, email_type as string));
      }

      const logs = await query
        .orderBy(desc(emailLogs.createdAt))
        .limit(Number(limit))
        .offset(offset);

      // Contar total de logs
      const totalResult = await db.select({ count: emailLogs.id }).from(emailLogs);
      const total = totalResult.length;

      res.json({
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error("Error al obtener logs de correos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Obtener estadísticas de correos
  app.get("/api/admin/email-stats", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await db.select({
        status: emailLogs.status,
        emailType: emailLogs.emailType,
        transportMethod: emailLogs.transportMethod,
        count: emailLogs.id
      }).from(emailLogs);

      // Procesar estadísticas
      const processed = {
        byStatus: {},
        byType: {},
        byTransport: {},
        total: 0
      };

      stats.forEach(stat => {
        processed.byStatus[stat.status] = (processed.byStatus[stat.status] || 0) + 1;
        processed.byType[stat.emailType] = (processed.byType[stat.emailType] || 0) + 1;
        processed.byTransport[stat.transportMethod] = (processed.byTransport[stat.transportMethod] || 0) + 1;
        processed.total += 1;
      });

      res.json(processed);
    } catch (error) {
      console.error("Error al obtener estadísticas de correos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Eliminar log individual
  app.delete("/api/admin/email-logs/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const logId = parseInt(id);

      if (isNaN(logId)) {
        return res.status(400).json({ error: "ID de log inválido" });
      }

      await db.delete(emailLogs).where(eq(emailLogs.id, logId));

      res.json({ message: "Log eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar log:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Limpiar todo el historial
  app.delete("/api/admin/email-logs", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      await db.delete(emailLogs);
      res.json({ message: "Historial de correos limpiado completamente" });
    } catch (error) {
      console.error("Error al limpiar historial:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
}