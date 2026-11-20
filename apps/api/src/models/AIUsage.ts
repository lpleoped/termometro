import { Schema, model } from 'mongoose';

const schema = new Schema({
  userId: { type: String, required: true, index: true },
  schemaVersion: { type: Number, required: true, default: 1 },
  motivo: { type: String, required: true, enum: ['prueba', 'cuestionario', 'lectura', 'tono'] },
  modelo: { type: String, required: true, maxlength: 200 },
  tokensEntrada: { type: Number, default: null },
  tokensSalida: { type: Number, default: null },
  costoEstimado: { type: Number, default: null },
  fecha: { type: Date, required: true },
}, { collection: 'aiUsages' });

schema.index({ userId: 1, fecha: -1 });

export const AIUsage = model('AIUsage', schema);
