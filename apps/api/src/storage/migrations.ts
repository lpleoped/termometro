import type { LocalCollection, StoredRecord } from './storage';

export type CollectionMigration = (records: StoredRecord[]) => StoredRecord[];
const legacyArrayToV1: CollectionMigration = (records) => records;

export const migrateCollection = (collection: LocalCollection, fromVersion: number, records: StoredRecord[], toVersion: number): StoredRecord[] => {
  if (fromVersion > toVersion) throw new Error(`No se puede retroceder ${collection} de v${fromVersion} a v${toVersion}.`);
  let current = records;
  for (let version = fromVersion; version < toVersion; version += 1) {
    if (version === 0) current = legacyArrayToV1(current);
    else throw new Error(`No existe migración de ${collection} v${version} a v${version + 1}.`);
  }
  return current;
};
