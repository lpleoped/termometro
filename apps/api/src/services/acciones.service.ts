import { featureRepository } from '../repositories/feature.repository';
import { newFeature } from '../domain/feature-validation';
import type { EstadoAccion, HorizonteAccion } from '@termometro/shared';
import { auditEvent } from './audit.service';
import { generateAnalysis } from './ai-analysis.service';
import { assertInstanceOwner } from './authorization.service';
import type { AccionPlanInput } from '@termometro/shared';

import { validRecordId } from '../domain/feature-records';

const transiciones: Record<EstadoAccion, EstadoAccion[]> = {
  generada: ['en_revision'],
  en_revision: ['aprobada', 'rechazada'],
  aprobada: ['ejecutada'],
  rechazada: ['en_revision'],
  ejecutada: ['verificada'],
  verificada: [],
};

export const validarTransicionAccion = (actual: EstadoAccion, siguiente: EstadoAccion) => {
  if (!transiciones[actual]?.includes(siguiente)) throw new Error(`Transición no permitida: ${actual} → ${siguiente}`);
  return siguiente;
};

const puedeGestionar = async (userId: string, instanciaId: string) => {
  return assertInstanceOwner(userId, instanciaId);
};
const checkIns = (createdAt: Date) => ([7, 30, 90] as const).map((days) => ({
  horizonte: `${days}d` as HorizonteAccion,
  venceEn: new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000),
  estado: 'pendiente' as const,
}));

export const validarAccionInput = (input: AccionPlanInput) => {
  for (const [key, max] of [['descripcion', 4000], ['ownerRole', 200], ['successMetric', 500], ['checkInQuestion', 500]] as const) {
    if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max) throw new Error('Completá descripción, responsable, métrica y pregunta de seguimiento dentro de los límites indicados.');
  }
  if (!['7d', '30d', '90d'].includes(input.horizon)) throw new Error('Seleccioná un plazo de 7, 30 o 90 días.');
  if (input.evidenciaIds !== undefined && (!Array.isArray(input.evidenciaIds) || input.evidenciaIds.length > 50 || input.evidenciaIds.some(id => typeof id !== 'string' || id.length > 200))) throw new Error('Referencias de evidencia inválidas.');
  for (const id of [input.instanciaId, input.analisisId, input.adaptadaDe]) if (id !== undefined && !validRecordId(id)) throw new Error('Referencia de ronda, análisis o acción inválida.');
  if (input.analisisId && input.adaptadaDe) throw new Error('Elegí un único antecedente para la acción.');
};

export const agregarAccionPlan = async (userId: string, input: AccionPlanInput) => {
  validarAccionInput(input);
  const round = await puedeGestionar(userId, input.instanciaId);
  let propuestaOriginal: string | undefined;
  let evidenciaIds = input.evidenciaIds || [];
  if (input.analisisId) {
    const analysis = await featureRepository('aiAnalyses').find({ _id: input.analisisId, userId, instanciaId: input.instanciaId });
    const proposal = Number.isInteger(input.propuestaIndice) ? analysis?.result.accionesContextuales?.[input.propuestaIndice!] : undefined;
    if (!proposal) throw new Error('La propuesta de IA no pertenece a esta ronda o ya no está disponible.');
    propuestaOriginal = proposal.descripcion;
    evidenciaIds = proposal.evidenceIds;
  } else if (input.propuestaIndice !== undefined) throw new Error('La propuesta requiere un análisis de origen.');
  if (input.adaptadaDe) {
    const source = await featureRepository('accionesPlan').find({ _id: input.adaptadaDe });
    if (!source) throw new Error('Acción de origen no encontrada.');
    const sourceRound = await puedeGestionar(userId, String(source.instanciaEvaluacion));
    if (String(sourceRound.equipo) !== String(round.equipo) || String(sourceRound.evaluacion) !== String(round.evaluacion)) throw new Error('La acción de origen debe pertenecer al mismo equipo y evaluación.');
    propuestaOriginal = source.descripcion;
  }
  const creadaEn = new Date();
  const accion = await featureRepository('accionesPlan').insert(newFeature('accionesPlan', { instanciaEvaluacion: input.instanciaId, descripcion: input.descripcion.trim(), autor: userId, creadaEn, estado: 'generada', hallazgoId: input.hallazgoId, analisisId: input.analisisId, propuestaIndice: input.propuestaIndice, propuestaOriginal, adaptadaDe: input.adaptadaDe, evidenciaIds, ownerRole: input.ownerRole.trim(), horizon: input.horizon, successMetric: input.successMetric.trim(), checkInQuestion: input.checkInQuestion.trim(), checkIns: [] }));
  auditEvent('action.created', { actionId: String(accion._id), instanciaId: input.instanciaId, userId, estado: accion.estado });
  return accion;
};

export const listarAccionesPorInstancia = async (userId: string, instanciaId: string) => {
  await puedeGestionar(userId, instanciaId);
  return featureRepository('accionesPlan').list({ instanciaEvaluacion: instanciaId }, { creadaEn: -1 });
};

export const cambiarEstadoAccion = async (userId: string, actionId: string, siguiente: EstadoAccion) => {
  const accion = await featureRepository('accionesPlan').find({ _id: actionId });
  if (!accion) throw new Error('Acción no encontrada');
  await puedeGestionar(userId, String(accion.instanciaEvaluacion));
  validarTransicionAccion(accion.estado, siguiente);
  if (siguiente === 'verificada' && !accion.checkIns?.some(item => item.estado === 'completado' && item.nota?.trim())) throw new Error('Registrá al menos un seguimiento con el resultado observado antes de verificar.');
  accion.estado = siguiente;
  if (siguiente === 'aprobada') { accion.aprobadaPor = userId; accion.aprobadaEn = new Date(); }
  if (siguiente === 'ejecutada') { accion.ejecutadaEn = new Date(); accion.checkIns = checkIns(accion.ejecutadaEn); }
  if (siguiente === 'verificada') accion.verificadaEn = new Date();
  const saved = await featureRepository('accionesPlan').save(accion);
  auditEvent('action.state_changed', { actionId, userId, estado: siguiente });
  return saved;
};

export const completarCheckInAccion = async (userId: string, actionId: string, horizonte: HorizonteAccion, nota?: string, resultado?: { indiceAnterior?: number; indicePosterior?: number; interpretacion?: string }) => {
  const accion = await featureRepository('accionesPlan').find({ _id: actionId });
  if (!accion) throw new Error('Acción no encontrada');
  await puedeGestionar(userId, String(accion.instanciaEvaluacion));
  if (!['ejecutada', 'verificada'].includes(accion.estado)) throw new Error('La acción debe estar ejecutada antes del check-in');
  const checkIn = (accion.checkIns || []).find((item) => item.horizonte === horizonte);
  if (!checkIn) throw new Error('Check-in no encontrado');
  if (checkIn.estado === 'completado') throw new Error('Este seguimiento ya está registrado.');
  if (typeof nota !== 'string' || !nota.trim() || nota.length > 2000) throw new Error('Registrá qué se aplicó y qué resultado observaron (hasta 2000 caracteres).');
  if (resultado) {
    for (const value of [resultado.indiceAnterior, resultado.indicePosterior]) if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)) throw new Error('Los índices deben estar entre 0 y 100.');
    if (resultado.interpretacion !== undefined && (typeof resultado.interpretacion !== 'string' || resultado.interpretacion.length > 2000)) throw new Error('Interpretación de resultado inválida.');
  }
  checkIn.estado = 'completado'; checkIn.nota = nota?.trim(); checkIn.completadoEn = new Date();
  if (resultado) accion.resultado = { ...resultado, delta: resultado.indiceAnterior !== undefined && resultado.indicePosterior !== undefined ? resultado.indicePosterior - resultado.indiceAnterior : undefined, medidoEn: new Date(), interpretacion: resultado.interpretacion || 'El cambio posterior es descriptivo y no prueba causalidad.' };
  if (resultado) checkIn.resultado = { indiceAnterior: resultado.indiceAnterior, indicePosterior: resultado.indicePosterior, delta: accion.resultado?.delta };
  const saved = await featureRepository('accionesPlan').save(accion);
  auditEvent('action.checkin_completed', { actionId, userId, horizonte });
  return saved;
};

// Legacy callers also respect the central switch and default connection.
export const sugerirAccionesConIA = async (userId: string, instanciaId: string) => {
  const analysis = await generateAnalysis(userId, { instanciaId, includeHistorico: true });
  return analysis.recomendaciones.join('\n');
};
