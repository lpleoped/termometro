import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonStorage } from './json-storage';

const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-export-source-'));
const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-export-target-'));
try {
  const source = new JsonStorage(sourceDir); source.initialize();
  source.save('equipos', { _id: 'team-1', nombre: 'Equipo', creadoPor: 'user-1', miembros: [] });
  const snapshot = source.exportSnapshot();
  assert.equal(source.previewImport(snapshot).collections.equipos, 1);
  const target = new JsonStorage(targetDir); target.initialize();
  target.importSnapshot(snapshot);
  assert.equal((target.get('equipos', 'team-1') as { nombre?: string } | null)?.nombre, 'Equipo');
  const tampered = structuredClone(snapshot); tampered.checksums.equipos = 'bad';
  assert.throws(() => target.previewImport(tampered), /Checksum inválido/);
  assert.equal((target.get('equipos', 'team-1') as { nombre?: string } | null)?.nombre, 'Equipo', 'la importación inválida no debe alterar datos');
  console.log('portable-export: OK');
} finally { fs.rmSync(sourceDir, { recursive: true, force: true }); fs.rmSync(targetDir, { recursive: true, force: true }); }
