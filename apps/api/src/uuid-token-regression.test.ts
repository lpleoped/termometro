import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeLocalStorage, saveLocal } from './storage/local-store';
import { crearRespuestaService } from './services/respuesta.service';
import { obtenerRondaPublicaService } from './services/instancia.service';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-uuid-test-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

console.log('uuid-token-regression.test: validando tokens UUID legacy...');

const evaluation = {
  _id: 'eval-uuid-test',
  titulo: 'Test UUID Token',
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

// Legacy round with UUID token (36 chars, 8-4-4-4-12 format)
const legacyRound = {
  _id: 'round-uuid-legacy',
  evaluacion: 'eval-uuid-test',
  estado: 'activa' as const,
  activadoEn: '2026-01-01T00:00:00.000Z',
  cantidadEsperada: 5,
  modoRespuesta: 'anonima' as const,
  minimoAnonimato: 1,
  alcance: 'individual' as const,
  tokenPublico: 'f732e3eb-ed0f-47c2-843b-831f5c3a6c7a', // UUID format
  createdAt: '2026-01-01T00:00:00.000Z',
};

// Current round with base64url token (43 chars)
const currentRound = {
  _id: 'round-base64url-current',
  evaluacion: 'eval-uuid-test',
  estado: 'activa' as const,
  activadoEn: '2026-01-01T00:00:00.000Z',
  cantidadEsperada: 5,
  modoRespuesta: 'anonima' as const,
  minimoAnonimato: 1,
  alcance: 'individual' as const,
  tokenPublico: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', // Base64url format (43 chars)
  createdAt: '2026-01-01T00:00:00.000Z',
};

async function run() {
  try {
    initializeLocalStorage();
    saveLocal('evaluaciones', evaluation);
    saveLocal('instancias', legacyRound);
    saveLocal('instancias', currentRound);

    // Test 1: Legacy UUID token - GET /r/:token (obtenerRondaPublicaService)
    const legacyPublic = await obtenerRondaPublicaService(legacyRound.tokenPublico);
    assert.ok(legacyPublic, 'Legacy UUID token debe cargar ronda pública');
    assert.equal(legacyPublic.titulo, 'Test UUID Token', 'Debe devolver la evaluación correcta');
    console.log('✓ Legacy UUID token: GET /r/:token funciona');

    // Test 2: Legacy UUID token - POST /respuestas (crearRespuestaService)
    const legacyResponse = await crearRespuestaService({
      tokenPublico: legacyRound.tokenPublico,
      respuestas: [{ indicadorId: 'ind-1', valor: 5 }],
    });
    assert.ok(legacyResponse._id, 'Legacy UUID token debe permitir enviar respuesta');
    console.log('✓ Legacy UUID token: POST /respuestas funciona');

    // Test 3: Current base64url token - GET /r/:token
    const currentPublic = await obtenerRondaPublicaService(currentRound.tokenPublico);
    assert.ok(currentPublic, 'Base64url token debe cargar ronda pública');
    assert.equal(currentPublic.titulo, 'Test UUID Token', 'Debe devolver la evaluación correcta');
    console.log('✓ Current base64url token: GET /r/:token funciona');

    // Test 4: Current base64url token - POST /respuestas
    const currentResponse = await crearRespuestaService({
      tokenPublico: currentRound.tokenPublico,
      respuestas: [{ indicadorId: 'ind-1', valor: 4 }],
    });
    assert.ok(currentResponse._id, 'Base64url token debe permitir enviar respuesta');
    console.log('✓ Current base64url token: POST /respuestas funciona');

    // Test 5: Invalid tokens still rejected - NoSQL injection attempt
    await assert.rejects(
      () => obtenerRondaPublicaService({ $ne: null } as any),
      /Token inválido/,
      'Objeto debe ser rechazado'
    );
    console.log('✓ NoSQL injection rechazada');

    // Test 6: Invalid UUID format rejected
    await assert.rejects(
      () => obtenerRondaPublicaService('not-a-valid-uuid-format'),
      /Token inválido/,
      'UUID inválido debe ser rechazado'
    );
    console.log('✓ UUID inválido rechazado');

    // Test 7: Invalid base64url format rejected (too short)
    await assert.rejects(
      () => obtenerRondaPublicaService('short'),
      /Token inválido/,
      'Token corto debe ser rechazado'
    );
    console.log('✓ Token corto rechazado');

    // Test 8: UUID uppercase (should work - case insensitive)
    const upperCaseRound = {
      _id: 'round-uuid-upper',
      evaluacion: 'eval-uuid-test',
      estado: 'activa' as const,
      activadoEn: '2026-01-01T00:00:00.000Z',
      cantidadEsperada: 5,
      modoRespuesta: 'anonima' as const,
      minimoAnonimato: 1,
      alcance: 'individual' as const,
      tokenPublico: 'F732E3EB-ED0F-47C2-843B-831F5C3A6C7A', // UUID uppercase
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    saveLocal('instancias', upperCaseRound);
    
    const upperPublic = await obtenerRondaPublicaService(upperCaseRound.tokenPublico);
    assert.ok(upperPublic, 'UUID uppercase debe funcionar (case insensitive)');
    console.log('✓ UUID uppercase funciona');

    console.log('uuid-token-regression.test: ok');
  } catch (error) {
    console.error('uuid-token-regression.test: FAILED');
    throw error;
  }
}

run();
