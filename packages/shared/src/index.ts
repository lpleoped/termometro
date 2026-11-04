/** Contratos compartidos API ↔ Web — Termómetro de Equipo (clima). */

export const PRODUCT_NAME = 'Termómetro de Equipo';

/** Tipo de evaluación del producto (clima por secciones ponderadas). */
export type TipoEvaluacion = 'CUSTOM';

export interface HealthResponse {
  ok: boolean;
  service: string;
  product: string;
  mongo?: 'connected' | 'disconnected';
}

export interface Indicador {
  id: string;
  texto: string;
  descripcion?: string;
}

/** Sección de una evaluación (definición / formulario). */
export interface Seccion {
  titulo: string;
  ponderacion: number;
  indicadores: Indicador[];
}

export interface ConfiguracionTipoEvaluacion {
  maxIndicadores: number;
  minIndicadores: number;
  seccionesFijas: boolean;
  ponderacionAutomatica: boolean;
  tituloSeccion?: string;
}

export interface TipoEvaluacionInfo {
  tipo: TipoEvaluacion;
  nombre: string;
  descripcion: string;
  configuracion: ConfiguracionTipoEvaluacion;
}

export interface Participacion {
  esperada: number;
  recibida: number;
  porcentaje: number;
}

/** Sección agregada en dashboard / histórico. */
export interface SeccionResultado {
  titulo: string;
  ponderacion?: number;
  valor: number;
}

export interface IndicadorResultado {
  id: string;
  texto: string;
  valorPonderado: number;
}

export interface DashboardEstadoActual {
  equipo: string;
  evaluacion: {
    titulo: string;
    version: string;
    tipo: TipoEvaluacion | string;
  };
  participacion: Participacion;
  indiceGlobal: number;
  secciones: SeccionResultado[];
  indicadores: IndicadorResultado[];
}

export interface HistoricoPunto {
  instanciaId: string;
  activadoEn: string | Date;
  indiceGlobal: number;
  secciones: SeccionResultado[];
  participacion: Participacion;
}

export interface HistoricoResponse {
  equipo: string;
  evaluacion: {
    titulo: string;
    version: string;
  };
  historico: HistoricoPunto[];
}

/** Semáforo de clima (índice 0–100). */
export type SemaforoClima = 'Excelente' | 'Bueno' | 'Regular' | 'Crítico';

export function interpretarIndiceClima(indice: number): SemaforoClima {
  if (indice >= 80) return 'Excelente';
  if (indice >= 60) return 'Bueno';
  if (indice >= 40) return 'Regular';
  return 'Crítico';
}

export type AIProviderKind = 'openai-compatible' | 'azure-openai' | 'ollama';
export type AIProviderStatus = 'active' | 'invalid' | 'unverified';

export interface AIProviderInput {
  name: string;
  kind: AIProviderKind;
  endpoint: string;
  model: string;
  apiKey?: string;
}

export interface AIProviderResponse {
  id: string;
  name: string;
  kind: AIProviderKind;
  endpoint: string;
  model: string;
  status: AIProviderStatus;
}

export interface AIAnalysisRequest {
  providerId: string;
  instanciaId: string;
  equipoId: string;
  evaluacionId: string;
  includeHistorico?: boolean;
}

export interface AIAnalysisResponse {
  id: string;
  resumen: string;
  fortalezas: string[];
  alertas: string[];
  recomendaciones: string[];
  nivelConfianza: number;
  fuentes: string[];
  emotionalSignals?: EmotionalSignal[];
  findings?: ClimateFinding[];
  actionPlan?: ActionItem[];
  limitations?: string[];
  needsHumanReview?: boolean;
  promptVersion?: string;
  datasetHash?: string;
}

export type SentimentDirection = 'positive' | 'negative' | 'mixed' | 'neutral';
export type EmotionalSignalLabel = 'trust' | 'belonging' | 'energy' | 'safety' | 'frustration' | 'recognition' | 'uncertainty' | 'conflict';
export interface EmotionalSignal { label: EmotionalSignalLabel; direction: SentimentDirection; intensity: number; confidence: number; evidenceIds: string[]; interpretation: string; }
export interface ClimateFinding { title: string; type: 'strength' | 'risk' | 'opportunity' | 'divergence'; severity: 'low' | 'medium' | 'high'; evidence: string[]; confidence: number; }
export interface ActionItem { priority: number; objective: string; actions: string[]; ownerRole: string; horizon: '7d' | '30d' | '90d'; successMetrics: string[]; checkInQuestion: string; risks: string[]; }
export interface AIClimateAnalysis { summary: string; emotionalSignals: EmotionalSignal[]; findings: ClimateFinding[]; actionPlan: ActionItem[]; limitations: string[]; needsHumanReview: boolean; sources: string[]; }
export interface QuantitativeSection { id: string; name: string; score: number; weight: number; n: number; }
export interface QuantitativeIndicator { id: string; name: string; score: number; n: number; }
export interface QualitativeTheme { name: string; frequency: number; sentiment: SentimentDirection; evidenceIds: string[]; }
export interface TeamClimateContext {
  schemaVersion: 'team-climate-context.v1';
  scope: { equipoId: string; instanciaId: string; evaluacionId: string; periodo: string };
  sample: { expected: number; received: number; participation: number };
  quantitative: { globalIndex: number; sections: QuantitativeSection[]; indicators: QuantitativeIndicator[] };
  qualitative: { responsesAnalyzed: number; themes: QualitativeTheme[]; redactions: number };
  history: Array<{ periodo: string; globalIndex: number; participation: number }>;
  limitations: string[];
  sources: string[];
}
