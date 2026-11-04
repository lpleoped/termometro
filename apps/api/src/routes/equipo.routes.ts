import { Router, Request, Response } from 'express';
import { crearEquipo, listarEquipos } from '../controllers/equipo.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/equipos', authMiddleware, (req: Request, res: Response) => {
  crearEquipo(req, res);
});

router.get('/equipos', authMiddleware, (req: Request, res: Response) => {
  listarEquipos(req, res);
});

export default router;
