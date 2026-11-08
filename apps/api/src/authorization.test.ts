import assert from 'node:assert/strict';
import { hasInstanceOwnership } from './services/authorization.service';

assert.equal(hasInstanceOwnership(true, true, true), true);
assert.equal(hasInstanceOwnership(true, false, true), false);
assert.equal(hasInstanceOwnership(false, true, true), false);
assert.equal(hasInstanceOwnership(false, false, true), false);
assert.equal(hasInstanceOwnership(true, false, false), true);

console.log('authorization.test: ok');
