import mongoose from 'mongoose';

export const conectarDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/termometro-de-equipo';
  await mongoose.connect(uri);
};

export const estadoMongo = (): 'connected' | 'disconnected' =>
  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
