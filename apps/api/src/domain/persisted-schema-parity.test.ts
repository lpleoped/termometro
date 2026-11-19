import assert from 'node:assert/strict';
import type { Schema } from 'mongoose';
import { z } from 'zod';
import { Usuario } from '../models/Usuario';
import { Equipo } from '../models/Equipo';
import { Evaluacion } from '../models/Evaluacion';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Respuesta } from '../models/Respuesta';
import { AIProvider } from '../models/AIProvider';
import { AISettingsModel } from '../models/AISettings';
import { AIAnalysis } from '../models/AIAnalysis';
import { AIUsage } from '../models/AIUsage';
import { AccionPlan } from '../models/AccionPlan';
import { TeamContextItem } from '../models/TeamContextItem';
import { IntegrationConnection } from '../models/IntegrationConnection';
import { TeamIntegrationSettings } from '../models/TeamIntegrationSettings';
import { guardPersisted, persistedSchemas } from './persisted-schemas';
import type { LocalCollection } from '../storage/storage';

const models: Record<LocalCollection, { schema: Schema }> = {
  usuarios: Usuario,
  equipos: Equipo,
  evaluaciones: Evaluacion,
  instancias: InstanciaEvaluacion,
  respuestas: Respuesta,
  aiProviders: AIProvider,
  aiSettings: AISettingsModel,
  aiAnalyses: AIAnalysis,
  aiUsages: AIUsage,
  accionesPlan: AccionPlan,
  teamContextItems: TeamContextItem,
  integrationConnections: IntegrationConnection,
  teamIntegrationSettings: TeamIntegrationSettings,
};

const nestedSchema = (path: unknown): Schema | undefined => {
  const candidate = path as { schema?: Schema; caster?: { schema?: Schema } };
  if (candidate.schema?.paths) return candidate.schema;
  if (candidate.caster?.schema?.paths) return candidate.caster.schema;
  return undefined;
};

const walkMongoose = (schema: Schema, prefix = ''): string[] => {
  const keys: string[] = [];
  for (const [key, path] of Object.entries(schema.paths)) {
    if (key === '_id' || key === '__v') continue;
    const name = prefix ? `${prefix}.${key}` : key;
    keys.push(name);
    const nested = nestedSchema(path);
    if (nested) keys.push(...walkMongoose(nested, name));
  }
  return keys;
};

const unwrap = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) return unwrap(schema.unwrap() as z.ZodTypeAny);
  return schema;
};

const walkZod = (schema: z.ZodTypeAny, prefix = ''): string[] => {
  const current = unwrap(schema);
  if (current instanceof z.ZodArray) return walkZod(current.element as z.ZodTypeAny, prefix);
  if (!(current instanceof z.ZodObject)) return [];
  const keys: string[] = [];
  for (const [key, child] of Object.entries(current.shape)) {
    if (key === '_id' || key === '__v') continue;
    const name = prefix ? `${prefix}.${key}` : key;
    keys.push(name);
    keys.push(...walkZod(child as z.ZodTypeAny, name));
  }
  return keys;
};

const missing = (left: string[], right: Set<string>) => left.filter(key => !right.has(key));

for (const [collection, model] of Object.entries(models) as Array<[LocalCollection, { schema: Schema }]>) {
  const mongooseKeys = walkMongoose(model.schema).sort();
  const zodKeys = walkZod(persistedSchemas[collection]).sort();
  const zodSet = new Set(zodKeys);
  const mongooseSet = new Set(mongooseKeys);
  const isFlattenedParent = (key: string) => mongooseKeys.some(path => path.startsWith(`${key}.`));
  assert.deepEqual(missing(mongooseKeys, zodSet), [], `${collection} tiene paths de Mongoose fuera del esquema Zod`);
  assert.deepEqual(zodKeys.filter(key => !mongooseSet.has(key) && !isFlattenedParent(key)), [], `${collection} tiene campos Zod que Mongoose no declara`);
}

const legacyTeam = { _id: 'equipo-1', nombre: 'Equipo inicial', creadoPor: 'usuario-1', miembros: [], index: 4 };
assert.equal(guardPersisted('equipos', legacyTeam), legacyTeam);
assert.equal(legacyTeam.index, 4);

const legado = { _id: 'legado', titulo: 'Formato anterior', version: '1.0', creadoPor: 'usuario-1', secciones: [] };
assert.equal(guardPersisted('evaluaciones', legado), legado);
assert.equal('equipoId' in legado, false);
const conEquipo = { ...legado, _id: 'nuevo', equipoId: 'equipo-1' };
assert.equal(guardPersisted('evaluaciones', conEquipo).equipoId, 'equipo-1');
guardPersisted('instancias', {
  _id: 'ronda', evaluacion: 'eval', activadoEn: '2026-01-01T00:00:00.000Z', estado: 'activa', cantidadEsperada: '3',
});

console.log('persisted-schema-parity: ok');
