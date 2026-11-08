import type { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const counters = new Map<string, { startedAt: number; count: number }>();

export const publicResponseRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const token = typeof req.body?.tokenPublico === 'string' ? req.body.tokenPublico : 'missing-token';
  const key = `${req.ip}:${token}`;
  const now = Date.now();
  const current = counters.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) counters.set(key, { startedAt: now, count: 1 });
  else if (++current.count > MAX_REQUESTS) return res.status(429).json({ error: 'Demasiados intentos. Esperá un minuto y probá de nuevo.' });
  res.setHeader('RateLimit-Limit', MAX_REQUESTS);
  return next();
};
