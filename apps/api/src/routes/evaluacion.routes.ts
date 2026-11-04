import { Router, Request, Response } from 'express';
import {
  listarEvaluaciones,
  obtenerEvaluacionPublica,
  crearEvaluacion,
  editarEvaluacion,
  eliminarEvaluacion,
  obtenerTiposEvaluacion,
} from '../controllers/evaluacion.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/tipos-evaluacion', (req: Request, res: Response) => {
  obtenerTiposEvaluacion(req, res);
});

router.post('/evaluaciones', authMiddleware, (req: Request, res: Response) => {
  crearEvaluacion(req, res);
});

router.get('/evaluaciones', authMiddleware, (req: Request, res: Response) => {
  listarEvaluaciones(req, res);
});

router.get('/evaluaciones/:id', (req: Request, res: Response) => {
  obtenerEvaluacionPublica(req, res);
});

router.put('/evaluaciones/:id', authMiddleware, (req: Request, res: Response) => {
  editarEvaluacion(req, res);
});

router.delete('/evaluaciones/:id', authMiddleware, (req: Request, res: Response) => {
  eliminarEvaluacion(req, res);
});

export default router;
