import { Schema, model, Document, Types } from 'mongoose';

export interface IAccionPlan extends Document {
  instanciaEvaluacion: Types.ObjectId;
  descripcion: string;
  autor?: string;
  creadaEn: Date;
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
  integraciones: [{ provider: { type: String, enum: ['slack', 'monday'] }, externalId: String, url: String, status: { type: String, enum: ['published', 'error'] }, error: String, publishedAt: { type: Date, default: Date.now } }],
});

export const AccionPlan = model<IAccionPlan>('AccionPlan', AccionPlanSchema);
