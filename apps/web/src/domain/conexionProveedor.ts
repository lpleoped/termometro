/** Con una sola conexión ya está elegida. Con varias, hace falta elegir. */
export function conexionLista(ids: readonly string[], elegida: string): string {
  if (ids.length === 1) return ids[0];
  return ids.includes(elegida) ? elegida : '';
}
