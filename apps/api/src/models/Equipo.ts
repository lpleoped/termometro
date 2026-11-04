import { Schema, model, Types } from 'mongoose';

const equipoSchema = new Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  creadoPor: { type: Types.ObjectId, ref: 'Usuario', required: true },
  miembros: [{ type: String }],
  activo: { type: Boolean, default: true },
  creadoEn: { type: Date, default: Date.now },
});

export const Equipo = model('Equipo', equipoSchema);
