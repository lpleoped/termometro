/** Acepta tanto una Query real como una promesa/fixture ya resuelto. */
export const resolveMongooseResult = async <T>(query: any): Promise<T> => {
  if (query && typeof query.lean === 'function') return plainRecord(await query.lean()) as T;
  return plainRecord(await query) as T;
};
/** Repository contracts use string IDs and serializable dates in both drivers. */
export const plainRecord = <T>(value: unknown): T => value === undefined ? value as T : JSON.parse(JSON.stringify(value));
