import { eq } from 'drizzle-orm';
import { db } from '../db';
import { siteConfig } from '../../shared/schema';

// Tipos para la configuración de mantenimiento
export interface MaintenanceConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  estimatedTime: string;
}

// Valores por defecto
const DEFAULT_CONFIG: MaintenanceConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'Estamos realizando mejoras en nuestro sitio. Volveremos pronto.',
  estimatedTime: '30 minutos'
};

/**
 * Obtiene la configuración actual del modo mantenimiento
 */
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  try {
    // Intentar obtener la configuración de la base de datos
    const configRow = await db.select().from(siteConfig).where(eq(siteConfig.id, 1)).limit(1);
    
    if (configRow.length > 0) {
      // Convertir la configuración de la base de datos al formato esperado
      return {
        maintenanceMode: configRow[0].maintenanceMode || false,
        maintenanceMessage: configRow[0].maintenanceMessage || DEFAULT_CONFIG.maintenanceMessage,
        estimatedTime: configRow[0].estimatedTime || DEFAULT_CONFIG.estimatedTime
      };
    }
    
    // Si no hay configuración, crear una con valores predeterminados
    await db.insert(siteConfig).values({
      id: 1,
      maintenanceMode: DEFAULT_CONFIG.maintenanceMode,
      maintenanceMessage: DEFAULT_CONFIG.maintenanceMessage,
      estimatedTime: DEFAULT_CONFIG.estimatedTime,
      lastUpdated: new Date()
    });
    
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error al obtener configuración de mantenimiento:', error);
    // En caso de error, devolver valores predeterminados
    return DEFAULT_CONFIG;
  }
}

/**
 * Actualiza la configuración del modo mantenimiento
 */
export async function updateMaintenanceConfig(config: Partial<MaintenanceConfig>): Promise<MaintenanceConfig> {
  try {
    // Obtener la configuración actual
    const currentConfig = await getMaintenanceConfig();
    
    // Crear objeto con los cambios, manteniendo valores actuales para campos no especificados
    const updatedConfig = {
      ...currentConfig,
      ...config,
      lastUpdated: new Date()
    };
    
    // Actualizar en la base de datos
    await db.update(siteConfig)
      .set({
        maintenanceMode: updatedConfig.maintenanceMode,
        maintenanceMessage: updatedConfig.maintenanceMessage,
        estimatedTime: updatedConfig.estimatedTime,
        lastUpdated: new Date()
      })
      .where(eq(siteConfig.id, 1));
    
    return updatedConfig;
  } catch (error) {
    console.error('Error al actualizar configuración de mantenimiento:', error);
    throw error;
  }
}