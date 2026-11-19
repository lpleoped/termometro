const { test } = require('node:test');
const assert = require('node:assert/strict');
const completion = require('../dist/services/ai-completion');
const settings = require('../dist/services/ai-settings.service');
const providerService = require('../dist/services/ai-provider.service');
const uso = require('../dist/services/uso.service');
const { generateQuestionnaire, MENSAJE_ESPECIFICACION_VACIA } = require('../dist/services/questionnaire-generation.service');

const cuestionario = {
  titulo: 'Carga de Operaciones',
  secciones: [{
    titulo: 'Energía',
    ponderacion: 100,
    indicadores: [{ id: 'e1', texto: 'El equipo llega con energía a la semana.', tipo: 'cuantitativo', direccion: 'positiva' }],
  }],
};

test('la generación acepta una respuesta usable y no invalida la prueba de conexión', async () => {
  const provider = { endpoint: 'https://api.openai.com/v1', modelName: 'gpt-test', status: 'active', checkVersion: 2 };
  const guardados = [];
  let llamadas = 0;
  let respuesta = () => ({ prompt: '' });
  settings.getAISettings = async () => ({ enabled: true, defaultProviderId: 'p1', budgetPreset: 'estándar' });
  settings.resolveAIProvider = async () => provider;
  providerService.getProviderCredentials = () => 'no-se-usa';
  providerService.saveProvider = async (guardado) => { guardados.push(guardado.status); return guardado; };
  uso.anotarUso = async () => {};
  completion.requestCompletion = async () => { llamadas += 1; return respuesta(); };
  const pedido = { role: 'especialista en carga y energía del equipo', request: 'Quiero entender la carga de Operaciones.' };

  respuesta = () => {
    if (llamadas === 1) return { constructo: 'Carga del equipo de operaciones', dimensiones: ['energía'] };
    return cuestionario;
  };
  const conEspecificacion = await generateQuestionnaire('cuenta', pedido);
  assert.equal(llamadas, 2);
  assert.equal(conEspecificacion.cuestionario.titulo, 'Carga de Operaciones');
  assert.match(conEspecificacion.prompt, /Carga del equipo de operaciones/);
  assert.equal(provider.status, 'active');
  assert.deepEqual(guardados, ['active']);

  llamadas = 0;
  guardados.length = 0;
  respuesta = () => cuestionario;
  const yaListo = await generateQuestionnaire('cuenta', pedido);
  assert.equal(llamadas, 1);
  assert.equal(yaListo.cuestionario.secciones[0].indicadores[0].direccion, 'positiva');
  assert.equal(provider.status, 'active');

  llamadas = 0;
  guardados.length = 0;
  respuesta = () => ({ prompt: '' });
  await assert.rejects(() => generateQuestionnaire('cuenta', pedido), (error) => {
    assert.equal(error.message, MENSAJE_ESPECIFICACION_VACIA);
    assert.equal(String(error.message).includes('prompt generado'), false);
    assert.equal(String(error.message).includes('obligatorio'), false);
    return true;
  });
  assert.equal(provider.status, 'active');
  assert.deepEqual(guardados, []);
});
