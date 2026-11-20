import { Request, Response, NextFunction } from 'express';

/**
 * LAN security middleware: in desktop LOCAL_NETWORK mode, only loopback clients
 * may access admin/auth/API routes. Non-loopback clients are restricted to:
 * - la página de la encuesta, sus archivos y el envío de la respuesta
 * - /api/health endpoint
 * 
 * Use socket remoteAddress, NOT X-Forwarded-For (to avoid proxy spoofing).
 */

const isLoopback = (address: string): boolean => {
  // IPv4 loopback: 127.0.0.0/8
  if (address.startsWith('127.')) return true;
  // IPv6 loopback: ::1 or ::ffff:127.x.x.x (IPv4-mapped)
  if (address === '::1' || address === '::ffff:127.0.0.1') return true;
  if (address.startsWith('::ffff:127.')) return true;
  return false;
};

const ARCHIVOS_DE_LA_ENCUESTA = new Set([
  '/termometro-runtime.js',
  '/favicon.ico',
  '/favicon-32.png',
  '/favicon-16.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
  '/sw.js',
]);

/** Lo que un celular de la red puede pedir: la encuesta, sus archivos y el envío. */
export const esSolicitudPublicaEnRed = (path: string, method: string): boolean => {
  if (path.includes('..') || path.includes('\\')) return false;
  const verbo = method.toUpperCase();
  const lectura = verbo === 'GET' || verbo === 'HEAD';
  if (path === '/api/health' && lectura) return true;
  if (verbo === 'POST' && path === '/api/respuestas') return true;
  if (lectura && /^\/api\/r\/[^/]+$/.test(path)) return true;
  if (lectura && /^\/(?:r|responder)\/[^/]+$/.test(path)) return true;
  if (lectura && ARCHIVOS_DE_LA_ENCUESTA.has(path)) return true;
  if (lectura && /^\/assets\/[A-Za-z0-9._-]+$/.test(path)) return true;
  return false;
};

export const lanSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only enforce in desktop LOCAL_NETWORK mode
  if (process.env.LOCAL_NETWORK !== 'true' && process.env.TERMOMETRO_DESKTOP !== 'true') {
    return next();
  }
  
  const remoteAddress = req.socket.remoteAddress || '';
  const path = req.path;
  const method = req.method;
  
  // Loopback clients: allow everything
  if (isLoopback(remoteAddress)) {
    return next();
  }
  
  if (esSolicitudPublicaEnRed(path, method)) {
    return next();
  }
  
  // Reject admin/auth/API routes from non-loopback in LAN mode
  res.status(403).json({
    error: 'Acceso denegado desde la red local. Solo el equipo local puede acceder a esta función.',
  });
};
