#!/usr/bin/env node

import { MetasyncOptimizedImportService } from './server/api/metasync-optimized-import-service.js';

async function createAssociations() {
  console.log('🔄 Iniciando creación de asociaciones vehículo-piezas...');
  
  try {
    const service = new MetasyncOptimizedImportService();
    await service.configure();
    
    const { resolved } = await service.processPendingRelations();
    
    console.log(`✅ Creadas ${resolved} asociaciones vehículo-piezas`);
    console.log('🎯 Proceso completado exitosamente');
  } catch (error) {
    console.error('❌ Error creando asociaciones:', error);
  }
}

createAssociations();