/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️ 
 * Estas rutas han sido reemplazadas por metasync-optimized-routes.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-routes.ts
 */

import { Router } from 'express';
import { metasyncImportController } from './metasync-import-controller';
import { isAdmin, isAuthenticated } from '../auth';

const router = Router();

// Proteger todas las rutas con autenticación y rol de admin
router.use(isAuthenticated);
router.use(isAdmin);

// Rutas para la importación
router.post('/vehicles', metasyncImportController.importVehicles);
router.post('/parts', metasyncImportController.importParts);
router.get('/:id', metasyncImportController.getImportStatus);
router.post('/:id/cancel', metasyncImportController.cancelImport);

// Rutas para gestión de relaciones
router.post('/process-pending-relations', metasyncImportController.processPendingRelations);
router.post('/update-parts-status', metasyncImportController.updatePartsActiveStatus);

export default router;