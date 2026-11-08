import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipLimits = new Map<string, RateLimitEntry>();
const accountLimits = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 20;
const MAX_ATTEMPTS_PER_ACCOUNT = 5;

const cleanup = () => {
  const now = Date.now();
  for (const [key, entry] of ipLimits) {
    if (entry.resetAt < now) ipLimits.delete(key);
  }
  for (const [key, entry] of accountLimits) {
    if (entry.resetAt < now) accountLimits.delete(key);
  }
};

setInterval(cleanup, 60 * 1000);

const checkLimit = (map: Map<string, RateLimitEntry>, key: string, max: number): boolean => {
  const now = Date.now();
  const entry = map.get(key);
  
  if (!entry || entry.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  
  if (entry.count >= max) {
    return false;
  }
  
  entry.count += 1;
  return true;
};

export const authRateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  
  if (!checkLimit(ipLimits, ip, MAX_ATTEMPTS_PER_IP)) {
    return res.status(429).json({ error: 'Demasiados intentos. Intentá nuevamente más tarde.' });
  }
  
  const email = req.body?.email?.toLowerCase().trim();
  if (email) {
    if (!checkLimit(accountLimits, email, MAX_ATTEMPTS_PER_ACCOUNT)) {
      return res.status(429).json({ error: 'Demasiados intentos. Intentá nuevamente más tarde.' });
    }
  }
  
  next();
};
