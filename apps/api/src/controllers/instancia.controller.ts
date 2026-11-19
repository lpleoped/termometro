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
import { registrarError } from '../observability/errores';

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
    registrarError('ronda', error, { accion: 'crear' });
    return res.status(400).json({ error: error.message || 'Error al crear instancia' });
  }
};

export const obtenerInstanciaPorId = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' });
    const instancia = await obtenerInstanciaPorIdService(String(req.params.instanciaId), req.user.id);
    return res.status(200).json(instancia);
  } catch (error: any) {
    registrarError('ronda', error, { accion: 'obtener' });
    return res.status(404).json({ error: error.message || 'No se pudo obtener la instancia' });
  }
};

export const obtenerRondaPublica = async (req: Request, res: Response): Promise<Response> => {
  try { return res.json(await obtenerRondaPublicaService(String(req.params.token))); }
  catch (error: any) { registrarError('ronda', error, { accion: 'publica' }); return res.status(404).json({ error: error.message || 'Ronda no disponible' }); }
};

export const cerrarInstanciaEvaluacion = async (req: AuthRequest, res: Response): Promise<Response> => {
  try { if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' }); return res.json(await cerrarInstanciaEvaluacionService(String(req.params.instanciaId), req.user.id)); }
  catch (error: any) { registrarError('ronda', error, { accion: 'cerrar' }); return res.status(400).json({ error: error.message || 'No se pudo cerrar la ronda' }); }
};

export const obtenerEnlacesPublicos = async (req: AuthRequest, res: Response): Promise<Response> => {
  try { if (!req.user?.id) return res.status(401).json({ error: 'Usuario no autenticado' }); return res.json(await obtenerEnlacesPublicosService(String(req.params.instanciaId), req.user.id)); }
  catch (error: any) { registrarError('ronda', error, { accion: 'enlaces' }); return res.status(400).json({ error: error.message || 'No se pudieron obtener los enlaces' }); }
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
    registrarError('ronda', error, { accion: 'listar' });
    // #region agent log
    fetch('http://127.0.0.1:7896/ingest/1bc53dc5-4602-4767-b8ad-8a1bbeccd6eb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b4c3d6'},body:JSON.stringify({sessionId:'b4c3d6',runId:'pre-fix',hypothesisId:'B',location:'instancia.controller.ts:listar',message:'el listado respondio error',data:{status:400,error:typeof error?.message==='string'?error.message.slice(0,160):'sin-mensaje'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return res.status(400).json({ error: error.message });
  }
};
