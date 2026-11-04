import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { aiError } from '../services/ai-completion';
import {
  agregarAccionPlan,
  listarAccionesPorInstancia,
  sugerirAccionesConIA,
} from '../services/acciones.service';

export const crearAccion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { instanciaId, descripcion, autor } = req.body;
    if (!instanciaId || !descripcion) {
      res.status(400).json({ error: 'Faltan datos obligatorios' });
      return;
    }
    const accion = await agregarAccionPlan(instanciaId, descripcion, autor);
    res.status(201).json(accion);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const obtenerAcciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const { instanciaId } = req.query;
    if (!instanciaId) {
      res.status(400).json({ error: 'Falta instanciaId' });
      return;
    }
    const acciones = await listarAccionesPorInstancia(instanciaId.toString());
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
