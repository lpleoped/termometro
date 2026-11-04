import axios from 'axios';
import { getEstadoActualDashboard } from './dashboard.service';
import { getHistoricoPorEquipoYEvaluacion } from './historico.service';
import { getProviderCredentials } from './ai-provider.service';
import { IAIProvider } from '../models/AIProvider';
import { AIAnalysis } from '../models/AIAnalysis';
import { buildContext, datasetHash } from '../context-engineering';
import { buildPrompt, PROMPT_VERSION, validateAnalysis } from '../prompting-engineering';


export const generateAnalysis = async (provider: IAIProvider, userId: string, input: {
  instanciaId: string; equipoId: string; evaluacionId: string; includeHistorico?: boolean;
}) => {
  const current = await getEstadoActualDashboard(input.instanciaId);
  const history = input.includeHistorico === false ? null : await getHistoricoPorEquipoYEvaluacion(input.equipoId, input.evaluacionId);
  const context = buildContext({
    scope: { equipoId: input.equipoId, instanciaId: input.instanciaId, evaluacionId: input.evaluacionId, periodo: new Date().toISOString().slice(0, 7) },
    sample: { expected: current.participacion.esperada, received: current.participacion.recibida, participation: current.participacion.porcentaje },
    quantitative: {
      globalIndex: current.indiceGlobal,
      sections: current.secciones.map((section, index) => ({ id: String(index), name: section.titulo, score: section.valor, weight: section.ponderacion || 0, n: current.participacion.recibida })),
      indicators: current.indicadores.map((indicator) => ({ id: indicator.id, name: indicator.texto, score: indicator.valorPonderado, n: current.participacion.recibida })),
    },
    history: (history?.historico || []).map((point) => ({ periodo: String(point.activadoEn), globalIndex: point.indiceGlobal, participation: point.participacion.porcentaje })),
  });
  const hash = datasetHash(context);
  const prompt = buildPrompt(context);
  const response = await axios.post(`${provider.endpoint}/chat/completions`, {
    model: provider.modelName,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'developer', content: prompt.developer },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }, { headers: { ...(getProviderCredentials(provider) ? { Authorization: `Bearer ${getProviderCredentials(provider)}` } : {}) }, timeout: 30000 });
  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('El proveedor no devolvió un análisis');
  const parsed = JSON.parse(content);
  if (!validateAnalysis(parsed)) {
    throw new Error('La respuesta del proveedor no cumple el formato de análisis');
  }
  const confidence = parsed.findings.length ? parsed.findings.reduce((sum, item) => sum + item.confidence, 0) / parsed.findings.length : 0;
  const result = {
    resumen: parsed.summary,
    fortalezas: parsed.findings.filter((item) => item.type === 'strength').map((item) => item.title),
    alertas: parsed.findings.filter((item) => item.type === 'risk' || item.type === 'divergence').map((item) => item.title),
    recomendaciones: parsed.actionPlan.flatMap((item) => item.actions),
    nivelConfianza: Math.max(0, Math.min(1, confidence)),
    fuentes: parsed.sources.map(String),
    emotionalSignals: parsed.emotionalSignals,
    findings: parsed.findings,
    actionPlan: parsed.actionPlan,
    limitations: parsed.limitations,
    needsHumanReview: parsed.needsHumanReview || context.limitations.length > 0,
  };
  const saved = await AIAnalysis.create({ userId, providerId: provider.id, instanciaId: input.instanciaId,
    equipoId: input.equipoId, evaluacionId: input.evaluacionId, providerKind: provider.kind,
    modelName: provider.modelName, promptVersion: PROMPT_VERSION, datasetHash: hash, result });
  return { id: saved.id, ...result };
};

export const listAnalyses = async (userId: string, instanciaId?: string) => {
  const filter = instanciaId ? { userId, instanciaId } : { userId };
  return AIAnalysis.find(filter).sort({ creadoEn: -1 }).limit(50).lean();
};
