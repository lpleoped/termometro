import { AI_CHECK_VERSION, ANALYSIS_INSTRUCTIONS, requestCompletion, validateAnalysis } from './ai-completion';
import { getEstadoActualDashboard } from './dashboard.service';
import { getHistoricoPorEquipoYEvaluacion } from './historico.service';
import { getProviderCredentials } from './ai-provider.service';
import { resolveAIProvider } from './ai-settings.service';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Equipo } from '../models/Equipo';
import { AIRequestError } from './ai-completion';
import crypto from 'crypto';
import { AIAnalysis } from '../models/AIAnalysis';
import { Respuesta } from '../models/Respuesta';
import { selectTeamContext } from './context-engine.service';
import { ActionPolicyError, validateContextualActions } from './action-policy.service';

const PROMPT_VERSION = 'v2';

const fuentesLegibles = (fuentes: string[], indicadores: Array<{ id: string; texto: string; valorPonderado: number }>, contextItems: Array<{ id: string; title: string }>) => fuentes.map((fuente) => {
  const referencia = fuente.split(':')[0].trim();
  const indicador = indicadores.find(item => item.id === referencia || fuente.startsWith(`${item.id}:`));
  if (indicador) {
    const valor = fuente.includes(':') ? fuente.slice(fuente.indexOf(':') + 1).trim() : `${indicador.valorPonderado}/100`;
    return `${indicador.texto} (${valor})`;
  }
  const contexto = contextItems.find(item => item.id === referencia || fuente === item.id);
  if (contexto) return `Contexto del equipo: ${contexto.title}`;
  if (/^custom_/i.test(referencia)) return 'Un indicador cuantitativo de la encuesta (referencia técnica no disponible)';
  return fuente;
});

export const generateAnalysis = async (userId: string, input: {
  instanciaId: string; includeHistorico?: boolean;
}) => {
  const provider = await resolveAIProvider(userId);
  const round = await InstanciaEvaluacion.findById(input.instanciaId);
  if (!round || !await Equipo.exists({ _id: round.equipo, creadoPor: userId })) {
    throw new AIRequestError('AI_ROUND_MISSING', 'No se encontró una ronda de tus equipos para analizar.', 404);
  }
  const equipoId = String(round.equipo);
  const evaluacionId = String(round.evaluacion);
  const teamContext = await selectTeamContext(equipoId);
  const current = await getEstadoActualDashboard(input.instanciaId);
  const rawResponses = await Respuesta.find({ instanciaEvaluacion: input.instanciaId }).select('respuestas').lean();
  const cualitativos = current.privacidad?.protegido ? [] : rawResponses.flatMap((row: any) => row.respuestas.filter((answer: any) => typeof answer.texto === 'string').map((answer: any) => ({ indicadorId: answer.indicadorId, texto: answer.texto.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]').slice(0, 2000) })));
  const history = input.includeHistorico === false ? null : await getHistoricoPorEquipoYEvaluacion(equipoId, evaluacionId);
  const context = {
    equipo: current.equipo,
    evaluacion: current.evaluacion,
    cuantitativos: {
      indiceGlobal: current.indiceGlobal,
      participacion: current.participacion,
      secciones: current.secciones,
      indicadores: current.indicadores,
    },
    historico: history?.historico || [],
    cualitativos,
    contextoEquipo: {
      elementos: teamContext.items,
      elementosOmitidosPorPresupuesto: teamContext.omittedCount,
      caracteresSeleccionados: teamContext.characterCount,
    },
    marcoAnalisisCualitativo: {
      objetivo: 'detectar temas recurrentes, tono conversacional y señales de lenguaje agresivo o de hostigamiento a nivel agregado',
      limites: ['no diagnosticar emociones o salud mental', 'no etiquetar personas', 'no inferir atributos sensibles', 'no convertir una señal en una acusación'],
      revisionHumana: true,
    },
  };
  const datasetHash = crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
  let result: any;
  try {
    result = validateAnalysis(await requestCompletion(provider.endpoint, provider.modelName, getProviderCredentials(provider), [
      { role: 'system', content: ANALYSIS_INSTRUCTIONS },
      { role: 'user', content: JSON.stringify(context) },
    ]));
    provider.status = 'active';
    provider.checkVersion = AI_CHECK_VERSION;
  } catch (error) {
    provider.status = 'invalid';
    provider.checkVersion = AI_CHECK_VERSION;
    await provider.save();
    throw error;
  }
  await provider.save();
  try {
    result.accionesContextuales = validateContextualActions((result.accionesContextuales || []) as any, teamContext.items);
  } catch (error) {
    if (error instanceof ActionPolicyError) {
      throw new AIRequestError(error.code, `${error.message} Revisá el contexto del equipo y volvé a intentar.`, 422);
    }
    throw error;
  }
  const fuentesTecnicas = [...result.fuentes];
  result.fuentes = fuentesLegibles(fuentesTecnicas, current.indicadores, teamContext.items);
  result.fuentesTecnicas = fuentesTecnicas;
  const saved = await AIAnalysis.create({ userId, providerId: provider.id, instanciaId: input.instanciaId,
    equipoId, evaluacionId, providerKind: provider.kind,
    modelName: provider.modelName, promptVersion: PROMPT_VERSION, datasetHash, contextItemIds: teamContext.itemIds, result });
  return { id: saved.id, ...result, contextoUtilizado: teamContext.items.map(item => `${item.title} (${item.type})`), contextoOmitido: teamContext.omittedCount };
};

export const listAnalyses = async (userId: string, instanciaId?: string) => {
  const filter = instanciaId ? { userId, instanciaId } : { userId };
  const rows = await AIAnalysis.find(filter).sort({ creadoEn: -1 }).limit(50).lean();
  return rows.map(row => ({ id: String(row._id), ...row.result, contextoUtilizado: row.contextItemIds || [] }));
};
