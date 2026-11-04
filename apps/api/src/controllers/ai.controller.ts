import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createProvider, deleteProvider, getProviderForUser, listProviders, testProvider, updateProvider } from '../services/ai-provider.service';
import { generateAnalysis, listAnalyses } from '../services/ai-analysis.service';

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
  catch (error: any) {
    const message = error instanceof Error ? error.message : 'No pudimos verificar el proveedor';
    const status = /API key|HTTP 401|HTTP 403/i.test(message) ? 401 : /URL|\/models|llegar|tardó/i.test(message) ? 400 : 502;
    res.status(status).json({ error: message });
  }
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
    const { providerId, instanciaId, equipoId, evaluacionId, includeHistorico } = req.body;
    if (!providerId || !instanciaId || !equipoId || !evaluacionId) return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    const provider = await getProviderForUser(userId(req), providerId);
    const result = await generateAnalysis(provider, userId(req), { instanciaId, equipoId, evaluacionId, includeHistorico });
    res.json(result);
  } catch (error: any) { res.status(502).json({ error: error.message }); }
};

export const getAIAnalyses = async (req: AuthRequest, res: Response) => {
  res.json(await listAnalyses(userId(req), typeof req.query.instanciaId === 'string' ? req.query.instanciaId : undefined));
};
