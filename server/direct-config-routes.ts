import { Express, Request, Response } from 'express';
import { db } from './db';
import { siteConfig, apiConfig } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated, isAdmin } from './middleware/auth-middleware';

export function setupConfigRoutes(app: Express) {
  // Endpoint para obtener configuración de API
  app.get("/api/config", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Obteniendo configuración de API...");

      // Buscar configuración activa de API
      const [config] = await db
        .select()
        .from(apiConfig)
        .where(eq(apiConfig.active, true))
        .limit(1);

      if (!config) {
        console.log("No hay configuración de API. El administrador debe configurarla.");
        
        // Retornar configuración vacía - el administrador debe configurarla manualmente
        return res.status(404).json({ 
          message: "No hay configuración de API. Por favor, configure la API desde el panel de administración.",
          apiKey: "",
          companyId: 0,
          channel: ""
        });
      }

      console.log("Configuración encontrada:", config);
      return res.json(config);
    } catch (error) {
      console.error("Error al obtener configuración de API:", error);
      return res.status(500).json({ 
        message: "Error al obtener configuración de API",
        error: error.message
      });
    }
  });

  // Endpoint para actualizar configuración de API
  app.post('/api/config', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('📝 Actualizando configuración de API:', req.body);

      const { apiKey, apiId, channel, active = true } = req.body;

      if (!apiKey || !apiId || !channel) {
        console.error('❌ Faltan datos requeridos:', { apiKey: !!apiKey, apiId: !!apiId, channel: !!channel });
        return res.status(400).json({ 
          success: false, 
          error: 'Faltan datos requeridos (apiKey, apiId, channel)' 
        });
      }

      // Validar que apiId sea un número
      const parsedApiId = parseInt(apiId.toString());
      if (isNaN(parsedApiId)) {
        console.error('❌ apiId no es un número válido:', apiId);
        return res.status(400).json({ 
          success: false, 
          error: 'apiId debe ser un número válido' 
        });
      }

      // Buscar configuración existente
      const existingConfig = await db.select().from(apiConfig).limit(1);

      if (existingConfig.length > 0) {
        console.log('🔄 Actualizando configuración existente ID:', existingConfig[0].id);

        // Actualizar configuración existente
        const [updated] = await db
          .update(apiConfig)
          .set({
            apiKey: apiKey.toString(),
            companyId: parsedApiId,  // Usar companyId en lugar de apiId
            channel: channel.toString()
          })
          .where(eq(apiConfig.id, existingConfig[0].id))
          .returning();

        console.log('✅ Configuración actualizada exitosamente:', { id: updated.id, channel: updated.channel });
        return res.status(200).json({ 
          success: true, 
          data: updated,
          message: 'Configuración actualizada correctamente'
        });
      } else {
        console.log('🆕 Creando nueva configuración');

        // Crear nueva configuración
        const [created] = await db
          .insert(apiConfig)
          .values({
            apiKey: apiKey.toString(),
            companyId: parsedApiId,  // Usar companyId en lugar de apiId
            channel: channel.toString()
          })
          .returning();

        console.log('✅ Nueva configuración creada exitosamente:', { id: created.id, channel: created.channel });
        return res.status(201).json({ 
          success: true, 
          data: created,
          message: 'Configuración creada correctamente'
        });
      }
    } catch (error) {
      console.error('❌ Error detallado al actualizar configuración:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // Endpoint para obtener el valor real sin procesamiento (solo para admins)
  app.get("/api/site/config/raw", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const [config] = await db.select().from(siteConfig).limit(1);

      // Si no hay configuración, crear una por defecto
      if (!config) {
        const [defaultConfig] = await db
          .insert(siteConfig)
          .values({
            maintenanceMode: false,
            maintenanceMessage: "Estamos realizando mejoras en nuestra plataforma.",
            estimatedCompletion: "Volveremos pronto",
            updatedAt: new Date()
          })
          .returning();

        return res.json(defaultConfig);
      }

      // Devolver el valor real sin manipular
      return res.json(config);
    } catch (error) {
      console.error("Error al obtener configuración raw del sitio:", error);
      return res.status(500).json({ 
        message: "Error al obtener configuración del sitio" 
      });
    }
  });

  // Obtener configuración del sitio (accesible públicamente)
  app.get("/api/site/config", async (req: Request, res: Response) => {
    try {
      const [config] = await db.select().from(siteConfig).limit(1);

      // Si no hay configuración, crear una por defecto
      if (!config) {
        const [defaultConfig] = await db
          .insert(siteConfig)
          .values({
            maintenanceMode: false,
            maintenanceMessage: "Estamos realizando mejoras en nuestra plataforma.",
            estimatedCompletion: "Volveremos pronto",
            updatedAt: new Date()
          })
          .returning();

        return res.json(defaultConfig);
      }

      // Comprobar si el usuario es administrador
      const userIsAdmin = req.isAuthenticated() && req.user && (req.user as any).isAdmin === true;
      console.log(`Usuario autenticado: ${req.isAuthenticated()}, Es admin: ${userIsAdmin}, Modo mantenimiento actual: ${config.maintenanceMode}`);

      // Si es administrador, añadir flag de administrador pero NO modificar el modo mantenimiento
      if (userIsAdmin) {
        console.log("Enviando configuración real para admin:", config);
        return res.json({
          ...config,
          isAdminUser: true
        });
      }

      // Para usuarios normales, enviar configuración sin modificaciones
      console.log("Enviando configuración normal:", config);
      return res.json(config);
    } catch (error) {
      console.error("Error al obtener configuración del sitio:", error);
      return res.status(500).json({ 
        message: "Error al obtener configuración del sitio" 
      });
    }
  });

  // Actualizar configuración del sitio (protegida para administradores)
  app.post("/api/site/config", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Recibida solicitud para actualizar configuración del sitio:", req.body);

      // Validar estrictamente los tipos de datos
      let maintenanceMode = req.body.maintenanceMode;
      let maintenanceMessage = req.body.maintenanceMessage;
      let estimatedTime = req.body.estimatedTime;

      // Asegurar que los valores sean del tipo correcto
      // maintenanceMode debe ser un booleano
      if (maintenanceMode !== undefined) {
        if (typeof maintenanceMode === 'string') {
          maintenanceMode = maintenanceMode === 'true';
        } else {
          maintenanceMode = Boolean(maintenanceMode);
        }
      }

      // Mensajes deben ser strings
      if (maintenanceMessage !== undefined) {
        maintenanceMessage = String(maintenanceMessage || "");
      }

      if (estimatedTime !== undefined) {
        estimatedTime = String(estimatedTime || "");
      }

      // Crear objeto de actualización con valores tipados correctamente
      const updateData: Record<string, any> = {};

      if (maintenanceMode !== undefined) {
        updateData.maintenanceMode = maintenanceMode;
      }

      if (maintenanceMessage !== undefined) {
        updateData.maintenanceMessage = maintenanceMessage;
      }

      if (estimatedTime !== undefined) {
        updateData.estimatedTime = estimatedTime;
      }

      updateData.lastUpdated = new Date();

      // Registrar los valores que se van a actualizar
      console.log("Valores a actualizar:", {
        maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : "sin cambios",
        maintenanceMessage: maintenanceMessage ? maintenanceMessage : "sin cambios",
        estimatedTime: estimatedTime ? estimatedTime : "sin cambios"
      });

      // Buscar configuración existente
      const [existingConfig] = await db.select().from(siteConfig).limit(1);

      // Actualizar o crear según corresponda
      let updatedConfig;
      if (existingConfig) {
        [updatedConfig] = await db
          .update(siteConfig)
          .set(updateData)
          .where(eq(siteConfig.id, existingConfig.id))
          .returning();
      } else {
        // Si no existe, establecer valores por defecto para campos obligatorios
        if (maintenanceMode === undefined) updateData.maintenanceMode = false;
        if (!maintenanceMessage) updateData.maintenanceMessage = "Estamos realizando mejoras en nuestra plataforma.";
        if (!estimatedTime) updateData.estimatedTime = "Volveremos pronto";

        [updatedConfig] = await db
          .insert(siteConfig)
          .values(updateData)
          .returning();
      }

      if (!updatedConfig) {
        console.error("No se pudo actualizar la configuración del sitio");
        return res.status(500).json({ 
          message: "Error al actualizar configuración del sitio" 
        });
      }

      console.log("Configuración actualizada con éxito:", updatedConfig);
      return res.json(updatedConfig);
    } catch (error) {
      console.error("Error al actualizar configuración del sitio:", error);
      return res.status(500).json({ 
        message: "Error al actualizar configuración del sitio" 
      });
    }
  });

  // Chatbot config endpoints
  app.get('/api/config/chatbot', async (req: Request, res: Response) => {
    try {
      const { pool } = await import('./db');
      const result = await pool.query('SELECT code FROM chatbot_config ORDER BY id DESC LIMIT 1');
      
      if (result.rows && result.rows.length > 0) {
        res.json({ chatbotCode: result.rows[0].code || '' });
      } else {
        res.json({ chatbotCode: '' });
      }
    } catch (error) {
      console.error("Error obteniendo configuración del chatbot:", error);
      res.json({ chatbotCode: '' });
    }
  });

  app.post('/api/config/chatbot', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { chatbotCode } = req.body;
      
      console.log('Chatbot POST request received:', { chatbotCodeLength: chatbotCode?.length });
      
      if (typeof chatbotCode !== 'string') {
        return res.status(400).json({ error: 'chatbotCode debe ser una cadena de texto' });
      }
      
      const { pool } = await import('./db');
      console.log('Pool connection established');
      
      // Check if config exists
      const checkResult = await pool.query('SELECT id FROM chatbot_config LIMIT 1');
      console.log('Check result:', checkResult.rows);
      
      if (checkResult.rows && checkResult.rows.length > 0) {
        console.log('Updating existing config...');
        await pool.query(
          'UPDATE chatbot_config SET code = $1, updated_at = NOW() WHERE id = $2',
          [chatbotCode, checkResult.rows[0].id]
        );
        console.log('Config updated successfully');
      } else {
        console.log('Inserting new config...');
        await pool.query(
          'INSERT INTO chatbot_config (code, created_at, updated_at) VALUES ($1, NOW(), NOW())',
          [chatbotCode]
        );
        console.log('Config inserted successfully');
      }
      
      res.json({ 
        success: true, 
        message: 'Configuración del chatbot actualizada correctamente' 
      });
    } catch (error) {
      console.error("Error actualizando configuración del chatbot:", error);
      res.status(500).json({
        error: "Error al actualizar configuración del chatbot",
        details: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });
}