import { Schema, model, Document, Types } from 'mongoose';

export interface IInstanciaEvaluacion extends Document {
  equipo?: Types.ObjectId;
  alcance: 'equipo' | 'persona' | 'individual';
  evaluadoNombre?: string;
  evaluacion: Types.ObjectId;
  activadoEn: Date;
  estado: 'activa' | 'cerrada' | 'archivada';
  cantidadEsperada: number;
  descripcionLider?: string;
  modoRespuesta: 'anonima' | 'identificada';
  minimoAnonimato: number;
  tokenPublico?: string;
}

const InstanciaEvaluacionSchema = new Schema<IInstanciaEvaluacion>(
  {
    equipo: { type: Schema.Types.ObjectId, ref: 'Equipo' },
    alcance: { type: String, enum: ['equipo', 'persona', 'individual'], default: 'equipo' },
    evaluadoNombre: { type: String, default: '' },
    evaluacion: { type: Schema.Types.ObjectId, ref: 'Evaluacion', required: true },
    activadoEn: { type: Date, required: true },
    estado: { type: String, enum: ['activa', 'cerrada', 'archivada'], default: 'activa' },
    cantidadEsperada: { type: Number, required: true },
    descripcionLider: { type: String, default: '' },
    modoRespuesta: { type: String, enum: ['anonima', 'identificada'], default: 'anonima' },
    minimoAnonimato: { type: Number, default: 1, min: 1 },
    tokenPublico: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true },
);

export const InstanciaEvaluacion = model<IInstanciaEvaluacion>(
  'InstanciaEvaluacion',
  InstanciaEvaluacionSchema,
);
