import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { aiError } from '../services/ai-completion';
import {
  agregarAccionPlan,
  listarAccionesPorInstancia,
  sugerirAccionesConIA,
  cambiarEstadoAccion,
  completarCheckInAccion,
} from '../services/acciones.service';

export const crearAccion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { instanciaId, descripcion, hallazgoId, evidenciaIds, ownerRole, horizon, successMetric, checkInQuestion, analisisId, propuestaIndice, adaptadaDe } = req.body;
    if (!instanciaId || !descripcion || !req.user?.id) {
      res.status(400).json({ error: 'Faltan datos obligatorios' });
      return;
    }
    const accion = await agregarAccionPlan(req.user.id, { instanciaId, descripcion, hallazgoId, evidenciaIds, ownerRole, horizon, successMetric, checkInQuestion, analisisId, propuestaIndice, adaptadaDe });
    res.status(201).json(accion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const obtenerAcciones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { instanciaId } = req.query;
    if (!instanciaId) {
      res.status(400).json({ error: 'Falta instanciaId' });
      return;
    }
    const acciones = await listarAccionesPorInstancia(req.user!.id, instanciaId.toString());
    res.status(200).json(acciones);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};


export const obtenerSugerenciasIA = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { instanciaId } = req.body;
    if (!instanciaId || !req.user?.id) {
      res.status(400).json({ error: 'Faltan parámetros requeridos' });
      return;
    }
    const plan = await sugerirAccionesConIA(req.user.id, instanciaId);
    res.status(200).json({ plan });
  } catch (error: unknown) {
    const issue = aiError(error);
    res.status(issue.status).json({ error: issue.message, code: issue.code });
  }
};

export const cambiarEstado = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json(await cambiarEstadoAccion(req.user!.id, String(req.params.actionId), req.body.estado)); } catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const completarCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json(await completarCheckInAccion(req.user!.id, String(req.params.actionId), req.body.horizonte, req.body.nota, req.body.resultado)); } catch (error: any) { res.status(400).json({ error: error.message }); }
};
