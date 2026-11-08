import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { LOCAL_COLLECTIONS, FEATURE_COLLECTIONS, type LocalCollection, type StorageAdapter, type StoredRecord, type PortableSnapshot } from './storage';
import { validateRecord } from './record-validation';
import { migrateCollection } from './migrations';

const FORMAT_VERSION = 1;
const MAX_BACKUPS = 5;
const STALE_LOCK_MS = 30_000;

export const CURRENT_FORMAT_VERSION = FORMAT_VERSION;

import { checksum } from '../domain/portable-backup';
export { checksum } from '../domain/portable-backup';

interface CollectionDocument {
  schemaVersion: typeof FORMAT_VERSION;
  collection: LocalCollection;
  records: StoredRecord[];
}

const assertRows = (value: unknown, collection: LocalCollection): StoredRecord[] => {
  if (!Array.isArray(value)) throw new Error(`El archivo local ${collection}.json tiene un formato inválido.`);
  for (const [index, row] of value.entries()) {
    validateRecord(collection, row as StoredRecord, index);
  }
  return value as StoredRecord[];
};

const parseDocument = (value: unknown, collection: LocalCollection): StoredRecord[] => {
  // Formato legado de la primera iteración: un array sin sobre versionado.
  if (Array.isArray(value)) return assertRows(migrateCollection(collection, 0, value as StoredRecord[], FORMAT_VERSION), collection);
  if (!value || typeof value !== 'object') throw new Error(`El archivo local ${collection}.json tiene un formato inválido.`);
  const document = value as Partial<CollectionDocument>;
  if (document.schemaVersion !== FORMAT_VERSION) throw new Error(`La versión de ${collection}.json no está soportada: ${String(document.schemaVersion)}.`);
  if (document.collection !== collection) throw new Error(`El archivo ${collection}.json declara una colección diferente.`);
  return assertRows(document.records, collection);
};

export class JsonStorage implements StorageAdapter {
  constructor(readonly directory: string) {}
  private fileFor(collection: LocalCollection) { return path.join(this.directory, `${collection}.json`); }
  private backupDirectory() { return path.join(this.directory, 'backups'); }
  private lockFile(collection: LocalCollection) { return path.join(this.directory, `.${collection}.lock`); }
  private ensureDirectory() {
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    fs.mkdirSync(this.backupDirectory(), { recursive: true, mode: 0o700 });
  }
  private read<T extends StoredRecord>(collection: LocalCollection): T[] {
    this.ensureDirectory();
    const file = this.fileFor(collection);
    if (!fs.existsSync(file)) return [];
    try { return parseDocument(JSON.parse(fs.readFileSync(file, 'utf8')), collection) as T[]; }
    catch (error) {
      if (error instanceof SyntaxError) throw new Error(`El archivo local ${collection}.json no contiene JSON válido.`);
      throw error;
    }
  }
  private acquireLock(collection: LocalCollection): () => void {
    this.ensureDirectory();
    const lock = this.lockFile(collection);
    try {
      const descriptor = fs.openSync(lock, 'wx', 0o600);
      fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      fs.closeSync(descriptor);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const age = Date.now() - fs.statSync(lock).mtimeMs;
      if (age > STALE_LOCK_MS) { fs.unlinkSync(lock); return this.acquireLock(collection); }
      throw new Error(`La colección ${collection} está siendo escrita por otro proceso. Intentá nuevamente.`);
    }
    return () => { try { fs.unlinkSync(lock); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } };
  }
  private backup(collection: LocalCollection, file: string) {
    if (!fs.existsSync(file)) return;
    const backup = path.join(this.backupDirectory(), `${collection}-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}.json`);
    fs.copyFileSync(file, backup);
    const previous = fs.readdirSync(this.backupDirectory()).filter(name => name.startsWith(`${collection}-`)).sort();
    for (const name of previous.slice(0, -MAX_BACKUPS)) fs.unlinkSync(path.join(this.backupDirectory(), name));
  }
  private write<T extends StoredRecord>(collection: LocalCollection, rows: T[]) {
    assertRows(rows, collection);
    const release = this.acquireLock(collection);
    const file = this.fileFor(collection);
    const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      this.backup(collection, file);
      const document: CollectionDocument = { schemaVersion: FORMAT_VERSION, collection, records: rows };
      fs.writeFileSync(temporary, JSON.stringify(document, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      release();
    }
  }
  initialize() {
    this.ensureDirectory();
    const manifest = path.join(this.directory, 'manifest.json');
    const existing = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : null;
    if (existing && ![1, 2].includes(existing.formatVersion)) throw new Error('Los datos pertenecen a una versión más nueva. Instalá una versión compatible; tus datos no fueron modificados.');
    for (const collection of LOCAL_COLLECTIONS) {
      if (!fs.existsSync(this.fileFor(collection))) this.write(collection, []);
      else this.read(collection); // Fail before starting on a newer/invalid schema.
    }
    if (!existing || existing.formatVersion === 1) {
      if (existing) fs.copyFileSync(manifest, path.join(this.directory, 'manifest.v1.bak'));
      const temporary = manifest + '.tmp';
      fs.writeFileSync(temporary, JSON.stringify({ schemaVersion: 1, formatVersion: 2, createdAt: existing?.createdAt || new Date().toISOString(), storage: 'json', collections: Object.fromEntries(LOCAL_COLLECTIONS.map(name => [name, FORMAT_VERSION])) }, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(temporary, manifest);
    }
  }

  exportSnapshot(): PortableSnapshot {
    this.initialize();
    const collections = Object.fromEntries(LOCAL_COLLECTIONS.map((collection) => {
      const records = this.read(collection);
      return [collection, { schemaVersion: FORMAT_VERSION, collection, records }];
    })) as PortableSnapshot['collections'];
    return {
      format: 'termometro-de-equipo-export', formatVersion: 2,
      createdAt: new Date().toISOString(), collections,
      checksums: Object.fromEntries(LOCAL_COLLECTIONS.map((collection) => [collection, checksum(collections[collection].records)])) as PortableSnapshot['checksums'],
    };
  }

  previewImport(snapshot: unknown) {
    const candidate = this.validateSnapshot(snapshot);
    return { createdAt: candidate.createdAt, collections: Object.fromEntries(LOCAL_COLLECTIONS.map((name) => [name, candidate.collections[name].records.length])) };
  }

  importSnapshot(snapshot: unknown): void {
    const candidate = this.validateSnapshot(snapshot);
    // Stage the complete store before exchanging directories. Never restore
    // half a set of collections. Keep the previous directory as recovery backup.
    fs.mkdirSync(path.dirname(this.directory), { recursive: true });
    const staging = fs.mkdtempSync(this.directory + '.restore-');
    const target = new JsonStorage(staging);
    for (const collection of LOCAL_COLLECTIONS) target.write(collection, candidate.collections[collection].records);
    target.initialize();
    const previous = this.directory + '.before-restore-' + crypto.randomUUID();
    const existed = fs.existsSync(this.directory);
    if (existed) fs.renameSync(this.directory, previous);
    try { fs.renameSync(staging, this.directory); }
    catch (error) { if (existed) fs.renameSync(previous, this.directory); throw error; }
  }

  private validateSnapshot(value: unknown): PortableSnapshot {
    if (!value || typeof value !== 'object') throw new Error('La exportación no es válida.');
    const candidate = structuredClone(value) as Partial<PortableSnapshot>;
    if (candidate.format !== 'termometro-de-equipo-export' || ![1, 2].includes(candidate.formatVersion!) || !candidate.collections || !candidate.checksums) throw new Error('La exportación no es compatible.');
    // Explicit v1 → v2 migration: old backups had only the five core entities.
    if (candidate.formatVersion === 1) {
      for (const name of FEATURE_COLLECTIONS) if (!candidate.collections[name]) {
        candidate.collections[name] = { schemaVersion: 1, collection: name, records: [] };
        candidate.checksums[name] = checksum([]);
      }
      candidate.formatVersion = 2;
    }
    for (const collection of LOCAL_COLLECTIONS) {
      const document = candidate.collections[collection];
      if (!document || document.schemaVersion !== FORMAT_VERSION || document.collection !== collection) throw new Error(`La colección ${collection} no es compatible.`);
      assertRows(document.records, collection);
      if (new Set(document.records.map(row => row._id)).size !== document.records.length) throw new Error('El respaldo tiene identificadores duplicados.');
      if (candidate.checksums[collection] !== checksum(document.records)) throw new Error(`Checksum inválido para ${collection}.`);
    }
    return candidate as PortableSnapshot;
  }
  list<T extends StoredRecord>(collection: LocalCollection): T[] { return this.read<T>(collection); }
  get<T extends StoredRecord>(collection: LocalCollection, id: string): T | null { return this.read<T>(collection).find(row => row._id === String(id)) || null; }
  save<T extends StoredRecord>(collection: LocalCollection, row: T): T {
    const rows = this.read<T>(collection); const index = rows.findIndex(item => item._id === row._id);
    if (index >= 0) rows[index] = row; else rows.push(row);
    this.write(collection, rows); return row;
  }
  delete(collection: LocalCollection, predicate: (row: StoredRecord) => boolean): number {
    const rows = this.read(collection); const kept = rows.filter(row => !predicate(row));
    if (kept.length !== rows.length) this.write(collection, kept);
    return rows.length - kept.length;
  }
}
