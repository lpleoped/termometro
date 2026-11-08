import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, 'apps', 'api', '.env');
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const values = new Map();
for (const line of existing.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) values.set(match[1], match[2]);
}

if (!values.get('PORT')) values.set('PORT', '3000');
if (!values.get('STORAGE_DRIVER')) values.set('STORAGE_DRIVER', 'json');
if (values.get('STORAGE_DRIVER') !== 'json' && !values.get('MONGO_URI')) values.set('MONGO_URI', 'mongodb://localhost:27017/termometro-de-equipo');
for (const name of ['JWT_SECRET', 'AI_CREDENTIAL_SECRET', 'INTEGRATION_ENCRYPTION_KEY']) {
  if (!values.get(name) || values.get(name).length < 32) values.set(name, crypto.randomBytes(32).toString('base64url'));
}

const known = new Set(values.keys());
const lines = existing.split(/\r?\n/).map(line => {
  const match = line.match(/^([A-Z0-9_]+)=/);
  if (!match || !known.has(match[1])) return line;
  const value = values.get(match[1]); known.delete(match[1]);
  return `${match[1]}=${value}`;
}).filter((line, index, all) => line || index < all.length - 1);
for (const name of known) lines.push(`${name}=${values.get(name)}`);
fs.writeFileSync(envPath, lines.join('\n').replace(/\n?$/, '\n'), { encoding: 'utf8', mode: 0o600 });
console.log(`Entorno de desarrollo listo: ${path.relative(root, envPath)}`);
