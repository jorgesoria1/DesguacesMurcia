import { Router } from 'express';
import { isAdmin, isAuthenticated } from '../auth';
import { recalculateVehicleParts } from '../controllers/recalculate-controller';

// Crear router
const recalculateRouter = Router();

// Proteger todas las rutas con autenticación y rol de admin
recalculateRouter.use(isAuthenticated, isAdmin);

// Ruta para recalcular relaciones vehículo-pieza
recalculateRouter.get('/vehicle-parts', recalculateVehicleParts);

export default recalculateRouter;