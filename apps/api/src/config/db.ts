import mongoose from 'mongoose';
import { registrarError } from '../observability/errores';

export const conectarDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/termometro-de-equipo';
  try {
    await mongoose.connect(uri);
  } catch (error) {
    registrarError('persistencia', error, { accion: 'conectar' });
    throw error;
  }
};

export const estadoMongo = (): 'connected' | 'disconnected' =>
  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
