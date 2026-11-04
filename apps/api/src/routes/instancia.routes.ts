import { Router, Request, Response } from 'express';
import {
  crearInstanciaEvaluacion,
  obtenerInstanciaPorId,
  listarInstanciasPorEquipo,
} from '../controllers/instancia.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/instancias', authMiddleware, (req: Request, res: Response) => {
  crearInstanciaEvaluacion(req, res);
});

router.get('/instancias/:instanciaId', (req: Request, res: Response) => {
  obtenerInstanciaPorId(req, res);
});

router.get('/instancias', authMiddleware, (req: Request, res: Response) => {
  listarInstanciasPorEquipo(req, res);
});

export default router;
