import { validateAnalysis, validateProbeAnalysis } from './services/ai-completion';

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
