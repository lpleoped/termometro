import { Schema, model, Document } from 'mongoose';
import type { TipoEvaluacion } from '@termometro/shared';

interface IIndicador {
  id: string;
  texto: string;
  descripcion?: string;
  tipo?: 'cuantitativo' | 'cualitativo';
  direccion?: 'positiva' | 'negativa';
  obligatorio?: boolean;
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
  reglasAlertas?: { umbralAtencion?: number; umbralCritico?: number; variacionMinima?: number };
}

export interface IEvaluacion extends Document {
  titulo: string;
  descripcion?: string;
  version: string;
  tipo: TipoEvaluacion;
  configuracion?: IConfiguracionEvaluacion;
  secciones: ISeccion[];
  creadoPor: string;
  origenCuestionario: 'manual' | 'ia';
  revisionHumana: { estado: 'pendiente' | 'aprobada'; revisadoPor?: string; revisadoEn?: Date };
  createdAt?: Date;
  updatedAt?: Date;
}

const IndicadorSchema = new Schema<IIndicador>({
  id: String,
  texto: String,
  descripcion: String,
  tipo: { type: String, enum: ['cuantitativo', 'cualitativo'], default: 'cuantitativo' },
  direccion: { type: String, enum: ['positiva', 'negativa'], default: 'positiva' },
  obligatorio: { type: Boolean, default: true },
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
    reglasAlertas: { umbralAtencion: Number, umbralCritico: Number, variacionMinima: Number },
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
    origenCuestionario: { type: String, enum: ['manual', 'ia'], default: 'manual' },
    revisionHumana: { estado: { type: String, enum: ['pendiente', 'aprobada'], default: 'aprobada' }, revisadoPor: String, revisadoEn: Date },
  },
  { timestamps: true },
);

export const Evaluacion = model<IEvaluacion>('Evaluacion', EvaluacionSchema);
