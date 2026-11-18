/**
 * Valida el cuestionario que devuelve la IA antes de que pueda guardarse.
 * Un instrumento con ponderaciones, direcciones o IDs inválidos corrompe el
 * índice del dashboard (los ítems negativos se invierten; un id duplicado
 * mezcla respuestas de preguntas distintas).
 */
import assert from 'node:assert/strict';
import { AIRequestError } from './services/ai-completion';
import { validateGeneratedQuestionnaire } from './services/questionnaire-generation.service';

const indicador = (
  id: string,
  texto = 'Pregunta',
  tipo: 'cuantitativo' | 'cualitativo' = 'cuantitativo',
  direccion: 'positiva' | 'negativa' = 'positiva',
) => ({ id, texto, tipo, direccion });

const seccion = (
  titulo: string,
  ponderacion: number,
  indicadores: ReturnType<typeof indicador>[],
) => ({ titulo, ponderacion, indicadores });

const cuestionario = (
  secciones: ReturnType<typeof seccion>[],
  titulo = 'Clima del equipo',
) => ({ titulo, secciones });

const valido = () => cuestionario([
  seccion(' Colaboración ', 60, [
    indicador(' apoyo ', ' Recibo apoyo cuando lo necesito '),
    indicador('friccion', 'Hay fricción para decidir', 'cuantitativo', 'negativa'),
  ]),
  seccion('Riesgo', 40, [
    indicador('comentario', 'Qué obstáculo viste este mes', 'cualitativo', 'negativa'),
  ]),
]);

const rechaza = (value: unknown) => {
  assert.throws(() => validateGeneratedQuestionnaire(value), (error: unknown) => {
    assert.ok(error instanceof AIRequestError, 'debe ser AIRequestError');
    assert.equal(error.code, 'AI_QUESTIONNAIRE_FORMAT');
    assert.equal(error.status, 502);
    return true;
  });
};

const normalizado = validateGeneratedQuestionnaire(valido());
assert.equal(normalizado.titulo, 'Clima del equipo');
assert.equal(normalizado.secciones[0].titulo, 'Colaboración');
assert.equal(normalizado.secciones[0].indicadores[0].id, 'apoyo');
assert.equal(normalizado.secciones[0].indicadores[0].texto, 'Recibo apoyo cuando lo necesito');
assert.equal(normalizado.secciones[0].indicadores[1].direccion, 'negativa');
assert.equal(normalizado.secciones[1].indicadores[0].tipo, 'cualitativo');
assert.equal(normalizado.secciones[1].indicadores[0].direccion, 'negativa');

const cincuenta = cuestionario(Array.from({ length: 5 }, (_, sectionIndex) => seccion(
  `Dimensión ${sectionIndex + 1}`,
  20,
  Array.from({ length: 10 }, (_, itemIndex) => indicador(`s${sectionIndex}-i${itemIndex}`)),
)));
assert.equal(validateGeneratedQuestionnaire(cincuenta).secciones.length, 5);

const ocho = cuestionario([
  ...Array.from({ length: 7 }, (_, index) => seccion(`S${index}`, 12, [indicador(`id-${index}`)])),
  seccion('Última', 16, [indicador('id-ultima', 'a'.repeat(1000))]),
]);
assert.equal(validateGeneratedQuestionnaire(ocho).secciones[7].indicadores[0].texto.length, 1000);

rechaza(null);
rechaza([]);
rechaza({ titulo: '   ', secciones: [seccion('S', 100, [indicador('a')])] });
rechaza({ titulo: 'a'.repeat(301), secciones: [seccion('S', 100, [indicador('a')])] });
rechaza(cuestionario([]));
rechaza(cuestionario(Array.from({ length: 9 }, (_, index) => seccion(`S${index}`, index === 0 ? 20 : 10, [indicador(`id-${index}`)]))));
rechaza(cuestionario([seccion('   ', 100, [indicador('a')])]));
rechaza(cuestionario([seccion('S', 0, [indicador('a')])]));
rechaza(cuestionario([seccion('S', -10, [indicador('a')])]));
rechaza(cuestionario([seccion('S', 50.5, [indicador('a')])]));
rechaza(cuestionario([seccion('S', '100' as unknown as number, [indicador('a')])]));
rechaza(cuestionario([seccion('A', 40, [indicador('a')]), seccion('B', 59, [indicador('b')])]));
rechaza(cuestionario([seccion('A', 40, [indicador('a')]), seccion('B', 61, [indicador('b')])]));
rechaza(cuestionario([seccion('S', 100, [])]));
rechaza(cuestionario([seccion('S', 100, Array.from({ length: 11 }, (_, index) => indicador(`i${index}`)))]));
rechaza(cuestionario([
  ...Array.from({ length: 5 }, (_, sectionIndex) => seccion(
    `D${sectionIndex}`,
    16,
    Array.from({ length: 10 }, (_, itemIndex) => indicador(`s${sectionIndex}-i${itemIndex}`)),
  )),
  seccion('Extra', 20, [indicador('extra')]),
]));
rechaza(cuestionario([seccion('S', 100, [indicador('mismo'), indicador(' mismo ')])]));
rechaza(cuestionario([
  seccion('A', 50, [indicador('compartido')]),
  seccion('B', 50, [indicador('compartido')]),
]));
rechaza(cuestionario([seccion('S', 100, [indicador('  ', 'texto')])]));
rechaza(cuestionario([seccion('S', 100, [indicador('a', '   ')])]));
rechaza(cuestionario([seccion('S', 100, [indicador('a', 'a'.repeat(1001))])]));
rechaza(cuestionario([seccion('S', 100, [{ id: 'a', texto: 'texto', tipo: 'cuantitativo' } as ReturnType<typeof indicador>])]));
rechaza(cuestionario([seccion('S', 100, [indicador('a', 'texto', 'cuantitativo', 'Positiva' as 'positiva')])]));
rechaza(cuestionario([seccion('S', 100, [indicador('a', 'texto', 'likert' as 'cuantitativo')])]));

console.log('questionnaire-validation.test: el instrumento generado rechaza formato, ponderación, dirección e IDs inválidos');
