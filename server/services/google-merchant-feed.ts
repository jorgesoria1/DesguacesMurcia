
import { storage } from '../storage';
import { Part } from '@shared/schema';

export class GoogleMerchantFeedService {
  /**
   * Genera el feed XML para Google Merchant Center
   */
  async generateFeed(): Promise<string> {
    try {
      console.log('Iniciando generación de feed...');
      
      // Obtener piezas activas con límite para mejorar performance
      const parts = await storage.getParts({ 
        activo: true, 
        limit: 1000  // Limitar a 1000 piezas para mejor rendimiento
      });
      
      console.log(`Obtenidas ${parts.length} piezas de la base de datos`);
      
      // Filtrar piezas que tienen precio válido e imágenes
      const validParts = parts.filter(part => {
        const price = Number(part.precio);
        return price > 0 && part.imagenes && part.imagenes.length > 0;
      });

      console.log(`Generando feed para ${validParts.length} piezas válidas`);

      // Procesar en lotes de 50 para evitar sobrecarga
      const batchSize = 50;
      const items: (string | null)[] = [];
      
      for (let i = 0; i < validParts.length; i += batchSize) {
        const batch = validParts.slice(i, i + batchSize);
        console.log(`Procesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(validParts.length/batchSize)}`);
        
        const batchItems = await Promise.all(
          batch.map(async (part) => this.generateItem(part))
        );
        
        items.push(...batchItems);
      }

      const validItems = items.filter(item => item !== null);
      console.log(`Feed generado con ${validItems.length} items válidos`);

      return this.buildXMLFeed(validItems);
    } catch (error) {
      console.error('Error generando feed de Google Merchant:', error);
      throw error;
    }
  }

  /**
   * Genera un item XML para una pieza
   */
  private async generateItem(part: Part): Promise<string | null> {
    try {
      // Generar información de vehículo basada en los datos de la pieza
      let vehicleInfo = '';
      if (part.vehicleMarca || part.vehicleModelo) {
        const vehicleData = [
          part.vehicleMarca,
          part.vehicleModelo,
          part.vehicleVersion,
          part.vehicleAnyo ? `(${part.vehicleAnyo})` : ''
        ].filter(Boolean).join(' ').trim();
        
        if (vehicleData) {
          vehicleInfo = ` - Compatible con: ${vehicleData}`;
        }
      }

      const price = Number(part.precio);
      const title = this.sanitizeText(part.descripcionArticulo || `Pieza ${part.refLocal}`);
      const description = this.sanitizeText(
        `${part.descripcionArticulo || 'Pieza de recambio'} ${vehicleInfo}. Familia: ${part.descripcionFamilia || 'General'}. Referencia: ${part.refPrincipal || part.refLocal}`
      );
      
      // URL del producto (usar la URL de la aplicación actual)
      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : process.env.BASE_URL || 'https://desguacesmurcia.com';
      const link = `${baseUrl}/parts/${part.id}`;
      
      // Imagen principal
      const imageLink = part.imagenes && part.imagenes.length > 0 
        ? part.imagenes[0] 
        : '';

      // Categoría basada en la familia de la pieza
      const category = this.mapCategory(part.descripcionFamilia || 'General');

      return `
    <item>
      <g:id>${part.id}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:condition>used</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${price.toFixed(2)} EUR</g:price>
      <g:brand>${part.vehicleMarca || 'Genérico'}</g:brand>
      <g:mpn>${part.refPrincipal || part.refLocal}</g:mpn>
      <g:product_type>${category}</g:product_type>
      <g:google_product_category>Vehicle Parts &amp; Accessories</g:google_product_category>
      <g:gtin></g:gtin>
      <g:custom_label_0>${part.descripcionFamilia || 'General'}</g:custom_label_0>
      <g:custom_label_1>${part.vehicleMarca || 'Universal'}</g:custom_label_1>
    </item>`;
    } catch (error) {
      console.error(`Error generando item para pieza ${part.id}:`, error);
      return null;
    }
  }

  /**
   * Construye el XML completo del feed
   */
  private buildXMLFeed(items: string[]): string {
    const now = new Date().toISOString();
    
    const baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : process.env.BASE_URL || 'https://desguacesmurcia.com';
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Desguace Murcia - Piezas de Recambio</title>
    <link>${baseUrl}</link>
    <description>Piezas de recambio de segunda mano de calidad</description>
    <lastBuildDate>${now}</lastBuildDate>
    ${items.join('\n')}
  </channel>
</rss>`;
  }

  /**
   * Mapea familias de piezas a categorías de Google
   */
  private mapCategory(familia: string): string {
    const categoryMap: { [key: string]: string } = {
      'MOTOR': 'Vehículos > Piezas de vehículos > Motor',
      'CARROCERIA': 'Vehículos > Piezas de vehículos > Carrocería',
      'ELECTRICIDAD': 'Vehículos > Piezas de vehículos > Sistema eléctrico',
      'TRANSMISION': 'Vehículos > Piezas de vehículos > Transmisión',
      'SUSPENSION': 'Vehículos > Piezas de vehículos > Suspensión',
      'FRENOS': 'Vehículos > Piezas de vehículos > Frenos',
      'DIRECCION': 'Vehículos > Piezas de vehículos > Dirección',
      'CLIMATIZACION': 'Vehículos > Piezas de vehículos > Climatización',
      'ESCAPE': 'Vehículos > Piezas de vehículos > Sistema de escape',
      'COMBUSTIBLE': 'Vehículos > Piezas de vehículos > Sistema de combustible'
    };

    const familiaUpper = familia.toUpperCase();
    return categoryMap[familiaUpper] || 'Vehículos > Piezas de vehículos > Otros';
  }

  /**
   * Limpia texto para XML
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .substring(0, 150); // Limitar longitud para Google
  }

  /**
   * Obtiene estadísticas del feed
   */
  async getFeedStats(): Promise<{
    totalParts: number;
    validParts: number;
    partsWithImages: number;
    partsWithPrice: number;
  }> {
    const allParts = await storage.getParts({ activo: true });
    
    const validParts = allParts.filter(part => {
      const price = Number(part.precio);
      return price > 0;
    });

    const partsWithImages = allParts.filter(part => 
      part.imagenes && part.imagenes.length > 0
    );

    const partsWithPrice = allParts.filter(part => {
      const price = Number(part.precio);
      return price > 0;
    });

    return {
      totalParts: allParts.length,
      validParts: validParts.length,
      partsWithImages: partsWithImages.length,
      partsWithPrice: partsWithPrice.length
    };
  }
}

export const googleMerchantFeedService = new GoogleMerchantFeedService();
