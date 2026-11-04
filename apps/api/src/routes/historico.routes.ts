import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { obtenerHistoricoEquipoEvaluacion } from '../controllers/historico.controller';

const router = Router();

router.get('/dashboard/historico/:equipoId/:evaluacionId', authMiddleware, (req, res) => {
  obtenerHistoricoEquipoEvaluacion(req, res);
});

export default router;
