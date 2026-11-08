import type { LocalCollection, StoredRecord } from './storage';
import { FEATURE_COLLECTIONS } from './storage';
import type { FeatureCollection } from '../domain/feature-records';
import { validateFeature } from '../domain/feature-validation';

const isObject = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const requiredString = (row: Record<string, any>, key: string, collection: LocalCollection, index: number) => {
  if (typeof row[key] !== 'string' || !row[key].trim()) throw new Error(`El registro ${index} de ${collection}.json requiere ${key}.`);
};
const requiredArray = (row: Record<string, any>, key: string, collection: LocalCollection, index: number) => {
  if (!Array.isArray(row[key])) throw new Error(`El registro ${index} de ${collection}.json requiere ${key} como array.`);
};
const requiredDate = (row: Record<string, any>, key: string, collection: LocalCollection, index: number) => {
  const value = row[key];
  if (!(value instanceof Date) && (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value)))) {
    throw new Error(`El registro ${index} de ${collection}.json requiere ${key} válido.`);
  }
};

export const validateRecord = (collection: LocalCollection, row: StoredRecord, index: number) => {
  const data = row as StoredRecord & Record<string, any>;
  if (!isObject(row) || typeof row._id !== 'string' || !row._id.trim()) throw new Error(`El registro ${index} de ${collection}.json no tiene un _id válido.`);
  if ((FEATURE_COLLECTIONS as readonly string[]).includes(collection)) validateFeature(collection as FeatureCollection, data);
  switch (collection) {
    case 'usuarios':
      requiredString(data, 'nombre', collection, index); requiredString(data, 'email', collection, index); requiredString(data, 'password', collection, index); break;
    case 'equipos':
      requiredString(data, 'nombre', collection, index); requiredString(data, 'creadoPor', collection, index); requiredArray(data, 'miembros', collection, index); break;
    case 'evaluaciones':
      requiredString(data, 'titulo', collection, index); requiredString(data, 'version', collection, index); requiredString(data, 'creadoPor', collection, index); requiredArray(data, 'secciones', collection, index); break;
    case 'instancias':
      requiredString(data, 'evaluacion', collection, index); requiredDate(data, 'activadoEn', collection, index);
      if (!Number.isFinite(Number(data.cantidadEsperada)) || Number(data.cantidadEsperada) < 1) throw new Error(`El registro ${index} de ${collection}.json requiere cantidadEsperada válida.`);
      if (!['activa', 'cerrada', 'archivada'].includes(data.estado)) throw new Error(`El registro ${index} de ${collection}.json tiene un estado inválido.`);
      break;
    case 'respuestas':
      requiredString(data, 'instanciaEvaluacion', collection, index); requiredArray(data, 'respuestas', collection, index); break;
  }
};
