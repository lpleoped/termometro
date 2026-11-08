import { Request, Response } from 'express';
import { getHistoricoPorEquipoYEvaluacion } from '../services/historico.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { assertEvaluationOwner, assertTeamOwner } from '../services/authorization.service';

export const obtenerHistoricoEquipoEvaluacion = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const equipoId = String(req.params.equipoId || '');
    const evaluacionId = String(req.params.evaluacionId || '');
    if (!equipoId || !evaluacionId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    await Promise.all([assertTeamOwner(req.user!.id, equipoId), assertEvaluationOwner(req.user!.id, evaluacionId)]);
    const data = await getHistoricoPorEquipoYEvaluacion(equipoId, evaluacionId, req.user!.id);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
