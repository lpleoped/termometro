import type { Request, Response, NextFunction } from 'express';
export function localManagement(req: Request, res: Response, next: NextFunction) {
  if (process.env.TERMOMETRO_DESKTOP !== 'true') return next();
  const local = ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '');
  const publicRead = req.method === 'GET' && (/^\/r\/[^/]+$/.test(req.path) || /^\/(instancias|evaluaciones)\/[^/]+$/.test(req.path));
  if (!local && !publicRead && !(req.method === 'POST' && req.path === '/respuestas')) return res.status(403).json({ error: 'Administrá el Termómetro desde la computadora donde está instalado.' });
  // Browser requests from unrelated sites must not manage an empty installation.
  if (local && req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Origen no permitido.' }); }
    catch { return res.status(403).json({ error: 'Origen no permitido.' }); }
  }
  next();
}
