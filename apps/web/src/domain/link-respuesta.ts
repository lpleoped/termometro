const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Origen de la página abierta más `/r/:token`. No usa el puerto del API. */
export function linkDeLaPagina(origen: string, token: string): string {
  const base = origen.replace(/\/+$/, '');
  if (!base || !token) return '';
  return `${base}/r/${encodeURIComponent(token)}`;
}

function esLoopback(url: string): boolean {
  try {
    return LOOPBACK.has(new URL(url).hostname);
  } catch {
    return true;
  }
}

/**
 * Direcciones de la red local, distintas del link de la página.
 * Vacío hasta que la red está permitida. El loopback no entra.
 */
export function direccionesDeRed(urls: readonly string[], redPermitida: boolean, principal = ''): string[] {
  if (!redPermitida) return [];
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const url of urls) {
    if (!url || url === principal || esLoopback(url) || vistos.has(url)) continue;
    vistos.add(url);
    salida.push(url);
  }
  return salida;
}
