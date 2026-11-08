import assert from 'node:assert/strict';
import { validarTransicionAccion } from './services/acciones.service';

assert.equal(validarTransicionAccion('generada', 'en_revision'), 'en_revision');
assert.equal(validarTransicionAccion('en_revision', 'aprobada'), 'aprobada');
assert.equal(validarTransicionAccion('ejecutada', 'verificada'), 'verificada');
assert.throws(() => validarTransicionAccion('generada', 'aprobada'), /Transición no permitida/);
assert.throws(() => validarTransicionAccion('aprobada', 'verificada'), /Transición no permitida/);

console.log('acciones-lifecycle.test: ok');
