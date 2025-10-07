// Archivo temporal para arreglar rutas CMS que causan reinicios del servidor
// Esto reemplaza las rutas problemáticas con stubs seguros hasta que se implementen
// los métodos faltantes en DatabaseStorage

import { Request, Response, Application } from 'express';

export function setupSafeCMSRoutes(app: Application) {
  // Rutas CMS temporalmente inhabilitadas - devuelven respuestas vacías pero válidas
  
  // Rutas públicas del CMS
  app.get('/api/cms/pages/:slug', async (req: Request, res: Response) => {
    res.status(404).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.get('/api/cms/footer-blocks', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.get('/api/cms/settings', async (req: Request, res: Response) => {
    res.json([]);
  });

  // Rutas administrativas del CMS
  app.get('/api/admin/cms/pages', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.get('/api/admin/cms/pages/:id', async (req: Request, res: Response) => {
    res.status(404).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.post('/api/admin/cms/pages', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.put('/api/admin/cms/pages/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.delete('/api/admin/cms/pages/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  // Rutas para gestión de footer blocks
  app.get('/api/admin/cms/footer-blocks', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.post('/api/admin/cms/footer-blocks', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.put('/api/admin/cms/footer-blocks/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.delete('/api/admin/cms/footer-blocks/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  // Rutas de homepage blocks
  app.get('/api/admin/cms/homepage-blocks', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.post('/api/admin/cms/homepage-blocks', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.put('/api/admin/cms/homepage-blocks/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.delete('/api/admin/cms/homepage-blocks/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  // Rutas de banners
  app.get('/api/admin/cms/banners', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.get('/api/cms/banners/active', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.get('/api/cms/banners/position/:position', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.post('/api/admin/cms/banners', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.put('/api/admin/cms/banners/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.delete('/api/admin/cms/banners/:id', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  // Rutas de site settings
  app.put('/api/cms/site-settings/:key', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.get('/api/admin/cms/site-settings', async (req: Request, res: Response) => {
    res.json([]);
  });

  app.put('/api/admin/cms/site-settings/:key', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  app.post('/api/admin/cms/site-settings', async (req: Request, res: Response) => {
    res.status(503).json({ error: 'CMS temporalmente deshabilitado' });
  });

  console.log('🛡️ Safe CMS routes loaded (CMS temporarily disabled)');
}