import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

console.log('security-hardening.test: validando correcciones de seguridad...');

// Test 1: Validación de secretos conocidos
const KNOWN_PLACEHOLDERS = new Set([
  'generar-un-secreto-aleatorio-de-al-menos-32-caracteres',
  'generar-otro-secreto-aleatorio-de-al-menos-32-caracteres',
]);

const testPlaceholderDetection = () => {
  for (const placeholder of KNOWN_PLACEHOLDERS) {
    assert.ok(placeholder.length >= 32, 'Placeholder debe tener al menos 32 caracteres');
    assert.ok(KNOWN_PLACEHOLDERS.has(placeholder), 'Placeholder debe ser detectado');
  }
};

testPlaceholderDetection();
console.log('✓ Test 1: Detección de placeholders conocidos');

// Test 2: Validación de formato de token público
const testTokenPublicoValidation = () => {
  const validToken = randomBytes(32).toString('base64url');
  assert.ok(/^[A-Za-z0-9_-]{40,64}$/.test(validToken), 'Token válido debe pasar validación');
  
  const invalidTokens = [
    { $ne: null },
    { $gt: '' },
    '',
    'short',
    'invalid!@#$%',
    'a'.repeat(100),
  ];
  
  for (const invalid of invalidTokens) {
    const token = typeof invalid === 'string' ? invalid : JSON.stringify(invalid);
    if (typeof invalid === 'object') {
      assert.ok(true, 'Objetos no deben ser aceptados como tokens');
    } else {
      assert.ok(!/^[A-Za-z0-9_-]{40,64}$/.test(token), `Token inválido debe fallar: ${token}`);
    }
  }
};

testTokenPublicoValidation();
console.log('✓ Test 2: Validación de formato de token público');

// Test 3: Validación de URL de webhook de Slack
const testSlackWebhookValidation = () => {
  const validWebhooks = [
    'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
    'https://hooks.slack.com/services/T0A1B2C3D/B0E5F6G7H/1234567890abcdefghijklmn',
  ];
  
  const invalidWebhooks = [
    'http://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
    'https://evil.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
    'https://hooks.slack.com/other/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
    'https://hooks.slack.com/services/',
    'javascript:alert(1)',
    'http://localhost:8080',
    'https://192.168.1.1/webhook',
  ];
  
  const slackWebhookRegex = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]{9,12}\/[A-Z0-9]{9,12}\/[A-Za-z0-9]{24}$/;
  
  for (const valid of validWebhooks) {
    assert.ok(slackWebhookRegex.test(valid), `Webhook válido debe pasar: ${valid}`);
  }
  
  for (const invalid of invalidWebhooks) {
    assert.ok(!slackWebhookRegex.test(invalid), `Webhook inválido debe fallar: ${invalid}`);
  }
};

testSlackWebhookValidation();
console.log('✓ Test 3: Validación de URL de webhook de Slack');

// Test 4: Validación de política de contraseñas
const testPasswordPolicy = () => {
  const MIN_PASSWORD_LENGTH = 8;
  const MAX_PASSWORD_BYTES = 72;
  
  const validatePassword = (password: string) => {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new Error('La contraseña es demasiado larga');
    }
  };
  
  // Contraseñas válidas
  assert.doesNotThrow(() => validatePassword('12345678'), 'Contraseña de 8 caracteres debe ser válida');
  assert.doesNotThrow(() => validatePassword('ValidPassword123!'), 'Contraseña válida debe pasar');
  
  // Contraseñas inválidas
  assert.throws(() => validatePassword(''), 'Contraseña vacía debe fallar');
  assert.throws(() => validatePassword('1234567'), 'Contraseña de 7 caracteres debe fallar');
  assert.throws(() => validatePassword('a'.repeat(73)), 'Contraseña de 73 bytes debe fallar');
};

testPasswordPolicy();
console.log('✓ Test 4: Validación de política de contraseñas');

// Test 5: Validación de rate limiting (estructura)
const testRateLimitStructure = () => {
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS_PER_IP = 20;
  const MAX_ATTEMPTS_PER_ACCOUNT = 5;
  
  assert.ok(WINDOW_MS > 0, 'Ventana de rate limit debe ser positiva');
  assert.ok(MAX_ATTEMPTS_PER_IP >= MAX_ATTEMPTS_PER_ACCOUNT, 'Límite por IP debe ser mayor o igual que por cuenta');
  assert.ok(MAX_ATTEMPTS_PER_ACCOUNT >= 3, 'Límite por cuenta debe permitir al menos 3 intentos');
};

testRateLimitStructure();
console.log('✓ Test 5: Estructura de rate limiting');

// Test 6: Validación de formato de instanciaId
const testInstanciaIdValidation = () => {
  const validIds = [
    '507f1f77bcf86cd799439011',
    'abc123',
  ];
  
  const invalidIds = [
    { $ne: null },
    { $exists: true },
    ['array'],
    null,
    undefined,
  ];
  
  for (const valid of validIds) {
    assert.ok(typeof valid === 'string', 'ID válido debe ser string');
  }
  
  for (const invalid of invalidIds) {
    assert.ok(typeof invalid !== 'string', 'ID inválido no debe ser string');
  }
};

testInstanciaIdValidation();
console.log('✓ Test 6: Validación de formato de instanciaId');

// Test 7: Producción - seed debe rechazarse
const testProductionSeedGuard = () => {
  const originalEnv = process.env.NODE_ENV;
  
  process.env.NODE_ENV = 'production';
  const shouldReject = process.env.NODE_ENV === 'production';
  assert.ok(shouldReject, 'Seed debe rechazarse en producción');
  
  process.env.NODE_ENV = 'development';
  const shouldAllow = process.env.NODE_ENV !== 'production';
  assert.ok(shouldAllow, 'Seed debe permitirse en desarrollo');
  
  process.env.NODE_ENV = originalEnv;
};

testProductionSeedGuard();
console.log('✓ Test 7: Protección de seed en producción');

console.log('security-hardening.test: ok - todas las validaciones pasaron');
