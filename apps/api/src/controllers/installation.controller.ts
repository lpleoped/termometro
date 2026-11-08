import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { installationStatusService, exportBackupService, restoreBackupService } from '../services/installation.service';
export const installationStatus = async (_req: Request, res: Response) => {
  try { return res.json(await installationStatusService()); }
  catch { return res.status(503).json({ error: 'No se pudieron abrir los datos. Consultá Ayuda para recuperarlos.' }); }
};
export const restoreFirstRun = async (req: Request, res: Response) => {
  try { return res.json(await restoreBackupService(req.body)); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'El respaldo no es válido.' }); }
};
export const exportBackup = async (req: AuthRequest, res: Response) => {
  try {
    // Do not normalize opaque export data: that would invalidate checksums.
    return res.type('application/json').send(JSON.stringify(await exportBackupService(req.user!.id)));
  } catch { return res.status(400).json({ error: 'No se pudo exportar el respaldo.' }); }
};
export const importBackup = async (req: AuthRequest, res: Response) => {
  try { return res.json(await restoreBackupService(req.body, req.user!.id)); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'El respaldo no es válido.' }); }
};
