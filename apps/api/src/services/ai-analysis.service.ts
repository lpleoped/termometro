import { AI_CHECK_VERSION, ANALYSIS_INSTRUCTIONS, QUALITATIVE_ANALYSIS_INSTRUCTIONS, requestCompletion, validateAnalysis } from './ai-completion';
import { getEstadoActualDashboard } from './dashboard.service';
import { getHistoricoPorEquipoYEvaluacion } from './historico.service';
import { getProviderCredentials, saveProvider } from './ai-provider.service';
import { resolveAIProvider } from './ai-settings.service';
import { roundRepository } from '../repositories/round.repository';
import { evaluationRepository } from '../repositories/evaluation.repository';
import { teamRepository } from '../repositories/team.repository';
import { responseRepository } from '../repositories/response.repository';
import { featureRepository } from '../repositories/feature.repository';
import { newFeature } from '../domain/feature-validation';

import { AIRequestError } from './ai-completion';


import { selectTeamContext } from './context-engine.service';
import { ActionPolicyError, validateContextualActions } from './action-policy.service';
import { buildContext, datasetHash as hashContext, redactText, type RawQualitativeResponse } from '../context-engineering';
import { AI_ANALYSIS_SCHEMA_VERSION } from '@termometro/shared';
import { auditEvent } from './audit.service';
import { assertInstanceOwner } from './authorization.service';
import { buildHistoricalMemory, HISTORICAL_ANALYSIS_INSTRUCTIONS, assertGroundedEvidence } from './historical-context';

import { getBudgetLimits } from './ai-budget-presets';

const PROMPT_VERSION = 'v3-history';
const analysisAttempts = new Map<string, number[]>();
const ANALYSIS_WINDOW_MS = 60 * 60 * 1000;

const quantitativeQuality = (values: number[]): { dispersion: number | null; floorCeiling: 'floor' | 'ceiling' | null } => {
  if (values.length < 3) return { dispersion: null, floorCeiling: null as 'floor' | 'ceiling' | null };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const dispersion = Math.round(Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) * 100) / 100;
  const floorCount = values.filter(value => value <= 1).length;
  const ceilingCount = values.filter(value => value >= 5).length;
  const floorCeiling = floorCount / values.length >= 0.8 ? 'floor' : ceilingCount / values.length >= 0.8 ? 'ceiling' : null;
  return { dispersion, floorCeiling };
};

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
  // Get user's budget preset and concrete limits
  const { getAISettings } = await import('./ai-settings.service');
  const settings = await getAISettings(userId);
  const limits = getBudgetLimits(settings.budgetPreset);
  
  // Budget check with user-specific preset limit
  const now = Date.now();
  const recent = (analysisAttempts.get(userId) || []).filter((time) => now - time < ANALYSIS_WINDOW_MS);
  if (recent.length >= limits.maxAnalysesPerHour) {
    throw new AIRequestError('AI_RATE_LIMIT', `Alcanzaste el límite de ${limits.maxAnalysesPerHour} análisis por hora (preset "${settings.budgetPreset}"). Esperá antes de reintentar, o elegí un preset más grande en Configuración → IA → Presupuesto.`, 429);
  }
  recent.push(now); analysisAttempts.set(userId, recent);
  
  await assertInstanceOwner(userId, input.instanciaId);
  const provider = await resolveAIProvider(userId);
  const round = await roundRepository().findById(input.instanciaId);
  if (!round || !await teamRepository().findOwned(String(round.equipo), userId)) {
    throw new AIRequestError('AI_ROUND_MISSING', 'No se encontró una ronda de tus equipos para analizar.', 404);
  }
  const equipoId = String(round.equipo);
  const evaluacionId = String((round.evaluacion as any)?._id || round.evaluacion);
  const teamContext = await selectTeamContext(equipoId);
  const current = await getEstadoActualDashboard(input.instanciaId);
  const rawResponses = await responseRepository().listByRound(input.instanciaId);
  const evaluacion = await evaluationRepository().findById(evaluacionId);
  const indicatorMeta = new Map<string, { question: string; section: string }>();
  evaluacion?.secciones?.forEach((section: any, sectionIndex: number) => (section.indicadores || []).forEach((indicator: any) => indicatorMeta.set(String(indicator.id), { question: String(indicator.texto), section: String(section.titulo || `Seccion ${sectionIndex + 1}`) })));
  const qualitativeResponses: RawQualitativeResponse[] = [];
  rawResponses.forEach((row: any, responseIndex: number) => {
    (row.respuestas || []).forEach((answer: any, answerIndex: number) => {
      if (typeof answer.texto !== 'string' || !answer.texto.trim()) return;
      const meta = indicatorMeta.get(String(answer.indicadorId));
      qualitativeResponses.push({ id: `q${responseIndex}-${answerIndex}`, question: meta?.question || String(answer.indicadorId), section: meta?.section || 'Sin seccion', text: answer.texto.slice(0, limits.maxQualitativeText) });
    });
    for (const [key, value] of Object.entries(row.comentariosAbiertos || {})) {
      if (typeof value === 'string' && value.trim()) qualitativeResponses.push({ id: `c${responseIndex}-${key}`, question: key, section: 'Comentarios abiertos', text: value.slice(0, limits.maxQualitativeText) });
    }
  });
  const history = input.includeHistorico === false ? null : await getHistoricoPorEquipoYEvaluacion(equipoId, evaluacionId, userId);
  const historicalMemory = buildHistoricalMemory(history?.seguimiento || [], new Date(round.activadoEn));
  const rawIndicatorCounts = new Map<string, number>();
  const rawIndicatorValues = new Map<string, number[]>();
  rawResponses.forEach((row: any) => (row.respuestas || []).forEach((answer: any) => {
    const id = String(answer.indicadorId || '');
    const value = Number(answer.valor);
    if (id && Number.isFinite(value)) {
      rawIndicatorCounts.set(id, (rawIndicatorCounts.get(id) || 0) + 1);
      rawIndicatorValues.set(id, [...(rawIndicatorValues.get(id) || []), value]);
    }
  }));
  const context = buildContext({
    scope: { equipoId, instanciaId: input.instanciaId, evaluacionId, periodo: new Date(round.activadoEn).toISOString().slice(0, 10) },
    sample: { expected: current.participacion.esperada, received: current.participacion.recibida, participation: current.participacion.porcentaje / 100 },
    quantitative: {
      globalIndex: current.participacion.recibida > 0 ? current.indiceGlobal : null,
      sections: current.secciones.map((section: any, index: number) => {
        const sectionDefinition = evaluacion?.secciones?.[index];
        const values = (sectionDefinition?.indicadores || []).flatMap((indicator: any) => rawIndicatorValues.get(String(indicator.id)) || []);
        return { id: `section-${index + 1}`, name: redactText(String(section.titulo)), score: values.length > 0 ? section.valor : null, weight: Number(section.ponderacion) || 0, n: values.length, quality: quantitativeQuality(values) };
      }),
      indicators: current.indicadores.map((indicator: any) => { const id = String(indicator.id); const n = rawIndicatorCounts.get(id) || 0; return { id, name: redactText(String(indicator.texto)), score: n > 0 ? indicator.valorPonderado : null, n, quality: quantitativeQuality(rawIndicatorValues.get(id) || []) }; }),
    },
    history: (history?.historico || []).filter(point => new Date(point.activadoEn) <= new Date(round.activadoEn)).map((point) => ({ periodo: new Date(point.activadoEn).toISOString().slice(0, 10), globalIndex: point.indiceGlobal, participation: point.participacion.porcentaje / 100 })),
    qualitative: current.privacidad?.protegido ? [] : qualitativeResponses,
    qualitativeSuppressedReason: current.privacidad?.protegido ? 'Ronda anonima protegida: los cualitativos no se envian porque no alcanzan el minimo de respuestas.' : undefined,
  });
  const safeTeamContext = teamContext.items.map(item => ({ ...item, title: redactText(item.title), content: redactText(item.content), source: item.source ? redactText(item.source) : undefined }));
  const externalContext = { ...context, historicalMemory, teamContext: { items: safeTeamContext, omittedCount: teamContext.omittedCount, characterCount: teamContext.characterCount }, limitations: [...context.limitations, ...(teamContext.omittedCount ? ['Se omitieron elementos de contexto del equipo por presupuesto.'] : []), ...(historicalMemory.omittedCount ? [`Se omitieron ${historicalMemory.omittedCount} antecedentes por límite de contexto; no asumir que no existen.`] : [])] };
  const datasetHash = hashContext(externalContext as any);
  let result: any;
  try {
    result = validateAnalysis(await requestCompletion(provider.endpoint, provider.modelName, getProviderCredentials(provider), [
      { role: 'system', content: ANALYSIS_INSTRUCTIONS },
      { role: 'system', content: QUALITATIVE_ANALYSIS_INSTRUCTIONS },
      { role: 'system', content: HISTORICAL_ANALYSIS_INSTRUCTIONS },
      { role: 'system', content: 'Contrato obligatorio adicional: devolvé hallazgos (máximo 20) con título, tipo fortaleza|riesgo|oportunidad|divergencia, severidad baja|media|alta, confianza 0..1 y evidenciaIds no vacíos. Devolvé como máximo 3 accionesContextuales; cada una debe incluir ownerRole, horizon 7d|30d|90d, successMetric, checkInQuestion y evidenceIds no vacíos. Cada evidencia debe referir IDs del contexto recibido.' },
      { role: 'system', content: 'Analiza todas las respuestas cualitativas y comparalas entre participantes, aunque usen palabras distintas. Devuelve senalesEmocionales con etiqueta, direccion positiva|negativa|mixta|neutral, intensidad, confianza, interpretacion y evidenciaIds; y temasRecurrentes con tema, frecuencia de participantes >=2, interpretacion y evidenciaIds. No diagnostiques salud mental ni identifiques personas.' },
      { role: 'system', content: 'Inclui limitations como array de limites y advertencias del contexto; no presentes nivelConfianza como certeza estadistica.' },
      { role: 'user', content: JSON.stringify(externalContext) },
    ]));
    provider.status = 'active';
    provider.checkVersion = AI_CHECK_VERSION;
  } catch (error) {
    provider.status = 'invalid';
    provider.checkVersion = AI_CHECK_VERSION;
    await saveProvider(provider);
    throw error;
  }
  const evidenceIds = new Set([
    ...context.quantitative.indicators.map(item => item.id),
    ...context.quantitative.sections.map(item => item.id),
    ...context.qualitative.themes.flatMap(item => item.evidenceIds),
    ...context.qualitative.responses.map(item => item.id),
    ...safeTeamContext.map(item => item.id),
    ...historicalMemory.items.map(item => item.id),
  ]);
  if (!assertGroundedEvidence(result, evidenceIds)) throw new AIRequestError('AI_EVIDENCE_UNGROUNDED', 'La IA devolvió una referencia de evidencia que no existe en el contexto enviado.', 422);
  result.limitations = [...new Set([...externalContext.limitations, ...(result.limitations || [])])];
  result.metadata = { schemaVersion: AI_ANALYSIS_SCHEMA_VERSION, promptVersion: PROMPT_VERSION, providerKind: provider.kind, modelName: provider.modelName, datasetHash, parameters: { includeHistorico: input.includeHistorico !== false, contextSchemaVersion: context.schemaVersion } };
  await saveProvider(provider);
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
  const snapshot = { indiceGlobal: current.privacidad?.protegido || !current.indicadores.some(item => (item.n || 0) > 0) ? null : current.indiceGlobal, participacion: current.participacion };
  const saved = await featureRepository('aiAnalyses').insert(newFeature('aiAnalyses', { userId, providerId: provider._id, instanciaId: input.instanciaId, snapshot, historicalMemory,
    equipoId, evaluacionId, providerKind: provider.kind,
    modelName: provider.modelName, promptVersion: PROMPT_VERSION, schemaVersion: AI_ANALYSIS_SCHEMA_VERSION, datasetHash, parameters: result.metadata.parameters, contextItemIds: teamContext.itemIds, result }));
  auditEvent('ai.analysis.completed', { analysisId: String(saved._id), userId, instanciaId: input.instanciaId, datasetHash, providerKind: provider.kind, modelName: provider.modelName });
  return { id: saved._id, creadoEn: saved.creadoEn.toISOString(), instanciaId: input.instanciaId, snapshot, ...result, contextoUtilizado: teamContext.items.map(item => `${item.title} (${item.type})`), contextoOmitido: teamContext.omittedCount };
};

export const listAnalyses = async (userId: string, instanciaId?: string) => {
  if (instanciaId) await assertInstanceOwner(userId, instanciaId);
  const filter = instanciaId ? { userId, instanciaId } : { userId };
  const rows = await featureRepository('aiAnalyses').list(filter, { creadoEn: -1 }, 50);
  return rows.map(row => ({ id: String(row._id), creadoEn: row.creadoEn.toISOString(), instanciaId: row.instanciaId, snapshot: row.snapshot, ...row.result, contextoUtilizado: row.contextItemIds || [] }));
};
