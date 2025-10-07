import { Router } from 'express';
import { isAdmin, isAuthenticated } from '../auth';
import { recalculateVehicleParts } from '../controllers/recalculate-controller';

// Crear el router para rutas de utilidades
const utilitiesRouter = Router();

// Proteger rutas para que solo administradores puedan acceder
utilitiesRouter.use(isAuthenticated);

// Ruta para recalcular las relaciones vehículo-pieza y actualizar los contadores
utilitiesRouter.get("/recalculate-vehicle-parts", isAdmin, recalculateVehicleParts);

export default utilitiesRouter;