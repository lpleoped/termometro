import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonStorage } from './json-storage';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-json-storage-'));

try {
  const storage = new JsonStorage(directory);
  storage.initialize();

  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.formatVersion, 2);
  assert.equal(manifest.storage, 'json');
  assert.equal(manifest.collections.equipos, 1);

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

  console.log('JsonStorage: OK');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
