import { Schema, model, Document } from 'mongoose';
import type { TipoEvaluacion } from '@termometro/shared';

interface IIndicador {
  id: string;
  texto: string;
  descripcion?: string;
}

interface ISeccion {
  titulo: string;
  ponderacion: number;
  indicadores: IIndicador[];
}

interface IConfiguracionEvaluacion {
  maxIndicadores?: number;
  minIndicadores?: number;
  seccionesFijas?: boolean;
  ponderacionAutomatica?: boolean;
}

export interface IEvaluacion extends Document {
  titulo: string;
  descripcion?: string;
  version: string;
  tipo: TipoEvaluacion;
  configuracion?: IConfiguracionEvaluacion;
  secciones: ISeccion[];
  creadoPor: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const IndicadorSchema = new Schema<IIndicador>({
  id: String,
  texto: String,
  descripcion: String,
});

const SeccionSchema = new Schema<ISeccion>({
  titulo: String,
  ponderacion: Number,
  indicadores: [IndicadorSchema],
});

const ConfiguracionEvaluacionSchema = new Schema<IConfiguracionEvaluacion>(
  {
    maxIndicadores: Number,
    minIndicadores: Number,
    seccionesFijas: Boolean,
    ponderacionAutomatica: Boolean,
  },
  { _id: false },
);

const EvaluacionSchema = new Schema<IEvaluacion>(
  {
    titulo: { type: String, required: true },
    descripcion: String,
    version: { type: String, required: true },
    tipo: {
      type: String,
      required: true,
      enum: ['CUSTOM'],
      default: 'CUSTOM',
    },
    configuracion: ConfiguracionEvaluacionSchema,
    secciones: { type: [SeccionSchema], required: true },
    creadoPor: { type: String, required: true },
  },
  { timestamps: true },
);

export const Evaluacion = model<IEvaluacion>('Evaluacion', EvaluacionSchema);
