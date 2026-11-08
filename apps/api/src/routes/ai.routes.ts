import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

import { getAIProviders, postAIProvider, testAIProvider, postAIAnalysis, putAIProvider, deleteAIProvider, getAIAnalyses, getSettings, putSettings, postAIQuestionnaire } from '../controllers/ai.controller';

const router = Router();
router.use(authMiddleware);
router.get('/ai/settings', getSettings);
router.put('/ai/settings', putSettings);
router.get('/ai/providers', getAIProviders);
router.post('/ai/providers', postAIProvider);
router.put('/ai/providers/:id', putAIProvider);
router.delete('/ai/providers/:id', deleteAIProvider);
router.post('/ai/providers/:id/test', testAIProvider);
router.post('/ai/analyses', postAIAnalysis);
router.get('/ai/analyses', getAIAnalyses);
router.post('/ai/questionnaires/generate', postAIQuestionnaire);
export default router;
