import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { aiError } from '../services/ai-completion';
import {
  agregarAccionPlan,
  listarAccionesPorInstancia,
  listarAccionesPorEquipo,
  sugerirAccionesConIA,
  cambiarEstadoAccion,
  completarCheckInAccion,
} from '../services/acciones.service';
import { registrarError } from '../observability/errores';

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
    registrarError('validacion', error, { accion: 'crear' });
    res.status(400).json({ error: error.message });
  }
};

export const obtenerAcciones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { instanciaId, equipoId } = req.query;
    if (typeof equipoId === 'string' && equipoId) {
      res.status(200).json(await listarAccionesPorEquipo(req.user!.id, equipoId));
      return;
    }
    if (!instanciaId) {
      res.status(400).json({ error: 'Falta instanciaId' });
      return;
    }
    const acciones = await listarAccionesPorInstancia(req.user!.id, instanciaId.toString());
    res.status(200).json(acciones);
  } catch (error: any) {
    registrarError('sistema', error, { accion: 'listar' });
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
    registrarError('ia', issue, { accion: 'sugerencias' });
    res.status(issue.status).json({ error: issue.message, code: issue.code });
  }
};

export const cambiarEstado = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json(await cambiarEstadoAccion(req.user!.id, String(req.params.actionId), req.body.estado)); } catch (error: any) { registrarError('validacion', error, { accion: 'estado' }); res.status(400).json({ error: error.message }); }
};

export const completarCheckIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try { res.json(await completarCheckInAccion(req.user!.id, String(req.params.actionId), req.body.horizonte, req.body.nota, req.body.resultado)); } catch (error: any) { registrarError('validacion', error, { accion: 'checkin' }); res.status(400).json({ error: error.message }); }
};
