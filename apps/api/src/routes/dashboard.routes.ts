import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { obtenerEstadoActualEquipo } from '../controllers/dashboard.controller';

const router = Router();

router.get(
  '/dashboard/estado-actual/:instanciaId',
  authMiddleware,
  (req: Request, res: Response) => {
    obtenerEstadoActualEquipo(req, res);
  },
);

export default router;
