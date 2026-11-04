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
  const minimoAnonimato = instancia.minimoAnonimato ?? 3;
  const protegido = instancia.modoRespuesta === 'anonima' && cantidadRespondida < minimoAnonimato;
  const evaluacion: any = instancia.evaluacion;

  const resultadosPorIndicador: Record<string, number[]> = {};
  const indicadoresCualitativos = evaluacion.secciones.flatMap((seccion: any) => (seccion.indicadores || []).filter((indicador: any) => indicador.tipo === 'cualitativo'));
  const respuestasCualitativas = (protegido ? [] : respuestas).filter((respuesta) => respuesta.respuestas.some((item: any) => typeof item.texto === 'string' && item.texto.trim()));
  (protegido ? [] : respuestas).forEach((r) => {
    r.respuestas.forEach(({ indicadorId, valor }) => {
      if (!resultadosPorIndicador[indicadorId]) {
        resultadosPorIndicador[indicadorId] = [];
      }
      if (typeof valor === 'number') resultadosPorIndicador[indicadorId].push(valor);
    });
  });

  const indicadoresResult: any[] = [];
  const seccionesResult: any[] = [];
  const alertas: any[] = [];
  let indiceGlobal = 0;
  let pesoCuantitativo = 0;

  evaluacion.secciones.forEach((seccion: any) => {
    const indicadoresCuantitativos = seccion.indicadores.filter((indicador: any) => indicador.tipo !== 'cualitativo');
    let acumuladoSeccion = 0;
    indicadoresCuantitativos.forEach((indicador: any) => {
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

    if (!indicadoresCuantitativos.length) return;
    const promedioSeccion = acumuladoSeccion / indicadoresCuantitativos.length;
    pesoCuantitativo += Number(seccion.ponderacion) || 0;

    seccionesResult.push({
      titulo: seccion.titulo,
      ponderacion: seccion.ponderacion,
      valor: Math.round(promedioSeccion),
    });
  });

  indiceGlobal = seccionesResult.reduce((total, seccion: any) => total + seccion.valor * ((Number(seccion.ponderacion) || 0) / Math.max(pesoCuantitativo, 1)), 0);

  const reglas = evaluacion.configuracion?.reglasAlertas;
  if (reglas && !protegido) {
    const atencion = Number(reglas.umbralAtencion);
    const critico = Number(reglas.umbralCritico);
    for (const seccion of seccionesResult) {
      const severidad = Number.isFinite(critico) && seccion.valor <= critico ? 'critica' : Number.isFinite(atencion) && seccion.valor <= atencion ? 'atencion' : null;
      if (severidad) alertas.push({ tipo: 'nivel', severidad, titulo: `Nivel bajo en ${seccion.titulo}`, evidencia: `${seccion.titulo} registra ${seccion.valor} / 100.`, valor: seccion.valor });
    }
  }

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
    privacidad: {
      modo: instancia.modoRespuesta,
      protegido,
      minimoRespuestas: minimoAnonimato,
    },
    cualitativo: {
      preguntas: indicadoresCualitativos.length,
      respuestas: respuestasCualitativas.length,
      disponible: !protegido,
    },
    alertas,
  };
};
