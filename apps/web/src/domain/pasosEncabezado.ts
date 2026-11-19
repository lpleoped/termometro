import type { PasoFacilitador } from '@termometro/shared';

/** Los cinco nombres del primer uso, en el orden del encabezado. */
export const PASOS_VISIBLES = [
  { id: 'equipo', nombre: 'Equipo' },
  { id: 'inteligencia', nombre: 'Inteligencia' },
  { id: 'contexto', nombre: 'Contexto' },
  { id: 'cuestionario', nombre: 'Cuestionario' },
  { id: 'compartir', nombre: 'Compartir' },
] as const;

export type IdPasoVisible = (typeof PASOS_VISIBLES)[number]['id'];
export type EstadoPasoVisible = 'hecho' | 'actual' | 'futuro';

export interface PasoVisible {
  id: IdPasoVisible;
  nombre: string;
  estado: EstadoPasoVisible;
}

/** Traduce el paso de `siguientePaso` al nombre que se marca en el encabezado. */
export function pasoVisible(paso: PasoFacilitador): IdPasoVisible | null {
  if (paso === 'crear-equipo') return 'equipo';
  if (
    paso === 'conectar-inteligencia'
    || paso === 'cargar-proveedor'
    || paso === 'elegir-proveedor'
    || paso === 'probar'
    || paso === 'activar'
  ) return 'inteligencia';
  if (paso === 'dar-contexto') return 'contexto';
  if (paso === 'armar-con-ia' || paso === 'armar-a-mano') return 'cuestionario';
  if (paso === 'compartir') return 'compartir';
  return null;
}

/** Pantalla de cada paso del primer uso. Sin equipo, el destino no lleva query. */
export function destinoDePaso(id: IdPasoVisible, equipoId: string): string {
  const equipo = equipoId.trim();
  if (id === 'equipo') {
    return equipo ? `/backoffice/equipos?equipo=${encodeURIComponent(equipo)}` : '/backoffice/equipos';
  }
  if (id === 'inteligencia') {
    return equipo ? `/backoffice/configuracion/ia?equipoId=${encodeURIComponent(equipo)}` : '/backoffice/configuracion/ia';
  }
  if (id === 'contexto') {
    return equipo
      ? `/backoffice/equipos?equipo=${encodeURIComponent(equipo)}&paso=contexto`
      : '/backoffice/equipos?paso=contexto';
  }
  if (id === 'cuestionario') {
    return equipo ? `/backoffice/alta-evaluacion?equipoId=${encodeURIComponent(equipo)}` : '/backoffice/alta-evaluacion';
  }
  return equipo ? `/backoffice/publicar-evaluacion?equipoId=${encodeURIComponent(equipo)}` : '/backoffice/publicar-evaluacion';
}

function retornoInterno(from: unknown): from is string {
  return typeof from === 'string'
    && from.startsWith('/')
    && !from.startsWith('//')
    && !from.startsWith('/ayuda')
    && !from.includes('://')
    && !from.includes('\\');
}

/** A dónde vuelve la ayuda: la pantalla de origen, el paso actual, o el panel. */
export function destinoAlVolver(opciones: {
  autenticado: boolean;
  from: unknown;
  paso: PasoFacilitador | null;
  equipoId: string;
}): string {
  if (!opciones.autenticado) return '/';
  if (retornoInterno(opciones.from)) return opciones.from;
  const id = opciones.paso ? pasoVisible(opciones.paso) : null;
  if (id) return destinoDePaso(id, opciones.equipoId);
  return '/backoffice/home';
}

/** Los cinco pasos, con uno marcado. `ver-la-ronda` ya no es primer uso. */
export function pasosVisibles(paso: PasoFacilitador): PasoVisible[] | null {
  const actual = pasoVisible(paso);
  if (!actual) return null;
  const indice = PASOS_VISIBLES.findIndex((item) => item.id === actual);
  return PASOS_VISIBLES.map((item, orden) => ({
    id: item.id,
    nombre: item.nombre,
    estado: orden < indice ? 'hecho' : orden === indice ? 'actual' : 'futuro',
  }));
}
