import { Schema, model, Document, Types } from 'mongoose';

interface IRespuestaIndicador {
  indicadorId: string;
  valor?: number;
  texto?: string;
}

export interface IRespuesta extends Document {
  instanciaEvaluacion: Types.ObjectId;
  respuestas: IRespuestaIndicador[];
  comentariosAbiertos?: {
    mejora?: string;
    satisfaccion?: string;
  };
  respondidoEn: Date;
  identidad?: { nombre?: string; email?: string };
  consentimientoIdentificado?: boolean;
}

const RespuestaSchema = new Schema<IRespuesta>({
  instanciaEvaluacion: {
    type: Schema.Types.ObjectId,
    ref: 'InstanciaEvaluacion',
    required: true,
  },
  respuestas: [
    {
      indicadorId: String,
      valor: Number,
      texto: String,
    },
  ],
  comentariosAbiertos: {
    mejora: String,
    satisfaccion: String,
  },
  respondidoEn: { type: Date, default: Date.now },
  identidad: { nombre: String, email: String },
  consentimientoIdentificado: { type: Boolean, default: false },
});

export const Respuesta = model<IRespuesta>('Respuesta', RespuestaSchema);
