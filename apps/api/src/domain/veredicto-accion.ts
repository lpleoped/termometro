import { ETIQUETA_VEREDICTO, type HorizonteAccion, type VeredictoAccion, type VeredictoIndicador } from '@termometro/shared';
import { redactText } from '../context-engineering';

export const UMBRAL_MOVIMIENTO = 3;
const DIAS: Record<HorizonteAccion, number> = { '7d': 7, '30d': 30, '90d': 90 };

export interface MedicionRonda {
  instanciaId: string;
  evaluacionId: string;
  activadoEn: string;
  indicadores: Array<{ id: string; texto?: string; valor: number | null }>;
}

export interface NotaSeguimiento {
  horizonte: string;
  estado?: string;
  nota?: string;
}

export interface EntradaMemoria {
  descripcion: string;
  estado?: string;
  horizonte?: HorizonteAccion;
  ejecutadaEn?: string | Date | null;
  indicadoresObjetivo: string[];
  rondaOrigenId: string;
  rondas: MedicionRonda[];
  notas: NotaSeguimiento[];
  ahora: Date;
}

export interface MemoriaAccion {
  veredictos: VeredictoIndicador[];
  texto: { title: string; content: string };
}

const tiempo = (valor: string) => Date.parse(valor);

export const horizonteVencido = (horizonte: HorizonteAccion | undefined, ejecutadaEn: string | Date | null | undefined, ahora: Date) => {
  if (!horizonte || !ejecutadaEn || !DIAS[horizonte]) return false;
  const inicio = new Date(ejecutadaEn).getTime();
  if (!Number.isFinite(inicio)) return false;
  return ahora.getTime() >= inicio + DIAS[horizonte] * 24 * 60 * 60 * 1000;
};

const notasEscritas = (notas: NotaSeguimiento[]) => notas.filter((item) => item.estado === 'completado' && item.nota?.trim());

const compacto = (item: VeredictoIndicador): VeredictoIndicador => {
  const row: VeredictoIndicador = { indicadorId: item.indicadorId, veredicto: item.veredicto };
  if (item.texto) row.texto = item.texto;
  if (typeof item.valorAdopcion === 'number') row.valorAdopcion = item.valorAdopcion;
  if (typeof item.valorPosterior === 'number') row.valorPosterior = item.valorPosterior;
  if (typeof item.delta === 'number') row.delta = item.delta;
  return row;
};

const veredictoDe = (vencido: boolean, adopcion: number | undefined, posterior: number | undefined): { veredicto: VeredictoAccion; delta?: number } => {
  if (!vencido) return { veredicto: 'todavia_es_pronto', delta: typeof adopcion === 'number' && typeof posterior === 'number' ? Math.round((posterior - adopcion) * 10) / 10 : undefined };
  if (typeof adopcion !== 'number' || typeof posterior !== 'number') return { veredicto: 'sin_medicion_posterior' };
  const delta = Math.round((posterior - adopcion) * 10) / 10;
  if (Math.abs(delta) < UMBRAL_MOVIMIENTO) return { veredicto: 'no_se_movio', delta };
  return { veredicto: delta > 0 ? 'hay_una_senal' : 'se_movio_en_contra', delta };
};

const linea = (item: VeredictoIndicador) => {
  const nombre = item.texto || item.indicadorId;
  const antes = typeof item.valorAdopcion === 'number' ? `${item.valorAdopcion}/100` : 'sin medición';
  const despues = typeof item.valorPosterior === 'number' ? `${item.valorPosterior}/100` : 'sin medición';
  const cambio = typeof item.delta === 'number' ? `${item.delta} puntos` : 'sin cambio calculado';
  return `Indicador ${nombre}: al adoptarla ${antes}; después ${despues}; movimiento ${cambio}; veredicto: ${ETIQUETA_VEREDICTO[item.veredicto]}.`;
};

export function calcularMemoria(entrada: EntradaMemoria): MemoriaAccion | null {
  if (entrada.estado === 'rechazada') return null;
  const origen = entrada.rondas.find((ronda) => ronda.instanciaId === entrada.rondaOrigenId);
  const origenTiempo = origen ? tiempo(origen.activadoEn) : Number.NaN;
  const posteriores = entrada.rondas
    .filter((ronda) => ronda.instanciaId !== entrada.rondaOrigenId && tiempo(ronda.activadoEn) > origenTiempo)
    .sort((a, b) => tiempo(a.activadoEn) - tiempo(b.activadoEn) || a.instanciaId.localeCompare(b.instanciaId));
  const escritas = notasEscritas(entrada.notas);
  if (!posteriores.length && !escritas.length) return null;

  const vencido = horizonteVencido(entrada.horizonte, entrada.ejecutadaEn, entrada.ahora);
  const veredictos = entrada.indicadoresObjetivo.map((indicadorId) => {
    const adopcion = origen?.indicadores.find((item) => item.id === indicadorId);
    const valorAdopcion = typeof adopcion?.valor === 'number' ? adopcion.valor : undefined;
    let valorPosterior: number | undefined;
    let texto = adopcion?.texto;
    for (const ronda of posteriores) {
      const medido = ronda.indicadores.find((item) => item.id === indicadorId);
      if (!medido) continue;
      if (medido.texto) texto = medido.texto;
      if (typeof medido.valor === 'number') valorPosterior = medido.valor;
    }
    const calculo = veredictoDe(vencido, valorAdopcion, valorPosterior);
    return compacto({ indicadorId, texto, valorAdopcion, valorPosterior, delta: calculo.delta, veredicto: calculo.veredicto });
  });

  const general: VeredictoAccion = vencido ? 'sin_medicion_posterior' : 'todavia_es_pronto';
  const descripcion = redactText(entrada.descripcion).slice(0, 120) || 'una acción';
  const notas = escritas.map((item) => `Nota de seguimiento ${item.horizonte}: ${redactText(item.nota || '')}.`).join(' ');
  const cuerpo = veredictos.length
    ? veredictos.map(linea).join(' ')
    : `No hay un indicador objetivo para comparar. Veredicto: ${ETIQUETA_VEREDICTO[general]}.`;
  const content = `Indicio en revisión, no un hecho cerrado. La acción «${descripcion}» quería mover indicadores. ${cuerpo} ${notas} El cambio del indicador no prueba causalidad.`.replace(/\s+/g, ' ').trim();
  const title = `Aprendizaje: ${descripcion}`.slice(0, 160);
  return { veredictos, texto: { title, content } };
}
