import { Schema, model, Document, Types } from 'mongoose';

export interface IAccionPlan extends Document {
  instanciaEvaluacion: Types.ObjectId;
  descripcion: string;
  autor?: string;
  creadaEn: Date;
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
});

export const AccionPlan = model<IAccionPlan>('AccionPlan', AccionPlanSchema);
