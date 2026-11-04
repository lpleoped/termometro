import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getTeamContext, patchTeamContext, postTeamContext, removeTeamContext } from '../controllers/team-context.controller';
const router = Router(); router.use(authMiddleware);
router.get('/equipos/:equipoId/contexto', getTeamContext); router.post('/equipos/:equipoId/contexto', postTeamContext);
router.patch('/equipos/:equipoId/contexto/:itemId', patchTeamContext); router.delete('/equipos/:equipoId/contexto/:itemId', removeTeamContext);
export default router;
