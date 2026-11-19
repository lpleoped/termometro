/** Un solo siguiente paso del facilitador. No lee almacenamiento ni sesión. */

export const PASOS_FACILITADOR = [
  'crear-equipo',
  'conectar-inteligencia',
  'cargar-proveedor',
  'elegir-proveedor',
  'probar',
  'activar',
  'dar-contexto',
  'armar-con-ia',
  'armar-a-mano',
  'compartir',
  'ver-la-ronda',
] as const;

export type PasoFacilitador = typeof PASOS_FACILITADOR[number];

export interface EstadoFacilitador {
  tieneEquipo: boolean;
  proveedores: number;
  proveedorElegido: boolean;
  proveedorProbado: boolean;
  iaActiva: boolean;
  /** Dejó la inteligencia apagada y sigue el camino a mano. */
  iaApagadaAProposito: boolean;
  tieneContexto: boolean;
  /** Cuestionario guardado para este equipo. Uno de otra cuenta no cuenta. */
  tieneCuestionario: boolean;
  /** Hay algún cuestionario en la cuenta, propio o no. Publicar queda como acción secundaria. */
  hayAlgunCuestionario: boolean;
  rondaCompartida: boolean;
  /**
   * `recorrido` lo usan el panel, la ficha y el encabezado: con un equipo ya
   * creado, la primaria es contexto, cuestionario o publicar. `asistente`
   * nombra el paso fino de la conexión, que sigue en Configuración.
   */
  lugar: 'recorrido' | 'asistente';
}

const pasoDeConexion = (estado: EstadoFacilitador, fino: PasoFacilitador): PasoFacilitador =>
  estado.lugar === 'asistente' ? fino : 'conectar-inteligencia';

const huecoDeInteligencia = (estado: EstadoFacilitador): PasoFacilitador | null => {
  if (estado.iaApagadaAProposito && !estado.iaActiva) return null;
  if (estado.proveedores < 1) return pasoDeConexion(estado, 'cargar-proveedor');
  if (!estado.proveedorElegido) return pasoDeConexion(estado, 'elegir-proveedor');
  if (!estado.iaActiva && !estado.proveedorProbado) return pasoDeConexion(estado, 'probar');
  if (!estado.iaActiva) return pasoDeConexion(estado, 'activar');
  return null;
};

export function siguientePaso(estado: EstadoFacilitador): PasoFacilitador {
  if (!estado.tieneEquipo) return 'crear-equipo';
  if (estado.rondaCompartida) return 'ver-la-ronda';
  if (estado.lugar === 'asistente') {
    const inteligencia = huecoDeInteligencia(estado);
    if (inteligencia) return inteligencia;
  }
  if (estado.iaActiva && !estado.tieneContexto) return 'dar-contexto';
  if (!estado.tieneCuestionario) return estado.iaActiva ? 'armar-con-ia' : 'armar-a-mano';
  return 'compartir';
}
