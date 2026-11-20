export interface CuestionarioMarca {
  equipoId?: string;
}

/** El cuestionario propio es el que se guardó para este equipo. */
export function marcasDeCuestionario(lista: CuestionarioMarca[] | unknown, equipoId: string) {
  const cuestionarios = Array.isArray(lista) ? lista as CuestionarioMarca[] : [];
  return {
    tieneCuestionario: Boolean(equipoId) && cuestionarios.some((item) => item.equipoId === equipoId),
    hayAlgunCuestionario: cuestionarios.length > 0,
  };
}

/** Los de este equipo quedan primero. Si no tiene, siguen los de la cuenta. */
export function ordenarCuestionarios<T extends CuestionarioMarca>(lista: T[], equipoId: string): T[] {
  if (!equipoId) return lista;
  return [
    ...lista.filter((item) => item.equipoId === equipoId),
    ...lista.filter((item) => item.equipoId !== equipoId),
  ];
}
