import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkConnection, getConnections, getTeamSettings, postActionPublication, postConnection, putTeamSettings, removeConnection } from '../controllers/integration.controller';

const router = Router(); router.use(authMiddleware);
router.get('/integrations', getConnections);
router.post('/integrations', postConnection);
router.delete('/integrations/:id', removeConnection);
router.post('/integrations/:id/test', checkConnection);
router.post('/acciones/:actionId/publicar', postActionPublication);
router.get('/equipos/:equipoId/integraciones', getTeamSettings);
router.put('/equipos/:equipoId/integraciones', putTeamSettings);
export default router;
