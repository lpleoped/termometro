import assert from 'node:assert/strict';
import { TONE_PROMPT_VERSION } from '@termometro/shared';
import { ANALYSIS_INSTRUCTIONS, QUALITATIVE_ANALYSIS_INSTRUCTIONS, assertCleanInstructionText } from '../services/ai-completion';
import { TONE_INSTRUCTIONS, TonoInvalido, hayTextoParaTono, parseTono } from './tono';

const preguntas = ['¿Clima del equipo?', 'Qué está pesando esta semana'];
const fraseIds = ['f1', 'f2', 'f3'];
const entrada = { preguntas, fraseIds, comentarios: ['Las reuniones se comen la semana completa'] };

const valido = {
  oracion: 'La mayor parte de lo escrito suena a carga.',
  proporcion: { alivio: 0.2, mezcla: 0.3, tension: 0.5 },
  marcas: [
    { etiqueta: 'frustracion', intensidad: 0.8, direccion: 'negativa' },
    { etiqueta: 'energia', intensidad: 0.4, direccion: 'mixta' },
  ],
  frases: [
    { evidenciaId: 'f1', direccion: 'tension' },
    { evidenciaId: 'f2', direccion: 'mezcla' },
    { evidenciaId: 'f3', direccion: 'alivio' },
  ],
  temas: [
    { tema: 'Clima del equipo', interpretacion: 'El modelo copió la pregunta.', evidenciaIds: ['f1'] },
    { tema: 'Carga de reuniones', interpretacion: 'Lo que se repite es el peso de las reuniones.', evidenciaIds: ['f1', 'f2'] },
    { tema: 'Peso de la semana', interpretacion: 'Las reuniones se comen la semana completa.', evidenciaIds: ['f1'] },
  ],
};

assert.equal(hayTextoParaTono(2), false);
assert.equal(hayTextoParaTono(3), true);
assert.throws(() => parseTono(valido, { ...entrada, fraseIds: ['f1', 'f2'] }), TonoInvalido);

const tono = parseTono(valido, entrada);
assert.equal(tono.promptVersion, TONE_PROMPT_VERSION);
assert.equal(tono.oracion, valido.oracion);
assert.deepEqual(tono.proporcion, valido.proporcion);
assert.equal(tono.frases.length, 3);
assert.deepEqual(tono.temas.map((tema) => tema.tema), ['Carga de reuniones']);

assert.throws(
  () => parseTono({ ...valido, oracion: '¿Clima del equipo?' }, entrada),
  (error: unknown) => error instanceof TonoInvalido && /enunciado/.test((error as Error).message),
);

const dentroDeUnaPreguntaLarga = parseTono({
  ...valido,
  temas: [{ tema: 'Clima del equipo', interpretacion: 'Un recorte corto, no la pregunta.', evidenciaIds: ['f2'] }],
}, { ...entrada, preguntas: ['Cómo está el clima del equipo esta semana'] });
assert.deepEqual(dentroDeUnaPreguntaLarga.temas.map((tema) => tema.tema), ['Clima del equipo']);

assert.notEqual(TONE_INSTRUCTIONS, QUALITATIVE_ANALYSIS_INSTRUCTIONS);
assert.notEqual(TONE_INSTRUCTIONS, ANALYSIS_INSTRUCTIONS);
assert.match(TONE_INSTRUCTIONS, /no puede copiar el enunciado de la pregunta/i);
assert.match(TONE_INSTRUCTIONS, /proporci[oó]n/);
assertCleanInstructionText(TONE_INSTRUCTIONS, 'tono');
if (!/[áéíóú]/.test(TONE_INSTRUCTIONS)) throw new Error('El prompt de tono perdió los acentos del español.');

console.log('tono: ok');
