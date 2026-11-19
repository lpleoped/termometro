import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps', 'api');
const [mode, action] = process.argv.slice(2);
const drivers = { web: 'mongo', local: 'json' };

if (!drivers[mode] || !['dev', 'start'].includes(action)) {
  console.error('Uso: node scripts/run-api.mjs <web|local> <dev|start>');
  process.exit(1);
}

const driver = drivers[mode];
console.log(driver === 'mongo'
  ? 'Experiencia web local: la API usa MongoDB. El ingreso usa las cuentas de esa base.'
  : 'Experiencia en esta computadora: la API guarda los datos en JSON local.');

const require = createRequire(path.join(apiDir, 'package.json'));
const command = process.execPath;
const args = action === 'dev'
  ? [require.resolve('ts-node-dev/lib/bin.js'), '--respawn', '--transpile-only', 'src/app.ts']
  : ['dist/app.js'];

const child = spawn(command, args, {
  cwd: apiDir,
  env: { ...process.env, STORAGE_DRIVER: driver },
  stdio: 'inherit',
});

let stopping = false;
const stop = () => {
  if (stopping || child.pid == null) return;
  stopping = true;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 1));
