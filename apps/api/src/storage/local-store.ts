import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { JsonStorage } from './json-storage';
import type { LocalCollection, StoredRecord, PortableSnapshot } from './storage';

export type { LocalCollection } from './storage';
export const isLocalStorage = () => process.env.STORAGE_DRIVER === 'json';

export const dataDirectory = () => process.env.TERMOMETRO_DATA_DIR
  || path.join(process.env.APPDATA || path.join(os.homedir(), '.local', 'share'), 'TermometroDeEquipo', 'data');

// La instancia se crea bajo demanda para respetar dotenv y directorios de tests.
const adapter = () => new JsonStorage(dataDirectory());

export const localId = () => crypto.randomUUID();
export const localNow = () => new Date().toISOString();

export const listLocal = <T extends StoredRecord>(collection: LocalCollection): T[] => adapter().list<T>(collection);
export const getLocal = <T extends StoredRecord>(collection: LocalCollection, id: string): T | null => adapter().get<T>(collection, id);
export const saveLocal = <T extends StoredRecord>(collection: LocalCollection, row: T): T => adapter().save(collection, row);
export const deleteLocal = (collection: LocalCollection, predicate: (row: any) => boolean): number => adapter().delete(collection, predicate);
export const initializeLocalStorage = () => adapter().initialize();
export const exportLocalSnapshot = (): PortableSnapshot => adapter().exportSnapshot();
export const previewLocalImport = (snapshot: unknown) => adapter().previewImport(snapshot);
export const importLocalSnapshot = (snapshot: unknown) => adapter().importSnapshot(snapshot);
