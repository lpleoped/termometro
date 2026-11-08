import { Usuario } from '../models/Usuario';
import { Equipo } from '../models/Equipo';
import { Evaluacion } from '../models/Evaluacion';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Respuesta } from '../models/Respuesta';
import { isLocalStorage, exportLocalSnapshot, importLocalSnapshot, previewLocalImport } from '../storage/local-store';
import { featureRepository } from './feature.repository';
import { FEATURE_COLLECTIONS, LOCAL_COLLECTIONS, type PortableSnapshot } from '../storage/storage';
import { checksum } from '../storage/json-storage';

export interface InstallationRepository {
  local: boolean;
  hasData(): Promise<boolean>;
  exportOwned(userId: string): Promise<PortableSnapshot>;
  preview(snapshot: unknown): ReturnType<typeof previewLocalImport>;
  restore(snapshot: unknown): void;
}
export const installationRepository = (): InstallationRepository => ({
  local: isLocalStorage(),
  async hasData() {
    if (!isLocalStorage()) return true;
    return Object.values(exportLocalSnapshot().collections).some(collection => collection.records.length > 0);
  },
  async exportOwned(userId) {
    if (isLocalStorage()) return exportLocalSnapshot();
    const users = await Usuario.find({ _id: userId }).lean();
    const teams = await Equipo.find({ creadoPor: userId }).lean();
    const evaluations = await Evaluacion.find({ creadoPor: userId }).lean();
    const rounds = await InstanciaEvaluacion.find({ evaluacion: { $in: evaluations.map(row => row._id) } }).lean();
    const roundIds = rounds.map(row => String(row._id));
    const responses = await Respuesta.find({ instanciaEvaluacion: { $in: roundIds } }).lean();
    const rows: Record<string, unknown[]> = { usuarios: users, equipos: teams, evaluaciones: evaluations, instancias: rounds, respuestas: responses };
    for (const collection of FEATURE_COLLECTIONS) {
      const filter = collection === 'teamContextItems' ? { teamId: teams.map(row => String(row._id)) }
        : collection === 'accionesPlan' ? { instanciaEvaluacion: roundIds } : { userId };
      rows[collection] = await featureRepository(collection).list(filter);
    }
    const snapshot: PortableSnapshot = { format: 'termometro-de-equipo-export', formatVersion: 2, createdAt: new Date().toISOString(), collections: {} as PortableSnapshot['collections'], checksums: {} as PortableSnapshot['checksums'] };
    for (const name of LOCAL_COLLECTIONS) {
      const records = JSON.parse(JSON.stringify(rows[name]));
      snapshot.collections[name] = { schemaVersion: 1, collection: name, records };
      snapshot.checksums[name] = checksum(records);
    }
    return snapshot;
  },
  preview: previewLocalImport,
  restore: importLocalSnapshot,
});
