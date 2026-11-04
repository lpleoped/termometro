import type { DashboardEstadoActual } from '@termometro/shared';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Respuesta } from '../models/Respuesta';

/** Índice clima CUSTOM: promedio indicador → ×20 → promedio sección → Σ (sección × ponderación). */
export const getEstadoActualDashboard = async (
  instanciaId: string,
): Promise<DashboardEstadoActual> => {
  const instancia = await InstanciaEvaluacion.findById(instanciaId)
    .populate('equipo')
    .populate('evaluacion');

  if (!instancia) throw new Error('Instancia no encontrada');

  const respuestas = await Respuesta.find({ instanciaEvaluacion: instanciaId });
  const cantidadRespondida = respuestas.length;
  const cantidadEsperada = instancia.cantidadEsperada;
  const evaluacion: any = instancia.evaluacion;

  const resultadosPorIndicador: Record<string, number[]> = {};
  respuestas.forEach((r) => {
    r.respuestas.forEach(({ indicadorId, valor }) => {
      if (!resultadosPorIndicador[indicadorId]) {
        resultadosPorIndicador[indicadorId] = [];
      }
      resultadosPorIndicador[indicadorId].push(valor);
    });
  });

  const indicadoresResult: any[] = [];
  const seccionesResult: any[] = [];
  let indiceGlobal = 0;

  evaluacion.secciones.forEach((seccion: any) => {
    let acumuladoSeccion = 0;
    seccion.indicadores.forEach((indicador: any) => {
      const valores = resultadosPorIndicador[indicador.id] || [];
      const promedio = valores.length
        ? valores.reduce((a: number, b: number) => a + b, 0) / valores.length
        : 0;
      const normalizado = promedio * 20;
      acumuladoSeccion += normalizado;

      indicadoresResult.push({
        id: indicador.id,
        texto: indicador.texto,
        valorPonderado: Math.round(normalizado),
      });
    });

    const promedioSeccion = seccion.indicadores.length
      ? acumuladoSeccion / seccion.indicadores.length
      : 0;
    indiceGlobal += promedioSeccion * (seccion.ponderacion / 100);

    seccionesResult.push({
      titulo: seccion.titulo,
      ponderacion: seccion.ponderacion,
      valor: Math.round(promedioSeccion),
    });
  });

  return {
    equipo: (instancia.equipo as any).nombre,
    evaluacion: {
      titulo: evaluacion.titulo,
      version: evaluacion.version,
      tipo: evaluacion.tipo,
    },
    participacion: {
      esperada: cantidadEsperada,
      recibida: cantidadRespondida,
      porcentaje:
        cantidadEsperada > 0 ? Math.round((cantidadRespondida / cantidadEsperada) * 100) : 0,
    },
    indiceGlobal: Math.round(indiceGlobal),
    secciones: seccionesResult,
    indicadores: indicadoresResult,
  };
};
