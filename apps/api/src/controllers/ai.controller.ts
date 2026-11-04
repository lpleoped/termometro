import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createProvider, deleteProvider, getProviderForUser, listProviders, testProvider, updateProvider } from '../services/ai-provider.service';
import { generateAnalysis, listAnalyses } from '../services/ai-analysis.service';
import { aiError } from '../services/ai-completion';
import { getAISettings, saveAISettings } from '../services/ai-settings.service';

const userId = (req: AuthRequest) => req.user?.id || '';

export const getAIProviders = async (req: AuthRequest, res: Response) => {
  res.json(await listProviders(userId(req)));
};

export const postAIProvider = async (req: AuthRequest, res: Response) => {
  try {
    const { name, kind, endpoint, model, apiKey } = req.body;
    if (!name || !kind || !endpoint || !model) return res.status(400).json({ error: 'name, kind, endpoint y model son obligatorios' });
    res.status(201).json(await createProvider(userId(req), { name, kind, endpoint, model, apiKey }));
  } catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const testAIProvider = async (req: AuthRequest, res: Response) => {
  try { res.json(await testProvider(userId(req), String(req.params.id))); }
  catch (error: unknown) { const issue = aiError(error); res.status(issue.status).json({ error: issue.message, code: issue.code, ...(issue.diagnostic ? { diagnostic: issue.diagnostic } : {}) }); }
};

export const putAIProvider = async (req: AuthRequest, res: Response) => {
  try { res.json(await updateProvider(userId(req), String(req.params.id), req.body)); }
  catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const deleteAIProvider = async (req: AuthRequest, res: Response) => {
  try { await deleteProvider(userId(req), String(req.params.id)); res.status(204).send(); }
  catch (error: any) { res.status(404).json({ error: error.message }); }
};

export const postAIAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const { instanciaId, includeHistorico } = req.body;
    if (typeof instanciaId !== 'string' || !/^[a-f0-9]{24}$/i.test(instanciaId) || (includeHistorico !== undefined && typeof includeHistorico !== 'boolean')) return res.status(400).json({ error: 'Elegí una ronda válida.' });
    const result = await generateAnalysis(userId(req), { instanciaId, includeHistorico });
    res.json(result);
  } catch (error: unknown) {
    const issue = aiError(error);
    res.status(issue.status).json({ error: issue.message, code: issue.code, ...(issue.diagnostic ? { diagnostic: issue.diagnostic } : {}) });
  }
};

export const getSettings = async (req: AuthRequest, res: Response) => {
  try { res.json(await getAISettings(userId(req))); }
  catch (error) { const issue = aiError(error); res.status(issue.status).json({ error: issue.message }); }
};

export const putSettings = async (req: AuthRequest, res: Response) => {
  try { res.json(await saveAISettings(userId(req), req.body)); }
  catch (error) { const issue = aiError(error); res.status(issue.status).json({ error: issue.message, code: issue.code }); }
};

export const getAIAnalyses = async (req: AuthRequest, res: Response) => {
  res.json(await listAnalyses(userId(req), typeof req.query.instanciaId === 'string' ? req.query.instanciaId : undefined));
};
