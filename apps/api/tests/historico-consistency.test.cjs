const { test } = require('node:test');
const assert = require('node:assert/strict');
const { InstanciaEvaluacion } = require('../dist/models/InstanciaEvaluacion');
const { Evaluacion } = require('../dist/models/Evaluacion');
const { Equipo } = require('../dist/models/Equipo');
const { Respuesta } = require('../dist/models/Respuesta');
const { getEstadoActualDashboard } = require('../dist/services/dashboard.service');
const { getHistoricoPorEquipoYEvaluacion } = require('../dist/services/historico.service');

test('histórico y dashboard coinciden con polaridad mixta y comentarios; respetan anonimato', async () => {
  const originals = [InstanciaEvaluacion.find, InstanciaEvaluacion.findById, Evaluacion.findById, Equipo.findById, Respuesta.find];
  const evaluacion = { titulo: 'Mixta', version: '1', tipo: 'CUSTOM', secciones: [
    { titulo: 'Positiva', ponderacion: 50, indicadores: [{ id: 'p', tipo: 'cuantitativo', direccion: 'positiva' }] },
    { titulo: 'Negativa', ponderacion: 50, indicadores: [{ id: 'n', tipo: 'cuantitativo', direccion: 'negativa' }] },
    { titulo: 'Abierta', ponderacion: 0, indicadores: [{ id: 'a', tipo: 'cualitativo', texto: 'Comentario' }] },
  ] };
  const ronda = { _id: 'ronda', activadoEn: new Date(), cantidadEsperada: 1, modoRespuesta: 'identificada', minimoAnonimato: 2, equipo: { nombre: 'Equipo' }, evaluacion };
  try {
    InstanciaEvaluacion.find = () => ({ sort: async () => [ronda] });
    InstanciaEvaluacion.findById = () => ({ populate: () => ({ populate: async () => ronda }) });
    Evaluacion.findById = async () => evaluacion;
    Equipo.findById = async () => ronda.equipo;
    Respuesta.find = async () => [{ respuestas: [{ indicadorId: 'p', valor: 5 }, { indicadorId: 'n', valor: 5 }, { indicadorId: 'a', texto: 'Texto sin puntaje', valor: 5 }] }];
    const actual = await getEstadoActualDashboard('ronda');
    const historia = await getHistoricoPorEquipoYEvaluacion('equipo', 'evaluacion');
    assert.equal(actual.indiceGlobal, 50);
    assert.equal(historia.historico[0].indiceGlobal, actual.indiceGlobal);
    assert.deepEqual(historia.historico[0].secciones, actual.secciones);
    assert.equal(actual.secciones.length, 2);
    ronda.modoRespuesta = 'anonima';
    assert.deepEqual((await getHistoricoPorEquipoYEvaluacion('equipo', 'evaluacion')).historico, []);
  } finally {
    [InstanciaEvaluacion.find, InstanciaEvaluacion.findById, Evaluacion.findById, Equipo.findById, Respuesta.find] = originals;
  }
});
