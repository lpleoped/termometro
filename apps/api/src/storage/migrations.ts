import { checksum } from '../domain/portable-backup';
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

/**
 * Memoria de la acción, compatible con schemaVersion 1.
 * veredictos y learningKey son opcionales: un archivo ya guardado se lee igual.
 * Una lista de veredictos mal formada se descarta. Las notas y los check-ins no se tocan.
 */
/**
 * Uso es una colección nueva. Un respaldo anterior no la trae: se crea vacía.
 * No hay filas viejas que transformar y no se copia ningún prompt.
 */
export const asegurarColeccionUso = (snapshot: { collections?: Record<string, { schemaVersion: number; collection: string; records: unknown[] }>; checksums?: Record<string, string> }) => {
  if (!snapshot.collections || !snapshot.checksums || snapshot.collections.aiUsages) return;
  snapshot.collections.aiUsages = { schemaVersion: 1, collection: 'aiUsages', records: [] };
  snapshot.checksums.aiUsages = checksum([]);
};

const PRESETS_PRESUPUESTO = new Set(['pequeño', 'estándar', 'grande', 'muy-grande', 'sin-límite']);

export const applyMemoriaCompatible = (collection: LocalCollection, records: StoredRecord[]): StoredRecord[] => {
  if (collection === 'aiSettings') {
    return records.map((record) => {
      const preset = (record as { budgetPreset?: unknown }).budgetPreset;
      if (typeof preset === 'string' && PRESETS_PRESUPUESTO.has(preset)) return record;
      return { ...record, budgetPreset: 'estándar' };
    });
  }
  if (collection !== 'accionesPlan') return records;
  return records.map((record) => {
    const row = record as StoredRecord & { veredictos?: unknown };
    if (!('veredictos' in row) || Array.isArray(row.veredictos) || row.veredictos == null) return record;
    const { veredictos: _veredictos, ...resto } = row;
    return resto;
  });
};
