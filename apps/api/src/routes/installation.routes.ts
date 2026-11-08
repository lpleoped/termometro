import { Router } from 'express';
import { exportBackup, importBackup, installationStatus, restoreFirstRun } from '../controllers/installation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/installation', installationStatus);
router.post('/installation/restore', restoreFirstRun);
router.get('/backup', authMiddleware, exportBackup);
router.post('/backup/restore', authMiddleware, importBackup);

export default router;
