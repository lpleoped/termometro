import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeLocalStorage, saveLocal } from './storage/local-store';
import { crearRespuestaService } from './services/respuesta.service';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-token-test-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

console.log('respuesta-public-token-required.test: validando que respuestas públicas requieren token...');

const evaluation = {
  _id: 'eval-test',
  titulo: 'Test Evaluation',
  version: '1.0',
  creadoPor: 'user-1',
  secciones: [
    {
      titulo: 'Sección 1',
      indicadores: [
        { id: 'ind-1', texto: 'Indicador 1', tipo: 'cuantitativo', direccion: 'positiva' },
      ],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

const round = {
  _id: 'round-test',
  evaluacion: 'eval-test',
  estado: 'activa' as const,
  activadoEn: '2026-01-01T00:00:00.000Z',
  cantidadEsperada: 5,
  modoRespuesta: 'anonima' as const,
  minimoAnonimato: 1,
  alcance: 'individual' as const,
  tokenPublico: 'abcdefghijklmnopqrstuvwxyz0123456789ABCD',
  createdAt: '2026-01-01T00:00:00.000Z',
};

async function run() {
  try {
    initializeLocalStorage();
    saveLocal('evaluaciones', evaluation);
    saveLocal('instancias', round);

    // Test 1: Envío con token válido debe funcionar
    const withToken = await crearRespuestaService({
      tokenPublico: round.tokenPublico,
      respuestas: [{ indicadorId: 'ind-1', valor: 5 }],
    });
    assert.ok(withToken._id, 'Respuesta con token debe crearse correctamente');
    console.log('✓ Respuesta con token público válido: OK');

    // Test 2: Envío sin token debe ser rechazado
    await assert.rejects(
      () => crearRespuestaService({
        tokenPublico: undefined as any,
        respuestas: [{ indicadorId: 'ind-1', valor: 4 }],
      }),
      /requiere un token público válido/,
      'Envío sin token debe ser rechazado'
    );
    console.log('✓ Rechazo de envío sin token: OK');

    // Test 3: Envío con token vacío debe ser rechazado
    await assert.rejects(
      () => crearRespuestaService({
        tokenPublico: '',
        respuestas: [{ indicadorId: 'ind-1', valor: 3 }],
      }),
      /requiere un token público válido|Formato de token público inválido/,
      'Envío con token vacío debe ser rechazado'
    );
    console.log('✓ Rechazo de token vacío: OK');

    // Test 4: Envío con token inválido debe ser rechazado
    await assert.rejects(
      () => crearRespuestaService({
        tokenPublico: 'invalid-token',
        respuestas: [{ indicadorId: 'ind-1', valor: 2 }],
      }),
      /Formato de token público inválido/,
      'Token con formato inválido debe ser rechazado'
    );
    console.log('✓ Rechazo de token con formato inválido: OK');

    // Test 5: Envío con objeto en lugar de token (NoSQL injection attempt)
    await assert.rejects(
      () => crearRespuestaService({
        tokenPublico: { $ne: null } as any,
        respuestas: [{ indicadorId: 'ind-1', valor: 1 }],
      }),
      /Token público inválido/,
      'Objeto en lugar de token debe ser rechazado'
    );
    console.log('✓ Rechazo de objeto como token (NoSQL injection): OK');

    console.log('respuesta-public-token-required.test: ok');
  } catch (error) {
    console.error('respuesta-public-token-required.test: FAILED');
    throw error;
  }
}

run();
