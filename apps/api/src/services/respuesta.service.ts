import { Respuesta, IRespuesta } from '../models/Respuesta';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Evaluacion } from '../models/Evaluacion';

interface CrearRespuestaInput {
  instanciaEvaluacionId: string;
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
}

export const crearRespuestaService = async (data: CrearRespuestaInput): Promise<IRespuesta> => {
  const { instanciaEvaluacionId, respuestas, comentariosAbiertos, identidad, consentimientoIdentificado } = data;

  const instancia = await InstanciaEvaluacion.findById(instanciaEvaluacionId);
  if (!instancia) throw new Error('Instancia de evaluación no encontrada');
  if (instancia.modoRespuesta === 'identificada') {
    if (!consentimientoIdentificado) throw new Error('Necesitás aceptar el consentimiento para responder esta ronda');
    if (!identidad?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identidad.email)) throw new Error('Ingresá un email válido para esta ronda identificada');
  }

  const evaluacion = await Evaluacion.findById(instancia.evaluacion);
  if (!evaluacion) throw new Error('Evaluación asociada no encontrada');

  const indicadoresValidos = evaluacion.secciones.flatMap((s) => s.indicadores.map((i) => i.id));
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

  const nuevaRespuesta = new Respuesta({
    instanciaEvaluacion: instancia._id,
    respuestas,
    comentariosAbiertos,
    identidad: instancia.modoRespuesta === 'identificada' ? identidad : undefined,
    consentimientoIdentificado: instancia.modoRespuesta === 'identificada' ? true : false,
  });

  return nuevaRespuesta.save();
};
