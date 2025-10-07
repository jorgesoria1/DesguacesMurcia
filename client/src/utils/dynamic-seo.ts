// Dynamic SEO utilities for updating meta tags from React
export function updatePageSEO(data: {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
}) {
  try {
    // Update document title
    document.title = data.title;
    
    // Update meta description
    updateMetaTag('name', 'description', data.description);
    
    // Update Open Graph tags
    updateMetaTag('property', 'og:title', data.ogTitle || data.title);
    updateMetaTag('property', 'og:description', data.ogDescription || data.description);
    updateMetaTag('property', 'og:url', data.ogUrl || window.location.href);
    
    if (data.ogImage) {
      updateMetaTag('property', 'og:image', data.ogImage);
    }
    
    // Update Twitter Card tags
    updateMetaTag('name', 'twitter:title', data.ogTitle || data.title);
    updateMetaTag('name', 'twitter:description', data.ogDescription || data.description);
    
    if (data.ogImage) {
      updateMetaTag('name', 'twitter:image', data.ogImage);
    }
  } catch (error) {
    console.error('Error updating SEO meta tags:', error);
  }
}

function updateMetaTag(attribute: string, value: string, content: string) {
  try {
    let element = document.querySelector(`meta[${attribute}="${value}"]`) as HTMLMetaElement;
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, value);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  } catch (error) {
    console.error(`Error updating meta tag ${attribute}="${value}":`, error);
  }
}

export function generatePartSEO(part: any) {
  if (!part) {
    return {
      title: 'Desguace Murcia - Repuestos Originales Vehículos',
      description: 'Encuentra repuestos originales para tu vehículo en Desguace Murcia.',
      ogImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=630&fit=crop'
    };
  }

  const descripcion = part.descripcionArticulo || part.descripcion || 'Pieza';
  const marca = part.vehicleMarca || part.marca || '';
  const modelo = part.vehicleModelo || part.modelo || '';
  const anyo = part.vehicleAnyo || part.anyo || '';
  const codigo = part.codArticulo || part.codigoPieza || part.codigo_pieza || 'N/A';
  const precio = part.precio || '0';
  
  return {
    title: `${descripcion} ${marca} ${modelo} ${anyo ? `(${anyo})` : ''} (OEM: ${codigo}) (Ref: ${part.id})`.replace(/\s+/g, ' ').trim(),
    description: `Compra ${descripcion} para ${marca} ${modelo} online en Desguace Murcia por ${precio}€. Garantía 3 meses y envío península.`,
    ogImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=630&fit=crop'
  };
}

export function generateVehicleSEO(vehicle: any) {
  if (!vehicle) {
    return {
      title: 'Desguace Murcia - Repuestos Originales Vehículos',
      description: 'Encuentra repuestos originales para tu vehículo en Desguace Murcia.',
      ogImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=630&fit=crop'
    };
  }

  const marca = vehicle.marca || '';
  const modelo = vehicle.modelo || '';
  const anyo = vehicle.anyo || '';
  const partsCount = vehicle.activeParts || vehicle.active_parts_count || 0;

  return {
    title: `${marca} ${modelo} ${anyo} - Piezas y Recambios | Desguace Murcia`.replace(/\s+/g, ' ').trim(),
    description: `Encuentra piezas para ${marca} ${modelo} ${anyo} en Desguace Murcia. ${partsCount} piezas disponibles. Garantía 3 meses y envío península.`,
    ogImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1200&h=630&fit=crop'
  };
}