import { Request, Response } from 'express';
import { getHistoricoPorEquipoYEvaluacion } from '../services/historico.service';

export const obtenerHistoricoEquipoEvaluacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const equipoId = String(req.params.equipoId || '');
    const evaluacionId = String(req.params.evaluacionId || '');
    if (!equipoId || !evaluacionId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    const data = await getHistoricoPorEquipoYEvaluacion(equipoId, evaluacionId);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
