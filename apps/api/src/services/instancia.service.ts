import crypto from 'node:crypto';
import os from 'node:os';
import type { IInstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { assertEvaluationOwner, assertTeamInstanceOwner, assertTeamOwner } from './authorization.service';
import { evaluationRepository } from '../repositories/evaluation.repository';
import { roundRepository } from '../repositories/round.repository';

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
  const { equipoId, alcance = equipoId ? 'equipo' : 'individual', evaluadoNombre, evaluacionId, activadoEn, cantidadEsperada, descripcionLider, modoRespuesta = 'anonima', minimoAnonimato = 1 } = data;

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

  return roundRepository().insert({
    ...(equipoId ? { equipo: equipoId } : {}),
    alcance,
    evaluadoNombre: evaluadoNombre?.trim(),
    evaluacion: evaluacionId,
    activadoEn,
    cantidadEsperada,
    descripcionLider,
    estado: 'activa',
    modoRespuesta,
    minimoAnonimato,
    tokenPublico: crypto.randomBytes(32).toString('base64url'),
  }) as unknown as Promise<IInstanciaEvaluacion>;
};

export const obtenerInstanciaPorIdService = async (id: string) => {
  const instancia = await roundRepository().findById(id);

  if (!instancia) {
    throw new Error('Instancia no encontrada');
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
  const hosts = new Set<string>(['localhost']);
  for (const interfaces of Object.values(os.networkInterfaces())) for (const item of interfaces || []) {
    if (item.family === 'IPv4' && !item.internal) hosts.add(item.address);
  }
  return { token: instancia.tokenPublico, urls: [...hosts].map((host) => `http://${host}:${port}/r/${instancia.tokenPublico}`) };
};

export const obtenerRondaPublicaService = async (token: string) => {
  if (!/^[A-Za-z0-9_-]{40,}$/.test(token)) throw new Error('Token inválido');
  const instancia = await roundRepository().findByPublicToken(token);
  if (!instancia || instancia.estado !== 'activa') throw new Error('Ronda no disponible');
  const evaluacion = await evaluationRepository().findById(String(instancia.evaluacion));
  if (!evaluacion) throw new Error('Evaluación no disponible');
  return { token, titulo: evaluacion.titulo, secciones: evaluacion.secciones, evaluadoNombre: instancia.evaluadoNombre || '', modoRespuesta: instancia.modoRespuesta, minimoAnonimato: instancia.minimoAnonimato ?? 1 };
};

export const cerrarInstanciaEvaluacionService = async (id: string, userId: string) => {
  const current = await roundRepository().findById(id);
  if (!current) throw new Error('Instancia no encontrada');
  if (current.equipo) await assertTeamInstanceOwner(userId, String(current.equipo));
  else await assertEvaluationOwner(userId, String(current.evaluacion));
  const updated = await roundRepository().updateState(id, 'cerrada');
  if (!updated) throw new Error('Instancia no encontrada');
  return updated;
};

export const listarInstanciasPorEquipoService = async (equipoId: string, userId: string) => {
  const instancias = await assertTeamInstanceOwner(userId, equipoId);
  const evaluaciones = new Map((await evaluationRepository().listByOwner(userId)).map(item => [String(item._id), item]));

  const instanciasMap = new Map();

  for (const instancia of instancias) {
    if (!instancia.evaluacion) {
      console.warn(`Instancia ${instancia._id} ignorada: evaluación nula o eliminada.`);
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
  if (resultado.length === 0) {
    throw new Error('No se encontraron instancias válidas para el equipo solicitado.');
  }
  return resultado;
};
