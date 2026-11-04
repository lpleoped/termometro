import { Request, Response } from 'express';
import {
  crearInstanciaEvaluacionService,
  obtenerInstanciaPorIdService,
  listarInstanciasPorEquipoService,
} from '../services/instancia.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const crearInstanciaEvaluacion = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { equipoId, evaluacionId, activadoEn, cantidadEsperada, descripcionLider, modoRespuesta, minimoAnonimato } = req.body;
    const resultado = await crearInstanciaEvaluacionService({
      equipoId,
      evaluacionId,
      activadoEn,
      cantidadEsperada,
      descripcionLider,
      modoRespuesta,
      minimoAnonimato,
    });
    return res.status(201).json(resultado);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error al crear instancia' });
  }
};

export const obtenerInstanciaPorId = async (req: Request, res: Response): Promise<Response> => {
  try {
    const instancia = await obtenerInstanciaPorIdService(String(req.params.instanciaId));
    return res.status(200).json(instancia);
  } catch (error: any) {
    return res.status(404).json({ error: error.message || 'No se pudo obtener la instancia' });
  }
};

export const listarInstanciasPorEquipo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { equipoId } = req.query;
    if (!equipoId) {
      return res.status(400).json({ error: 'Falta el parámetro equipoId' });
    }
    const instancias = await listarInstanciasPorEquipoService(equipoId.toString());
    return res.status(200).json(instancias);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
