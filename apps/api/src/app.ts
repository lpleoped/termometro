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

const iniciarServidor = async () => {
  try {
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
