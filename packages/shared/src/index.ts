/** Contratos compartidos API ↔ Web — Termómetro. */

export const PRODUCT_NAME = 'Termómetro';

/** Tipo de evaluación del producto (clima por secciones ponderadas). */
export type TipoEvaluacion = 'CUSTOM';

export interface HealthResponse {
  ok: boolean;
  service: string;
  product: string;
  mongo?: 'connected' | 'disconnected';
  storage?: 'json' | 'mongo';
  dataDirectory?: string;
}

/** Estado de inicio seguro para la interfaz: nunca incluye rutas ni secretos locales. */
export interface InstallationStatusResponse {
  firstRun: boolean;
  storage: 'json' | 'mongo';
}

export interface BackupPreviewResponse {
  createdAt: string;
  collections: Record<BackupCollection, number>;
}

export const BACKUP_COLLECTIONS = ['usuarios','equipos','evaluaciones','instancias','respuestas','aiProviders','aiSettings','aiAnalyses','accionesPlan','teamContextItems','integrationConnections','teamIntegrationSettings'] as const;
export type BackupCollection = typeof BACKUP_COLLECTIONS[number];
export interface PortableBackup {
  format: 'termometro-de-equipo-export';
  formatVersion: 1 | 2;
  createdAt: string;
  collections: Record<BackupCollection, { schemaVersion: number; collection: BackupCollection; records: Array<{ _id: string; [key: string]: unknown }> }>;
  checksums: Record<BackupCollection, string>;
}

export interface Indicador {
  id: string;
  texto: string;
  descripcion?: string;
    tipo?: 'cuantitativo' | 'cualitativo';
  /** En Likert 1–5, define si un valor alto es favorable o desfavorable. */
  direccion?: 'positiva' | 'negativa';
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
  /** Personas con al menos una respuesta cuantitativa válida en la sección. */
  n?: number;
  calidad?: MedicionCalidad;
}

export interface MedicionCalidad {
  dispersion: number | null;
  techoPiso: 'techo' | 'piso' | null;
  disponible: boolean;
}

export interface IndicadorResultado {
  id: string;
  texto: string;
  valorPonderado: number;
  direccion?: 'positiva' | 'negativa';
  n?: number;
  calidad?: MedicionCalidad;
}

export interface DashboardEstadoActual {
  equipo?: string;
  evaluacion: {
    titulo: string;
    version: string;
    tipo: TipoEvaluacion | string;
  };
  participacion: Participacion;
  indiceGlobal: number;
  secciones: SeccionResultado[];
  indicadores: IndicadorResultado[];
    cualitativo?: {
      preguntas: number;
      respuestas: number;
      disponible: boolean;
      grupos?: Array<{ id: string; pregunta: string; seccion: string; comentarios: string[] }>;
    };
  privacidad?: {
    modo: 'anonima' | 'identificada';
    protegido: boolean;
    minimoRespuestas: number;
  };
  alertas?: Array<{ tipo: 'nivel' | 'variacion'; severidad: 'atencion' | 'critica'; titulo: string; evidencia: string; valor?: number; variacion?: number }>;
  calidadMedicion?: {
    advertencias: string[];
    semaforoEsOperativo: true;
  };
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
  seguimiento: HistoricoSeguimiento[];
  comparabilidad: {
    valida: boolean;
    razon: string;
    instrumentoVersion: string;
    reglas: string[];
  };
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
  /** The server always uses the centrally configured provider. */
  instanciaId: string;
  includeHistorico?: boolean;
}

/** Shared across every AI feature and team belonging to the signed-in account. */
export interface AISettings {
  enabled: boolean;
  defaultProviderId: string | null;
  limits?: {
    maxQuestionnaireInput?: number;
    maxQualitativeText?: number;
    maxContextChars?: number;
    maxAnalysesPerHour?: number;
  };
}

export const AI_ANALYSIS_SCHEMA_VERSION = 'team-climate-analysis.v1';

export interface AIAnalysisMetadata {
  schemaVersion: typeof AI_ANALYSIS_SCHEMA_VERSION;
  promptVersion: string;
  providerKind: AIProviderKind;
  modelName: string;
  datasetHash: string;
  parameters: { includeHistorico: boolean; contextSchemaVersion: TeamClimateContext['schemaVersion'] };
}

export interface AIAnalysisResponse {
  id: string;
  creadoEn?: string;
  instanciaId?: string;
  snapshot?: { indiceGlobal: number | null; participacion: Participacion };
  resumen: string;
  fortalezas: string[];
  alertas: string[];
  recomendaciones: string[];
  nivelConfianza: number;
  fuentes: string[];
  hallazgos: AIAnalysisFinding[];
  senalesEmocionales: AIEmotionalSignal[];
  temasRecurrentes: AIRecurringTheme[];
  limitations: string[];
  metadata: AIAnalysisMetadata;
    fuentesTecnicas?: string[];
  contextoUtilizado?: string[];
  contextoOmitido?: number;
  accionesContextuales?: ContextualAction[];
}

export type EstadoAccion = 'generada' | 'en_revision' | 'aprobada' | 'rechazada' | 'ejecutada' | 'verificada';
export type HorizonteAccion = '7d' | '30d' | '90d';

export interface AccionPlanInput {
  instanciaId: string;
  descripcion: string;
  ownerRole: string;
  horizon: HorizonteAccion;
  successMetric: string;
  checkInQuestion: string;
  evidenciaIds?: string[];
  hallazgoId?: string;
  analisisId?: string;
  propuestaIndice?: number;
  adaptadaDe?: string;
}

export interface AccionPlanResponse extends Omit<AccionPlanInput, 'instanciaId'> {
  _id: string;
  instanciaEvaluacion: string;
  creadaEn: string;
  estado?: EstadoAccion;
  aprobadaEn?: string;
  ejecutadaEn?: string;
  verificadaEn?: string;
  propuestaOriginal?: string;
  checkIns?: Array<{ horizonte: HorizonteAccion; venceEn: string; estado: 'pendiente' | 'completado'; nota?: string; completadoEn?: string; resultado?: { indiceAnterior?: number; indicePosterior?: number; delta?: number } }>;
  resultado?: { indiceAnterior?: number; indicePosterior?: number; delta?: number; medidoEn?: string; interpretacion?: string };
}

export interface HistoricoSeguimiento {
  instanciaId: string;
  activadoEn: string;
  indiceGlobal: number | null;
  participacion: Participacion;
  analisis: AIAnalysisResponse[];
  acciones: AccionPlanResponse[];
}

export interface AIEmotionalSignal {
  etiqueta: string;
  direccion: 'positiva' | 'negativa' | 'mixta' | 'neutral';
  intensidad: number;
  confianza: number;
  interpretacion: string;
  evidenciaIds: string[];
}

export interface AIRecurringTheme {
  tema: string;
  frecuencia: number;
  interpretacion: string;
  evidenciaIds: string[];
}

export interface AIAnalysisFinding {
  titulo: string;
  tipo: 'fortaleza' | 'riesgo' | 'oportunidad' | 'divergencia';
  severidad: 'baja' | 'media' | 'alta';
  evidenciaIds: string[];
  confianza: number;
}

export interface ContextualAction {
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
  alcance: 'equipo' | 'liderazgo' | 'proyecto';
  hallazgo?: string;
  contextoAplicado?: string[];
  esCondicionPrevia?: boolean;
  requiereValidacion: boolean;
  ownerRole: string;
  horizon: '7d' | '30d' | '90d';
  successMetric: string;
  checkInQuestion: string;
  evidenceIds: string[];
}

export type TeamContextType = 'stable_fact' | 'team_role' | 'client_context' | 'priority' | 'constraint' | 'external_actor' | 'decision' | 'hypothesis' | 'learning';
export type TeamContextStatus = 'active' | 'review' | 'obsolete';
export type TeamContextScope = 'team' | 'project' | 'analysis';
export type TeamContextImportance = 'informative' | 'relevant' | 'critical';
export type TeamContextSensitivity = 'normal' | 'sensitive' | 'highly_sensitive';
export type TeamContextInfluence = 'interpretation' | 'risk' | 'action' | 'precondition' | 'group_action' | 'do_not_act_directly' | 'interpretation_and_action';

export interface TeamContextItem {
  id: string; teamId: string; type: TeamContextType; title: string; content: string; source?: string;
  scope: TeamContextScope; status: TeamContextStatus; confidence: number; validFrom?: string; validUntil?: string;
  importance: TeamContextImportance; sensitivity: TeamContextSensitivity; influence: TeamContextInfluence;
  createdBy: string; updatedBy: string; version: number; createdAt: string; updatedAt: string;
}

export interface TeamContextInput {
  type: TeamContextType; title: string; content: string; source?: string; scope?: TeamContextScope;
  status?: TeamContextStatus; confidence?: number; validFrom?: string; validUntil?: string;
  importance?: TeamContextImportance; sensitivity?: TeamContextSensitivity; influence?: TeamContextInfluence;
}

export type SentimentDirection = 'positive' | 'negative' | 'mixed' | 'neutral';
export type EmotionalSignalLabel = 'trust' | 'belonging' | 'energy' | 'safety' | 'frustration' | 'recognition' | 'uncertainty' | 'conflict';
export interface EmotionalSignal { label: EmotionalSignalLabel; direction: SentimentDirection; intensity: number; confidence: number; evidenceIds: string[]; interpretation: string; }
export interface ClimateFinding { title: string; type: 'strength' | 'risk' | 'opportunity' | 'divergence'; severity: 'low' | 'medium' | 'high'; evidence: string[]; confidence: number; }
export interface ActionItem { priority: number; objective: string; actions: string[]; ownerRole: string; horizon: '7d' | '30d' | '90d'; successMetrics: string[]; checkInQuestion: string; risks: string[]; }
/** Alias histórico: el contrato canónico es AIAnalysisResponse. */
/** Contrato legado de prompting; los anÃ¡lisis publicados usan AIAnalysisResponse. */
export interface AIClimateAnalysis { summary: string; emotionalSignals: EmotionalSignal[]; findings: ClimateFinding[]; actionPlan: ActionItem[]; limitations: string[]; needsHumanReview: boolean; sources: string[]; }
export interface QuantitativeQuality { dispersion: number | null; floorCeiling: 'floor' | 'ceiling' | null; }
export interface QuantitativeSection { id: string; name: string; score: number | null; weight: number; n: number; quality?: QuantitativeQuality; }
export interface QuantitativeIndicator { id: string; name: string; score: number | null; n: number; quality?: QuantitativeQuality; }
export interface QualitativeTheme { name: string; frequency: number; sentiment: SentimentDirection; evidenceIds: string[]; }
export interface QualitativeResponse { id: string; question: string; section: string; text: string; }
export interface TeamClimateContext {
  schemaVersion: 'team-climate-context.v1';
  scope: { equipoId: string; instanciaId: string; evaluacionId: string; periodo: string };
  sample: { expected: number; received: number; participation: number };
  quantitative: { globalIndex: number | null; sections: QuantitativeSection[]; indicators: QuantitativeIndicator[] };
  qualitative: { responsesAnalyzed: number; responses: QualitativeResponse[]; themes: QualitativeTheme[]; redactions: number };
  history: Array<{ periodo: string; globalIndex: number; participation: number }>;
  limitations: string[];
  sources: string[];
}
