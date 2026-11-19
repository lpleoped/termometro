import { Respuesta } from '../models/Respuesta';
import { guardValue } from '../domain/persisted-schemas';
import { isLocalStorage, listLocal, localId, localNow, saveLocal } from '../storage/local-store';
import { resolveMongooseResult, plainRecord } from './mongoose-result';

export interface ResponseRecord {
  _id: string; instanciaEvaluacion: string;
  respuestas: Array<{ indicadorId: string; valor?: number; texto?: string }>;
  comentariosAbiertos?: { mejora?: string; satisfaccion?: string };
  respondidoEn: string | Date; identidad?: { nombre?: string; email?: string };
  consentimientoIdentificado?: boolean;
  idempotencyKey?: string;
}
export type NewResponseRecord = Omit<ResponseRecord, '_id' | 'respondidoEn'>;

export interface ResponseRepository {
  insert(record: NewResponseRecord): Promise<ResponseRecord>;
  findByIdempotency(roundId: string, key: string): Promise<ResponseRecord | null>;
  listByRound(roundId: string): Promise<ResponseRecord[]>;
}

class JsonResponseRepository implements ResponseRepository {
  async insert(record: NewResponseRecord) { return saveLocal('respuestas', { ...record, _id: localId(), respondidoEn: localNow() }); }
  async findByIdempotency(roundId: string, key: string) { return listLocal<ResponseRecord>('respuestas').find(item => item.instanciaEvaluacion === roundId && item.idempotencyKey === key) || null; }
  async listByRound(roundId: string) { return listLocal<ResponseRecord>('respuestas').filter(item => item.instanciaEvaluacion === roundId); }
}
class MongoResponseRepository implements ResponseRepository {
  async insert(record: NewResponseRecord) { return guardValue('respuestas', plainRecord<ResponseRecord>(await new Respuesta(record).save())); }
  async findByIdempotency(roundId: string, key: string) { return guardValue('respuestas', await resolveMongooseResult<ResponseRecord | null>(Respuesta.findOne({ instanciaEvaluacion: roundId, idempotencyKey: key }))); }
  async listByRound(roundId: string) { return guardValue('respuestas', await resolveMongooseResult<ResponseRecord[]>(Respuesta.find({ instanciaEvaluacion: roundId }))); }
}

export const responseRepository = (): ResponseRepository => isLocalStorage() ? new JsonResponseRepository() : new MongoResponseRepository();
