import { Schema, model, Document, Types } from 'mongoose';

export interface IInstanciaEvaluacion extends Document {
  equipo: Types.ObjectId;
  evaluacion: Types.ObjectId;
  activadoEn: Date;
  estado: 'activa' | 'cerrada' | 'archivada';
  cantidadEsperada: number;
  descripcionLider?: string;
}

const InstanciaEvaluacionSchema = new Schema<IInstanciaEvaluacion>(
  {
    equipo: { type: Schema.Types.ObjectId, ref: 'Equipo', required: true },
    evaluacion: { type: Schema.Types.ObjectId, ref: 'Evaluacion', required: true },
    activadoEn: { type: Date, required: true },
    estado: { type: String, enum: ['activa', 'cerrada', 'archivada'], default: 'activa' },
    cantidadEsperada: { type: Number, required: true },
    descripcionLider: { type: String, default: '' },
  },
  { timestamps: true },
);

export const InstanciaEvaluacion = model<IInstanciaEvaluacion>(
  'InstanciaEvaluacion',
  InstanciaEvaluacionSchema,
);
