import { Request, Response, NextFunction } from 'express';

/**
 * LAN security middleware: in desktop LOCAL_NETWORK mode, only loopback clients
 * may access admin/auth/API routes. Non-loopback clients are restricted to:
 * - SPA static assets (handled by express.static, not here)
 * - /responder/:token public respondent page
 * - Public survey GET/POST by tokenPublico
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

const isPublicRoute = (path: string, method: string): boolean => {
  // Health check (all methods)
  if (path === '/api/health') return true;
  
  // Public respondent page (GET only)
  if (method === 'GET' && /^\/responder\/[^/]+$/.test(path)) return true;
  
  // Public respondent assets (handled by express.static before this middleware)
  // /r/:token is handled by backend routes (obtenerRondaPublicaService)
  
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
  
  // Non-loopback clients: allow only public routes
  if (isPublicRoute(path, method)) {
    return next();
  }
  
  // Also allow public response submission (POST /api/respuestas with tokenPublico)
  // This is already protected by publicResponseRateLimit and token validation
  if (method === 'POST' && path === '/api/respuestas') {
    return next();
  }
  
  // Also allow GET /r/:token (public survey load by token)
  if (method === 'GET' && /^\/r\/[^/]+$/.test(path)) {
    return next();
  }
  
  // Reject admin/auth/API routes from non-loopback in LAN mode
  res.status(403).json({
    error: 'Acceso denegado desde la red local. Solo el equipo local puede acceder a esta función.',
  });
};
