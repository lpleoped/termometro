import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface InstallationSecrets { jwt: string; ai: string; integrations: string; }
export function installationSecrets(directory: string, protect: (value: string) => Buffer, unprotect: (value: Buffer) => string): InstallationSecrets {
  const file = path.join(directory, 'installation-secrets.bin');
  if (fs.existsSync(file)) {
    const value = JSON.parse(unprotect(fs.readFileSync(file))) as InstallationSecrets;
    if (![value.jwt, value.ai, value.integrations].every(key => typeof key === 'string' && key.length >= 32)) throw new Error('Las claves de esta instalación no son válidas.');
    return value;
  }
  const value = { jwt: crypto.randomBytes(32).toString('hex'), ai: crypto.randomBytes(32).toString('hex'), integrations: crypto.randomBytes(32).toString('hex') };
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(file, protect(JSON.stringify(value)), { flag: 'wx', mode: 0o600 });
  return value;
}
