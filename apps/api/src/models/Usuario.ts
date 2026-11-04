import { Schema, model, Document } from 'mongoose';

export interface IUsuario extends Document {
  nombre: string;
  email: string;
  password: string;
  rol: 'lider';
  creadoEn: Date;
}

const UsuarioSchema = new Schema<IUsuario>({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['lider'], default: 'lider' },
  creadoEn: { type: Date, default: Date.now },
});

export const Usuario = model<IUsuario>('Usuario', UsuarioSchema);
