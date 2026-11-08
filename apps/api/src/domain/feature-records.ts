import type { AIProviderKind, EstadoAccion, HorizonteAccion, TeamContextType, TeamContextStatus, TeamContextScope, TeamContextImportance, TeamContextSensitivity, TeamContextInfluence } from '@termometro/shared';
export type IntegrationProvider = 'slack' | 'monday';
export type { AIProviderKind, EstadoAccion, HorizonteAccion } from '@termometro/shared';
export interface FeatureRecord { _id: string; __v?: number; }
export interface IAIProvider extends FeatureRecord {
  userId: string;
  name: string;
  kind: AIProviderKind;
  endpoint: string;
  modelName: string;
  encryptedApiKey?: string;
  status: 'active' | 'invalid' | 'unverified';
  checkVersion?: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface IAIAnalysis extends FeatureRecord {
  userId: string;
  providerId: string;
  instanciaId: string;
  equipoId: string;
  evaluacionId: string;
  providerKind: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  datasetHash: string;
  parameters: { includeHistorico: boolean; contextSchemaVersion: string };
  contextItemIds: string[];
  historicalMemory?: { items: unknown[]; omittedCount: number };
  snapshot?: { indiceGlobal: number | null; participacion: { esperada: number; recibida: number; porcentaje: number } };
  result: {
    resumen: string;
    fortalezas: string[];
    alertas: string[];
    recomendaciones: string[];
    nivelConfianza: number;
    fuentes: string[];
    limitations: string[];
    metadata: { schemaVersion: string; promptVersion: string; providerKind: string; modelName: string; datasetHash: string; parameters: { includeHistorico: boolean; contextSchemaVersion: string } };
    fuentesTecnicas?: string[];
    hallazgos: Array<{ titulo: string; tipo: string; severidad: string; evidenciaIds: string[]; confianza: number }>;
    senalesEmocionales: Array<{ etiqueta: string; direccion: string; intensidad: number; confianza: number; interpretacion: string; evidenciaIds: string[] }>;
    temasRecurrentes: Array<{ tema: string; frecuencia: number; interpretacion: string; evidenciaIds: string[] }>;
    accionesContextuales?: Array<{ titulo: string; descripcion: string; prioridad: string; alcance: string; hallazgo?: string; contextoAplicado?: string[]; esCondicionPrevia?: boolean; requiereValidacion: boolean; ownerRole: string; horizon: string; successMetric: string; checkInQuestion: string; evidenceIds: string[] }>;
  };
  creadoEn: Date;
}

export interface IAccionPlan extends FeatureRecord {
  instanciaEvaluacion: string;
  descripcion: string;
  autor?: string;
  creadaEn: Date;
  estado: EstadoAccion;
  hallazgoId?: string;
  analisisId?: string;
  propuestaIndice?: number;
  propuestaOriginal?: string;
  adaptadaDe?: string;
  evidenciaIds: string[];
  ownerRole: string;
  horizon: HorizonteAccion;
  successMetric: string;
  checkInQuestion: string;
  aprobadaPor?: string;
  aprobadaEn?: Date;
  ejecutadaEn?: Date;
  verificadaEn?: Date;
  checkIns: Array<{ horizonte: HorizonteAccion; venceEn: Date; estado: 'pendiente' | 'completado'; nota?: string; completadoEn?: Date; resultado?: { indiceAnterior?: number; indicePosterior?: number; delta?: number } }>;
  resultado?: { indiceAnterior?: number; indicePosterior?: number; delta?: number; medidoEn?: Date; interpretacion?: string };
  integraciones?: Array<{ provider: 'slack' | 'monday'; externalId?: string; url?: string; status: 'published' | 'error'; error?: string; publishedAt: Date }>;
}

export interface ITeamContextItem extends FeatureRecord {
  teamId: string; type: TeamContextType; title: string; content: string; source?: string;
  scope: TeamContextScope; status: TeamContextStatus; confidence: number; importance: TeamContextImportance; sensitivity: TeamContextSensitivity; influence: TeamContextInfluence; validFrom?: Date; validUntil?: Date;
  createdBy: string; updatedBy: string; version: number; createdAt: Date; updatedAt: Date;
}

export interface IIntegrationConnection extends FeatureRecord {
  userId: string;
  provider: IntegrationProvider;
  name: string;
  status: 'active' | 'invalid';
  secret: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeamIntegrationSettings extends FeatureRecord {
  userId: string;
  equipoId: string;
  slackConnectionId?: string;
  mondayConnectionId?: string;
  mondayBoardId?: string;
}
export interface AISettingsRecord extends FeatureRecord {
  userId: string;
  enabled: boolean;
  defaultProviderId: string | null;
  budgetPreset?: 'pequeño' | 'estándar' | 'grande' | 'muy-grande' | 'sin-límite';
}
export interface FeatureRecords {
 aiProviders: IAIProvider; aiSettings: AISettingsRecord; aiAnalyses: IAIAnalysis;
 accionesPlan: IAccionPlan; teamContextItems: ITeamContextItem;
 integrationConnections: IIntegrationConnection; teamIntegrationSettings: ITeamIntegrationSettings;
}
export type FeatureCollection = keyof FeatureRecords;
export const validRecordId = (id: unknown): id is string => typeof id === 'string' && (/^[a-f\d]{24}$/i.test(id) || /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id));

