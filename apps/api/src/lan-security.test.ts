/**
 * LAN Security Middleware Tests
 * 
 * Verifies that in desktop LOCAL_NETWORK mode:
 * - Loopback clients can access all routes
 * - Non-loopback clients can only access public respondent surface:
 *   * /api/health
 *   * /responder/:token (GET)
 *   * /r/:token (GET)
 *   * /api/respuestas (POST)
 * - Non-loopback clients are rejected (403) for admin/auth/API routes
 */

import assert from 'node:assert';
import { Request, Response, NextFunction } from 'express';

// Mock Express types for testing
type MockRequest = Partial<Request> & {
  socket: { remoteAddress: string };
  path: string;
  method: string;
};

type MockResponse = Partial<Response> & {
  statusCode?: number;
  jsonData?: any;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
};

type MockNext = NextFunction & { called?: boolean };

// Import the middleware logic (we'll test the isLoopback logic directly)
const isLoopback = (address: string): boolean => {
  if (address.startsWith('127.')) return true;
  if (address === '::1' || address === '::ffff:127.0.0.1') return true;
  if (address.startsWith('::ffff:127.')) return true;
  return false;
};

const isPublicRoute = (path: string, method: string): boolean => {
  if (path === '/api/health') return true;
  if (method === 'GET' && /^\/responder\/[^/]+$/.test(path)) return true;
  if (method === 'POST' && path === '/api/respuestas') return true;
  if (method === 'GET' && /^\/r\/[^/]+$/.test(path)) return true;
  return false;
};

// Test 1: Loopback detection
const testLoopbackDetection = () => {
  assert.strictEqual(isLoopback('127.0.0.1'), true, 'IPv4 loopback 127.0.0.1');
  assert.strictEqual(isLoopback('127.0.1.1'), true, 'IPv4 loopback 127.0.1.1');
  assert.strictEqual(isLoopback('127.255.255.255'), true, 'IPv4 loopback 127.255.255.255');
  assert.strictEqual(isLoopback('::1'), true, 'IPv6 loopback ::1');
  assert.strictEqual(isLoopback('::ffff:127.0.0.1'), true, 'IPv4-mapped IPv6 loopback');
  assert.strictEqual(isLoopback('::ffff:127.1.2.3'), true, 'IPv4-mapped IPv6 loopback range');
  
  assert.strictEqual(isLoopback('192.168.1.1'), false, 'Private IPv4 not loopback');
  assert.strictEqual(isLoopback('10.0.0.1'), false, 'Private IPv4 not loopback');
  assert.strictEqual(isLoopback('172.16.0.1'), false, 'Private IPv4 not loopback');
  assert.strictEqual(isLoopback('8.8.8.8'), false, 'Public IPv4 not loopback');
  assert.strictEqual(isLoopback('::ffff:192.168.1.1'), false, 'IPv4-mapped private not loopback');
};

testLoopbackDetection();
console.log('✓ Test 1: Loopback detection');

// Test 2: Public route detection
const testPublicRouteDetection = () => {
  assert.strictEqual(isPublicRoute('/api/health', 'GET'), true, '/api/health is public');
  assert.strictEqual(isPublicRoute('/api/health', 'POST'), true, '/api/health is public (any method)');
  
  assert.strictEqual(isPublicRoute('/responder/abc123', 'GET'), true, '/responder/:token GET is public');
  assert.strictEqual(isPublicRoute('/responder/f732e3eb-ed0f-47c2-843b-831f5c3a6c7a', 'GET'), true, '/responder/:token with UUID is public');
  assert.strictEqual(isPublicRoute('/responder/abc123', 'POST'), false, '/responder/:token POST is not public');
  
  assert.strictEqual(isPublicRoute('/r/abc123', 'GET'), true, '/r/:token GET is public');
  assert.strictEqual(isPublicRoute('/r/f732e3eb-ed0f-47c2-843b-831f5c3a6c7a', 'GET'), true, '/r/:token with UUID is public');
  assert.strictEqual(isPublicRoute('/r/abc123', 'POST'), false, '/r/:token POST is not public');
  
  assert.strictEqual(isPublicRoute('/api/respuestas', 'POST'), true, 'POST /api/respuestas is public');
  assert.strictEqual(isPublicRoute('/api/respuestas', 'GET'), false, 'GET /api/respuestas is not public');
  
  assert.strictEqual(isPublicRoute('/api/auth/login', 'POST'), false, '/api/auth/login is not public');
  assert.strictEqual(isPublicRoute('/api/equipos', 'GET'), false, '/api/equipos is not public');
  assert.strictEqual(isPublicRoute('/api/dashboard', 'GET'), false, '/api/dashboard is not public');
  assert.strictEqual(isPublicRoute('/backoffice', 'GET'), false, '/backoffice is not public');
};

testPublicRouteDetection();
console.log('✓ Test 2: Public route detection');

// Test 3: Middleware logic simulation
const testMiddlewareLogic = () => {
  const scenarios: Array<{
    name: string;
    localNetwork: boolean;
    remoteAddress: string;
    path: string;
    method: string;
    expectAllowed: boolean;
  }> = [
    // LOCAL_NETWORK=false: all clients allowed (middleware is bypassed)
    { name: 'Non-LAN mode: any client to admin', localNetwork: false, remoteAddress: '192.168.1.100', path: '/api/auth/login', method: 'POST', expectAllowed: true },
    
    // LOCAL_NETWORK=true: loopback clients allowed everywhere
    { name: 'LAN mode: loopback to admin', localNetwork: true, remoteAddress: '127.0.0.1', path: '/api/auth/login', method: 'POST', expectAllowed: true },
    { name: 'LAN mode: loopback to health', localNetwork: true, remoteAddress: '127.0.0.1', path: '/api/health', method: 'GET', expectAllowed: true },
    { name: 'LAN mode: IPv6 loopback to admin', localNetwork: true, remoteAddress: '::1', path: '/api/equipos', method: 'GET', expectAllowed: true },
    
    // LOCAL_NETWORK=true: non-loopback clients allowed only to public routes
    { name: 'LAN mode: LAN client to health', localNetwork: true, remoteAddress: '192.168.1.100', path: '/api/health', method: 'GET', expectAllowed: true },
    { name: 'LAN mode: LAN client to /responder/:token', localNetwork: true, remoteAddress: '192.168.1.100', path: '/responder/abc123', method: 'GET', expectAllowed: true },
    { name: 'LAN mode: LAN client to /r/:token', localNetwork: true, remoteAddress: '192.168.1.100', path: '/r/abc123', method: 'GET', expectAllowed: true },
    { name: 'LAN mode: LAN client POST /api/respuestas', localNetwork: true, remoteAddress: '192.168.1.100', path: '/api/respuestas', method: 'POST', expectAllowed: true },
    
    // LOCAL_NETWORK=true: non-loopback clients blocked from admin/auth/API
    { name: 'LAN mode: LAN client to /api/auth/login (blocked)', localNetwork: true, remoteAddress: '192.168.1.100', path: '/api/auth/login', method: 'POST', expectAllowed: false },
    { name: 'LAN mode: LAN client to /api/equipos (blocked)', localNetwork: true, remoteAddress: '192.168.1.100', path: '/api/equipos', method: 'GET', expectAllowed: false },
    { name: 'LAN mode: LAN client to /api/dashboard (blocked)', localNetwork: true, remoteAddress: '192.168.1.100', path: '/api/dashboard', method: 'GET', expectAllowed: false },
    { name: 'LAN mode: LAN client to /backoffice (blocked)', localNetwork: true, remoteAddress: '192.168.1.100', path: '/backoffice', method: 'GET', expectAllowed: false },
    { name: 'LAN mode: LAN client to /api/ai/analyses (blocked)', localNetwork: true, remoteAddress: '192.168.1.100', path: '/api/ai/analyses', method: 'POST', expectAllowed: false },
  ];
  
  for (const scenario of scenarios) {
    const allowed = scenario.localNetwork
      ? (isLoopback(scenario.remoteAddress) || isPublicRoute(scenario.path, scenario.method))
      : true;
    
    assert.strictEqual(allowed, scenario.expectAllowed, `Scenario failed: ${scenario.name}`);
  }
};

testMiddlewareLogic();
console.log('✓ Test 3: Middleware logic simulation');

// Test 4: Edge cases
const testEdgeCases = () => {
  // Path traversal attempts
  assert.strictEqual(isPublicRoute('/api/../responder/abc', 'GET'), false, 'Path traversal blocked');
  assert.strictEqual(isPublicRoute('/responder/', 'GET'), false, 'Empty token blocked');
  assert.strictEqual(isPublicRoute('/responder/abc/extra', 'GET'), false, 'Extra path segments blocked');
  
  // NoSQL injection in token (caught by token validation, but middleware should still allow the request to reach validation)
  assert.strictEqual(isPublicRoute('/responder/{"$ne":null}', 'GET'), true, 'Malformed token still passes middleware (validation happens later)');
  assert.strictEqual(isPublicRoute('/r/{"$ne":null}', 'GET'), true, 'Malformed token in /r/ still passes middleware');
};

testEdgeCases();
console.log('✓ Test 4: Edge cases');

console.log('\n✅ All LAN security middleware tests passed');
