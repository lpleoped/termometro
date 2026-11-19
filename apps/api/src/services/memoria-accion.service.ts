import type { VeredictoIndicador } from '@termometro/shared';
import type { IAccionPlan } from '../domain/feature-records';
import { newFeature } from '../domain/feature-validation';
import { calcularMemoria, type MedicionRonda } from '../domain/veredicto-accion';
import { featureRepository } from '../repositories/feature.repository';
import type { RoundRecord } from '../repositories/round.repository';
import { roundRepository } from '../repositories/round.repository';
import { assertTeamInstanceOwner } from './authorization.service';
import { getEstadoActualDashboard } from './dashboard.service';

const firma = (items: VeredictoIndicador[] = []) => JSON.stringify(items.map((item) => ({
  indicadorId: item.indicadorId,
  texto: item.texto || '',
  valorAdopcion: item.valorAdopcion ?? null,
  valorPosterior: item.valorPosterior ?? null,
  delta: item.delta ?? null,
  veredicto: item.veredicto,
})));

const medir = async (ronda: RoundRecord): Promise<MedicionRonda> => {
  const activadoEn = ronda.activadoEn instanceof Date ? ronda.activadoEn.toISOString() : String(ronda.activadoEn);
  const base = { instanciaId: String(ronda._id), evaluacionId: String(ronda.evaluacion), activadoEn, indicadores: [] as MedicionRonda['indicadores'] };
  try {
    const estado = await getEstadoActualDashboard(String(ronda._id));
    return {
      ...base,
      indicadores: estado.indicadores.map((item) => ({
        id: String(item.id),
        texto: item.texto,
        valor: (item.n ?? 0) > 0 ? item.valorPonderado : null,
      })),
    };
  } catch {
    return base;
  }
};

const guardarAprendizaje = async (userId: string, teamId: string, actionId: string, texto: { title: string; content: string }) => {
  const learningKey = `action:${actionId}`;
  const repo = featureRepository('teamContextItems');
  const actual = await repo.find({ teamId, learningKey });
  if (actual && actual.title === texto.title && actual.content === texto.content && actual.type === 'learning' && actual.status === 'review' && actual.influence === 'interpretation') return actual;
  if (!actual) {
    return repo.insert(newFeature('teamContextItems', {
      teamId, type: 'learning', title: texto.title, content: texto.content, source: learningKey, learningKey,
      scope: 'team', status: 'review', confidence: 0.5, importance: 'relevant', sensitivity: 'normal', influence: 'interpretation',
      createdBy: userId, updatedBy: userId,
    }));
  }
  return repo.save({
    ...actual,
    type: 'learning',
    title: texto.title,
    content: texto.content,
    source: learningKey,
    learningKey,
    status: 'review',
    influence: 'interpretation',
    importance: 'relevant',
    sensitivity: 'normal',
    updatedBy: userId,
    updatedAt: new Date(),
    version: actual.version + 1,
  });
};

const persistir = async (userId: string, accion: IAccionPlan, mediciones: MedicionRonda[], teamId: string, ahora: Date) => {
  const delInstrumento = mediciones.filter((item) => item.evaluacionId === mediciones.find((ronda) => ronda.instanciaId === String(accion.instanciaEvaluacion))?.evaluacionId);
  const memoria = calcularMemoria({
    descripcion: accion.descripcion,
    estado: accion.estado,
    horizonte: accion.horizon,
    ejecutadaEn: accion.ejecutadaEn,
    indicadoresObjetivo: accion.evidenciaIds || [],
    rondaOrigenId: String(accion.instanciaEvaluacion),
    rondas: delInstrumento,
    notas: (accion.checkIns || []).map((item) => ({ horizonte: item.horizonte, estado: item.estado, nota: item.nota })),
    ahora,
  });
  if (!memoria || !teamId) return;
  if (firma(accion.veredictos) !== firma(memoria.veredictos)) {
    await featureRepository('accionesPlan').save({ ...accion, veredictos: memoria.veredictos });
  }
  await guardarAprendizaje(userId, teamId, String(accion._id), memoria.texto);
};

/** Recalcula veredictos del equipo y deja un aprendizaje en revisión por acción. */
export const recordarEquipo = async (userId: string, equipoId: string, ahora = new Date()) => {
  const rondas = await assertTeamInstanceOwner(userId, equipoId);
  const ids = rondas.map((ronda) => String(ronda._id));
  if (!ids.length) return [];
  const mediciones = await Promise.all(rondas.map(medir));
  const acciones = await featureRepository('accionesPlan').list({ instanciaEvaluacion: ids }, { creadaEn: -1 });
  for (const accion of acciones) await persistir(userId, accion, mediciones, equipoId, ahora);
  return featureRepository('accionesPlan').list({ instanciaEvaluacion: ids }, { creadaEn: -1 });
};
