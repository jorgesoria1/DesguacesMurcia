// Sistema SEO que actualiza título y meta tags dinámicamente
export function updateSEO(title: string, description: string, keywords?: string) {
  if (typeof window === 'undefined') return;
  
  // Actualizar título
  document.title = title;
  
  // Actualizar o crear meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);
  
  // Actualizar o crear meta keywords
  if (keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);
  }
  
  // Actualizar Open Graph title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', title);
  
  // Actualizar Open Graph description
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute('content', description);
}

// SEO para páginas principales
export function setHomeTitle() {
  // Actualizar título directamente como las otras páginas
  updateSEO(
    'Desguace Murcia - Repuestos Originales Vehículos | Garantía 3 Meses',
    'Desguace especializado en repuestos originales de vehículos en Murcia. Más de 120.000 piezas disponibles con garantía de 3 meses. Envíos a toda España.',
    'desguace murcia, repuestos coches, piezas vehículos, recambios originales, garantía'
  );
}

export function setPartsTitle() {
  updateSEO(
    'Catálogo de Piezas y Repuestos de Vehículos | Desguace Murcia',
    'Amplio catálogo de piezas y repuestos de vehículos. Más de 120.000 recambios originales disponibles con garantía. Búsqueda por marca, modelo y categoría.',
    'catálogo piezas, repuestos vehículos, recambios coches, piezas originales'
  );
}

export function setVehiclesTitle() {
  updateSEO(
    'Catálogo de Vehículos Desguazados | Desguace Murcia',
    'Vehículos desguazados disponibles para extracción de piezas. Consulta nuestro inventario actualizado de coches con piezas disponibles.',
    'vehículos desguazados, coches desguace, inventario vehículos, piezas disponibles'
  );
}

export function setContactTitle() {
  updateSEO(
    'Contacto - Desguace Murcia | Teléfono 958 79 08 58',
    'Contacta con Desguace Murcia. Teléfono 958 79 08 58. Solicita presupuesto para repuestos de vehículos. Atención personalizada y envíos a toda España.',
    'contacto desguace murcia, teléfono repuestos, presupuesto piezas'
  );
}

export function setValueTitle() {
  updateSEO(
    'Tasamos tu Vehículo - Venta de Coches | Desguace Murcia',
    'Tasación gratuita de tu vehículo en Desguace Murcia. Compramos coches en cualquier estado. Valoración rápida y pago inmediato.',
    'tasación vehículo, venta coche, compra coches, valoración gratuita'
  );
}

// SEO para pieza específica
export function setPartTitle(part: any) {
  if (!part || !part.descripcionArticulo) return;
  
  const vehicleInfo = part.vehicleMarca && part.vehicleModelo 
    ? `${part.vehicleMarca} ${part.vehicleModelo}` 
    : '';
  
  const version = part.vehicleVersion && 
                 part.vehicleVersion !== '*' && 
                 part.vehicleVersion !== 'N/A' && 
                 part.vehicleVersion.trim() !== '' 
                 ? ` ${part.vehicleVersion}` : '';
  
  const year = part.vehicleAnyo ? ` ${part.vehicleAnyo}` : '';
  const price = part.precio ? ` - ${part.precio}€` : '';
  
  const title = `${part.descripcionArticulo}${vehicleInfo ? ' ' + vehicleInfo : ''}${version}${year}${price} | Desguace Murcia`;
  
  const description = `${part.descripcionArticulo} para ${vehicleInfo}${version}${year}. ` +
    `Precio: ${part.precio || 'Consultar'}€. Pieza original con garantía de 3 meses. ` +
    `Referencia: ${part.refPrincipal || part.refLocal || 'N/A'}. Envío a toda España.`;
  
  const keywords = `${part.descripcionArticulo}, ${vehicleInfo}, repuesto ${part.vehicleMarca}, pieza ${part.vehicleModelo}, ${part.refPrincipal || ''}`.toLowerCase();
  
  updateSEO(title, description, keywords);
}

// SEO para vehículo específico
export function setVehicleTitle(vehicle: any) {
  if (!vehicle || !vehicle.marca || !vehicle.modelo) return;
  
  const version = vehicle.version ? ` ${vehicle.version}` : '';
  const year = vehicle.anyo ? ` ${vehicle.anyo}` : '';
  const fuel = vehicle.combustible ? ` ${vehicle.combustible}` : '';
  const activeParts = vehicle.activeParts ? ` - ${vehicle.activeParts} piezas disponibles` : '';
  
  const title = `${vehicle.marca} ${vehicle.modelo}${version}${year}${fuel}${activeParts} | Desguace Murcia`;
  
  const description = `Piezas disponibles para ${vehicle.marca} ${vehicle.modelo}${version}${year}. ` +
    `${vehicle.activeParts || 0} recambios originales en stock. ` +
    `${vehicle.matricula ? `Matrícula: ${vehicle.matricula}. ` : ''}` +
    `${vehicle.bastidor ? `Bastidor: ${vehicle.bastidor}. ` : ''}` +
    `Garantía de 3 meses en todos los repuestos.`;
  
  const keywords = `${vehicle.marca} ${vehicle.modelo}, piezas ${vehicle.marca}, repuestos ${vehicle.modelo}, ${vehicle.combustible || ''}, ${year || ''}`.toLowerCase();
  
  updateSEO(title, description, keywords);
}