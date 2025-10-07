import { Express, Request, Response } from 'express';
import { db } from '../db';
import { homepageBlocks, pages, footerBlocks, siteConfig, siteSettings } from '../../shared/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { isAuthenticated, isAdmin } from '../middleware/auth-middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'client/public/uploads');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para evitar conflictos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `image-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export function registerCMSRoutes(app: Express) {
  // Rutas para Homepage Blocks
  app.get('/api/cms/homepage-blocks', async (req: Request, res: Response) => {
    try {
      const blocks = await db.select().from(homepageBlocks).orderBy(asc(homepageBlocks.sortOrder));
      res.json(blocks);
    } catch (error) {
      console.error('Error al obtener bloques de homepage:', error);
      res.status(500).json({ error: 'Error al obtener bloques de homepage' });
    }
  });

  // Rutas ADMIN para Homepage Blocks
  app.get('/api/admin/cms/homepage-blocks', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const blocks = await db.select().from(homepageBlocks).orderBy(asc(homepageBlocks.sortOrder));
      res.json(blocks);
    } catch (error) {
      console.error('Error al obtener bloques de homepage:', error);
      res.status(500).json({ error: 'Error al obtener bloques de homepage' });
    }
  });

  app.put('/api/admin/cms/homepage-blocks/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const result = await db.update(homepageBlocks)
        .set({
          ...updateData,
          updatedAt: sql`NOW()`
        })
        .where(eq(homepageBlocks.id, parseInt(id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Bloque no encontrado' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error al actualizar bloque de homepage:', error);
      res.status(500).json({ error: 'Error al actualizar bloque de homepage' });
    }
  });

  // Subir imagen para bloque
  app.post('/api/admin/cms/upload-image', isAuthenticated, isAdmin, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó archivo de imagen' });
      }

      // Generar URL de la imagen
      const imageUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        success: true,
        imageUrl: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      res.status(500).json({ error: 'Error al subir imagen' });
    }
  });

  // Rutas para Footer Blocks
  app.get('/api/cms/footer-blocks', async (req: Request, res: Response) => {
    try {
      const blocks = await db.select().from(footerBlocks).orderBy(asc(footerBlocks.sortOrder));
      res.json(blocks);
    } catch (error) {
      console.error('Error al obtener bloques de footer:', error);
      res.status(500).json({ error: 'Error al obtener bloques de footer' });
    }
  });

  app.get('/api/admin/cms/footer-blocks', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const blocks = await db.select().from(footerBlocks).orderBy(asc(footerBlocks.sortOrder));
      res.json(blocks);
    } catch (error) {
      console.error('Error al obtener bloques de footer:', error);
      res.status(500).json({ error: 'Error al obtener bloques de footer' });
    }
  });

  app.post('/api/admin/cms/footer-blocks', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const newBlock = req.body;
      const result = await db.insert(footerBlocks).values(newBlock).returning();
      res.json(result[0]);
    } catch (error) {
      console.error('Error al crear bloque de footer:', error);
      res.status(500).json({ error: 'Error al crear bloque de footer' });
    }
  });

  app.put('/api/admin/cms/footer-blocks/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log('📝 Datos recibidos para actualizar footer block:', JSON.stringify(updateData, null, 2));
      
      // Filtrar campos de fecha automáticos para evitar conflictos
      const { id: blockId, createdAt, updatedAt, ...cleanData } = updateData;
      
      console.log('📝 Datos filtrados para actualización:', JSON.stringify(cleanData, null, 2));
      
      const result = await db.update(footerBlocks)
        .set({
          ...cleanData,
          updatedAt: sql`NOW()`
        })
        .where(eq(footerBlocks.id, parseInt(id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Bloque no encontrado' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error al actualizar bloque de footer:', error);
      res.status(500).json({ error: 'Error al actualizar bloque de footer' });
    }
  });

  app.delete('/api/admin/cms/footer-blocks/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await db.delete(footerBlocks)
        .where(eq(footerBlocks.id, parseInt(id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Bloque no encontrado' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar bloque de footer:', error);
      res.status(500).json({ error: 'Error al eliminar bloque de footer' });
    }
  });

  // Rutas para Pages
  app.get('/api/admin/cms/pages', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const allPages = await db.select().from(pages).orderBy(asc(pages.id));
      res.json(allPages);
    } catch (error) {
      console.error('Error al obtener páginas:', error);
      res.status(500).json({ error: 'Error al obtener páginas' });
    }
  });

  app.post('/api/admin/cms/pages', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const newPage = req.body;
      const result = await db.insert(pages).values(newPage).returning();
      res.json(result[0]);
    } catch (error) {
      console.error('Error al crear página:', error);
      res.status(500).json({ error: 'Error al crear página' });
    }
  });

  app.put('/api/admin/cms/pages/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log('📝 Datos recibidos para actualizar página:', JSON.stringify(updateData, null, 2));
      
      // Filtrar campos de fecha automáticos para evitar conflictos
      const { id: pageId, createdAt, updatedAt, ...cleanData } = updateData;
      
      console.log('📝 Datos filtrados para actualización:', JSON.stringify(cleanData, null, 2));
      
      const result = await db.update(pages)
        .set({
          ...cleanData,
          updatedAt: sql`NOW()`
        })
        .where(eq(pages.id, parseInt(id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Página no encontrada' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error al actualizar página:', error);
      res.status(500).json({ error: 'Error al actualizar página' });
    }
  });

  app.delete('/api/admin/cms/pages/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await db.delete(pages)
        .where(eq(pages.id, parseInt(id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Página no encontrada' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar página:', error);
      res.status(500).json({ error: 'Error al eliminar página' });
    }
  });

  // Rutas para Site Config
  app.get('/api/cms/settings', async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(siteConfig);
      res.json(settings);
    } catch (error) {
      console.error('Error al obtener configuración del sitio:', error);
      res.status(500).json({ error: 'Error al obtener configuración del sitio' });
    }
  });

  // Rutas para Site Settings (configuraciones más específicas)
  app.get('/api/cms/site-settings', async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(siteSettings);
      res.json(settings);
    } catch (error) {
      console.error('Error al obtener configuraciones del sitio:', error);
      res.status(500).json({ error: 'Error al obtener configuraciones del sitio' });
    }
  });

  app.get('/api/admin/cms/settings', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(siteConfig);
      res.json(settings);
    } catch (error) {
      console.error('Error al obtener configuración del sitio:', error);
      res.status(500).json({ error: 'Error al obtener configuración del sitio' });
    }
  });

  app.put('/api/admin/cms/settings/:key', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      const result = await db.update(siteSettings)
        .set({
          value: value
        })
        .where(eq(siteSettings.key, key))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Configuración no encontrada' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  });

  // Endpoint para actualizar configuraciones individuales del sitio
  app.put('/api/cms/site-settings/:key', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      console.log(`📝 Actualizando configuración: ${key} = ${value}`);
      
      const result = await db.update(siteSettings)
        .set({
          value: value
        })
        .where(eq(siteSettings.key, key))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Configuración no encontrada' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error al actualizar configuración del sitio:', error);
      res.status(500).json({ error: 'Error al actualizar configuración del sitio' });
    }
  });

  // Ruta para obtener páginas publicadas (público)
  app.get('/api/cms/pages/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const page = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
      
      if (page.length === 0 || !page[0].isPublished) {
        return res.status(404).json({ error: 'Página no encontrada' });
      }

      res.json(page[0]);
    } catch (error) {
      console.error('Error al obtener página:', error);
      res.status(500).json({ error: 'Error al obtener página' });
    }
  });

  // Ruta para banners (vacía por ahora)
  app.get('/api/admin/cms/banners', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      // Por ahora devolver array vacío
      res.json([]);
    } catch (error) {
      console.error('Error al obtener banners:', error);
      res.status(500).json({ error: 'Error al obtener banners' });
    }
  });
}