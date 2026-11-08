import { Request, Response } from 'express';
import { getEstadoActualDashboard } from '../services/dashboard.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { assertInstanceOwner } from '../services/authorization.service';

export const obtenerEstadoActualEquipo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' });
    await assertInstanceOwner(req.user.id, String(req.params.instanciaId));
    const resultado = await getEstadoActualDashboard(String(req.params.instanciaId));
    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};
