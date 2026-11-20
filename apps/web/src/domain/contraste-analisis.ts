export interface AnalisisContraste {
  id: string;
  creadoEn?: string;
  instanciaId?: string;
}

export interface EleccionContraste<T extends AnalisisContraste> {
  /** Hay una ronda anterior con análisis y esta ronda también tiene el suyo. */
  hayRondaAnterior: boolean;
  lectura?: T;
  referencia?: T;
  /** Versiones de la ronda abierta, de la más vieja a la más nueva. */
  versiones: T[];
  /** Todos los análisis del histórico, en orden de ronda y fecha. */
  opciones: T[];
}

function porFecha(a: AnalisisContraste, b: AnalisisContraste): number {
  return (a.creadoEn || '').localeCompare(b.creadoEn || '') || a.id.localeCompare(b.id);
}

/** El contraste es entre rondas. Dos versiones de la misma medición no son una evolución. */
export function elegirContraste<T extends AnalisisContraste>(
  rondas: Array<{ instanciaId: string; analisis: T[] }>,
  instanciaId: string,
  lecturaId: string,
  referenciaId: string,
): EleccionContraste<T> {
  const ordenadas = rondas.map((ronda) => ({
    instanciaId: ronda.instanciaId,
    analisis: [...ronda.analisis].sort(porFecha),
  }));
  const opciones = ordenadas.flatMap((ronda) => ronda.analisis);
  const indice = ordenadas.findIndex((ronda) => ronda.instanciaId === instanciaId);
  const actual = indice >= 0 ? ordenadas[indice] : undefined;
  const versiones = actual?.analisis ?? [];
  const lecturaPropia = versiones.at(-1);
  const lectura = opciones.find((item) => item.id === lecturaId) || lecturaPropia || opciones.at(-1);
  const referenciaDefault = indice > 0
    ? ordenadas.slice(0, indice).filter((ronda) => ronda.analisis.length > 0).at(-1)?.analisis.at(-1)
    : undefined;
  const referencia = referenciaDefault
    ? opciones.find((item) => item.id === referenciaId) || referenciaDefault
    : undefined;

  return {
    hayRondaAnterior: Boolean(lecturaPropia && referenciaDefault),
    lectura,
    referencia,
    versiones,
    opciones,
  };
}
