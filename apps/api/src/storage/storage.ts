export const LEGACY_COLLECTIONS = ['usuarios', 'equipos', 'evaluaciones', 'instancias', 'respuestas'] as const;
export const FEATURE_COLLECTIONS = ['aiProviders', 'aiSettings', 'aiAnalyses', 'accionesPlan', 'teamContextItems', 'integrationConnections', 'teamIntegrationSettings'] as const;
export const LOCAL_COLLECTIONS = [...LEGACY_COLLECTIONS, ...FEATURE_COLLECTIONS] as const;
export type LocalCollection = (typeof LOCAL_COLLECTIONS)[number];
export interface StoredRecord { _id: string; }

/** Contrato mínimo que desacopla los servicios del formato físico local. */
export interface StorageAdapter {
  initialize(): void;
  list<T extends StoredRecord>(collection: LocalCollection): T[];
  get<T extends StoredRecord>(collection: LocalCollection, id: string): T | null;
  save<T extends StoredRecord>(collection: LocalCollection, row: T): T;
  delete(collection: LocalCollection, predicate: (row: StoredRecord) => boolean): number;
}

export interface PortableCollection {
  schemaVersion: number;
  collection: LocalCollection;
  records: StoredRecord[];
}

export interface PortableSnapshot {
  format: 'termometro-de-equipo-export';
  formatVersion: 1 | 2;
  createdAt: string;
  collections: Record<LocalCollection, PortableCollection>;
  checksums: Record<LocalCollection, string>;
}
