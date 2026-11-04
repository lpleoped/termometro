import { Router, Request, Response } from 'express';
import { actualizarEquipo, agregarMiembro, archivarEquipo, crearEquipo, listarEquipos, obtenerEquipo, quitarMiembro } from '../controllers/equipo.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/equipos', authMiddleware, (req: Request, res: Response) => {
  crearEquipo(req, res);
});

router.get('/equipos', authMiddleware, (req: Request, res: Response) => {
  listarEquipos(req, res);
});

router.get('/equipos/:equipoId', authMiddleware, (req: Request, res: Response) => {
  obtenerEquipo(req, res);
});

router.patch('/equipos/:equipoId', authMiddleware, (req: Request, res: Response) => {
  actualizarEquipo(req, res);
});

router.delete('/equipos/:equipoId', authMiddleware, (req: Request, res: Response) => {
  archivarEquipo(req, res);
});

router.post('/equipos/:equipoId/miembros', authMiddleware, (req: Request, res: Response) => {
  agregarMiembro(req, res);
});

router.delete('/equipos/:equipoId/miembros/:email', authMiddleware, (req: Request, res: Response) => {
  quitarMiembro(req, res);
});

export default router;
