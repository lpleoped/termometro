import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

import {
  crearAccion,
  obtenerAcciones,
  obtenerSugerenciasIA,
  cambiarEstado,
  completarCheckIn,
} from '../controllers/acciones.controller';

const router = Router();
router.use(authMiddleware);

router.post('/acciones', crearAccion);
router.get('/acciones', obtenerAcciones);
router.post('/acciones/sugerencias', obtenerSugerenciasIA);
router.patch('/acciones/:actionId/estado', cambiarEstado);
router.patch('/acciones/:actionId/checkins', completarCheckIn);

export default router;
