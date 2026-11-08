import type { FeatureCollection, FeatureRecord, FeatureRecords } from '../domain/feature-records';
import { validateFeature } from '../domain/feature-validation';
import { isLocalStorage, listLocal, getLocal, saveLocal, deleteLocal } from '../storage/local-store';
import { AIProvider } from '../models/AIProvider';
import { AISettingsModel } from '../models/AISettings';
import { AIAnalysis } from '../models/AIAnalysis';
import { AccionPlan } from '../models/AccionPlan';
import { TeamContextItem } from '../models/TeamContextItem';
import { IntegrationConnection } from '../models/IntegrationConnection';
import { TeamIntegrationSettings } from '../models/TeamIntegrationSettings';

/** Equality filters only; arrays mean membership. No driver query objects escape. */
export type RecordFilter<T> = Partial<{ [K in keyof T]: T[K] | readonly string[] }>;
export interface FeatureRepository<T extends FeatureRecord> {
  list(filter?: RecordFilter<T>, sort?: Partial<Record<keyof T, 1 | -1>>, limit?: number): Promise<T[]>;
  find(filter: RecordFilter<T>): Promise<T | null>;
  insert(record: T): Promise<T>;
  save(record: T): Promise<T>;
  remove(filter: RecordFilter<T>): Promise<number>;
}
const models = { aiProviders: AIProvider, aiSettings: AISettingsModel, aiAnalyses: AIAnalysis, accionesPlan: AccionPlan, teamContextItems: TeamContextItem, integrationConnections: IntegrationConnection, teamIntegrationSettings: TeamIntegrationSettings };
const dateKeys = new Set(['creadoEn','actualizadoEn','createdAt','updatedAt','creadaEn','aprobadaEn','ejecutadaEn','verificadaEn','venceEn','completadoEn','medidoEn','publishedAt','validFrom','validUntil']);
export const plainFeature = <T>(value: unknown): T => JSON.parse(JSON.stringify(value), (key, child) => dateKeys.has(key) && typeof child === 'string' ? new Date(child) : child);
const matches = <T>(record: T, filter: RecordFilter<T>) => Object.entries(filter).every(([key, expected]) => {
  const actual = (record as Record<string, unknown>)[key];
  return Array.isArray(expected) ? expected.includes(String(actual)) : String(actual) === String(expected);
});

export class JsonFeatureRepository<K extends FeatureCollection> implements FeatureRepository<FeatureRecords[K]> {
  constructor(private collection: K) {}
  async list(filter: RecordFilter<FeatureRecords[K]> = {}, sort: Partial<Record<keyof FeatureRecords[K], 1 | -1>> = {}, limit?: number) {
    const rows = listLocal<FeatureRecords[K]>(this.collection).map(row => plainFeature<FeatureRecords[K]>(row)).filter(row => matches(row, filter));
    rows.sort((a, b) => {
      for (const [key, direction] of Object.entries(sort)) {
        const left = (a as any)[key], right = (b as any)[key];
        const comparison = left < right ? -1 : left > right ? 1 : 0;
        if (comparison) return comparison * Number(direction);
      }
      return 0;
    });
    return limit === undefined ? rows : rows.slice(0, limit);
  }
  async find(filter: RecordFilter<FeatureRecords[K]>) { return (await this.list(filter))[0] || null; }
  async insert(record: FeatureRecords[K]) {
    if (await this.find({ _id: record._id } as RecordFilter<FeatureRecords[K]>)) throw new Error('Registro duplicado');
    return plainFeature<FeatureRecords[K]>(saveLocal(this.collection, { ...record, __v: 0 }));
  }
  async save(record: FeatureRecords[K]) {
    const current = getLocal<FeatureRecords[K]>(this.collection, record._id);
    if (!current || (current.__v || 0) !== (record.__v || 0)) throw new Error('El registro cambió. Recargá antes de guardar.');
    // No await between revision check and the synchronous local write.
    return plainFeature<FeatureRecords[K]>(saveLocal(this.collection, { ...record, __v: (record.__v || 0) + 1 }));
  }
  async remove(filter: RecordFilter<FeatureRecords[K]>) { return deleteLocal(this.collection, row => matches(row, filter)); }
}

export class MongoFeatureRepository<K extends FeatureCollection> implements FeatureRepository<FeatureRecords[K]> {
  constructor(private collection: K) {}
  private model(): any { return models[this.collection]; }
  private query(filter: RecordFilter<FeatureRecords[K]>) { return Object.fromEntries(Object.entries(filter).map(([key, value]) => [key, Array.isArray(value) ? { $in: value } : value])); }
  async list(filter: RecordFilter<FeatureRecords[K]> = {}, sort = {}, limit?: number): Promise<FeatureRecords[K][]> {
    let query = this.model().find(this.query(filter)).sort(sort);
    if (limit !== undefined) query = query.limit(limit);
    return plainFeature(await query.lean());
  }
  async find(filter: RecordFilter<FeatureRecords[K]>): Promise<FeatureRecords[K] | null> { return plainFeature(await this.model().findOne(this.query(filter)).lean()); }
  async insert(record: FeatureRecords[K]): Promise<FeatureRecords[K]> { validateFeature(this.collection, record); return plainFeature(await this.model().create({ ...record, __v: 0 })); }
  async save(record: FeatureRecords[K]): Promise<FeatureRecords[K]> {
    validateFeature(this.collection, record);
    const { _id, __v, ...changes } = record;
    const updated = await this.model().findOneAndUpdate({ _id, __v: __v || 0 }, { $set: changes, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!updated) throw new Error('El registro cambió. Recargá antes de guardar.');
    return plainFeature(updated);
  }
  async remove(filter: RecordFilter<FeatureRecords[K]>) { return (await this.model().deleteMany(this.query(filter))).deletedCount; }
}
export const featureRepository = <K extends FeatureCollection>(collection: K): FeatureRepository<FeatureRecords[K]> =>
  isLocalStorage() ? new JsonFeatureRepository(collection) : new MongoFeatureRepository(collection);
