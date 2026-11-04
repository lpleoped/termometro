import { Router, Request, Response } from 'express';
import { crearRespuesta } from '../controllers/respuesta.controller';

const router = Router();

router.post('/respuestas', (req: Request, res: Response) => {
  crearRespuesta(req, res);
});

export default router;
