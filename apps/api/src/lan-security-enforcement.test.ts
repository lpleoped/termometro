/**
 * Ejecuta el middleware real de LAN. Las pruebas anteriores reimplementaban
 * la regla y no hubieran detectado un desvío en la lista de rutas públicas
 * ni en la condición LOCAL_NETWORK / TERMOMETRO_DESKTOP.
 */
import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { lanSecurityMiddleware } from './middleware/lan-security.middleware';

const previous = {
  LOCAL_NETWORK: process.env.LOCAL_NETWORK,
  TERMOMETRO_DESKTOP: process.env.TERMOMETRO_DESKTOP,
};

const restoreEnv = () => {
  if (previous.LOCAL_NETWORK === undefined) delete process.env.LOCAL_NETWORK;
  else process.env.LOCAL_NETWORK = previous.LOCAL_NETWORK;
  if (previous.TERMOMETRO_DESKTOP === undefined) delete process.env.TERMOMETRO_DESKTOP;
  else process.env.TERMOMETRO_DESKTOP = previous.TERMOMETRO_DESKTOP;
};

const decide = (
  flags: { localNetwork?: string; desktop?: string },
  request: { address?: string; path: string; method: string },
) => {
  if (flags.localNetwork === undefined) delete process.env.LOCAL_NETWORK;
  else process.env.LOCAL_NETWORK = flags.localNetwork;
  if (flags.desktop === undefined) delete process.env.TERMOMETRO_DESKTOP;
  else process.env.TERMOMETRO_DESKTOP = flags.desktop;

  let nextCalled = false;
  let statusCode = 0;
  let body: unknown;
  const req = {
    socket: { remoteAddress: request.address },
    path: request.path,
    method: request.method,
  } as Request;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      body = data;
      return this;
    },
  } as Response;
  const next: NextFunction = () => {
    nextCalled = true;
  };
  lanSecurityMiddleware(req, res, next);
  return { nextCalled, statusCode, body };
};

try {
  const permitido = (flags: { localNetwork?: string; desktop?: string }, request: { address?: string; path: string; method: string }) => {
    const result = decide(flags, request);
    assert.equal(result.nextCalled, true, `${request.method} ${request.path} desde ${request.address || '(vacío)'} debía seguir`);
    assert.equal(result.statusCode, 0);
  };
  const bloqueado = (flags: { localNetwork?: string; desktop?: string }, request: { address?: string; path: string; method: string }) => {
    const result = decide(flags, request);
    assert.equal(result.nextCalled, false, `${request.method} ${request.path} desde ${request.address || '(vacío)'} no debía seguir`);
    assert.equal(result.statusCode, 403);
    assert.match(JSON.stringify(result.body), /Acceso denegado desde la red local/);
  };

  const lan = { localNetwork: 'true' };
  const desktop = { desktop: 'true' };
  const abierto = {};

  permitido(abierto, { address: '192.168.1.40', path: '/api/auth/login', method: 'POST' });
  permitido({ localNetwork: 'false', desktop: 'false' }, { address: '10.0.0.4', path: '/api/equipos', method: 'GET' });
  permitido({ localNetwork: '1' }, { address: '10.0.0.4', path: '/api/equipos', method: 'GET' });

  permitido(lan, { address: '127.0.0.1', path: '/api/auth/login', method: 'POST' });
  permitido(lan, { address: '127.0.1.1', path: '/api/ai/analyses', method: 'POST' });
  permitido(lan, { address: '::1', path: '/api/equipos', method: 'GET' });
  permitido(lan, { address: '::ffff:127.0.0.1', path: '/api/dashboard', method: 'GET' });
  permitido(lan, { address: '::ffff:127.8.8.8', path: '/backoffice', method: 'GET' });

  permitido(lan, { address: '192.168.1.40', path: '/api/health', method: 'GET' });
  permitido(lan, { address: '192.168.1.40', path: '/api/health', method: 'POST' });
  permitido(lan, { address: '10.1.2.3', path: '/responder/f732e3eb-ed0f-47c2-843b-831f5c3a6c7a', method: 'GET' });
  permitido(lan, { address: '10.1.2.3', path: '/r/abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', method: 'GET' });
  permitido(lan, { address: '10.1.2.3', path: '/api/respuestas', method: 'POST' });

  bloqueado(lan, { address: '192.168.1.40', path: '/api/auth/login', method: 'POST' });
  bloqueado(lan, { address: '192.168.1.40', path: '/api/equipos', method: 'GET' });
  bloqueado(lan, { address: '192.168.1.40', path: '/api/respuestas', method: 'GET' });
  bloqueado(lan, { address: '192.168.1.40', path: '/api/network-status', method: 'GET' });
  bloqueado(lan, { address: '192.168.1.40', path: '/responder/abc123', method: 'POST' });
  bloqueado(lan, { address: '192.168.1.40', path: '/r/abc123', method: 'POST' });
  bloqueado(lan, { address: '192.168.1.40', path: '/responder/abc/extra', method: 'GET' });
  bloqueado(lan, { address: '192.168.1.40', path: '/api/../equipos', method: 'GET' });
  bloqueado(lan, { address: '::ffff:192.168.1.40', path: '/api/equipos', method: 'GET' });
  bloqueado(lan, { address: 'fd00::20', path: '/api/ai/settings', method: 'PUT' });
  bloqueado(lan, { address: '', path: '/api/equipos', method: 'GET' });
  bloqueado(lan, { path: '/api/equipos', method: 'GET' });
  bloqueado(desktop, { address: '192.168.1.40', path: '/api/auth/login', method: 'POST' });
  permitido(desktop, { address: '192.168.1.40', path: '/api/respuestas', method: 'POST' });
  permitido(desktop, { address: '127.0.0.1', path: '/api/auth/login', method: 'POST' });

  console.log('lan-security-enforcement.test: el middleware real limita la LAN a la superficie pública');
} finally {
  restoreEnv();
}
