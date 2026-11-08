import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newFeature } from './domain/feature-validation';
import { eliminarUsuarioLocal } from './services/eliminar-usuario.service';
import { JsonStorage } from './storage/json-storage';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-delete-user-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;

const storage = new JsonStorage(directory);
storage.initialize();

storage.save('usuarios', { _id: 'user-1', nombre: 'Ana', email: 'ana@example.com', password: 'hash', rol: 'facilitador' });
storage.save('usuarios', { _id: 'user-2', nombre: 'Bea', email: 'bea@example.com', password: 'hash', rol: 'facilitador' });
storage.save('equipos', { _id: 'equipo-1', nombre: 'Equipo Ana', creadoPor: 'user-1', miembros: [] });
storage.save('equipos', { _id: 'equipo-2', nombre: 'Equipo Bea', creadoPor: 'user-2', miembros: [] });
storage.save('evaluaciones', { _id: 'eval-1', titulo: 'Pulso Ana', version: '1', creadoPor: 'user-1', secciones: [] });
storage.save('instancias', {
  _id: 'ronda-1', equipo: 'equipo-1', evaluacion: 'eval-1', activadoEn: '2026-01-01T00:00:00.000Z',
  cantidadEsperada: 1, modoRespuesta: 'anonima', minimoAnonimato: 1, estado: 'activa',
});
storage.save('respuestas', { _id: 'resp-1', instanciaEvaluacion: 'ronda-1', respuestas: [] });

const accion = newFeature('accionesPlan', {
  instanciaEvaluacion: 'ronda-1',
  descripcion: 'Seguir',
  ownerRole: 'Facilitador',
  horizon: '7d',
  successMetric: 'Mejora',
  checkInQuestion: '¿Mejoró?',
});
storage.save('accionesPlan', { ...accion, _id: 'accion-1' });

const context = newFeature('teamContextItems', {
  teamId: 'equipo-1',
  type: 'priority',
  title: 'Prioridad',
  content: 'Acuerdos',
  createdBy: 'user-1',
  updatedBy: 'user-1',
});
storage.save('teamContextItems', { ...context, _id: 'ctx-1' });

const provider = newFeature('aiProviders', {
  userId: 'user-1',
  name: 'Modelo',
  kind: 'openai-compatible',
  endpoint: 'https://example.test/v1',
  modelName: 'fixture',
});
storage.save('aiProviders', { ...provider, _id: 'prov-1' });

const settings = newFeature('aiSettings', { userId: 'user-1', enabled: true, defaultProviderId: 'prov-1' });
storage.save('aiSettings', { ...settings, _id: 'settings-1' });

const analysis = newFeature('aiAnalyses', {
  userId: 'user-1',
  providerId: 'prov-1',
  instanciaId: 'ronda-1',
  equipoId: 'equipo-1',
  evaluacionId: 'eval-1',
  providerKind: 'openai-compatible',
  modelName: 'fixture',
  promptVersion: '1',
  schemaVersion: '1',
  datasetHash: 'abc',
  parameters: { includeHistorico: false, contextSchemaVersion: '1' },
  result: {
    resumen: 'ok', fortalezas: [], alertas: [], recomendaciones: [], nivelConfianza: 0.5, fuentes: [],
    limitations: [], metadata: {
      schemaVersion: '1', promptVersion: '1', providerKind: 'openai-compatible', modelName: 'fixture',
      datasetHash: 'abc', parameters: { includeHistorico: false, contextSchemaVersion: '1' },
    },
    hallazgos: [], senalesEmocionales: [], temasRecurrentes: [],
  },
});
storage.save('aiAnalyses', { ...analysis, _id: 'analisis-1' });

const connection = newFeature('integrationConnections', {
  userId: 'user-1',
  provider: 'slack',
  name: 'Slack Ana',
  secret: 'enc',
});
storage.save('integrationConnections', { ...connection, _id: 'conn-1' });

const teamSettings = newFeature('teamIntegrationSettings', { userId: 'user-1', equipoId: 'equipo-1' });
storage.save('teamIntegrationSettings', { ...teamSettings, _id: 'tis-1' });

async function run() {
  const preview = await eliminarUsuarioLocal(directory, 'ana@example.com', true);
  assert.equal(preview.collections.usuarios, 1);
  assert.equal(preview.collections.equipos, 1);
  assert.equal(preview.collections.instancias, 1);
  assert.equal(preview.collections.aiProviders, 1);
  assert.equal(storage.list('usuarios').length, 2);

  const deleted = await eliminarUsuarioLocal(directory, 'ana@example.com', false);
  assert.equal(deleted.dryRun, false);
  assert.equal(storage.list('usuarios').length, 1);
  assert.equal(storage.list('usuarios')[0]._id, 'user-2');
  assert.equal(storage.list('equipos').length, 1);
  assert.equal(storage.list('equipos')[0]._id, 'equipo-2');
  assert.equal(storage.list('instancias').length, 0);
  assert.equal(storage.list('respuestas').length, 0);
  assert.equal(storage.list('accionesPlan').length, 0);
  assert.equal(storage.list('teamContextItems').length, 0);
  assert.equal(storage.list('aiProviders').length, 0);
  assert.equal(storage.list('aiSettings').length, 0);
  assert.equal(storage.list('aiAnalyses').length, 0);
  assert.equal(storage.list('integrationConnections').length, 0);
  assert.equal(storage.list('teamIntegrationSettings').length, 0);

  fs.rmSync(directory, { recursive: true, force: true });
  console.log('eliminar-usuario local: ok');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
