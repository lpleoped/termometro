import type { DashboardEstadoActual } from '@termometro/shared';
import { evaluationRepository } from '../repositories/evaluation.repository';
import { responseRepository } from '../repositories/response.repository';
import { roundRepository } from '../repositories/round.repository';
import { teamRepository } from '../repositories/team.repository';

const normalizarIndicadorId = (valor: unknown): string => String(valor ?? '').trim();

export function comentariosDelDashboard(secciones: any[], respuestas: any[], protegido: boolean) {
  if (protegido) return [];
  const grupos: Array<{ id: string; pregunta: string; seccion: string; comentarios: string[] }> = secciones.flatMap(seccion => (seccion.indicadores || [])
    .filter((item: any) => item.tipo === 'cualitativo')
    .map((item: any) => ({ id: String(item.id), pregunta: String(item.texto), seccion: String(seccion.titulo), comentarios: [] as string[] })));
  const porId = new Map(grupos.map(grupo => [grupo.id, grupo]));
  for (const respuesta of respuestas) {
    for (const item of respuesta.respuestas || []) {
      if (typeof item.texto !== 'string' || !item.texto.trim()) continue;
      const id = String(item.indicadorId);
      if (!porId.has(id)) {
        const grupo = { id, pregunta: 'Comentario abierto', seccion: 'Otros comentarios', comentarios: [] as string[] };
        grupos.push(grupo);
        porId.set(id, grupo);
      }
      porId.get(id)!.comentarios.push(item.texto.trim());
    }
    for (const [clave, texto] of Object.entries(respuesta.comentariosAbiertos || {})) {
      if (typeof texto !== 'string' || !texto.trim()) continue;
      const id = `comentario:${clave}`;
      if (!porId.has(id)) {
        const grupo = { id, pregunta: clave === 'mejora' ? 'Sugerencias de mejora' : clave === 'satisfaccion' ? 'Comentarios de satisfacción' : 'Comentario abierto', seccion: 'Comentarios abiertos', comentarios: [] as string[] };
        grupos.push(grupo);
        porId.set(id, grupo);
      }
      porId.get(id)!.comentarios.push(texto.trim());
    }
  }
  // No se exponen identidad, fecha ni IDs de participantes; tampoco se vinculan respuestas entre preguntas.
  for (const grupo of grupos) grupo.comentarios.sort((a, b) => a.localeCompare(b));
  return grupos;
}

/** Extrae únicamente respuestas Likert de indicadores declarados como cuantitativos. */
export const extraerRespuestasCuantitativas = (
  respuestas: Array<{ respuestas?: Array<{ indicadorId?: unknown; valor?: unknown }> }>,
  indicadoresCuantitativos: Set<string>,
): Record<string, number[]> => {
  const resultado: Record<string, number[]> = {};
  respuestas.forEach((respuesta) => {
    (respuesta.respuestas || []).forEach((item) => {
      const id = normalizarIndicadorId(item.indicadorId);
      if (!id || !indicadoresCuantitativos.has(id)) return;
      const valor = Number(item.valor);
      if (Number.isInteger(valor) && valor >= 1 && valor <= 5) {
        (resultado[id] ||= []).push(valor);
      }
    });
  });
  return resultado;
};

/** Cuenta personas, no respuestas: una persona sólo aporta una vez por sección. */
export const contarPersonasConRespuestaValida = (
  respuestas: Array<{ respuestas?: Array<{ indicadorId?: unknown; valor?: unknown }> }>,
  indicadoresDeSeccion: Set<string>,
): number => respuestas.filter((respuesta) => (respuesta.respuestas || []).some((item) => {
  const valor = Number(item.valor);
  return indicadoresDeSeccion.has(normalizarIndicadorId(item.indicadorId))
    && Number.isInteger(valor)
    && valor >= 1
    && valor <= 5;
})).length;

export const calidadDe = (valores: number[]) => {
  if (valores.length < 3) return { dispersion: null, techoPiso: null, disponible: false } as const;
  const media = valores.reduce((sum, valor) => sum + valor, 0) / valores.length;
  const dispersion = Math.round(Math.sqrt(valores.reduce((sum, valor) => sum + (valor - media) ** 2, 0) / valores.length) * 100) / 100;
  const piso = valores.filter(valor => valor <= 1).length / valores.length >= 0.8;
  const techo = valores.filter(valor => valor >= 5).length / valores.length >= 0.8;
  return { dispersion, techoPiso: piso ? 'piso' : techo ? 'techo' : null, disponible: true } as const;
};

/** Índice cuantitativo CUSTOM: Likert 1–5 → puntaje favorable 0–100 → promedio de sección → ponderación. */
export const getEstadoActualDashboard = async (
  instanciaId: string,
): Promise<DashboardEstadoActual> => {
  const instancia = await roundRepository().findById(instanciaId);

  if (!instancia) throw new Error('Instancia no encontrada');

  const respuestas = await responseRepository().listByRound(instanciaId);
  const cantidadRespondida = respuestas.length;
  const cantidadEsperada = instancia.cantidadEsperada;
  const minimoAnonimato = instancia.minimoAnonimato ?? 1;
  const protegido = instancia.modoRespuesta === 'anonima' && cantidadRespondida < minimoAnonimato;
  const evaluacionRef: any = instancia.evaluacion;
  const evaluacion: any = evaluacionRef && typeof evaluacionRef === 'object' && Array.isArray(evaluacionRef.secciones)
    ? instancia.evaluacion
    : await evaluationRepository().findById(String(instancia.evaluacion));
  if (!evaluacion) throw new Error('Evaluación asociada no encontrada');
  const equipoRef: any = instancia.equipo;
  const equipo: any = equipoRef && typeof equipoRef === 'object' && typeof equipoRef.nombre === 'string'
    ? instancia.equipo
    : instancia.equipo ? await teamRepository().findById(String(instancia.equipo)) : null;

  const indicadoresCualitativos = evaluacion.secciones.flatMap((seccion: any) => (seccion.indicadores || []).filter((indicador: any) => indicador.tipo === 'cualitativo'));
  const indicadoresCuantitativos = new Set<string>(evaluacion.secciones.flatMap((seccion: any) => (seccion.indicadores || [])
    .filter((indicador: any) => indicador.tipo === 'cuantitativo')
    .map((indicador: any) => normalizarIndicadorId(indicador.id))));
  const respuestasCualitativas = (protegido ? [] : respuestas).filter((respuesta) => respuesta.respuestas.some((item: any) => typeof item.texto === 'string' && item.texto.trim()));
  const resultadosPorIndicador = extraerRespuestasCuantitativas(protegido ? [] : respuestas, indicadoresCuantitativos);

  const indicadoresResult: any[] = [];
  const seccionesResult: any[] = [];
  const alertas: any[] = [];
  let indiceGlobal = 0;
  let pesoCuantitativo = 0;

  evaluacion.secciones.forEach((seccion: any) => {
    const indicadoresCuantitativos = seccion.indicadores.filter((indicador: any) => indicador.tipo === 'cuantitativo');
    const idsDeSeccion = new Set<string>(indicadoresCuantitativos.map((indicador: any) => normalizarIndicadorId(indicador.id)));
    let acumuladoSeccion = 0;
    let indicadoresConRespuesta = 0;
    indicadoresCuantitativos.forEach((indicador: any) => {
      const valores = resultadosPorIndicador[normalizarIndicadorId(indicador.id)] || [];
      const promedio = valores.length
        ? valores.reduce((a: number, b: number) => a + b, 0) / valores.length
        : 0;
      const direccion = indicador.direccion === 'negativa' ? 'negativa' : 'positiva';
      // El dashboard expresa siempre "favorable": 100 es mejor y 0 es peor.
      const normalizado = (direccion === 'negativa' ? 5 - promedio : promedio) * 20;
      // Dato faltante no equivale a una puntuación cero.
      if (valores.length) {
        acumuladoSeccion += normalizado;
        indicadoresConRespuesta += 1;
      }

      indicadoresResult.push({
        id: indicador.id,
        texto: indicador.texto,
        valorPonderado: Math.round(normalizado),
        direccion,
        n: valores.length,
        calidad: calidadDe(valores),
      });
    });

    if (!indicadoresCuantitativos.length) return;
    const promedioSeccion = indicadoresConRespuesta ? acumuladoSeccion / indicadoresConRespuesta : 0;
    if (indicadoresConRespuesta) pesoCuantitativo += Number(seccion.ponderacion) || 0;

    seccionesResult.push({
      titulo: seccion.titulo,
      ponderacion: seccion.ponderacion,
      valor: Math.round(promedioSeccion),
      // n de sección significa personas con al menos una respuesta válida,
      // no la suma de preguntas respondidas.
      n: contarPersonasConRespuestaValida(protegido ? [] : respuestas, idsDeSeccion),
      calidad: calidadDe(indicadoresCuantitativos.flatMap((indicador: any) => resultadosPorIndicador[normalizarIndicadorId(indicador.id)] || [])),
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
    equipo: (instancia as any).alcance === 'persona' && (instancia as any).evaluadoNombre
      ? `Evaluación de ${(instancia as any).evaluadoNombre}`
      : equipo?.nombre || 'Evaluación individual',
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
      grupos: comentariosDelDashboard(evaluacion.secciones, respuestas, protegido),
    },
    calidadMedicion: {
      advertencias: [
        ...(cantidadEsperada > 0 && cantidadRespondida / cantidadEsperada < 0.5 ? ['La participaciÃ³n es baja; el resultado representa a quienes respondieron.'] : []),
        ...(cantidadRespondida < 3 ? ['La muestra no permite estimar dispersiÃ³n ni detectar techo/piso con estabilidad.'] : []),
      ],
      semaforoEsOperativo: true,
    },
    alertas,
  };
};
