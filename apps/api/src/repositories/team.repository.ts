import { Equipo } from '../models/Equipo';
import { getLocal, isLocalStorage, listLocal, localId, localNow, saveLocal } from '../storage/local-store';
import { resolveMongooseResult, plainRecord } from './mongoose-result';

export interface TeamRecord {
  _id: string; nombre: string; descripcion?: string; creadoPor: string;
  miembros: string[]; activo: boolean; creadoEn: string | Date;
}

export interface TeamRepository {
  insert(input: Pick<TeamRecord, 'nombre' | 'descripcion' | 'creadoPor'>): Promise<TeamRecord>;
  findById(id: string): Promise<TeamRecord | null>;
  listActiveByOwner(userId: string): Promise<TeamRecord[]>;
  findOwned(id: string, userId: string): Promise<TeamRecord | null>;
  findOwnedActive(id: string, userId: string): Promise<TeamRecord | null>;
  updateOwnedActive(id: string, userId: string, changes: Partial<Pick<TeamRecord, 'nombre' | 'descripcion'>>): Promise<TeamRecord | null>;
  archiveOwnedActive(id: string, userId: string): Promise<TeamRecord | null>;
  addMemberOwnedActive(id: string, userId: string, email: string): Promise<TeamRecord | null>;
  removeMemberOwnedActive(id: string, userId: string, email: string): Promise<TeamRecord | null>;
}

class JsonTeamRepository implements TeamRepository {
  async insert(input: Pick<TeamRecord, 'nombre' | 'descripcion' | 'creadoPor'>) {
    return saveLocal('equipos', { ...input, _id: localId(), miembros: [], activo: true, creadoEn: localNow() });
  }
  async findById(id: string) { return getLocal<TeamRecord>('equipos', id); }
  async listActiveByOwner(userId: string) { return listLocal<TeamRecord>('equipos').filter(row => row.creadoPor === userId && row.activo !== false); }
  async findOwned(id: string, userId: string) { const row = getLocal<TeamRecord>('equipos', id); return row?.creadoPor === userId ? row : null; }
  async findOwnedActive(id: string, userId: string) { const row = await this.findOwned(id, userId); return row && row.activo !== false ? row : null; }
  async updateOwnedActive(id: string, userId: string, changes: Partial<Pick<TeamRecord, 'nombre' | 'descripcion'>>) {
    const row = await this.findOwned(id, userId);
    return row && row.activo !== false ? saveLocal('equipos', { ...row, ...changes }) : null;
  }
  async archiveOwnedActive(id: string, userId: string) {
    const row = await this.findOwned(id, userId);
    return row && row.activo !== false ? saveLocal('equipos', { ...row, activo: false }) : null;
  }
  async addMemberOwnedActive(id: string, userId: string, email: string) {
    const row = await this.findOwned(id, userId);
    if (!row || row.activo === false || row.miembros.includes(email)) return null;
    return saveLocal('equipos', { ...row, miembros: [...row.miembros, email] });
  }
  async removeMemberOwnedActive(id: string, userId: string, email: string) {
    const row = await this.findOwned(id, userId);
    if (!row || row.activo === false) return null;
    return saveLocal('equipos', { ...row, miembros: row.miembros.filter(item => item !== email) });
  }
}

const plain = (value: any): TeamRecord | null => value ? plainRecord<TeamRecord>(value) : null;

class MongoTeamRepository implements TeamRepository {
  async insert(input: Pick<TeamRecord, 'nombre' | 'descripcion' | 'creadoPor'>) { return plain(await new Equipo(input).save())!; }
  async findById(id: string) { return resolveMongooseResult<TeamRecord | null>(Equipo.findById(id)); }
  async listActiveByOwner(userId: string) { return resolveMongooseResult<TeamRecord[]>(Equipo.find({ creadoPor: userId, activo: { $ne: false } })); }
  async findOwned(id: string, userId: string) { return resolveMongooseResult<TeamRecord | null>(Equipo.findOne({ _id: id, creadoPor: userId })); }
  async findOwnedActive(id: string, userId: string) { return resolveMongooseResult<TeamRecord | null>(Equipo.findOne({ _id: id, creadoPor: userId, activo: { $ne: false } })); }
  async updateOwnedActive(id: string, userId: string, changes: Partial<Pick<TeamRecord, 'nombre' | 'descripcion'>>) {
    return plain(await Equipo.findOneAndUpdate({ _id: id, creadoPor: userId, activo: { $ne: false } }, changes, { new: true, runValidators: true }));
  }
  async archiveOwnedActive(id: string, userId: string) {
    return plain(await Equipo.findOneAndUpdate({ _id: id, creadoPor: userId, activo: { $ne: false } }, { activo: false }, { new: true }));
  }
  async addMemberOwnedActive(id: string, userId: string, email: string) {
    return plain(await Equipo.findOneAndUpdate({ _id: id, creadoPor: userId, activo: { $ne: false }, miembros: { $ne: email } }, { $push: { miembros: email } }, { new: true }));
  }
  async removeMemberOwnedActive(id: string, userId: string, email: string) {
    return plain(await Equipo.findOneAndUpdate({ _id: id, creadoPor: userId, activo: { $ne: false } }, { $pull: { miembros: email } }, { new: true }));
  }
}

export const teamRepository = (): TeamRepository => isLocalStorage() ? new JsonTeamRepository() : new MongoTeamRepository();
