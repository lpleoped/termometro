import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { getLocal, isLocalStorage, listLocal, localId, localNow, saveLocal } from '../storage/local-store';
import { resolveMongooseResult, plainRecord } from './mongoose-result';

export interface RoundRecord {
  _id: string; equipo?: string; alcance: 'equipo' | 'persona' | 'individual'; evaluadoNombre?: string;
  evaluacion: string; activadoEn: string | Date; estado: 'activa' | 'cerrada' | 'archivada';
  cantidadEsperada: number; descripcionLider?: string; modoRespuesta: 'anonima' | 'identificada';
  minimoAnonimato: number; createdAt?: string | Date; updatedAt?: string | Date;
  tokenPublico?: string;
}
export type NewRoundRecord = Omit<RoundRecord, '_id' | 'createdAt' | 'updatedAt'>;

export interface RoundRepository {
  findById(id: string): Promise<RoundRecord | null>;
  findByPublicToken(token: string): Promise<RoundRecord | null>;
  insert(record: NewRoundRecord): Promise<RoundRecord>;
  updateState(id: string, estado: RoundRecord['estado']): Promise<RoundRecord | null>;
  listByTeam(teamId: string): Promise<RoundRecord[]>;
  listByTeamAndEvaluation(teamId: string, evaluationId: string): Promise<RoundRecord[]>;
}

class JsonRoundRepository implements RoundRepository {
  async findById(id: string) { return getLocal<RoundRecord>('instancias', id); }
  async findByPublicToken(token: string) { return listLocal<RoundRecord>('instancias').find(item => item.tokenPublico === token) || null; }
  async insert(record: NewRoundRecord) {
    const now = localNow(); return saveLocal('instancias', { ...record, _id: localId(), createdAt: now, updatedAt: now });
  }
  async updateState(id: string, estado: RoundRecord['estado']) {
    const current = getLocal<RoundRecord>('instancias', id); if (!current) return null;
    return saveLocal('instancias', { ...current, estado, updatedAt: localNow() });
  }
  async listByTeam(teamId: string) {
    return listLocal<RoundRecord>('instancias').filter(item => item.equipo === teamId).sort((a, b) => String(b.activadoEn).localeCompare(String(a.activadoEn)));
  }
  async listByTeamAndEvaluation(teamId: string, evaluationId: string) {
    return (await this.listByTeam(teamId)).filter(item => item.evaluacion === evaluationId);
  }
}

class MongoRoundRepository implements RoundRepository {
  async findById(id: string) {
    const query: any = InstanciaEvaluacion.findById(id);
    if (query && typeof query.lean === 'function') return resolveMongooseResult<RoundRecord | null>(query);
    if (query && typeof query.populate === 'function') return await query.populate('equipo').populate('evaluacion') as unknown as RoundRecord;
    return await query as unknown as RoundRecord | null;
  }
  async findByPublicToken(token: string) { return resolveMongooseResult<RoundRecord | null>(InstanciaEvaluacion.findOne({ tokenPublico: token })); }
  async insert(record: NewRoundRecord) { return plainRecord<RoundRecord>(await new InstanciaEvaluacion(record).save()); }
  async listByTeam(teamId: string) {
    return resolveMongooseResult<RoundRecord[]>(InstanciaEvaluacion.find({ equipo: teamId }).sort({ activadoEn: -1 }));
  }
  async listByTeamAndEvaluation(teamId: string, evaluationId: string) {
    return resolveMongooseResult<RoundRecord[]>(InstanciaEvaluacion.find({ equipo: teamId, evaluacion: evaluationId }).sort({ activadoEn: 1 }));
  }
  async updateState(id: string, estado: RoundRecord['estado']) { return resolveMongooseResult<RoundRecord | null>(InstanciaEvaluacion.findByIdAndUpdate(id, { estado }, { new: true })); }
}

export const roundRepository = (): RoundRepository => isLocalStorage() ? new JsonRoundRepository() : new MongoRoundRepository();
