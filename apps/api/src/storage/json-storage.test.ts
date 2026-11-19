import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonStorage } from './json-storage';
import { asegurarColeccionUso } from './migrations';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-json-storage-'));

try {
  const storage = new JsonStorage(directory);
  storage.initialize();

  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.formatVersion, 2);
  assert.equal(manifest.storage, 'json');
  assert.equal(manifest.collections.equipos, 1);
  assert.equal(manifest.collections.aiUsages, 1);
  assert.equal(fs.existsSync(path.join(directory, 'aiUsages.json')), true);

  const initialTeams = JSON.parse(fs.readFileSync(path.join(directory, 'equipos.json'), 'utf8'));
  assert.deepEqual({ schemaVersion: initialTeams.schemaVersion, collection: initialTeams.collection }, { schemaVersion: 1, collection: 'equipos' });

  storage.save('equipos', { _id: 'equipo-1', nombre: 'Equipo inicial', creadoPor: 'usuario-1', miembros: [] });
  storage.save('equipos', { _id: 'equipo-1', nombre: 'Equipo actualizado', creadoPor: 'usuario-1', miembros: [] });
  assert.equal(storage.get<{ _id: string; nombre: string }>('equipos', 'equipo-1')?.nombre, 'Equipo actualizado');
  assert.equal(storage.delete('equipos', row => row._id === 'equipo-1'), 1);
  assert.equal(storage.get('equipos', 'equipo-1'), null);

  for (let index = 0; index < 8; index += 1) storage.save('equipos', { _id: 'rotacion', nombre: `Equipo ${index}`, creadoPor: 'usuario-1', miembros: [], index });
  const backups = fs.readdirSync(path.join(directory, 'backups')).filter(name => name.startsWith('equipos-'));
  assert.equal(backups.length, 5, 'debe conservar solamente los cinco backups más recientes');

  fs.writeFileSync(path.join(directory, '.equipos.lock'), 'ocupado');
  assert.throws(() => storage.save('equipos', { _id: 'bloqueado', nombre: 'Bloqueado', creadoPor: 'usuario-1', miembros: [] }), /otro proceso/);
  fs.unlinkSync(path.join(directory, '.equipos.lock'));

  fs.writeFileSync(path.join(directory, 'usuarios.json'), JSON.stringify([{ nombre: 'Sin ID' }]));
  assert.throws(() => storage.list('usuarios'), /no tiene un _id válido/);
  fs.writeFileSync(path.join(directory, 'equipos.json'), JSON.stringify([{ _id: 'incompleto' }]));
  assert.throws(() => storage.list('equipos'), /requiere nombre/);

  fs.writeFileSync(path.join(directory, 'evaluaciones.json'), JSON.stringify([{ _id: 'legado', titulo: 'Formato anterior', version: '1.0', creadoPor: 'usuario-1', secciones: [] }]));
  assert.equal(storage.list('evaluaciones').length, 1, 'debe leer el array legado');
  storage.save('evaluaciones', { _id: 'nueva', titulo: 'Nueva', version: '1.0', creadoPor: 'usuario-1', secciones: [] });
  const migrated = JSON.parse(fs.readFileSync(path.join(directory, 'evaluaciones.json'), 'utf8'));
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.records.length, 2);

  const accionVieja = {
    _id: 'accion-vieja', instanciaEvaluacion: 'ronda', descripcion: 'Seguir', ownerRole: 'Equipo', horizon: '30d',
    successMetric: 'Claridad', checkInQuestion: '¿Qué pasó?', estado: 'ejecutada', evidenciaIds: [],
    checkIns: [{ horizonte: '30d', estado: 'completado', nota: 'La nota sigue' }], veredictos: 'esto no es una lista',
  };
  fs.writeFileSync(path.join(directory, 'accionesPlan.json'), JSON.stringify({ schemaVersion: 1, collection: 'accionesPlan', records: [accionVieja] }));
  const leida = storage.list<typeof accionVieja & { veredictos?: unknown }>('accionesPlan')[0];
  assert.equal(leida.checkIns[0].nota, 'La nota sigue');
  assert.equal(leida.veredictos, undefined);

  storage.save('aiUsages', {
    _id: 'uso-1', userId: 'usuario-1', schemaVersion: 1, motivo: 'lectura', modelo: 'fixture',
    tokensEntrada: null, tokensSalida: null, costoEstimado: null, fecha: '2026-11-01T00:00:00.000Z',
  });
  const uso = storage.get<{ _id: string; tokensEntrada: null; motivo: string; prompt?: string }>('aiUsages', 'uso-1');
  assert.equal(uso?.tokensEntrada, null);
  assert.equal(uso?.motivo, 'lectura');
  assert.equal(uso?.prompt, undefined);
  const respaldoAnterior = { collections: {} as Record<string, { schemaVersion: number; collection: string; records: unknown[] }>, checksums: {} as Record<string, string> };
  asegurarColeccionUso(respaldoAnterior);
  assert.deepEqual((respaldoAnterior.collections.aiUsages as { records: unknown[] }).records, []);

  fs.writeFileSync(path.join(directory, 'aiSettings.json'), JSON.stringify({
    schemaVersion: 1,
    collection: 'aiSettings',
    records: [
      { _id: 'settings-viejo', userId: 'usuario-1', enabled: false, defaultProviderId: null },
      { _id: 'settings-raro', userId: 'usuario-2', enabled: false, defaultProviderId: null, budgetPreset: 'raro' },
    ],
  }));
  const presets = storage.list<{ _id: string; budgetPreset?: string }>('aiSettings');
  assert.equal(presets.find((row) => row._id === 'settings-viejo')?.budgetPreset, 'estándar');
  assert.equal(presets.find((row) => row._id === 'settings-raro')?.budgetPreset, 'estándar');

  console.log('JsonStorage: OK');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
