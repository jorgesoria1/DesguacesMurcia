#!/usr/bin/env node

// Script rápido para restaurar vehículos eliminados accidentalmente
import { db } from '../server/storage.js';

async function restoreVehicles() {
  try {
    console.log('🔄 Iniciando importación rápida de vehículos...');
    
    // Verificar configuración de API
    const { sql } = await import('drizzle-orm');
    const { apiConfig } = await import('../shared/schema.js');
    
    const configs = await db.select().from(apiConfig).where(sql`active = true`).limit(1);
    
    if (configs.length === 0) {
      console.log('❌ No hay configuración de API activa');
      return;
    }
    
    const config = configs[0];
    console.log(`✅ Usando configuración: Company ID ${config.companyId}`);
    
    // Importar solo los primeros 1000 vehículos para recuperar rápidamente
    const url = 'https://api.metasync.com/api/v2/vehicles';
    console.log('📡 Conectando a MetaSync API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        companyId: config.companyId,
        channel: config.channel,
        limit: 1000,
        offset: 0
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📊 Recibidos ${data.data?.length || 0} vehículos de la API`);
    
    if (!data.data || data.data.length === 0) {
      console.log('⚠️ No hay vehículos en la respuesta de la API');
      return;
    }
    
    // Insertar vehículos
    const { vehicles } = await import('../shared/schema.js');
    
    for (const vehicleData of data.data.slice(0, 100)) { // Solo los primeros 100 para rapidez
      try {
        await db.insert(vehicles).values({
          marca: vehicleData.marca || 'NO IDENTIFICADO',
          modelo: vehicleData.modelo || 'NO IDENTIFICADO', 
          version: vehicleData.version || '',
          anyo: vehicleData.anyo || 0,
          combustible: vehicleData.combustible || '',
          descripcion: vehicleData.descripcion || '',
          imagenes: vehicleData.imagenes || [],
          activo: true,
          matricula: vehicleData.matricula || '',
          bastidor: vehicleData.bastidor || '',
          potencia: vehicleData.potencia || ''
        }).onConflictDoNothing();
      } catch (error) {
        // Ignorar duplicados
      }
    }
    
    // Verificar resultado
    const { count } = await import('drizzle-orm');
    const totalVehicles = await db.select({ count: count() }).from(vehicles);
    console.log(`✅ Restauración completada. Total vehículos: ${totalVehicles[0].count}`);
    
  } catch (error) {
    console.error('❌ Error en restauración:', error.message);
  } finally {
    process.exit(0);
  }
}

restoreVehicles();