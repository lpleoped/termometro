import { ANALYSIS_INSTRUCTIONS, QUALITATIVE_ANALYSIS_INSTRUCTIONS, assertCleanInstructionText, validateAnalysis, validateProbeAnalysis } from './services/ai-completion';
import { HISTORICAL_ANALYSIS_INSTRUCTIONS } from './services/historical-context';
import { promptDesignerInstructions, questionnaireInstructions } from './services/questionnaire-generation.service';

const valid = {
  senalesEmocionales: [], temasRecurrentes: [],
  resumen: 'Señal agregada para conversación.', fortalezas: [], alertas: [], recomendaciones: [], nivelConfianza: 0.6,
  fuentes: ['indicator-1'], limitations: ['La confianza es narrativa y requiere revisión humana.'],
  hallazgos: [{ titulo: 'Participación', tipo: 'oportunidad', severidad: 'media', evidenciaIds: ['indicator-1'], confianza: 0.6 }],
  accionesContextuales: [{ titulo: 'Revisar el resultado', descripcion: 'Conversar con el equipo.', prioridad: 'media', alcance: 'equipo', ownerRole: 'Lider del equipo', horizon: '30d', successMetric: 'La conversación queda registrada.', checkInQuestion: '¿Qué cambió desde la conversación?', evidenceIds: ['indicator-1'], requiereValidacion: true }],
};

validateAnalysis(valid);
validateProbeAnalysis({ resumen: 'Prueba', fortalezas: [], alertas: [], recomendaciones: [], fuentes: [] });
try {
  validateProbeAnalysis({ ...valid, hallazgos: undefined, limitations: undefined });
} catch (error) {
  throw new Error(`La prueba de conexión rechazó un JSON compatible: ${String(error)}`);
}
try {
  validateAnalysis({ ...valid, accionesContextuales: [valid.accionesContextuales[0], valid.accionesContextuales[0], valid.accionesContextuales[0], valid.accionesContextuales[0]] });
  throw new Error('Se aceptaron más de tres prioridades');
} catch (error: any) {
  if (error?.code !== 'AI_FORMAT') throw error;
}
try {
  validateAnalysis({ ...valid, hallazgos: [{ ...valid.hallazgos[0], evidenciaIds: [] }] });
  throw new Error('Se aceptó un hallazgo sin evidencia');
} catch (error: any) {
  if (error?.code !== 'AI_FORMAT') throw error;
}
const conTemaFlojo = validateAnalysis({
  ...valid,
  temasRecurrentes: [
    { tema: 'Carga', frecuencia: 2, interpretacion: 'Se repite en dos respuestas.', evidenciaIds: ['q0', 'q1'] },
    { tema: 'Un solo comentario', frecuencia: 2, interpretacion: 'No alcanza para ser recurrente.', evidenciaIds: ['q0'] },
  ],
});
if (conTemaFlojo.temasRecurrentes.length !== 1 || conTemaFlojo.temasRecurrentes[0].tema !== 'Carga') {
  throw new Error('Un tema con una sola evidencia rechazó o desplazó al tema recurrente válido.');
}

for (const [name, instruction] of [
  ['diseño de cuestionario', promptDesignerInstructions],
  ['cuestionario', questionnaireInstructions],
  ['análisis', ANALYSIS_INSTRUCTIONS],
  ['cualitativo', QUALITATIVE_ANALYSIS_INSTRUCTIONS],
  ['histórico', HISTORICAL_ANALYSIS_INSTRUCTIONS],
] as const) {
  assertCleanInstructionText(instruction, name);
  if (!instruction.includes('á') && !instruction.includes('é') && !instruction.includes('í') && !instruction.includes('ó') && !instruction.includes('ú')) {
    throw new Error(`La instrucción ${name} perdió los acentos del español.`);
  }
}
if (!questionnaireInstructions.includes('declará dirección')) throw new Error('La instrucción del cuestionario no pide la dirección de cada indicador.');
for (const instruction of [promptDesignerInstructions, questionnaireInstructions]) {
  if (!instruction.includes('Casi nunca') || !instruction.includes('Casi siempre')) {
    throw new Error('La instrucción no pide una oración que se pueda contestar con Casi nunca y Casi siempre.');
  }
  if (!instruction.includes('Prohibido usar el nombre del tema como texto')) {
    throw new Error('La instrucción no prohíbe usar el nombre del tema como texto.');
  }
}
try {
  assertCleanInstructionText('declar\u00c3\u00a1 direccion', 'prueba');
  throw new Error('Se aceptó una instrucción con codificación rota');
} catch (error: any) {
  if (error?.code !== 'AI_PROMPT_ENCODING') throw error;
}
