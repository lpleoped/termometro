import crypto from 'node:crypto';
import type { FeatureCollection, FeatureRecords } from './feature-records';
import { guardPersisted } from './persisted-schemas';

export function newFeature<K extends FeatureCollection>(collection: K, input: Partial<FeatureRecords[K]>): FeatureRecords[K] {
  const now = new Date();
  const defaults: Record<FeatureCollection, object> = {
    aiProviders: { status: 'unverified', creadoEn: now, actualizadoEn: now },
    aiSettings: { enabled: false, defaultProviderId: null, budgetPreset: 'estándar' },
    aiAnalyses: { creadoEn: now, contextItemIds: [], propuestasOmitidas: [] },
    aiUsages: { schemaVersion: 1, tokensEntrada: null, tokensSalida: null, costoEstimado: null, fecha: now },
    accionesPlan: { estado: 'generada', creadaEn: now, evidenciaIds: [], checkIns: [] },
    teamContextItems: { scope: 'team', status: 'active', confidence: 1, importance: 'relevant', sensitivity: 'normal', influence: 'interpretation_and_action', version: 1, createdAt: now, updatedAt: now },
    integrationConnections: { status: 'active', metadata: {}, createdAt: now, updatedAt: now },
    teamIntegrationSettings: {},
  };
  const record = { ...defaults[collection], ...input, _id: crypto.randomBytes(12).toString('hex'), __v: 0 } as FeatureRecords[K];
  validateFeature(collection, record);
  return record;
}

/** Shared validation for both persistence adapters and imported records. */
export function validateFeature(collection: FeatureCollection, record: any): void {
  const required: Record<FeatureCollection, string[]> = {
    aiProviders: ['userId','name','kind','endpoint','modelName'],
    aiSettings: ['userId'],
    aiAnalyses: ['userId','providerId','instanciaId','equipoId','evaluacionId','providerKind','modelName','promptVersion','schemaVersion','datasetHash'],
    aiUsages: ['userId','motivo','modelo'],
    accionesPlan: ['instanciaEvaluacion','descripcion','ownerRole','horizon','successMetric','checkInQuestion'],
    teamContextItems: ['teamId','type','title','content','createdBy','updatedBy'],
    integrationConnections: ['userId','provider','name'],
    teamIntegrationSettings: ['userId','equipoId'],
  };
  for (const key of required[collection]) if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error('Falta un campo obligatorio: ' + key);
  const enumField = (key: string, values: string[]) => { if (!values.includes(record[key])) throw new Error('Valor inválido: ' + key); };
  if (collection === 'aiProviders') {
    enumField('kind', ['openai-compatible','azure-openai','ollama']); enumField('status', ['active','invalid','unverified']);
    if (!['http:','https:'].includes(new URL(record.endpoint).protocol)) throw new Error('Endpoint inválido');
  }
  if (collection === 'aiSettings') {
    if (typeof record.enabled !== 'boolean' || !(record.defaultProviderId === null || typeof record.defaultProviderId === 'string')) throw new Error('Configuración IA inválida');
    if (record.budgetPreset !== undefined && !['pequeño', 'estándar', 'grande', 'muy-grande', 'sin-límite'].includes(record.budgetPreset)) throw new Error('Configuración IA inválida');
  }
  if (collection === 'teamContextItems') {
    enumField('type', ['stable_fact','team_role','client_context','priority','constraint','external_actor','decision','hypothesis','learning']);
    enumField('status', ['active','review','obsolete']); enumField('scope', ['team','project','analysis']);
    enumField('importance', ['informative','relevant','critical']); enumField('sensitivity', ['normal','sensitive','highly_sensitive']);
    enumField('influence', ['interpretation','risk','action','precondition','group_action','do_not_act_directly','interpretation_and_action']);
    if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1 || record.title.length > 160 || record.content.length > 8000 || (record.source && (typeof record.source !== 'string' || record.source.length > 500))) throw new Error('Contexto inválido');
    for (const field of ['validFrom','validUntil']) if (record[field] && !Number.isFinite(new Date(record[field]).getTime())) throw new Error('Fecha inválida');
    if (record.validFrom && record.validUntil && new Date(record.validFrom) > new Date(record.validUntil)) throw new Error('Fechas de contexto inconsistentes');
    if (record.learningKey !== undefined && (typeof record.learningKey !== 'string' || !/^action:\S{1,80}$/.test(record.learningKey))) throw new Error('Clave de aprendizaje inválida');
  }
  if (collection === 'accionesPlan') {
    enumField('estado', ['generada','en_revision','aprobada','rechazada','ejecutada','verificada']); enumField('horizon', ['7d','30d','90d']);
    if (!Array.isArray(record.checkIns) || !Array.isArray(record.evidenciaIds)) throw new Error('Seguimiento inválido');
    if (record.veredictos !== undefined) {
      if (!Array.isArray(record.veredictos)) throw new Error('Veredictos inválidos');
      for (const item of record.veredictos) {
        if (!item || typeof item.indicadorId !== 'string' || item.indicadorId.length > 200 || !['sin_medicion_posterior', 'todavia_es_pronto', 'hay_una_senal', 'no_se_movio', 'se_movio_en_contra'].includes(item.veredicto)) throw new Error('Veredicto inválido');
        for (const key of ['valorAdopcion', 'valorPosterior', 'delta']) if (item[key] !== undefined && (typeof item[key] !== 'number' || !Number.isFinite(item[key]))) throw new Error('Medición de veredicto inválida');
      }
    }
  }
  if (collection === 'integrationConnections') {
    enumField('provider', ['slack','monday']); enumField('status', ['active','invalid']);
    if (typeof record.secret !== 'string') throw new Error('Credencial inválida');
  }
  if (collection === 'aiAnalyses' && (!record.result || typeof record.result.resumen !== 'string' || !record.parameters)) throw new Error('Análisis inválido');
  if (collection === 'aiUsages') {
    if (record.schemaVersion !== 1) throw new Error('Versión de uso inválida');
    enumField('motivo', ['prueba', 'cuestionario', 'lectura', 'tono']);
    if (record.modelo.length > 200) throw new Error('Modelo inválido');
    for (const key of ['tokensEntrada', 'tokensSalida', 'costoEstimado']) {
      if (record[key] != null && (typeof record[key] !== 'number' || !Number.isFinite(record[key]) || record[key] < 0)) throw new Error('Consumo inválido');
    }
    if (!Number.isFinite(new Date(record.fecha).getTime())) throw new Error('Fecha de uso inválida');
    for (const prohibido of ['prompt', 'messages', 'texto', 'content']) if (prohibido in record) throw new Error('El uso no guarda el texto de la consulta');
  }
  guardPersisted(collection, record);
}
