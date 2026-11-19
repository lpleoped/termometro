import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createProvider, deleteProvider, getProviderForUser, listProviders, testProvider, updateProvider } from '../services/ai-provider.service';
import { generateAnalysis, listAnalyses } from '../services/ai-analysis.service';
import { omitirPropuestaLectura } from '../services/acciones.service';
import { aiError } from '../services/ai-completion';
import { getAISettings, saveAISettings } from '../services/ai-settings.service';
import { generateQuestionnaire } from '../services/questionnaire-generation.service';
import { resumirUso } from '../services/uso.service';
import { validRecordId } from '../domain/feature-records';
import { registrarError } from '../observability/errores';

const userId = (req: AuthRequest) => req.user?.id || '';

export const getAIProviders = async (req: AuthRequest, res: Response) => {
  res.json(await listProviders(userId(req)));
};

export const postAIProvider = async (req: AuthRequest, res: Response) => {
  try {
    const { name, kind, endpoint, model, apiKey } = req.body;
    if (!name || !kind || !endpoint || !model) return res.status(400).json({ error: 'name, kind, endpoint y model son obligatorios' });
    res.status(201).json(await createProvider(userId(req), { name, kind, endpoint, model, apiKey }));
  } catch (error: any) { registrarError('ia', error, { accion: 'crear-proveedor' }); res.status(400).json({ error: error.message }); }
};

export const testAIProvider = async (req: AuthRequest, res: Response) => {
  try { res.json(await testProvider(userId(req), String(req.params.id))); }
  catch (error: unknown) { const issue = aiError(error); registrarError('ia', issue, { accion: 'probar-proveedor' }); res.status(issue.status).json({ error: issue.message, code: issue.code, ...(issue.diagnostic ? { diagnostic: issue.diagnostic } : {}) }); }
};

export const putAIProvider = async (req: AuthRequest, res: Response) => {
  try { res.json(await updateProvider(userId(req), String(req.params.id), req.body)); }
  catch (error: any) { registrarError('ia', error, { accion: 'actualizar-proveedor' }); res.status(400).json({ error: error.message }); }
};

export const deleteAIProvider = async (req: AuthRequest, res: Response) => {
  try { await deleteProvider(userId(req), String(req.params.id)); res.status(204).send(); }
  catch (error: any) { registrarError('ia', error, { accion: 'eliminar-proveedor' }); res.status(404).json({ error: error.message }); }
};

export const postAIAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const { instanciaId, includeHistorico } = req.body;
    if (!validRecordId(instanciaId) || (includeHistorico !== undefined && typeof includeHistorico !== 'boolean')) return res.status(400).json({ error: 'Elegí una ronda válida.' });
    const result = await generateAnalysis(userId(req), { instanciaId, includeHistorico });
    res.json(result);
  } catch (error: unknown) {
    const issue = aiError(error);
    registrarError('ia', issue, { accion: 'lectura' });
    res.status(issue.status).json({ error: issue.message, code: issue.code, ...(issue.diagnostic ? { diagnostic: issue.diagnostic } : {}) });
  }
};

export const getSettings = async (req: AuthRequest, res: Response) => {
  try { res.json(await getAISettings(userId(req))); }
  catch (error) { const issue = aiError(error); registrarError('ia', issue, { accion: 'leer-ajustes' }); res.status(issue.status).json({ error: issue.message }); }
};

export const putSettings = async (req: AuthRequest, res: Response) => {
  try { res.json(await saveAISettings(userId(req), req.body)); }
  catch (error) { const issue = aiError(error); registrarError('ia', issue, { accion: 'guardar-ajustes' }); res.status(issue.status).json({ error: issue.message, code: issue.code }); }
};

export const omitirPropuesta = async (req: AuthRequest, res: Response) => {
  try {
    const indice = Number(req.body?.indice);
    res.json({ propuestasOmitidas: await omitirPropuestaLectura(userId(req), String(req.params.id), indice) });
  } catch (error) {
    registrarError('ia', error, { accion: 'omitir-propuesta' });
    res.status(400).json({ error: error instanceof Error ? error.message : 'No se pudo dejar pasar la propuesta.' });
  }
};

export const getAIAnalyses = async (req: AuthRequest, res: Response) => {
  try {
    res.json(await listAnalyses(userId(req), {
      instanciaId: typeof req.query.instanciaId === 'string' ? req.query.instanciaId : undefined,
      equipoId: typeof req.query.equipoId === 'string' ? req.query.equipoId : undefined,
    }));
  }
  catch (error) { registrarError('ia', error, { accion: 'listar-analisis' }); res.status(404).json({ error: error instanceof Error ? error.message : 'No se pudieron leer los análisis.' }); }
};

export const postAIQuestionnaire = async (req: AuthRequest, res: Response) => {
  try {
    const { role, request, equipoId } = req.body || {};
    res.json(await generateQuestionnaire(userId(req), { role, request, equipoId: typeof equipoId === 'string' ? equipoId : undefined }));
  } catch (error: unknown) {
    const issue = aiError(error);
    registrarError('ia', issue, { accion: 'cuestionario' });
    res.status(issue.status).json({ error: issue.message, code: issue.code, ...(issue.diagnostic ? { diagnostic: issue.diagnostic } : {}) });
  }
};

export const getUso = async (req: AuthRequest, res: Response) => {
  try { res.json(await resumirUso(userId(req), typeof req.query.periodo === 'string' ? req.query.periodo : undefined)); }
  catch (error) { registrarError('ia', error, { accion: 'uso' }); res.status(400).json({ error: error instanceof Error ? error.message : 'No se pudo leer el uso.' }); }
};
