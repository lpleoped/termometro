import assert from 'node:assert/strict';
import { AIRequestError } from './services/ai-completion';
import { MENSAJE_ESPECIFICACION_VACIA, datosDeContexto, leerDiseno, pedidoAlModelo, validateGeneratedQuestionnaire } from './services/questionnaire-generation.service';

const cuestionario = {
  titulo: 'Carga de Operaciones',
  secciones: [{
    titulo: 'Energía',
    ponderacion: 100,
    indicadores: [{ id: 'e1', texto: 'El equipo llega con energía a la semana.', tipo: 'cuantitativo', direccion: 'positiva' }],
  }],
};

const conPrompt = leerDiseno({ prompt: 'Medí la carga de la semana y la energía para sostenerla.' });
assert.ok('prompt' in conPrompt);
if ('prompt' in conPrompt) assert.match(conPrompt.prompt, /carga de la semana/);

const sinCampo = leerDiseno({ constructo: 'Carga del equipo de operaciones', dimensiones: ['energía'] });
assert.ok('prompt' in sinCampo);
if ('prompt' in sinCampo) {
  assert.match(sinCampo.prompt, /Carga del equipo de operaciones/);
  assert.equal(sinCampo.prompt.includes('prompt generado'), false);
}

const conAbiertas = validateGeneratedQuestionnaire({
  titulo: 'Clima del equipo',
  secciones: [
    { titulo: 'Coordinación', ponderacion: 100, indicadores: [{ id: 'c1', texto: 'El equipo coordina el trabajo de la semana.', tipo: 'cuantitativo', direccion: 'positiva' }] },
    { titulo: 'Comentarios', ponderacion: 0, indicadores: [{ id: 'a1', texto: '¿Qué ayudaría a coordinarse mejor?', tipo: 'cualitativo', direccion: 'n/a' }, { id: 'a2', texto: 'Contá un ejemplo de la última semana.', tipo: 'cualitativo', direccion: 'neutral' }] },
  ],
});
assert.equal(conAbiertas.secciones[1].ponderacion, 0);
assert.equal(conAbiertas.secciones[1].indicadores[0].direccion, 'positiva');
assert.equal(conAbiertas.secciones[1].indicadores[1].tipo, 'cualitativo');

try {
  validateGeneratedQuestionnaire({
    titulo: 'Clima del equipo',
    secciones: [{ titulo: 'Coordinación', ponderacion: 0, indicadores: [{ id: 'c1', texto: 'El equipo coordina el trabajo de la semana.', tipo: 'cuantitativo', direccion: 'positiva' }] }],
  });
  throw new Error('Se aceptó una sección cuantitativa con peso 0');
} catch (error) {
  assert.ok(error instanceof AIRequestError);
  assert.equal(error.message, 'La IA devolvió una sección inválida.');
}

const yaListo = leerDiseno(cuestionario);
assert.ok('cuestionario' in yaListo);
if ('cuestionario' in yaListo) assert.equal(yaListo.cuestionario.titulo, 'Carga de Operaciones');

const anidado = leerDiseno({ prompt: { constructo: 'Clima del equipo', decision: 'Qué conversar el viernes' } });
assert.ok('prompt' in anidado);
if ('prompt' in anidado) assert.match(anidado.prompt, /Qué conversar el viernes/);

const datos = datosDeContexto([
  { title: 'Quiénes', content: 'Ocho personas de operaciones', status: 'active' },
  { title: 'Viejo', content: 'Ya no aplica', status: 'obsolete' },
  { title: '   ', content: 'Sin título', status: 'active' },
]);
assert.deepEqual(datos, [{ titulo: 'Quiénes', texto: 'Ocho personas de operaciones' }]);
const conContexto = pedidoAlModelo('especialista', 'la carga de la semana', datos);
assert.deepEqual(conContexto.contextoEquipo, datos);
assert.equal(conContexto.necesidad, 'la carga de la semana');
const sinContexto = pedidoAlModelo('especialista', 'la carga de la semana', []);
assert.equal('contextoEquipo' in sinContexto, false);
const pedidoConEspecificacion = pedidoAlModelo('especialista', 'la carga de la semana', datos, 'especificación');
assert.equal(pedidoConEspecificacion.promptExperto, 'especificación');
assert.equal(JSON.stringify(pedidoConEspecificacion).includes('como instrucción'), false);

for (const vacio of [{ prompt: '' }, { prompt: '   ' }, {}, null, '']) {
  try {
    leerDiseno(vacio);
    throw new Error('Se aceptó una especificación vacía');
  } catch (error) {
    assert.ok(error instanceof AIRequestError);
    assert.equal(error.message, MENSAJE_ESPECIFICACION_VACIA);
    assert.equal(error.message.includes('prompt generado'), false);
    assert.equal(error.message.includes('obligatorio'), false);
  }
}
