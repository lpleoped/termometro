import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { conectarDB } from './config/db';
import { dataDirectory, initializeLocalStorage, isLocalStorage } from './storage/local-store';
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
import installationRoutes from './routes/installation.routes';
import { localManagement } from './middleware/local-management.middleware';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Algunas rondas históricas contienen texto UTF-8 leído previamente como
// Latin-1. Normalizamos únicamente esas secuencias al serializar para que una
// respuesta de la API nunca introduzca caracteres rotos en la interfaz.
const repararTexto = (value: string): string => {
  const cp1252: Record<string, number> = {
    '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
    'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91,
    '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98,
    '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
  };
  const mojibake = /[ÃÂâð](?:[\u0080-\u00ff\u0192\u20ac\u2018-\u2022\u2026\u2030\u2122\u0178])+/g;
  let repaired = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = repaired.replace(mojibake, (fragment) => Buffer.from([...fragment].map((character) => cp1252[character] ?? character.codePointAt(0) ?? 0)).toString('utf8'));
    if (next === repaired) break;
    repaired = next;
  }
  return repaired;
};

const normalizarRespuesta = (value: unknown): unknown => {
  if (typeof value === 'string') return repararTexto(value);
  if (Array.isArray(value)) return value.map(normalizarRespuesta);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizarRespuesta(child)]));
  }
  return value;
};

app.use((_req, res, next) => {
  const jsonOriginal = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (body === undefined) return jsonOriginal(body);
    // toJSON conserva correctamente documentos de Mongoose, fechas e IDs antes
    // de recorrer el contenido textual.
    return jsonOriginal(normalizarRespuesta(JSON.parse(JSON.stringify(body))));
  }) as typeof res.json;
  next();
});

app.use(cors());
app.use('/api', localManagement);
app.use(['/api/backup/restore', '/api/installation/restore'], express.json({ limit: '25mb' }));
app.use(express.json({ limit: '64kb' }));

// La interfaz servida por esta API usa su mismo origen (también en Desktop
// y desde celulares). Vite conserva su configuración de desarrollo.
app.get('/termometro-runtime.js', (_req, res) => {
  res.set('Cache-Control', 'no-store').type('application/javascript')
    .send('window.__TERMOMETRO_API_URL__ = "/api";');
});

app.use('/api', healthRoutes);
app.use('/api', installationRoutes);
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

// En la distribución local un único proceso también entrega la interfaz ya compilada.
// En desarrollo Vite conserva su servidor y proxy habituales.
const webDist = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(path.join(webDist, 'index.html'))) {
  app.use(express.static(webDist));
  app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.status(503).send('No se encontró la interfaz de Termómetro. Reinstalá la aplicación o compilá la web.'));
}

const iniciarServidor = async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres. En desarrollo ejecutá "npm run setup:dev"; en producción configurá la variable de entorno.');
    if (!process.env.AI_CREDENTIAL_SECRET || process.env.AI_CREDENTIAL_SECRET.length < 32) throw new Error('AI_CREDENTIAL_SECRET debe tener al menos 32 caracteres. En desarrollo ejecutá "npm run setup:dev"; en producción configurá la variable de entorno.');
    if (process.env.NODE_ENV === 'production' && (!process.env.INTEGRATION_ENCRYPTION_KEY || process.env.INTEGRATION_ENCRYPTION_KEY.length < 32)) throw new Error('INTEGRATION_ENCRYPTION_KEY debe tener al menos 32 caracteres en producción.');
    if (isLocalStorage()) {
      initializeLocalStorage();
      console.log(`Almacenamiento local preparado en ${dataDirectory()}`);
    } else {
      console.log('Conectando a MongoDB...');
      await conectarDB();
      console.log('Conectado a MongoDB');
    }

    const host = process.env.LOCAL_NETWORK === 'true' ? '0.0.0.0' : '127.0.0.1';
    app.listen(PORT, host, () => {
      console.log(`Servidor en http://localhost:${PORT}`);
      if (host === '0.0.0.0') console.log('Acceso de red local habilitado; permití el puerto en el firewall si Windows lo solicita.');
      console.log(`Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
};

iniciarServidor();
