/** Semáforo de clima (índice 0–100). */
export type SemaforoClima = 'Excelente' | 'Bueno' | 'Regular' | 'Crítico';

export function interpretarIndiceClima(indice: number): SemaforoClima {
  if (indice >= 80) return 'Excelente';
  if (indice >= 60) return 'Bueno';
  if (indice >= 40) return 'Regular';
  return 'Crítico';
}
