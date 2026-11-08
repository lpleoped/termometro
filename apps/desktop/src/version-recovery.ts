import fs from 'node:fs';
import path from 'node:path';
export function recoveryBackup(userData: string, reason: string) {
  const data = path.join(userData, 'data');
  if (!fs.existsSync(data)) return;
  const destination = path.join(userData, 'recovery', reason + '-' + Date.now());
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(data, path.join(destination, 'data'), { recursive: true, errorOnExist: true, force: false });
  return destination;
}
export function prepareVersion(userData: string, version: string) {
  const marker = path.join(userData, 'last-successful-version');
  const previous = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : 'legacy';
  if (previous !== version) recoveryBackup(userData, 'before-' + version);
  return () => { fs.mkdirSync(userData, { recursive: true }); fs.writeFileSync(marker, version); };
}
