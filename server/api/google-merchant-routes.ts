
import { Express, Request, Response } from 'express';
import { isAdmin, isAuthenticated } from '../auth';
import { googleMerchantFeedService } from '../services/google-merchant-feed';

/**
 * Rutas para Google Merchant Center feed
 */
export function registerGoogleMerchantRoutes(app: Express) {
  
  /**
   * Generar y descargar feed XML
   * GET /api/google-merchant/feed.xml
   */
  app.get('/api/google-merchant/feed.xml', async (req: Request, res: Response) => {
    try {
      console.log('Generando feed XML para Google Merchant Center...');
      
      const feedXML = await googleMerchantFeedService.generateFeed();
      
      // Configurar headers para el feed XML
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      console.log('Feed XML generado exitosamente');
      res.send(feedXML);
    } catch (error) {
      console.error('Error generando feed XML:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando feed XML',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  /**
   * Obtener estadísticas del feed (solo admin)
   * GET /api/google-merchant/stats
   */
  app.get('/api/google-merchant/stats', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await googleMerchantFeedService.getFeedStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas del feed:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas del feed',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  /**
   * Vista previa del feed (solo admin) - muestra primeros 10 items
   * GET /api/google-merchant/preview
   */
  app.get('/api/google-merchant/preview', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('Generando vista previa del feed...');
      
      // Obtener solo las primeras 10 piezas para vista previa
      const parts = await require('../storage').storage.getParts({ activo: true });
      const limitedParts = parts.slice(0, 10).filter((part: any) => {
        const price = Number(part.precio);
        return price > 0 && part.imagenes && part.imagenes.length > 0;
      });

      // Crear una instancia temporal del servicio para generar vista previa
      const feedService = new (require('../services/google-merchant-feed').GoogleMerchantFeedService)();
      
      // Generar items para vista previa
      const items = [];
      for (const part of limitedParts) {
        const item = await (feedService as any).generateItem(part);
        if (item) items.push(item);
      }

      const previewXML = (feedService as any).buildXMLFeed(items);
      
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.send(previewXML);
    } catch (error) {
      console.error('Error generando vista previa del feed:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando vista previa del feed',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });
}
