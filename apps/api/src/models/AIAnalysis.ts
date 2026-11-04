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
  datasetHash: string;
  result: {
    resumen: string;
    fortalezas: string[];
    alertas: string[];
    recomendaciones: string[];
    nivelConfianza: number;
    fuentes: string[];
    emotionalSignals?: unknown[];
    findings?: unknown[];
    actionPlan?: unknown[];
    limitations?: string[];
    needsHumanReview?: boolean;
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
  datasetHash: { type: String, required: true },
  result: {
    resumen: { type: String, required: true },
    fortalezas: [{ type: String }],
    alertas: [{ type: String }],
    recomendaciones: [{ type: String }],
    nivelConfianza: { type: Number, min: 0, max: 1, required: true },
    fuentes: [{ type: String }],
    emotionalSignals: [{ type: Schema.Types.Mixed }],
    findings: [{ type: Schema.Types.Mixed }],
    actionPlan: [{ type: Schema.Types.Mixed }],
    limitations: [{ type: String }],
    needsHumanReview: { type: Boolean, default: false },
  },
}, { timestamps: { createdAt: 'creadoEn', updatedAt: false } });

export const AIAnalysis = model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
