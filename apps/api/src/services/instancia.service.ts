import crypto from 'node:crypto';
import type { IInstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { assertEvaluationOwner, assertTeamInstanceOwner, assertTeamOwner } from './authorization.service';
import { evaluationRepository } from '../repositories/evaluation.repository';
import { direccionesParaCompartir, laRedLocalEstaAbierta } from '../network/red-local';
import { roundRepository } from '../repositories/round.repository';
import { log } from '../observability/logger';

interface CrearInstanciaInput {
  equipoId?: string;
  alcance?: 'equipo' | 'persona' | 'individual';
  evaluadoNombre?: string;
  evaluacionId: string;
  activadoEn: Date;
  cantidadEsperada: number;
  descripcionLider?: string;
  modoRespuesta?: 'anonima' | 'identificada';
  minimoAnonimato?: number;
}

export const crearInstanciaEvaluacionService = async (
  data: CrearInstanciaInput,
  userId: string,
): Promise<IInstanciaEvaluacion> => {
  const { equipoId, alcance = equipoId ? 'equipo' : 'individual', evaluadoNombre, evaluacionId, activadoEn, cantidadEsperada, descripcionLider, modoRespuesta = 'anonima', minimoAnonimato } = data;
  const minimoPedido = minimoAnonimato === undefined || minimoAnonimato === null ? 3 : Number(minimoAnonimato);
  if (!Number.isInteger(minimoPedido) || minimoPedido < 1) throw new Error('El mínimo de respuestas para mostrar resultados debe ser al menos 1');

  if (!evaluacionId) throw new Error('Falta la evaluación');
  await assertEvaluationOwner(userId, evaluacionId);
  if (equipoId) await assertTeamOwner(userId, equipoId);
  const evaluacion = await evaluationRepository().findById(evaluacionId);
  if (!evaluacion) throw new Error('La evaluación no existe');
  if (evaluacion.origenCuestionario === 'ia' && evaluacion.revisionHumana?.estado !== 'aprobada') {
    throw new Error('La evaluación generada con IA requiere revisión humana antes de publicarse');
  }
  if (!cantidadEsperada || cantidadEsperada < 1) throw new Error('La cantidad esperada debe ser al menos 1');
  if (alcance === 'persona' && (!equipoId || !evaluadoNombre?.trim())) {
    throw new Error('Una evaluación de persona necesita un equipo y el nombre de la persona evaluada');
  }
  if (alcance === 'individual' && equipoId) throw new Error('Una evaluación individual no puede tener equipo');

  const creada = await roundRepository().insert({
    ...(equipoId ? { equipo: equipoId } : {}),
    alcance,
    evaluadoNombre: evaluadoNombre?.trim(),
    evaluacion: evaluacionId,
    activadoEn,
    cantidadEsperada,
    descripcionLider,
    estado: 'activa',
    modoRespuesta,
    minimoAnonimato: minimoPedido,
    tokenPublico: crypto.randomBytes(32).toString('base64url'),
  }) as unknown as IInstanciaEvaluacion;
  log.info('ronda', 'Ronda publicada.', { contexto: { instanciaId: String(creada._id), alcance, modoRespuesta } });
  return creada;
};

export const obtenerInstanciaPorIdService = async (id: string, userId: string) => {
  const instancia = await roundRepository().findById(id);

  if (!instancia) {
    throw new Error('Instancia no encontrada');
  }

  const [evaluacion, equipo] = await Promise.all([
    evaluationRepository().findById(String(instancia.evaluacion)),
    instancia.equipo
      ? (await import('../repositories/team.repository')).teamRepository().findOwnedActive(String(instancia.equipo), userId)
      : null,
  ]);
  const evaluationOwned = Boolean(evaluacion && String(evaluacion.creadoPor) === userId);
  const teamOwned = Boolean(equipo);
  const hasTeam = Boolean(instancia.equipo);
  
  if (!evaluationOwned || (hasTeam && !teamOwned)) {
    throw new Error('No tienes permiso para acceder a esta instancia');
  }

  if (instancia.estado !== 'activa') {
    throw new Error('La instancia no está disponible');
  }

  return {
    _id: instancia._id,
    equipoId: instancia.equipo || null,
    evaluacionId: instancia.evaluacion,
    alcance: instancia.alcance,
    evaluadoNombre: instancia.evaluadoNombre || '',
    activadoEn: instancia.activadoEn,
    cantidadEsperada: instancia.cantidadEsperada ?? 0,
    modoRespuesta: instancia.modoRespuesta,
    minimoAnonimato: instancia.minimoAnonimato ?? 1,
    tokenPublico: instancia.tokenPublico,
  };
};

export const obtenerEnlacesPublicosService = async (id: string, userId: string) => {
  const instancia = await roundRepository().findById(id);
  if (!instancia) throw new Error('Instancia no encontrada');
  if (instancia.equipo) await assertTeamInstanceOwner(userId, String(instancia.equipo));
  else await assertEvaluationOwner(userId, String(instancia.evaluacion));
  if (!instancia.tokenPublico || instancia.estado !== 'activa') throw new Error('La ronda no está disponible');
  const port = Number(process.env.PORT) || 3000;
  
  if (!laRedLocalEstaAbierta()) {
    return {
      token: instancia.tokenPublico,
      urls: [{ url: `http://127.0.0.1:${port}/r/${instancia.tokenPublico}`, interface: 'loopback', address: '127.0.0.1' }],
    };
  }

  const hosts = await direccionesParaCompartir();
  
  // Always include localhost as fallback
  if (hosts.length === 0) {
    hosts.push({ address: 'localhost', interfaceName: 'loopback' });
  }
  
  return {
    token: instancia.tokenPublico,
    urls: hosts.map(host => ({
      url: `http://${host.address}:${port}/r/${instancia.tokenPublico}`,
      interface: host.interfaceName,
      address: host.address,
    })),
  };
};

const isValidPublicToken = (token: string): boolean => {
  // UUID format (legacy): 8-4-4-4-12 with hyphens (36 chars)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Base64url format (current): 40-64 chars, alphanumeric plus underscore and hyphen
  const base64urlPattern = /^[A-Za-z0-9_-]{40,64}$/;
  
  return uuidPattern.test(token) || base64urlPattern.test(token);
};

export const obtenerRondaPublicaService = async (token: string) => {
  if (!isValidPublicToken(token)) throw new Error('Token inválido');
  const instancia = await roundRepository().findByPublicToken(token);
  if (!instancia || instancia.estado !== 'activa') throw new Error('Ronda no disponible');
  const evaluacion = await evaluationRepository().findById(String(instancia.evaluacion));
  if (!evaluacion) throw new Error('Evaluación no disponible');
  return {
    token,
    titulo: evaluacion.titulo,
    secciones: (evaluacion.secciones || []).map((seccion) => ({
      titulo: seccion.titulo,
      indicadores: (seccion.indicadores || []).map((indicador: { id: string; texto: string; descripcion?: string; tipo?: string; direccion?: string }) => ({
        id: indicador.id,
        texto: indicador.texto,
        ...(indicador.descripcion ? { descripcion: indicador.descripcion } : {}),
        tipo: indicador.tipo === 'cualitativo' ? 'cualitativo' : 'cuantitativo',
        direccion: indicador.direccion === 'negativa' ? 'negativa' : 'positiva',
      })),
    })),
    evaluadoNombre: instancia.evaluadoNombre || '',
    modoRespuesta: instancia.modoRespuesta,
    minimoAnonimato: instancia.minimoAnonimato ?? 1,
  };
};

export const cerrarInstanciaEvaluacionService = async (id: string, userId: string) => {
  const current = await roundRepository().findById(id);
  if (!current) throw new Error('Instancia no encontrada');
  if (current.equipo) await assertTeamInstanceOwner(userId, String(current.equipo));
  else await assertEvaluationOwner(userId, String(current.evaluacion));
  const updated = await roundRepository().updateState(id, 'cerrada');
  if (!updated) throw new Error('Instancia no encontrada');
  log.info('ronda', 'Ronda cerrada.', { contexto: { instanciaId: id } });
  return updated;
};

export const listarInstanciasPorEquipoService = async (equipoId: string, userId: string) => {
  const instancias = await assertTeamInstanceOwner(userId, equipoId);
  const evaluaciones = new Map((await evaluationRepository().listByOwner(userId)).map(item => [String(item._id), item]));

  const instanciasMap = new Map();

  for (const instancia of instancias) {
    if (!instancia.evaluacion) {
      log.warn('ronda', 'Instancia ignorada: evaluación nula o eliminada.', { codigo: 'EVALUACION_AUSENTE', contexto: { instanciaId: String(instancia._id) } });
      continue;
    }
    const evalId = String((instancia.evaluacion as any)?._id ?? instancia.evaluacion);
    const evaluacion = evaluaciones.get(evalId);
    if (!evaluacion) continue;
    if (!instanciasMap.has(evalId)) {
      instanciasMap.set(evalId, { ...instancia, evaluacion });
    }
  }

  const resultado = Array.from(instanciasMap.values());
  return resultado;
};
