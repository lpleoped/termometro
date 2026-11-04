import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  crearAccion,
  obtenerAcciones,
  obtenerSugerenciasIA,
} from '../controllers/acciones.controller';

const router = Router();

router.post('/acciones', authMiddleware, crearAccion);
router.get('/acciones', authMiddleware, obtenerAcciones);
router.post('/acciones/sugerencias', authMiddleware, obtenerSugerenciasIA);

export default router;
