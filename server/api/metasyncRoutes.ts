/* 
 * ⚠️ ARCHIVO OBSOLETO - NO USAR ⚠️
 * Estas rutas han sido reemplazadas por metasync-optimized-routes.ts
 * Mantenido solo para referencia histórica
 * Fecha de obsolescencia: 30 Julio 2025
 * Usar en su lugar: metasync-optimized-routes.ts
 */

import { Router } from 'express';
import { metasyncController } from './metasyncController';
import { isAdmin, isAuthenticated } from '../auth';

const router = Router();

// Rutas protegidas por autenticación y rol admin
router.use(isAuthenticated);
router.use(isAdmin);

// Verificar conexión con MetaSync
router.post('/verify-connection', metasyncController.verifyConnection);

// Iniciar importación
router.post('/import', metasyncController.startImport);

// Obtener estado de importación
router.get('/import/:id', metasyncController.getImportStatus);

// Cancelar importación
router.post('/import/:id/cancel', metasyncController.cancelImport);

export default router;