import { interpretarIndiceClima, type SemaforoClima } from '../../../../packages/shared/src/semaforo.ts';

export interface AtencionRespuestas { tipo: 'respuestas'; equipo: string; instanciaId: string }
export interface AtencionSeguimiento { tipo: 'seguimiento'; accion: string; instanciaId: string }
export interface AtencionPropuestas { tipo: 'propuestas'; instanciaId: string }
export interface AtencionContexto { tipo: 'contexto'; equipo: string; equipoId: string }
export interface AtencionOtraRonda { tipo: 'otra-ronda'; equipo: string; equipoId: string }
export type Atencion = AtencionRespuestas | AtencionSeguimiento | AtencionPropuestas | AtencionContexto | AtencionOtraRonda;

export function priorizarAtencion(input: {
  respuestas: AtencionRespuestas | null;
  seguimiento: AtencionSeguimiento | null;
  propuestas: AtencionPropuestas | null;
  contexto: AtencionContexto | null;
  otraRonda: AtencionOtraRonda;
}): { primaria: Atencion; lineas: Atencion[] } {
  const primaria = input.respuestas || input.seguimiento || input.propuestas || input.otraRonda;
  const lineas: Atencion[] = [];
  for (const item of [input.respuestas, input.seguimiento, input.propuestas, input.contexto]) {
    if (item && item !== primaria) lineas.push(item);
  }
  return { primaria, lineas };
}

/** Misma barrera que el veredicto «no se movió»: un descenso menor de 3 no es enfriamiento. */
const UMBRAL_ENFRIAMIENTO = 3;

export interface RondaHoy {
  instanciaId: string;
  abierta: boolean;
  /** Índice 0–100. Si la ronda está protegida, este número no se usa. */
  indice: number | null;
  protegido: boolean;
  recibidas: number;
  esperadas: number;
  sinLectura: boolean;
}

export interface EquipoHoy {
  equipoId: string;
  nombre: string;
  ultimaRonda: RondaHoy | null;
  /** Ronda anterior del mismo cuestionario. `comparable: false` no enfría. */
  anterior: { indice: number; comparable: boolean } | null;
  seguimientos: ReadonlyArray<{ venceEn: string; estado?: string }>;
  propuestasSinDecidir: boolean;
}

export interface LineaHoy {
  equipoId: string;
  frase: string;
  destino: string;
}

export interface HoyElegido {
  equipoId: string;
  nombre: string;
  frase: string;
  gesto: string;
  destino: string;
  instanciaId: string | null;
  lineas: LineaHoy[];
}

export type BandaMapa = 'atender' | 'curso' | 'calma';

export interface FilaMapa {
  equipoId: string;
  nombre: string;
  banda: BandaMapa;
  motivo: string;
  destino: string;
  /** Índice 0–100 solo si la ronda es legible. Si no, null. */
  indice: number | null;
  semaforo: SemaforoClima | null;
}

interface PuntoHistorico {
  instanciaId: string;
  activadoEn: string;
  indice: number;
}

/** Índice de la ronda anterior comparable. Si esta ronda no está en la lista, no hay con qué comparar. */
export function indiceAnteriorComparable(puntos: readonly PuntoHistorico[], instanciaId: string, comparable: boolean): number | null {
  if (!comparable || !instanciaId) return null;
  const ordenados = [...puntos].sort((a, b) => b.activadoEn.localeCompare(a.activadoEn));
  const lugar = ordenados.findIndex((punto) => punto.instanciaId === instanciaId);
  if (lugar < 0) return null;
  const previo = ordenados[lugar + 1];
  return previo && Number.isFinite(previo.indice) ? previo.indice : null;
}

function indiceLegible(ronda: RondaHoy | null): number | null {
  if (!ronda || ronda.protegido || ronda.recibidas <= 0) return null;
  if (ronda.indice == null || !Number.isFinite(ronda.indice)) return null;
  return ronda.indice;
}

function vencidosDe(equipo: EquipoHoy, ahora: number): number[] {
  return equipo.seguimientos
    .filter((item) => item.estado === 'pendiente')
    .map((item) => Date.parse(item.venceEn))
    .filter((momento) => Number.isFinite(momento) && momento <= ahora);
}

type Peldaño = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface Clasificado {
  equipo: EquipoHoy;
  peldaño: Peldaño;
  indice: number | null;
  vence: number | null;
}

function clasificar(equipo: EquipoHoy, ahora: number): Clasificado {
  const ronda = equipo.ultimaRonda;
  const indice = indiceLegible(ronda);
  const fechas = vencidosDe(equipo, ahora);
  const anterior = equipo.anterior;
  let peldaño: Peldaño = 7;
  if (fechas.length) peldaño = 1;
  else if (equipo.propuestasSinDecidir) peldaño = 2;
  else if (indice != null && interpretarIndiceClima(indice) === 'Crítico') peldaño = 3;
  else if (indice != null && anterior?.comparable && Number.isFinite(anterior.indice) && anterior.indice - indice >= UMBRAL_ENFRIAMIENTO) peldaño = 4;
  else if (ronda?.abierta && indice != null && ronda.sinLectura) peldaño = 5;
  else if (ronda?.abierta && (ronda.recibidas <= 0 || ronda.protegido)) peldaño = 6;
  return { equipo, peldaño, indice, vence: fechas.length ? Math.min(...fechas) : null };
}

function comparar(a: Clasificado, b: Clasificado, activo: string | null): number {
  if (a.peldaño !== b.peldaño) return a.peldaño - b.peldaño;
  if ((a.peldaño === 3 || a.peldaño === 4) && a.indice !== b.indice) return (a.indice ?? 0) - (b.indice ?? 0);
  if (a.peldaño === 1 && a.vence !== b.vence) return (a.vence ?? 0) - (b.vence ?? 0);
  const aActivo = Boolean(activo) && a.equipo.equipoId === activo;
  const bActivo = Boolean(activo) && b.equipo.equipoId === activo;
  if (aActivo !== bActivo) return aActivo ? -1 : 1;
  if (a.equipo.equipoId < b.equipo.equipoId) return -1;
  if (a.equipo.equipoId > b.equipo.equipoId) return 1;
  return 0;
}

function destinoDe(item: Clasificado): string {
  const { equipo, peldaño } = item;
  const ronda = equipo.ultimaRonda?.instanciaId || '';
  if (peldaño === 1 || peldaño === 2) return `/backoffice/accionables?equipoId=${equipo.equipoId}`;
  if (peldaño === 6) return `/backoffice/publicar-evaluacion?instanciaId=${ronda}`;
  if (peldaño === 7) return `/backoffice/publicar-evaluacion?equipoId=${equipo.equipoId}`;
  return `/backoffice/dashboard?instanciaId=${ronda}`;
}

function fraseDe(item: Clasificado): string {
  const nombre = item.equipo.nombre;
  if (item.peldaño === 1) return `Hoy, ${nombre}. El seguimiento venció.`;
  if (item.peldaño === 2) return `Hoy, ${nombre}. Hay propuestas sin decidir.`;
  if (item.peldaño === 3) return `Hoy, ${nombre}. El clima está crítico.`;
  if (item.peldaño === 4) return `Hoy, ${nombre}. El clima bajó.`;
  if (item.peldaño === 5) return `Hoy, ${nombre}. Hay respuestas nuevas.`;
  if (item.peldaño === 6) return `Hoy, ${nombre}. Casi nadie respondió.`;
  return `Hoy, ${nombre}. Podés abrir otra ronda.`;
}

function gestoDe(item: Clasificado): string {
  const nombre = item.equipo.nombre;
  if (item.peldaño === 1) return 'Registrar qué pasó';
  if (item.peldaño === 2) return 'Decidir las propuestas';
  if (item.peldaño === 4) return `Ver qué cambió en ${nombre}`;
  if (item.peldaño === 6) return `Compartir de nuevo con ${nombre}`;
  if (item.peldaño === 7) return `Abrir otra ronda de ${nombre}`;
  return `Ver cómo está ${nombre}`;
}

function bandaDe(peldaño: Peldaño): BandaMapa {
  if (peldaño <= 4) return 'atender';
  if (peldaño <= 6) return 'curso';
  return 'calma';
}

function motivoDe(item: Clasificado): string {
  const ronda = item.equipo.ultimaRonda;
  const conteo = item.indice == null && ronda ? `Respondió ${ronda.recibidas} de ${ronda.esperadas}.` : '';
  if (item.peldaño === 6) return conteo || 'Casi nadie respondió.';
  const base = item.peldaño === 1
    ? 'El seguimiento venció.'
    : item.peldaño === 2
      ? 'Hay propuestas sin decidir.'
      : item.peldaño === 3
        ? 'El clima está crítico.'
        : item.peldaño === 4
          ? 'El clima bajó.'
          : item.peldaño === 5
            ? 'Hay respuestas nuevas.'
            : 'Podés abrir otra ronda.';
  return conteo ? `${base} ${conteo}` : base;
}

function filaDe(item: Clasificado): FilaMapa {
  const indice = item.indice;
  return {
    equipoId: item.equipo.equipoId,
    nombre: item.equipo.nombre,
    banda: bandaDe(item.peldaño),
    motivo: motivoDe(item),
    destino: destinoDe(item),
    indice,
    semaforo: indice == null ? null : interpretarIndiceClima(indice),
  };
}

function ordenadosDe(cartera: readonly EquipoHoy[], equipoActivoId: string | null, ahora: number): Clasificado[] {
  const activo = equipoActivoId?.trim() ? equipoActivoId : null;
  return cartera.map((equipo) => clasificar(equipo, ahora)).sort((a, b) => comparar(a, b, activo));
}

function lineaDe(item: Clasificado): string {
  const nombre = item.equipo.nombre;
  const ronda = item.equipo.ultimaRonda;
  if (item.peldaño === 1) return `${nombre}: el seguimiento venció.`;
  if (item.peldaño === 2) return `${nombre}: hay propuestas sin decidir.`;
  if (item.peldaño === 3) return `${nombre} está crítico.`;
  if (item.peldaño === 4) return `${nombre}: el clima bajó.`;
  if (item.peldaño === 5) return `${nombre} tiene respuestas nuevas.`;
  if (item.peldaño === 6 && ronda) return `${nombre} está en silencio: respondió ${ronda.recibidas} de ${ronda.esperadas}.`;
  return `Abrir otra ronda de ${nombre}`;
}

function elegidoDe(item: Clasificado, lineas: LineaHoy[]): HoyElegido {
  return {
    equipoId: item.equipo.equipoId,
    nombre: item.equipo.nombre,
    frase: fraseDe(item),
    gesto: gestoDe(item),
    destino: destinoDe(item),
    instanciaId: item.equipo.ultimaRonda?.instanciaId || null,
    lineas,
  };
}

/**
 * Elige un equipo y un gesto. No lee almacenamiento ni promedia índices.
 * `equipoActivoId` ya viene leído: solo desempata dentro del mismo peldaño.
 */
export function elegirHoy(cartera: readonly EquipoHoy[], equipoActivoId: string | null, ahora: number): HoyElegido | null {
  if (!cartera.length) return null;
  const ordenados = ordenadosDe(cartera, equipoActivoId, ahora);
  const conSenal = ordenados.filter((item) => item.peldaño < 7);
  const ganador = conSenal[0] || ordenados[0];
  const lineas = (conSenal[0] ? conSenal.slice(1, 4) : []).map((item) => ({
    equipoId: item.equipo.equipoId,
    frase: lineaDe(item),
    destino: destinoDe(item),
  }));
  return elegidoDe(ganador, lineas);
}

/**
 * Ordena a todos los equipos medidos. No lee almacenamiento ni promedia índices.
 * El mismo id activo que usa `elegirHoy` solo desempata dentro del peldaño.
 */
export function mapaHoy(cartera: readonly EquipoHoy[], equipoActivoId: string | null, ahora: number): FilaMapa[] {
  return ordenadosDe(cartera, equipoActivoId, ahora).map(filaDe);
}
