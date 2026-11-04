import axios from 'axios';
import { AccionPlan } from '../models/AccionPlan';
import { getEstadoActualDashboard } from './dashboard.service';
import { getHistoricoPorEquipoYEvaluacion } from './historico.service';

interface OpenAIResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

export const agregarAccionPlan = async (
  instanciaId: string,
  descripcion: string,
  autor?: string,
) => {
  const nueva = new AccionPlan({
    instanciaEvaluacion: instanciaId,
    descripcion,
    autor,
  });
  return nueva.save();
};

export const listarAccionesPorInstancia = async (instanciaId: string) => {
  return AccionPlan.find({ instanciaEvaluacion: instanciaId }).sort({ creadaEn: -1 });
};

export const sugerirAccionesConIA = async (
  instanciaId: string,
  equipoId: string,
  evaluacionId: string,
) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const estadoActual = await getEstadoActualDashboard(instanciaId);
  const historico = await getHistoricoPorEquipoYEvaluacion(equipoId, evaluacionId);

  const resumen = `
Equipo: ${estadoActual.equipo}
Evaluación: ${estadoActual.evaluacion.titulo} (v${estadoActual.evaluacion.version})

Índice global actual: ${estadoActual.indiceGlobal}%
Participación: ${estadoActual.participacion.porcentaje}%

Secciones:
${estadoActual.secciones.map((s) => `- ${s.titulo}: ${s.valor}%`).join('\n')}

Evolución histórica:
${historico.historico
  .map((h) => `• ${new Date(h.activadoEn).toLocaleDateString()}: ${h.indiceGlobal}%`)
  .join('\n')}
`;

  const response = await axios.post<OpenAIResponse>(
    'https://api.openai.com/v1/chat/completions',
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Sos un consultor experto en gestión de equipos. Generás planes de acción breves, claros y prácticos basados en diagnósticos de clima organizacional.',
        },
        {
          role: 'user',
          content: `${resumen}\n\nGenerá un plan de acción concreto para este equipo en base al diagnóstico actual y la evolución histórica. Enfocate en los aspectos más débiles.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.5,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    },
  );

  return response.data.choices[0].message.content;
};
