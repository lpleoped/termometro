import type { HistoricoResponse } from '@termometro/shared';
import { InstanciaEvaluacion } from '../models/InstanciaEvaluacion';
import { Respuesta } from '../models/Respuesta';
import { Evaluacion } from '../models/Evaluacion';
import { Equipo } from '../models/Equipo';

/** Misma fórmula de índice que el dashboard de estado actual. */
export const getHistoricoPorEquipoYEvaluacion = async (
  equipoId: string,
  evaluacionId: string,
): Promise<HistoricoResponse> => {
  const instancias = await InstanciaEvaluacion.find({
    equipo: equipoId,
    evaluacion: evaluacionId,
  }).sort({ activadoEn: 1 });

  const equipo = await Equipo.findById(equipoId);
  const evaluacion: any = await Evaluacion.findById(evaluacionId);

  if (!equipo || !evaluacion) throw new Error('Equipo o evaluación no encontrada');

  const historico: any[] = [];

  for (const instancia of instancias) {
    const respuestas = await Respuesta.find({ instanciaEvaluacion: instancia._id });
    const cantidadRespondida = respuestas.length;
    const cantidadEsperada = instancia.cantidadEsperada;

    const resultadosPorIndicador: Record<string, number[]> = {};
    respuestas.forEach((r) => {
      r.respuestas.forEach(({ indicadorId, valor }) => {
        if (!resultadosPorIndicador[indicadorId]) {
          resultadosPorIndicador[indicadorId] = [];
        }
        resultadosPorIndicador[indicadorId].push(valor);
      });
    });

    let indiceGlobal = 0;
    const seccionesResult: any[] = [];

    evaluacion.secciones.forEach((seccion: any) => {
      let acumuladoSeccion = 0;
      seccion.indicadores.forEach((indicador: any) => {
        const valores = resultadosPorIndicador[indicador.id] || [];
        const promedio = valores.length
          ? valores.reduce((a: number, b: number) => a + b, 0) / valores.length
          : 0;
        acumuladoSeccion += promedio * 20;
      });

      const promedioSeccion = seccion.indicadores.length
        ? acumuladoSeccion / seccion.indicadores.length
        : 0;
      indiceGlobal += promedioSeccion * (seccion.ponderacion / 100);

      seccionesResult.push({
        titulo: seccion.titulo,
        valor: Math.round(promedioSeccion),
      });
    });

    historico.push({
      instanciaId: instancia._id,
      activadoEn: instancia.activadoEn,
      indiceGlobal: Math.round(indiceGlobal),
      secciones: seccionesResult,
      participacion: {
        esperada: cantidadEsperada,
        recibida: cantidadRespondida,
        porcentaje:
          cantidadEsperada > 0
            ? Math.round((cantidadRespondida / cantidadEsperada) * 100)
            : 0,
      },
    });
  }

  return {
    equipo: equipo.nombre,
    evaluacion: {
      titulo: evaluacion.titulo,
      version: evaluacion.version,
    },
    historico,
  };
};
