import type { AccionPlanResponse, AIAnalysisResponse } from '@termometro/shared';

const CERRADAS = new Set(['verificada', 'rechazada']);

export function lecturaMasReciente(analisis: AIAnalysisResponse[], rondas: string[]): AIAnalysisResponse | null {
  const ids = new Set(rondas);
  return analisis
    .filter((item) => Boolean(item.instanciaId && ids.has(item.instanciaId)))
    .sort((a, b) => (b.creadoEn || '').localeCompare(a.creadoEn || ''))[0] || null;
}

export function ordenarAccionables(acciones: AccionPlanResponse[], lectura: AIAnalysisResponse | null) {
  const abiertas = acciones.filter((accion) => !CERRADAS.has(accion.estado || ''));
  const cerradas = acciones.filter((accion) => CERRADAS.has(accion.estado || ''));
  const adoptadas = new Set(
    acciones
      .filter((accion) => lectura && accion.analisisId === lectura.id && accion.propuestaIndice !== undefined)
      .map((accion) => accion.propuestaIndice),
  );
  const omitidas = new Set(lectura?.propuestasOmitidas || []);
  const propuestas = (lectura?.accionesContextuales || [])
    .map((propuesta, indice) => ({ propuesta, indice }))
    .filter(({ indice }) => !adoptadas.has(indice) && !omitidas.has(indice));
  return { abiertas, propuestas, cerradas };
}
