import type { IRespuesta } from '../models/Respuesta';
import { evaluationRepository } from '../repositories/evaluation.repository';
import { responseRepository } from '../repositories/response.repository';
import { roundRepository } from '../repositories/round.repository';

interface CrearRespuestaInput {
  instanciaEvaluacionId?: string;
  tokenPublico?: string;
  respuestas: Array<{
    indicadorId: string;
    valor?: number;
    texto?: string;
  }>;
  comentariosAbiertos?: {
    mejora?: string;
    satisfaccion?: string;
  };
  identidad?: { nombre?: string; email?: string };
  consentimientoIdentificado?: boolean;
  idempotencyKey?: string;
}

export const crearRespuestaService = async (data: CrearRespuestaInput): Promise<IRespuesta> => {
  const { instanciaEvaluacionId, tokenPublico, respuestas, comentariosAbiertos, identidad, consentimientoIdentificado, idempotencyKey } = data;

  if (tokenPublico !== undefined && typeof tokenPublico !== 'string') throw new Error('Token público inválido');
  if (instanciaEvaluacionId !== undefined && typeof instanciaEvaluacionId !== 'string') throw new Error('ID de instancia inválido');
  if (tokenPublico && !/^[A-Za-z0-9_-]{40,64}$/.test(tokenPublico)) throw new Error('Formato de token público inválido');

  const instancia = tokenPublico ? await roundRepository().findByPublicToken(tokenPublico) : instanciaEvaluacionId ? await roundRepository().findById(instanciaEvaluacionId) : null;
  if (!instancia) throw new Error('Instancia de evaluación no encontrada');
  if (instancia.estado !== 'activa') throw new Error('La ronda está cerrada');
  if (idempotencyKey) {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) throw new Error('Clave de idempotencia inválida');
    const previous = await responseRepository().findByIdempotency(instancia._id, idempotencyKey);
    if (previous) return previous as unknown as IRespuesta;
  }
  if (instancia.modoRespuesta === 'identificada') {
    if (!consentimientoIdentificado) throw new Error('Necesitás aceptar el consentimiento para responder esta ronda');
    if (!identidad?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identidad.email)) throw new Error('Ingresá un email válido para esta ronda identificada');
  }

  const evaluacion = await evaluationRepository().findById(String(instancia.evaluacion));
  if (!evaluacion) throw new Error('Evaluación asociada no encontrada');

  const indicadoresValidos = evaluacion.secciones.flatMap((s: any) => s.indicadores.map((i: any) => i.id));
  const idsRecibidos = respuestas.map((r) => r.indicadorId);
  const idsUnicos = new Set(idsRecibidos);

  for (const id of idsUnicos) {
    if (!indicadoresValidos.includes(id)) {
      throw new Error(`Indicador inválido o desconocido: ${id}`);
    }
  }

  if (idsRecibidos.length !== idsUnicos.size) {
    throw new Error('Existen respuestas duplicadas para un mismo indicador');
  }

  const indicadoresCualitativos = new Set(evaluacion.secciones.flatMap((s: any) => s.indicadores.filter((i: any) => i.tipo === 'cualitativo').map((i: any) => i.id)));
  for (const r of respuestas) {
    if (indicadoresCualitativos.has(r.indicadorId)) {
      if (typeof r.texto !== 'string' || r.texto.trim().length > 2000) throw new Error('La respuesta cualitativa debe tener texto válido');
      continue;
    }
    if (typeof r.valor !== 'number' || r.valor < 1 || r.valor > 5) {
      throw new Error(`Valor fuera de escala Likert 1–5: ${r.valor}`);
    }
  }

  return responseRepository().insert({
    instanciaEvaluacion: instancia._id,
    respuestas,
    comentariosAbiertos,
    identidad: instancia.modoRespuesta === 'identificada' ? identidad : undefined,
    consentimientoIdentificado: instancia.modoRespuesta === 'identificada',
    idempotencyKey,
  }) as unknown as Promise<IRespuesta>;
};
