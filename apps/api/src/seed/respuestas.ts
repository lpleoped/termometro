import { Respuesta } from '../models/Respuesta';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Evaluacion } from '../models/Evaluacion';

export async function crearRespuestas() {
  const instancias = await InstanciaEvaluacion.find();

  if (instancias.length === 0) {
    console.warn('No hay instancias para responder');
    return;
  }

  const perfiles = [
    { estado: 'crítico', min: 1, max: 2 },
    { estado: 'regular', min: 2, max: 3 },
    { estado: 'bueno', min: 3, max: 4 },
    { estado: 'excelente', min: 4, max: 5 },
  ];

  const comentarios = {
    crítico: {
      satisfaccion: 'El ambiente está tenso y la comunicación es escasa.',
      mejora: 'Revisar roles, liderazgo y salud del equipo.',
    },
    regular: {
      satisfaccion: 'El equipo funciona, pero hay desgaste o falta de foco.',
      mejora: 'Más planificación y espacios de mejora continua.',
    },
    bueno: {
      satisfaccion: 'Buen trabajo en general, con compromiso visible.',
      mejora: 'Alinear mejor objetivos e iniciativas.',
    },
    excelente: {
      satisfaccion: 'Ambiente motivador y mucha colaboración.',
      mejora: 'Seguir consolidando esta dinámica positiva.',
    },
  };

  let total = 0;
  let forzado = false;

  for (const [index, instancia] of instancias.entries()) {
    const evaluacion = await Evaluacion.findById(instancia.evaluacion);
    if (!evaluacion) {
      console.warn(`Evaluación no encontrada para instancia ${instancia._id}`);
      continue;
    }

    const indicadores = evaluacion.secciones.flatMap((seccion) =>
      seccion.indicadores.map((ind) => ind.id),
    );

    const perfil = perfiles[index % perfiles.length];
    const comentariosPerfil = comentarios[perfil.estado as keyof typeof comentarios];

    for (let i = 0; i < 3; i++) {
      const respuestas = indicadores.map((id, idx) => {
        let valor = Math.floor(Math.random() * (perfil.max - perfil.min + 1)) + perfil.min;
        if (!forzado && idx === 0) {
          valor = 1;
          forzado = true;
        }
        return { indicadorId: id, valor };
      });

      await Respuesta.create({
        instanciaEvaluacion: instancia._id,
        respuestas,
        comentariosAbiertos: {
          satisfaccion: comentariosPerfil.satisfaccion,
          mejora: comentariosPerfil.mejora,
        },
        respondidoEn: new Date(),
      });

      total++;
    }

    console.log(`${perfil.estado.toUpperCase()} → respuestas para instancia ${instancia._id}`);
  }

  console.log(`Total de respuestas generadas: ${total}`);
}
