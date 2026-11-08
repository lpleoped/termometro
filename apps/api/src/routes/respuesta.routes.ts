import { Router, Request, Response } from 'express';
import { crearRespuesta } from '../controllers/respuesta.controller';
import { publicResponseRateLimit } from '../middleware/public-response.middleware';

const router = Router();

router.post('/respuestas', publicResponseRateLimit, (req: Request, res: Response) => {
  crearRespuesta(req, res);
});

export default router;
