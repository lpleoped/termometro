import { Respuesta, IRespuesta } from '../models/Respuesta';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Evaluacion } from '../models/Evaluacion';

interface CrearRespuestaInput {
  instanciaEvaluacionId: string;
  respuestas: Array<{
    indicadorId: string;
    valor: number;
  }>;
  comentariosAbiertos?: {
    mejora?: string;
    satisfaccion?: string;
  };
}

export const crearRespuestaService = async (data: CrearRespuestaInput): Promise<IRespuesta> => {
  const { instanciaEvaluacionId, respuestas, comentariosAbiertos } = data;

  const instancia = await InstanciaEvaluacion.findById(instanciaEvaluacionId);
  if (!instancia) throw new Error('Instancia de evaluación no encontrada');

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

  for (const r of respuestas) {
    if (r.valor < 1 || r.valor > 5) {
      throw new Error(`Valor fuera de escala Likert 1–5: ${r.valor}`);
    }
  }

  const nuevaRespuesta = new Respuesta({
    instanciaEvaluacion: instancia._id,
    respuestas,
    comentariosAbiertos,
  });

  return nuevaRespuesta.save();
};
