import { AccionPlan } from '../models/AccionPlan';
import { AIAnalysis } from '../models/AIAnalysis';
import { AIProvider } from '../models/AIProvider';
import { AISettingsModel } from '../models/AISettings';
import { Equipo } from '../models/Equipo';
import { Evaluacion } from '../models/Evaluacion';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { IntegrationConnection } from '../models/IntegrationConnection';
import { Respuesta } from '../models/Respuesta';
import { TeamContextItem } from '../models/TeamContextItem';
import { TeamIntegrationSettings } from '../models/TeamIntegrationSettings';
import { Usuario } from '../models/Usuario';
import { JsonStorage } from '../storage/json-storage';
import { LOCAL_COLLECTIONS, type LocalCollection, type StoredRecord } from '../storage/storage';

export type DeleteMode = 'mongo' | 'local';

export type DeleteSummary = {
  email: string;
  dryRun: boolean;
  collections: Record<string, number>;
};

const MONGO_COLLECTIONS = [
  'usuarios', 'equipos', 'evaluaciones', 'instanciasEvaluacion', 'respuestas',
  'accionesPlan', 'teamContextItems', 'teamIntegrationSettings', 'aiAnalyses',
  'aiProviders', 'aiSettings', 'integrationConnections',
] as const;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
const idOf = (value: unknown) => String(value ?? '');
const localMatch = (value: unknown, expected: string) => idOf(value) === expected;

const emptySummary = (email: string, dryRun: boolean, collections: readonly string[]): DeleteSummary => ({
  email,
  dryRun,
  collections: Object.fromEntries(collections.map((name) => [name, 0])),
});

const add = (summary: DeleteSummary, collection: string, count: number) => {
  summary.collections[collection] = count;
};

/** Deletes one account and its owned data. It never deletes data owned by another user. */
export const eliminarUsuarioMongo = async (email: string, dryRun = false): Promise<DeleteSummary> => {
  const normalizedEmail = normalizeEmail(email);
  const summary = emptySummary(normalizedEmail, dryRun, MONGO_COLLECTIONS);
  const usuario = await Usuario.findOne({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } }).lean();
  if (!usuario) return summary;

  const userId = String(usuario._id);
  const [equipos, evaluaciones] = await Promise.all([
    Equipo.find({ creadoPor: usuario._id }).select('_id').lean(),
    Evaluacion.find({ creadoPor: userId }).select('_id').lean(),
  ]);
  const equipoIds = equipos.map((item) => item._id);
  const evaluacionIds = evaluaciones.map((item) => item._id);
  const instancias = await InstanciaEvaluacion.find({
    $or: [
      ...(equipoIds.length ? [{ equipo: { $in: equipoIds } }] : []),
      ...(evaluacionIds.length ? [{ evaluacion: { $in: evaluacionIds } }] : []),
    ],
  }).select('_id').lean();
  const instanciaIds = instancias.map((item) => item._id);

  add(summary, 'usuarios', 1);
  add(summary, 'equipos', equipos.length);
  add(summary, 'evaluaciones', evaluaciones.length);
  add(summary, 'instanciasEvaluacion', instancias.length);
  const [respuestas, acciones, contextos, settingsEquipo, analisis, providers, settingsIA, conexiones] = await Promise.all([
    Respuesta.countDocuments({ instanciaEvaluacion: { $in: instanciaIds } }),
    AccionPlan.countDocuments({ instanciaEvaluacion: { $in: instanciaIds } }),
    TeamContextItem.countDocuments({ teamId: { $in: equipoIds } }),
    TeamIntegrationSettings.countDocuments({ userId }),
    AIAnalysis.countDocuments({ userId }),
    AIProvider.countDocuments({ userId }),
    AISettingsModel.countDocuments({ userId }),
    IntegrationConnection.countDocuments({ userId }),
  ]);
  add(summary, 'respuestas', respuestas);
  add(summary, 'accionesPlan', acciones);
  add(summary, 'teamContextItems', contextos);
  add(summary, 'teamIntegrationSettings', settingsEquipo);
  add(summary, 'aiAnalyses', analisis);
  add(summary, 'aiProviders', providers);
  add(summary, 'aiSettings', settingsIA);
  add(summary, 'integrationConnections', conexiones);
  if (dryRun) return summary;

  await Promise.all([
    Respuesta.deleteMany({ instanciaEvaluacion: { $in: instanciaIds } }),
    AccionPlan.deleteMany({ instanciaEvaluacion: { $in: instanciaIds } }),
    TeamContextItem.deleteMany({ teamId: { $in: equipoIds } }),
    TeamIntegrationSettings.deleteMany({ userId }),
    AIAnalysis.deleteMany({ userId }),
    AIProvider.deleteMany({ userId }),
    AISettingsModel.deleteMany({ userId }),
    IntegrationConnection.deleteMany({ userId }),
    InstanciaEvaluacion.deleteMany({ _id: { $in: instanciaIds } }),
    Equipo.deleteMany({ creadoPor: usuario._id }),
    Evaluacion.deleteMany({ creadoPor: userId }),
    Usuario.deleteOne({ _id: usuario._id }),
  ]);
  return summary;
};

type LocalRow = StoredRecord & Record<string, unknown>;

/** Deletes from the JSON data directory used by STORAGE_DRIVER=json / Desktop. */
export const eliminarUsuarioLocal = async (dataDirectory: string, email: string, dryRun = false): Promise<DeleteSummary> => {
  const storage = new JsonStorage(dataDirectory);
  storage.initialize();
  const normalizedEmail = normalizeEmail(email);
  const summary = emptySummary(normalizedEmail, dryRun, LOCAL_COLLECTIONS);
  const user = storage.list<LocalRow>('usuarios').find((row) => normalizeEmail(String(row.email ?? '')) === normalizedEmail);
  if (!user) return summary;

  const userId = idOf(user._id);
  const equipos = storage.list<LocalRow>('equipos').filter((row) => localMatch(row.creadoPor, userId));
  const equipoIds = new Set(equipos.map((row) => idOf(row._id)));
  const evaluaciones = storage.list<LocalRow>('evaluaciones').filter((row) => localMatch(row.creadoPor, userId));
  const evaluacionIds = new Set(evaluaciones.map((row) => idOf(row._id)));
  const instancias = storage.list<LocalRow>('instancias').filter(
    (row) => equipoIds.has(idOf(row.equipo)) || evaluacionIds.has(idOf(row.evaluacion)),
  );
  const instanciaIds = new Set(instancias.map((row) => idOf(row._id)));

  const owned: Record<LocalCollection, (row: LocalRow) => boolean> = {
    usuarios: (row) => idOf(row._id) === userId,
    equipos: (row) => equipoIds.has(idOf(row._id)),
    evaluaciones: (row) => evaluacionIds.has(idOf(row._id)),
    instancias: (row) => instanciaIds.has(idOf(row._id)),
    respuestas: (row) => instanciaIds.has(idOf(row.instanciaEvaluacion)),
    accionesPlan: (row) => instanciaIds.has(idOf(row.instanciaEvaluacion)),
    teamContextItems: (row) => equipoIds.has(idOf(row.teamId)),
    teamIntegrationSettings: (row) => localMatch(row.userId, userId),
    aiAnalyses: (row) => localMatch(row.userId, userId),
    aiProviders: (row) => localMatch(row.userId, userId),
    aiSettings: (row) => localMatch(row.userId, userId),
    integrationConnections: (row) => localMatch(row.userId, userId),
  };

  for (const collection of LOCAL_COLLECTIONS) {
    add(summary, collection, storage.list<LocalRow>(collection).filter(owned[collection]).length);
  }
  if (dryRun) return summary;

  for (const collection of LOCAL_COLLECTIONS) {
    storage.delete(collection, (row) => owned[collection](row as LocalRow));
  }
  return summary;
};

export const validarCorreo = (email: string) => {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('El correo no tiene un formato válido.');
  return normalized;
};
