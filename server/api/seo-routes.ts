import { Request, Response, Router } from 'express';
import { pool } from '../db';

const router = Router();

// Simple formatPrice function for server-side use
function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice) || numPrice <= 0) {
    return 'Consultar precio';
  }
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numPrice);
}

// Endpoint para obtener datos SEO de una pieza
router.get('/parts/:id', async (req: Request, res: Response) => {
  try {
    const partId = parseInt(req.params.id);
    
    if (isNaN(partId)) {
      return res.status(400).json({ error: 'ID de pieza inválido' });
    }

    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        p.descripcion_articulo,
        p.precio,
        p.ref_local,
        p.ref_principal,
        p.cod_articulo,
        p.descripcion_familia,
        p.imagenes,
        p.vehicle_marca,
        p.vehicle_modelo,
        p.vehicle_version,
        p.vehicle_anyo
      FROM parts p
      WHERE p.id = $1 AND p.activo = true AND p.disponible_api = true
      LIMIT 1
    `, [partId]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pieza no encontrada' });
    }

    const part = result.rows[0];

    // Construir información del vehículo
    const vehicleInfo = part.vehicle_marca && part.vehicle_modelo 
      ? `${part.vehicle_marca} ${part.vehicle_modelo}` 
      : '';
    
    // Agregar versión si existe y no es genérica
    const version = part.vehicle_version && 
                   part.vehicle_version !== '*' && 
                   part.vehicle_version !== 'N/A' && 
                   part.vehicle_version.trim() !== '' 
                   ? ` ${part.vehicle_version}` : '';

    // Construir referencia OEM si existe
    const oemRef = part.ref_principal && 
                   part.ref_principal.trim() !== '' && 
                   part.ref_principal !== 'N/A' 
                   ? ` (OEM: ${part.ref_principal})` : '';

    // Construir referencia interna
    const refInterna = part.ref_local ? ` (Ref: ${part.ref_local})` : '';

    // Meta title personalizado
    const title = `${part.descripcion_articulo}${vehicleInfo ? ' ' + vehicleInfo : ''}${version}${oemRef}${refInterna} - Desguace Murcia`;
    
    // Meta description personalizada
    const priceText = formatPrice(part.precio).replace(',', '.');
    const shortVehicleInfo = vehicleInfo ? ` ${vehicleInfo}` : '';
    const shortVersion = version ? ` ${version.trim()}` : '';
    const description = `Compra ${part.descripcion_articulo}${shortVehicleInfo}${shortVersion}${oemRef}${refInterna}, online en desguace Murcia por ${priceText}. Garantía 3 meses.`;
    
    const keywords = `${part.descripcion_articulo}, ${vehicleInfo}, recambios, desguace, piezas usadas, ${part.descripcion_familia || ''}`.toLowerCase();
    const image = part.imagenes?.[0];
    const price = formatPrice(part.precio).replace('€', '').replace(',', '.').trim();

    const seoData = {
      title,
      description,
      keywords,
      image,
      price,
      brand: part.vehicle_marca,
      category: part.descripcion_familia,
      type: 'product',
      url: `${req.protocol}://${req.get('host')}/piezas/${partId}`
    };

    res.json(seoData);

  } catch (error) {
    console.error('Error generando SEO para pieza:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener datos SEO de un vehículo
router.get('/vehicles/:id', async (req: Request, res: Response) => {
  try {
    const vehicleId = parseInt(req.params.id);
    
    if (isNaN(vehicleId)) {
      return res.status(400).json({ error: 'ID de vehículo inválido' });
    }

    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        v.marca,
        v.modelo,
        v.version,
        v.anyo,
        v.combustible,
        v.imagenes,
        COUNT(p.id) as parts_count
      FROM vehicles v
      LEFT JOIN parts p ON v.cod_vehiculo = p.cod_vehiculo AND p.activo = true AND p.disponible_api = true
      WHERE v.id = $1
      GROUP BY v.id, v.marca, v.modelo, v.version, v.anyo, v.combustible, v.imagenes
      LIMIT 1
    `, [vehicleId]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const vehicle = result.rows[0];

    // Construir información completa del vehículo
    const vehicleInfo = `${vehicle.marca} ${vehicle.modelo}`;
    const year = vehicle.anyo ? ` ${vehicle.anyo}` : '';
    const version = vehicle.version && 
                   vehicle.version !== '*' && 
                   vehicle.version !== 'N/A' && 
                   vehicle.version.trim() !== '' 
                   ? ` ${vehicle.version}` : '';
    
    const getFuelType = (fuel: string) => {
      switch (fuel?.toLowerCase()) {
        case 'g': return 'Gasolina';
        case 'd': return 'Diésel';
        case 'h': return 'Híbrido';
        case 'e': return 'Eléctrico';
        case 'glp': return 'GLP';
        default: return fuel || '';
      }
    };
    
    const fuel = vehicle.combustible ? ` ${getFuelType(vehicle.combustible)}` : '';
    
    // Meta title personalizado para vehículos
    const title = `${vehicleInfo}${year}${version} - Piezas y Recambios | Desguace Murcia`;
    
    // Meta description personalizada
    const description = `Encuentra piezas para ${vehicleInfo}${year}${version}${fuel} en Desguace Murcia. ${vehicle.parts_count} piezas disponibles. Garantía 3 meses y envío península.`;
    
    const keywords = `${vehicleInfo}, recambios ${vehicle.marca}, piezas ${vehicle.modelo}, desguace, repuestos usados, ${vehicle.combustible || ''}`.toLowerCase();
    const image = vehicle.imagenes?.[0];

    const seoData = {
      title,
      description,
      keywords,
      image,
      brand: vehicle.marca,
      category: 'vehicle',
      type: 'article',
      url: `${req.protocol}://${req.get('host')}/vehiculos/${vehicleId}`
    };

    res.json(seoData);

  } catch (error) {
    console.error('Error generando SEO para vehículo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as seoRoutes };