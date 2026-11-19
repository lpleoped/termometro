import { log } from '../observability/logger';

const safe = (value: unknown) => typeof value === 'string' ? value.slice(0, 120) : value;

/** Auditoría operacional sin credenciales ni texto cualitativo crudo. */
export const auditEvent = (event: string, data: Record<string, unknown>) => {
  const sanitized = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, safe(value)]));
  log.info('auditoria', event, { codigo: event, contexto: sanitized });
};
