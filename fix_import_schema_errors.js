#!/usr/bin/env node

/**
 * Script para corregir errores de esquema en el sistema de importación
 * Elimina referencias a campos que no existen en el esquema Drizzle
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Iniciando corrección de errores de esquema de importación...');

const importServicePath = 'server/api/metasync-optimized-import-service.ts';

// Leer el archivo
let content = fs.readFileSync(importServicePath, 'utf8');

// Lista de correcciones a aplicar
const corrections = [
  // Eliminar lastUpdated de todas las actualizaciones de importHistory
  {
    pattern: /,\s*lastUpdated:\s*new Date\(\)/g,
    replacement: ''
  },
  {
    pattern: /lastUpdated:\s*new Date\(\),/g,
    replacement: ''
  },
  // Corregir referencias a updatedAt en parts (que no existe)
  {
    pattern: /parts\.updatedAt/g,
    replacement: 'parts.fechaActualizacion'
  },
  // Corregir deactivateInactiveParts para usar activo en lugar de isActive
  {
    pattern: /\.set\(\{\s*isActive:\s*false\s*\}\)/g,
    replacement: '.set({ activo: false })'
  },
  // Corregir función que busca parts con activo
  {
    pattern: /eq\(parts\.isActive,\s*true\)/g,
    replacement: 'eq(parts.activo, true)'
  },
  // Corregir firstItem que no existe en el objeto details vacío
  {
    pattern: /details\.firstItem/g,
    replacement: 'details.firstItem || {}'
  }
];

// Aplicar todas las correcciones
corrections.forEach((correction, index) => {
  const matches = content.match(correction.pattern);
  if (matches) {
    console.log(`✅ Aplicando corrección ${index + 1}: ${matches.length} coincidencias encontradas`);
    content = content.replace(correction.pattern, correction.replacement);
  } else {
    console.log(`ℹ️ Corrección ${index + 1}: No se encontraron coincidencias`);
  }
});

// Escribir el archivo corregido
fs.writeFileSync(importServicePath, content, 'utf8');

console.log('✅ Correcciones de esquema aplicadas exitosamente');
console.log('🔄 Reiniciando aplicación para aplicar cambios...');