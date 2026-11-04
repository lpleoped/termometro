import { Evaluacion } from '../models/Evaluacion';
import { Usuario } from '../models/Usuario';
import { Types } from 'mongoose';

export async function crearEvaluaciones() {
  const usuario = await Usuario.findOne({ email: 'test@test.com' });
  if (!usuario) {
    console.error('Usuario test@test.com no encontrado');
    return;
  }

  const creadoPor = (usuario._id as Types.ObjectId).toString();

  const evaluaciones = [
    {
      titulo: 'Clima y Organización',
      descripcion: 'Evaluación integral del clima laboral, liderazgo y cohesión interna.',
      version: '2.0',
      tipo: 'CUSTOM' as const,
      creadoPor,
      secciones: [
        {
          titulo: 'Ambiente Laboral',
          ponderacion: 30,
          indicadores: [
            { id: 'CO1', texto: 'Relaciones interpersonales' },
            { id: 'CO2', texto: 'Ambiente de respeto y colaboración' },
            { id: 'CO3', texto: 'Manejo de conflictos dentro del equipo' },
            { id: 'CO4', texto: 'Satisfacción general con el entorno laboral' },
          ],
        },
        {
          titulo: 'Liderazgo y Comunicación',
          ponderacion: 40,
          indicadores: [
            { id: 'CO5', texto: 'Accesibilidad del liderazgo' },
            { id: 'CO6', texto: 'Claridad en la comunicación de objetivos' },
            { id: 'CO7', texto: 'Feedback constructivo y oportuno' },
            { id: 'CO8', texto: 'Apertura a nuevas ideas' },
          ],
        },
        {
          titulo: 'Cultura Organizacional',
          ponderacion: 30,
          indicadores: [
            { id: 'CO9', texto: 'Sentido de pertenencia' },
            { id: 'CO10', texto: 'Identificación con los valores de la organización' },
            { id: 'CO11', texto: 'Espacios para participación y mejora' },
          ],
        },
      ],
    },
    {
      titulo: 'Metodología de Trabajo',
      descripcion: 'Evaluación sobre la eficiencia, claridad y modernidad de los procesos de trabajo.',
      version: '2.0',
      tipo: 'CUSTOM' as const,
      creadoPor,
      secciones: [
        {
          titulo: 'Gestión de Procesos',
          ponderacion: 35,
          indicadores: [
            { id: 'MT1', texto: 'Claridad en los procesos de trabajo' },
            { id: 'MT2', texto: 'Seguimiento de metodologías definidas' },
            { id: 'MT3', texto: 'Eficiencia en la ejecución de tareas' },
            { id: 'MT4', texto: 'Adaptación a cambios en el proceso' },
          ],
        },
        {
          titulo: 'Herramientas de Trabajo',
          ponderacion: 30,
          indicadores: [
            { id: 'MT5', texto: 'Adecuación de herramientas tecnológicas' },
            { id: 'MT6', texto: 'Facilidad de uso de las herramientas' },
            { id: 'MT7', texto: 'Disponibilidad de recursos digitales' },
          ],
        },
        {
          titulo: 'Gestión del Tiempo y Prioridades',
          ponderacion: 35,
          indicadores: [
            { id: 'MT8', texto: 'Capacidad de cumplir con deadlines' },
            { id: 'MT9', texto: 'Priorización de tareas relevantes' },
            { id: 'MT10', texto: 'Distribución equilibrada de la carga laboral' },
          ],
        },
      ],
    },
    {
      titulo: 'Adopción de IA',
      descripcion: 'Evaluación sobre la integración de inteligencia artificial en el trabajo cotidiano.',
      version: '2.0',
      tipo: 'CUSTOM' as const,
      creadoPor,
      secciones: [
        {
          titulo: 'Conocimiento y Capacitación',
          ponderacion: 40,
          indicadores: [
            { id: 'IA1', texto: 'Nivel de conocimiento general en IA' },
            { id: 'IA2', texto: 'Capacitación recibida en herramientas de IA' },
            { id: 'IA3', texto: 'Confianza en el uso de IA en tareas diarias' },
          ],
        },
        {
          titulo: 'Implementación y Uso',
          ponderacion: 40,
          indicadores: [
            { id: 'IA4', texto: 'Participación en proyectos con IA' },
            { id: 'IA5', texto: 'Percepción de impacto positivo de IA' },
            { id: 'IA6', texto: 'Facilidad para incorporar IA a procesos existentes' },
          ],
        },
        {
          titulo: 'Cultura de Innovación',
          ponderacion: 20,
          indicadores: [
            { id: 'IA7', texto: 'Apertura del equipo a nuevas tecnologías' },
            { id: 'IA8', texto: 'Apoyo de liderazgo a iniciativas innovadoras' },
          ],
        },
      ],
    },
  ];

  for (const evaluacion of evaluaciones) {
    const existente = await Evaluacion.findOne({ titulo: evaluacion.titulo });
    if (existente) {
      console.log(`Evaluación ya existe: ${evaluacion.titulo}`);
      continue;
    }
    await Evaluacion.create(evaluacion);
    console.log(`Evaluación creada: ${evaluacion.titulo}`);
  }
}
