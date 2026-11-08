import type { HistoricoResponse, HistoricoSeguimiento, AIAnalysisResponse, AccionPlanResponse } from '@termometro/shared';
import { getEstadoActualDashboard } from './dashboard.service';
import { evaluationRepository } from '../repositories/evaluation.repository';
import { historyAttachmentsRepository } from '../repositories/history-attachments.repository';
import { roundRepository } from '../repositories/round.repository';
import { teamRepository } from '../repositories/team.repository';

/** Misma fórmula de índice que el dashboard de estado actual. */
export const getHistoricoPorEquipoYEvaluacion = async (
  equipoId: string,
  evaluacionId: string,
  userId?: string,
): Promise<HistoricoResponse> => {
  const instancias = await roundRepository().listByTeamAndEvaluation(equipoId, evaluacionId);

  const equipo = await teamRepository().findById(equipoId);
  const evaluacion = await evaluationRepository().findById(evaluacionId);

  if (!equipo || !evaluacion) throw new Error('Equipo o evaluación no encontrada');

  const historico: HistoricoResponse['historico'] = [];
  const seguimiento: HistoricoSeguimiento[] = [];
  const visibles: string[] = [];

  for (const instancia of instancias) {
    const actual = await getEstadoActualDashboard(String(instancia._id));
    // La privacidad también se aplica a interpretaciones y planes asociados.
    if (actual.privacidad?.protegido) continue;
    const instanciaId = String(instancia._id);
    const tieneIndice = actual.indicadores.some(item => (item.n ?? 0) > 0);
    visibles.push(instanciaId);
    const activadoEn = instancia.activadoEn instanceof Date ? instancia.activadoEn.toISOString() : String(instancia.activadoEn);
    seguimiento.push({ instanciaId, activadoEn, indiceGlobal: tieneIndice ? actual.indiceGlobal : null, participacion: actual.participacion, analisis: [], acciones: [] });
    if (!tieneIndice) continue;

    historico.push({
      instanciaId,
      activadoEn,
      indiceGlobal: actual.indiceGlobal,
      secciones: actual.secciones,
      participacion: actual.participacion,
    });
  }

  if (visibles.length && userId) {
    const { analyses: analisis, actions: acciones } = await historyAttachmentsRepository().list(userId, equipoId, evaluacionId, visibles);
    for (const ronda of seguimiento) {
      ronda.analisis = analisis.filter(item => item.instanciaId === ronda.instanciaId).map(item => ({ ...item.result, id: String(item._id), instanciaId: item.instanciaId, creadoEn: item.creadoEn.toISOString(), snapshot: item.snapshot } as AIAnalysisResponse));
      ronda.acciones = acciones.filter(item => String(item.instanciaEvaluacion) === ronda.instanciaId).map(item => JSON.parse(JSON.stringify(item)) as AccionPlanResponse);
    }
  }

  return {
    equipo: equipo.nombre,
    evaluacion: {
      titulo: evaluacion.titulo,
      version: evaluacion.version,
    },
    comparabilidad: {
      valida: true,
      razon: 'Las rondas usan la misma evaluación y versión; los cambios describen asociación temporal, no causalidad.',
      instrumentoVersion: evaluacion.version,
      reglas: ['Misma evaluación e instrumento', 'Misma escala de respuesta', 'Interpretar junto con participación y calidad de medición', 'No inferir causalidad a partir del índice'],
    },
    historico,
    seguimiento,
  };
};
