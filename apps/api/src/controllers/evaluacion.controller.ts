import type { Request, Response } from 'express';
import {
  crearEvaluacionService,
  listarEvaluacionesService,
  eliminarEvaluacionPorIdService,
  editarEvaluacionService,
  obtenerTiposEvaluacionService,
} from '../services/evaluacion.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { assertEvaluationOwner } from '../services/authorization.service';
import { registrarError } from '../observability/errores';

export const crearEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const resultado = await crearEvaluacionService({ ...req.body, creadoPor: req.user?.id });
    return res.status(201).json(resultado);
  } catch (error: any) {
    registrarError('validacion', error, { accion: 'crear' });
    return res.status(400).json({ error: error.message || 'Error al crear evaluación' });
  }
};

export const listarEvaluaciones = async (req: AuthRequest, res: Response) => {
  try {
    const evaluaciones = await listarEvaluacionesService(req.user!.id);
    return res.json(evaluaciones);
  } catch (error) {
    registrarError('persistencia', error, { accion: 'listar' });
    return res.status(500).json({ error: 'Error al listar evaluaciones' });
  }
};

export const obtenerEvaluacion = async (req: AuthRequest, res: Response) => {
  try {
    const evaluacion = await assertEvaluationOwner(req.user!.id, String(req.params.id));
    return res.json({
      _id: evaluacion._id,
      titulo: evaluacion.titulo,
      descripcion: evaluacion.descripcion,
      tipo: evaluacion.tipo,
      secciones: evaluacion.secciones,
    });
  } catch (error: any) {
    registrarError('autorizacion', error, { accion: 'obtener' });
    return res.status(403).json({ error: error.message || 'No tienes permiso para acceder a esta evaluación' });
  }
};

export const editarEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const resultado = await editarEvaluacionService(String(req.params.id), req.body, req.user!.id);
    return res.status(200).json(resultado);
  } catch (error: any) {
    registrarError('validacion', error, { accion: 'editar' });
    return res.status(400).json({ error: error.message });
  }
};

export const eliminarEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    await eliminarEvaluacionPorIdService(String(req.params.id), req.user!.id);
    return res.status(204).send();
  } catch (error: any) {
    registrarError('validacion', error, { accion: 'eliminar' });
    return res.status(400).json({ error: error.message });
  }
};

export const obtenerTiposEvaluacion = async (_req: Request, res: Response): Promise<Response> => {
  try {
    return res.json(obtenerTiposEvaluacionService());
  } catch (error) {
    registrarError('sistema', error, { accion: 'tipos' });
    return res.status(500).json({ error: 'Error al obtener tipos de evaluación' });
  }
};
