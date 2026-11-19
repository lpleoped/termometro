import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validarTransicionAccion } from './services/acciones.service';
import { calcularMemoria } from './domain/veredicto-accion';
import { recordarEquipo } from './services/memoria-accion.service';
import { newFeature } from './domain/feature-validation';
import { initializeLocalStorage, saveLocal } from './storage/local-store';
import { featureRepository } from './repositories/feature.repository';

assert.equal(validarTransicionAccion('generada', 'en_revision'), 'en_revision');
assert.equal(validarTransicionAccion('en_revision', 'aprobada'), 'aprobada');
assert.equal(validarTransicionAccion('ejecutada', 'verificada'), 'verificada');
assert.throws(() => validarTransicionAccion('generada', 'aprobada'), /Transición no permitida/);
assert.throws(() => validarTransicionAccion('aprobada', 'verificada'), /Transición no permitida/);

const rondas = [
  { instanciaId: 'r1', evaluacionId: 'e', activadoEn: '2026-01-01T00:00:00.000Z', indicadores: [{ id: 'carga', texto: 'Carga', valor: 60 }] },
  { instanciaId: 'r2', evaluacionId: 'e', activadoEn: '2026-02-01T00:00:00.000Z', indicadores: [{ id: 'carga', texto: 'Carga', valor: 60 }] },
];
const base = {
  descripcion: 'Bajar la carga', estado: 'ejecutada' as const, horizonte: '90d' as const,
  ejecutadaEn: '2026-01-02T00:00:00.000Z', indicadoresObjetivo: ['carga'], rondaOrigenId: 'r1', rondas,
  notas: [{ horizonte: '7d', estado: 'completado', nota: 'Sin cambios todavía' }],
};
const pronto = calcularMemoria({ ...base, ahora: new Date('2026-02-15T00:00:00.000Z') });
assert.equal(pronto?.veredictos[0].veredicto, 'todavia_es_pronto');
assert.equal(pronto?.veredictos[0].valorPosterior, 60);
assert.match(pronto?.texto.content || '', /todavía es pronto/);
assert.match(pronto?.texto.content || '', /Sin cambios todavía/);

const quieto = calcularMemoria({ ...base, horizonte: '30d', ahora: new Date('2026-06-01T00:00:00.000Z') });
assert.equal(quieto?.veredictos[0].veredicto, 'no_se_movio');
assert.equal(quieto?.veredictos[0].delta, 0);
assert.match(quieto?.texto.content || '', /no se movió/);
assert.match(quieto?.texto.content || '', /no prueba causalidad/);

const mejora = calcularMemoria({ ...base, horizonte: '30d', ahora: new Date('2026-06-01T00:00:00.000Z'), rondas: [rondas[0], { ...rondas[1], indicadores: [{ id: 'carga', texto: 'Carga', valor: 63 }] }] });
assert.equal(mejora?.veredictos[0].veredicto, 'hay_una_senal');
const contra = calcularMemoria({ ...base, horizonte: '30d', ahora: new Date('2026-06-01T00:00:00.000Z'), rondas: [rondas[0], { ...rondas[1], indicadores: [{ id: 'carga', texto: 'Carga', valor: 50 }] }] });
assert.equal(contra?.veredictos[0].veredicto, 'se_movio_en_contra');
const casi = calcularMemoria({ ...base, horizonte: '30d', ahora: new Date('2026-06-01T00:00:00.000Z'), rondas: [rondas[0], { ...rondas[1], indicadores: [{ id: 'carga', texto: 'Carga', valor: 62 }] }] });
assert.equal(casi?.veredictos[0].veredicto, 'no_se_movio');
assert.equal(calcularMemoria({ ...base, notas: [], rondas: [rondas[0]], ahora: new Date('2026-06-01T00:00:00.000Z') }), null);
assert.equal(calcularMemoria({ ...base, estado: 'rechazada', ahora: new Date('2026-06-01T00:00:00.000Z') }), null);
const sinMedicion = calcularMemoria({ ...base, horizonte: '30d', rondas: [rondas[0]], ahora: new Date('2026-06-01T00:00:00.000Z') });
assert.equal(sinMedicion?.veredictos[0].veredicto, 'sin_medicion_posterior');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-memoria-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;

async function run() {
  initializeLocalStorage();
  saveLocal('usuarios', { _id: 'usuario-1', nombre: 'Ana', email: 'ana@example.com', password: 'hash', rol: 'lider' });
  saveLocal('equipos', { _id: 'equipo-1', nombre: 'Equipo', creadoPor: 'usuario-1', miembros: [], activo: true });
  saveLocal('evaluaciones', {
    _id: 'eval-1', titulo: 'Pulso', version: '1', tipo: 'CUSTOM', creadoPor: 'usuario-1',
    secciones: [{ titulo: 'Energía', ponderacion: 100, indicadores: [{ id: 'carga', texto: 'Carga', tipo: 'cuantitativo', direccion: 'positiva' }] }],
  });
  saveLocal('instancias', { _id: 'ronda-origen', equipo: 'equipo-1', evaluacion: 'eval-1', activadoEn: '2026-01-01T00:00:00.000Z', estado: 'cerrada', cantidadEsperada: 3, modoRespuesta: 'anonima', minimoAnonimato: 1 });
  saveLocal('instancias', { _id: 'ronda-despues', equipo: 'equipo-1', evaluacion: 'eval-1', activadoEn: '2026-04-01T00:00:00.000Z', estado: 'activa', cantidadEsperada: 3, modoRespuesta: 'anonima', minimoAnonimato: 1 });
  for (const [id, ronda] of [['resp-1', 'ronda-origen'], ['resp-2', 'ronda-origen'], ['resp-3', 'ronda-origen'], ['resp-4', 'ronda-despues'], ['resp-5', 'ronda-despues'], ['resp-6', 'ronda-despues']] as const) {
    saveLocal('respuestas', { _id: id, instanciaEvaluacion: ronda, respuestas: [{ indicadorId: 'carga', valor: 3 }] });
  }
  const accion = newFeature('accionesPlan', {
    instanciaEvaluacion: 'ronda-origen', descripcion: 'Bajar la carga de reuniones', ownerRole: 'Facilitación', horizon: '30d',
    successMetric: 'La carga', checkInQuestion: '¿Qué pasó?', estado: 'ejecutada', evidenciaIds: ['carga'],
    ejecutadaEn: new Date('2026-01-02T00:00:00.000Z'),
    checkIns: [{ horizonte: '30d', venceEn: new Date('2026-02-01T00:00:00.000Z'), estado: 'completado', nota: 'Seguimos igual', completadoEn: new Date('2026-02-01T00:00:00.000Z') }],
  });
  saveLocal('accionesPlan', accion);
  await recordarEquipo('usuario-1', 'equipo-1', new Date('2026-06-01T00:00:00.000Z'));
  await recordarEquipo('usuario-1', 'equipo-1', new Date('2026-06-01T00:00:00.000Z'));
  const guardada = await featureRepository('accionesPlan').find({ _id: accion._id });
  assert.equal(guardada?.checkIns[0].nota, 'Seguimos igual');
  assert.equal(guardada?.veredictos?.[0].veredicto, 'no_se_movio');
  assert.equal(guardada?.veredictos?.[0].valorAdopcion, 60);
  assert.equal(guardada?.veredictos?.[0].valorPosterior, 60);
  const aprendizajes = await featureRepository('teamContextItems').list({ teamId: 'equipo-1', type: 'learning' });
  assert.equal(aprendizajes.length, 1);
  assert.equal(aprendizajes[0].status, 'review');
  assert.equal(aprendizajes[0].influence, 'interpretation');
  assert.equal(aprendizajes[0].learningKey, `action:${accion._id}`);
  assert.match(aprendizajes[0].content, /no se movió/);
  assert.equal(aprendizajes[0].version, 1);
  console.log('acciones-lifecycle.test: ok');
}

run().catch((error) => { console.error(error); process.exit(1); });
