import { Document, Schema, model } from 'mongoose';

export interface IAIAnalysis extends Document {
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

const AIAnalysisSchema = new Schema<IAIAnalysis>({
  userId: { type: String, required: true, index: true },
  providerId: { type: String, required: true },
  instanciaId: { type: String, required: true },
  equipoId: { type: String, required: true },
  evaluacionId: { type: String, required: true },
  providerKind: { type: String, required: true },
  modelName: { type: String, required: true },
  promptVersion: { type: String, required: true },
  schemaVersion: { type: String, required: true },
  datasetHash: { type: String, required: true },
  parameters: { includeHistorico: { type: Boolean, required: true }, contextSchemaVersion: { type: String, required: true } },
  contextItemIds: [{ type: String }],
  historicalMemory: { items: [Schema.Types.Mixed], omittedCount: Number },
  snapshot: { indiceGlobal: { type: Number, default: null }, participacion: { esperada: Number, recibida: Number, porcentaje: Number } },
  result: {
    resumen: { type: String, required: true },
    fortalezas: [{ type: String }],
    alertas: [{ type: String }],
    recomendaciones: [{ type: String }],
    nivelConfianza: { type: Number, min: 0, max: 1, required: true },
    fuentes: [{ type: String }],
    limitations: { type: [String], required: true },
    metadata: { schemaVersion: { type: String, required: true }, promptVersion: { type: String, required: true }, providerKind: { type: String, required: true }, modelName: { type: String, required: true }, datasetHash: { type: String, required: true }, parameters: { includeHistorico: { type: Boolean, required: true }, contextSchemaVersion: { type: String, required: true } } },
    hallazgos: { type: [{ titulo: { type: String, required: true }, tipo: { type: String, required: true }, severidad: { type: String, required: true }, evidenciaIds: { type: [String], required: true }, confianza: { type: Number, min: 0, max: 1, required: true } }], required: true },
    senalesEmocionales: { type: [{ etiqueta: { type: String, required: true }, direccion: { type: String, required: true }, intensidad: { type: Number, min: 0, max: 1, required: true }, confianza: { type: Number, min: 0, max: 1, required: true }, interpretacion: { type: String, required: true }, evidenciaIds: { type: [String], required: true } }], required: true },
    temasRecurrentes: { type: [{ tema: { type: String, required: true }, frecuencia: { type: Number, min: 2, required: true }, interpretacion: { type: String, required: true }, evidenciaIds: { type: [String], required: true } }], required: true },
    fuentesTecnicas: [{ type: String }],
    accionesContextuales: [{ titulo: String, descripcion: String, prioridad: String, alcance: String, hallazgo: String, contextoAplicado: [String], esCondicionPrevia: Boolean, requiereValidacion: Boolean, ownerRole: String, horizon: String, successMetric: String, checkInQuestion: String, evidenceIds: [String] }],
  },
}, { timestamps: { createdAt: 'creadoEn', updatedAt: false } });

export const AIAnalysis = model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
