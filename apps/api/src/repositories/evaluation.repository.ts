import { Evaluacion } from '../models/Evaluacion';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Respuesta } from '../models/Respuesta';
import { AccionPlan } from '../models/AccionPlan';
import { AIAnalysis } from '../models/AIAnalysis';
import { deleteLocal, getLocal, isLocalStorage, listLocal, localId, localNow, saveLocal } from '../storage/local-store';
import { resolveMongooseResult, plainRecord } from './mongoose-result';

export interface EvaluationRecord {
  _id: string;
  titulo: string;
  descripcion?: string;
  version: string;
  tipo: 'CUSTOM';
  configuracion?: Record<string, unknown>;
  secciones: Array<Record<string, any>>;
  creadoPor: string;
  origenCuestionario?: 'manual' | 'ia';
  revisionHumana?: Record<string, unknown>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type NewEvaluationRecord = Omit<EvaluationRecord, '_id' | 'createdAt' | 'updatedAt'>;

export interface EvaluationRepository {
  findById(id: string): Promise<EvaluationRecord | null>;
  listByOwner(userId: string): Promise<EvaluationRecord[]>;
  listVersions(title: string, userId: string): Promise<EvaluationRecord[]>;
  insert(record: NewEvaluationRecord): Promise<EvaluationRecord>;
  deleteWithRounds(id: string): Promise<void>;
}

class JsonEvaluationRepository implements EvaluationRepository {
  async findById(id: string) { return getLocal<EvaluationRecord>('evaluaciones', id); }
  async listByOwner(userId: string) { return listLocal<EvaluationRecord>('evaluaciones').filter(item => item.creadoPor === userId); }
  async listVersions(title: string, userId: string) {
    return listLocal<EvaluationRecord>('evaluaciones').filter(item => item.titulo === title && item.creadoPor === userId);
  }
  async insert(record: NewEvaluationRecord) {
    const now = localNow();
    return saveLocal('evaluaciones', { ...record, _id: localId(), createdAt: now, updatedAt: now });
  }
  async deleteWithRounds(id: string) {
    const roundIds = new Set(listLocal<any>('instancias').filter(item => item.evaluacion === id).map(item => item._id));
    deleteLocal('respuestas', row => roundIds.has(row.instanciaEvaluacion));
    deleteLocal('accionesPlan', row => roundIds.has(row.instanciaEvaluacion));
    deleteLocal('aiAnalyses', row => roundIds.has(row.instanciaId));
    deleteLocal('instancias', row => row.evaluacion === id);
    deleteLocal('evaluaciones', row => row._id === id);
  }
}

class MongoEvaluationRepository implements EvaluationRepository {
  async findById(id: string) { return resolveMongooseResult<EvaluationRecord | null>(Evaluacion.findById(id)); }
  async listByOwner(userId: string) { return resolveMongooseResult<EvaluationRecord[]>(Evaluacion.find({ creadoPor: userId })); }
  async listVersions(title: string, userId: string) {
    return resolveMongooseResult<EvaluationRecord[]>(Evaluacion.find({ titulo: title, creadoPor: userId }));
  }
  async insert(record: NewEvaluationRecord) {
    const saved = await new Evaluacion(record).save();
    return plainRecord<EvaluationRecord>(saved);
  }
  async deleteWithRounds(id: string) {
    const rounds = await InstanciaEvaluacion.find({ evaluacion: id }).select('_id').lean();
    const roundIds = rounds.map(round => round._id);
    await Respuesta.deleteMany({ instanciaEvaluacion: { $in: roundIds } });
    await AccionPlan.deleteMany({ instanciaEvaluacion: { $in: roundIds } });
    await AIAnalysis.deleteMany({ instanciaId: { $in: roundIds.map(String) } });
    await InstanciaEvaluacion.deleteMany({ evaluacion: id });
    await Evaluacion.deleteOne({ _id: id });
  }
}

export const evaluationRepository = (): EvaluationRepository => isLocalStorage()
  ? new JsonEvaluationRepository()
  : new MongoEvaluationRepository();
