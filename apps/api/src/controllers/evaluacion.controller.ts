import type { Request, Response } from 'express';
import {
  crearEvaluacionService,
  listarEvaluacionesService,
  obtenerEvaluacionPorIdService,
  eliminarEvaluacionPorIdService,
  editarEvaluacionService,
  obtenerTiposEvaluacionService,
} from '../services/evaluacion.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const crearEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const resultado = await crearEvaluacionService({ ...req.body, creadoPor: req.user?.id });
    return res.status(201).json(resultado);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error al crear evaluación' });
  }
};

export const listarEvaluaciones = async (req: AuthRequest, res: Response) => {
  try {
    const evaluaciones = await listarEvaluacionesService(req.user!.id);
    return res.json(evaluaciones);
  } catch {
    return res.status(500).json({ error: 'Error al listar evaluaciones' });
  }
};

export const obtenerEvaluacionPublica = async (req: Request, res: Response) => {
  try {
    const evaluacion = await obtenerEvaluacionPorIdService(String(req.params.id));
    if (!evaluacion) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    return res.json({
      _id: evaluacion._id,
      titulo: evaluacion.titulo,
      descripcion: evaluacion.descripcion,
      tipo: evaluacion.tipo,
      secciones: evaluacion.secciones,
    });
  } catch {
    return res.status(500).json({ error: 'Error al obtener evaluación' });
  }
};

export const editarEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const resultado = await editarEvaluacionService(String(req.params.id), req.body, req.user!.id);
    return res.status(200).json(resultado);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const eliminarEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    await eliminarEvaluacionPorIdService(String(req.params.id), req.user!.id);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const obtenerTiposEvaluacion = async (_req: Request, res: Response): Promise<Response> => {
  try {
    return res.json(obtenerTiposEvaluacionService());
  } catch {
    return res.status(500).json({ error: 'Error al obtener tipos de evaluación' });
  }
};
