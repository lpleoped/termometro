import { Request, Response } from 'express';
import { getEstadoActualDashboard } from '../services/dashboard.service';

export const obtenerEstadoActualEquipo = async (req: Request, res: Response) => {
  try {
    const resultado = await getEstadoActualDashboard(String(req.params.instanciaId));
    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};
