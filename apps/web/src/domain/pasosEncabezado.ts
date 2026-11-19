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
