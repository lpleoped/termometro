import { Usuario } from '../models/Usuario';
import { plainRecord } from './mongoose-result';
import { getLocal, isLocalStorage, listLocal, localId, localNow, saveLocal } from '../storage/local-store';

export interface UserRecord {
  _id: string; nombre: string; email: string; password: string;
  rol: 'lider'; creadoEn: string | Date;
}
export type NewUserRecord = Pick<UserRecord, 'nombre' | 'email' | 'password'>;

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  count(): Promise<number>;
  insert(record: NewUserRecord): Promise<UserRecord>;
}

class JsonUserRepository implements UserRepository {
  async findById(id: string) { return getLocal<UserRecord>('usuarios', id); }
  async count() { return listLocal<UserRecord>('usuarios').length; }
  async findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return listLocal<UserRecord>('usuarios').find(user => user.email.trim().toLowerCase() === normalized) ?? null;
  }
  async insert(record: NewUserRecord) {
    return saveLocal<UserRecord>('usuarios', { ...record, _id: localId(), rol: 'lider', creadoEn: localNow() });
  }
}

class MongoUserRepository implements UserRepository {
  async findById(id: string) { return plainRecord<UserRecord | null>(await Usuario.findById(id).lean()); }
  async count() { return Usuario.countDocuments(); }
  async findByEmail(email: string) {
    return plainRecord<UserRecord | null>(await Usuario.findOne({ email: email.trim() }).collation({ locale: 'en', strength: 2 }).lean());
  }
  async insert(record: NewUserRecord) { return plainRecord<UserRecord>(await new Usuario(record).save()); }
}

export const userRepository = (): UserRepository => isLocalStorage() ? new JsonUserRepository() : new MongoUserRepository();
