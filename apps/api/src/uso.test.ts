import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-uso-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;

import { adjuntarUso, leerUsoProveedor } from './services/ai-completion';
import { anotarUso, resumirUso } from './services/uso.service';
import { initializeLocalStorage } from './storage/local-store';

async function run() {
  initializeLocalStorage();
  assert.equal(leerUsoProveedor({ usage: { total_tokens: 99 } })?.tokensEntrada, null);
  assert.equal(leerUsoProveedor({ usage: { total_tokens: 99 } })?.tokensSalida, null);
  assert.equal(leerUsoProveedor({}), null);
  assert.deepEqual(leerUsoProveedor({ usage: { prompt_tokens: 3, completion_tokens: 4, cost: 0.1 } }), {
    tokensEntrada: 3, tokensSalida: 4, costoEstimado: 0.1,
  });

  const ahora = new Date('2026-11-16T15:00:00.000Z');
  const informado = adjuntarUso({ resumen: 'Este texto no se guarda' }, { usage: { input_tokens: 8, output_tokens: 2 } });
  await anotarUso('cuenta', 'prueba', 'fixture', informado);
  await anotarUso('cuenta', 'lectura', 'fixture', { resumen: 'Lectura de claridad' });
  const resumen = await resumirUso('cuenta', '2026-11', ahora);
  assert.equal(resumen.consultas.length, 2);
  assert.equal(resumen.consultas.find((fila) => fila.motivo === 'prueba')?.tokensEntrada, 8);
  assert.equal(resumen.consultas.find((fila) => fila.motivo === 'prueba')?.tokensSalida, 2);
  assert.equal(resumen.consultas.find((fila) => fila.motivo === 'lectura')?.tokensEntrada, null);
  assert.equal(resumen.consultas.find((fila) => fila.motivo === 'lectura')?.costoEstimado, null);
  assert.equal(resumen.nuncaConsulto, false);
  assert.equal(JSON.stringify(resumen).includes('Este texto no se guarda'), false);
  assert.equal(JSON.stringify(resumen).includes('Lectura de claridad'), false);
  const vacio = await resumirUso('cuenta', '2026-10', ahora);
  assert.equal(vacio.consultas.length, 0);
  assert.equal(vacio.nuncaConsulto, false);
  const otra = await resumirUso('otra', '2026-11', ahora);
  assert.equal(otra.nuncaConsulto, true);
  assert.equal(otra.consultas.length, 0);
  console.log('uso: ok');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => fs.rmSync(directory, { recursive: true, force: true }));
