/** Índice que se puede mostrar. Un cero sin respuestas no es un clima. */
export function indiceVisible(data: {
  indiceGlobal: number;
  indicadores?: Array<{ n?: number }>;
  privacidad?: { protegido?: boolean };
}): number | null {
  if (data.privacidad?.protegido) return null;
  if (!(data.indicadores || []).some((item) => (item.n || 0) > 0)) return null;
  return data.indiceGlobal;
}

export function frasePropuestas(cantidad: number): string {
  if (cantidad === 1) return 'La lectura está lista. Hay 1 propuesta en Accionables.';
  return `La lectura está lista. Hay ${cantidad} propuestas en Accionables.`;
}
