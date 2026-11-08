import { Schema, model, Document, Types } from 'mongoose';

export type EstadoAccion = 'generada' | 'en_revision' | 'aprobada' | 'rechazada' | 'ejecutada' | 'verificada';
export type HorizonteAccion = '7d' | '30d' | '90d';

export interface IAccionPlan extends Document {
  instanciaEvaluacion: Types.ObjectId;
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

const AccionPlanSchema = new Schema<IAccionPlan>({
  instanciaEvaluacion: {
    type: Schema.Types.ObjectId,
    ref: 'InstanciaEvaluacion',
    required: true,
  },
  descripcion: { type: String, required: true },
  autor: { type: String, default: '' },
  creadaEn: { type: Date, default: Date.now },
  estado: { type: String, enum: ['generada', 'en_revision', 'aprobada', 'rechazada', 'ejecutada', 'verificada'], default: 'generada', index: true },
  hallazgoId: String,
  analisisId: String,
  propuestaIndice: Number,
  propuestaOriginal: String,
  adaptadaDe: String,
  evidenciaIds: { type: [String], required: true, default: [] },
  ownerRole: { type: String, required: true },
  horizon: { type: String, enum: ['7d', '30d', '90d'], required: true },
  successMetric: { type: String, required: true },
  checkInQuestion: { type: String, required: true },
  aprobadaPor: String,
  aprobadaEn: Date,
  ejecutadaEn: Date,
  verificadaEn: Date,
  checkIns: [{ horizonte: { type: String, enum: ['7d', '30d', '90d'], required: true }, venceEn: { type: Date, required: true }, estado: { type: String, enum: ['pendiente', 'completado'], default: 'pendiente' }, nota: String, completadoEn: Date, resultado: { indiceAnterior: Number, indicePosterior: Number, delta: Number } }],
  resultado: { indiceAnterior: Number, indicePosterior: Number, delta: Number, medidoEn: Date, interpretacion: String },
  integraciones: [{ provider: { type: String, enum: ['slack', 'monday'] }, externalId: String, url: String, status: { type: String, enum: ['published', 'error'] }, error: String, publishedAt: { type: Date, default: Date.now } }],
}, { optimisticConcurrency: true });

export const AccionPlan = model<IAccionPlan>('AccionPlan', AccionPlanSchema);
