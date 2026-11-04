import { Router, Request, Response } from 'express';
import { registrarUsuario, loginUsuario, obtenerPerfil } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/auth/register', (req: Request, res: Response) => {
  registrarUsuario(req, res);
});

router.post('/auth/login', (req: Request, res: Response) => {
  loginUsuario(req, res);
});

router.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  obtenerPerfil(req, res);
});

export default router;
