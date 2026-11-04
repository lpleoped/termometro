import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PRODUCT_NAME } from '@termometro/shared';
import { conectarDB } from './config/db';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import equipoRoutes from './routes/equipo.routes';
import evaluacionRoutes from './routes/evaluacion.routes';
import instanciaRoutes from './routes/instancia.routes';
import respuestaRoutes from './routes/respuesta.routes';
import dashboardRoutes from './routes/dashboard.routes';
import historicoRoutes from './routes/historico.routes';
import accionesRoutes from './routes/acciones.routes';
import aiRoutes from './routes/ai.routes';
import integrationRoutes from './routes/integration.routes';
import teamContextRoutes from './routes/team-context.routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send(`API de ${PRODUCT_NAME} funcionando`);
});

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', equipoRoutes);
app.use('/api', evaluacionRoutes);
app.use('/api', instanciaRoutes);
app.use('/api', respuestaRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', historicoRoutes);
app.use('/api', accionesRoutes);
app.use('/api', aiRoutes);
app.use('/api', integrationRoutes);
app.use('/api', teamContextRoutes);

const iniciarServidor = async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres. En desarrollo ejecutá "npm run setup:dev"; en producción configurá la variable de entorno.');
    if (!process.env.AI_CREDENTIAL_SECRET || process.env.AI_CREDENTIAL_SECRET.length < 32) throw new Error('AI_CREDENTIAL_SECRET debe tener al menos 32 caracteres. En desarrollo ejecutá "npm run setup:dev"; en producción configurá la variable de entorno.');
    console.log('Conectando a MongoDB...');
    await conectarDB();
    console.log('Conectado a MongoDB');

    app.listen(PORT, () => {
      console.log(`Servidor en http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();
