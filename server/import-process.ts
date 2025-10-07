import { importServiceOptimizado } from "./import-service-optimizado";
import { disableZeroPriceParts } from "./utils/disable-zero-price-parts";

/**
 * Función que inicia el proceso de importación en segundo plano
 * Utiliza el servicio de importación optimizado para mejorar la robustez del proceso
 */
export async function startImportProcess(importId: number, type: string, fromDate?: Date) {
  console.log(`Iniciando proceso de importación (ID: ${importId}, Tipo: ${type})${fromDate ? ' desde ' + fromDate.toISOString() : ''}`);
  
  // Iniciar proceso asincrónico
  setTimeout(async () => {
    try {
      switch (type) {
        case 'vehicles':
          await importServiceOptimizado.importarVehiculos(importId, fromDate);
          break;
        case 'parts':
          await importServiceOptimizado.importarPiezas(importId, fromDate);
          // Desactivar piezas con precio 0 después de importar
          await disableZeroPriceParts();
          break;
        case 'all':
        default:
          await importServiceOptimizado.importarTodo(importId, fromDate);
          // Desactivar piezas con precio 0 después de importar
          await disableZeroPriceParts();
          break;
      }
      
      console.log(`Importación manual de ${type} completada con estado: completed`);
    } catch (error) {
      console.error(`Error en proceso de importación (ID: ${importId}):`, error);
    }
  }, 0);
}