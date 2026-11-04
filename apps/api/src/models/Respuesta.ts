import { Schema, model, Document, Types } from 'mongoose';

interface IRespuestaIndicador {
  indicadorId: string;
  valor: number;
}

export interface IRespuesta extends Document {
  instanciaEvaluacion: Types.ObjectId;
  respuestas: IRespuestaIndicador[];
  comentariosAbiertos?: {
    mejora?: string;
    satisfaccion?: string;
  };
  respondidoEn: Date;
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
    },
  ],
  comentariosAbiertos: {
    mejora: String,
    satisfaccion: String,
  },
  respondidoEn: { type: Date, default: Date.now },
});

export const Respuesta = model<IRespuesta>('Respuesta', RespuestaSchema);
