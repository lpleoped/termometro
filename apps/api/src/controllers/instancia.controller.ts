import { Request, Response } from 'express';
import {
  crearInstanciaEvaluacionService,
  obtenerInstanciaPorIdService,
  listarInstanciasPorEquipoService,
  obtenerRondaPublicaService,
  cerrarInstanciaEvaluacionService,
  obtenerEnlacesPublicosService,
} from '../services/instancia.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const crearInstanciaEvaluacion = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { equipoId, alcance, evaluadoNombre, evaluacionId, activadoEn, cantidadEsperada, descripcionLider, modoRespuesta, minimoAnonimato } = req.body;
    if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' });
    const resultado = await crearInstanciaEvaluacionService({
      equipoId,
      alcance,
      evaluadoNombre,
      evaluacionId,
      activadoEn,
      cantidadEsperada,
      descripcionLider,
      modoRespuesta,
      minimoAnonimato,
    }, req.user.id);
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

export const obtenerRondaPublica = async (req: Request, res: Response): Promise<Response> => {
  try { return res.json(await obtenerRondaPublicaService(String(req.params.token))); }
  catch (error: any) { return res.status(404).json({ error: error.message || 'Ronda no disponible' }); }
};

export const cerrarInstanciaEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try { if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' }); return res.json(await cerrarInstanciaEvaluacionService(String(req.params.instanciaId), req.user.id)); }
  catch (error: any) { return res.status(400).json({ error: error.message || 'No se pudo cerrar la ronda' }); }
};

export const obtenerEnlacesPublicos = async (req: AuthRequest, res: Response): Promise<Response> => {
  try { if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' }); return res.json(await obtenerEnlacesPublicosService(String(req.params.instanciaId), req.user.id)); }
  catch (error: any) { return res.status(400).json({ error: error.message || 'No se pudieron obtener los enlaces' }); }
};

export const listarInstanciasPorEquipo = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { equipoId } = req.query;
    if (!equipoId) {
      return res.status(400).json({ error: 'Falta el parámetro equipoId' });
    }
    if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' });
    const instancias = await listarInstanciasPorEquipoService(equipoId.toString(), req.user.id);
    return res.status(200).json(instancias);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
