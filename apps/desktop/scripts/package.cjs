const { build, Platform } = require('electron-builder');
const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');
const updateUrl = process.env.TERMOMETRO_UPDATE_URL;

const desktopRoot = path.resolve(__dirname, '..');
const runtimeModules = path.join(desktopRoot, '.runtime', 'node_modules');
const runtimeCopy = path.join(desktopRoot, '.pack-modules');
const skippedDirectoryNames = new Set(['node_modules', '.bin', '.pack-modules', '.git']);

function normalize(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isInside(child, parent) {
  const from = normalize(parent);
  const to = normalize(child);
  if (to === from) return true;
  const prefix = from.endsWith(path.sep) ? from : from + path.sep;
  return to.startsWith(prefix);
}

function isInstalledModule(realPath) {
  return normalize(realPath).split(path.sep).includes('node_modules');
}

function copyInside(from, to, boundary, seen) {
  const stat = fs.lstatSync(from);
  if (stat.isSymbolicLink()) {
    const target = fs.realpathSync(from);
    if (!isInside(target, boundary) || isInside(to, target)) return;
    copyInside(target, to, boundary, seen);
    return;
  }
  const real = fs.realpathSync(from);
  if (seen.has(normalize(real)) || isInside(to, real)) return;
  seen.add(normalize(real));
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      if (skippedDirectoryNames.has(name) || name.startsWith('release-')) continue;
      copyInside(path.join(from, name), path.join(to, name), boundary, seen);
    }
    return;
  }
  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function readDependencies(packageDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  return Object.keys(manifest.dependencies || {});
}

function resolveDependency(name, parentDir) {
  const segments = name.split('/');
  let cursor = path.resolve(parentDir);
  while (true) {
    const candidate = path.join(cursor, 'node_modules', ...segments);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}

function collectRuntime(modulesRoot, appRoot) {
  const collected = [];
  const seen = new Set();
  const queue = [{ name: 'electron-updater', parentDir: modulesRoot }];
  while (queue.length) {
    const current = queue.pop();
    if (seen.has(current.name)) continue;
    const location = resolveDependency(current.name, current.parentDir);
    if (!location) {
      console.log(`runtime omitido (no se encontró): ${current.name}`);
      continue;
    }
    let real;
    try {
      real = fs.realpathSync(location);
    } catch {
      console.log(`runtime omitido (enlace roto): ${current.name}`);
      continue;
    }
    const livesInTheApp = Boolean(appRoot) && isInside(real, appRoot) && !isInside(real, modulesRoot);
    if (!isInstalledModule(real) || livesInTheApp) {
      console.log(`runtime omitido: ${current.name}`);
      continue;
    }
    seen.add(current.name);
    collected.push({ name: current.name, from: location, real });
    for (const dependency of readDependencies(real)) {
      queue.push({ name: dependency, parentDir: real });
    }
  }
  return collected;
}

function materializeRuntime(options = {}) {
  const root = options.desktopRoot || desktopRoot;
  const modules = options.runtimeModules || runtimeModules;
  const copy = options.runtimeCopy || runtimeCopy;
  fs.rmSync(copy, { recursive: true, force: true });
  fs.mkdirSync(copy, { recursive: true });
  for (const entry of collectRuntime(modules, root)) {
    const destination = path.join(copy, ...entry.name.split('/'));
    if (isInside(destination, entry.real)) {
      console.log(`runtime omitido: ${entry.name}`);
      continue;
    }
    copyInside(entry.from, destination, entry.real, new Set());
  }
  return copy;
}

function countFiles(dir) {
  let count = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Quedó un enlace en el runtime empaquetado: ${full}`);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) count += 1;
    }
  }
  return count;
}

function main() {
  materializeRuntime();
  const runtimeFiles = countFiles(runtimeCopy);
  console.log(`runtime empaquetado: ${runtimeFiles} archivos`);
  if (runtimeFiles > 8000) {
    throw new Error(`El runtime a empaquetar tiene ${runtimeFiles} archivos. No se arma el instalador.`);
  }
  if (!fs.existsSync(path.join(runtimeCopy, 'electron-updater', 'package.json'))) {
    throw new Error('El runtime empaquetado no incluye electron-updater.');
  }
  if (process.env.TERMOMETRO_MATERIALIZE_ONLY === '1') return;

  let publish;
  if (updateUrl) {
    const url = new URL(updateUrl);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('TERMOMETRO_UPDATE_URL debe ser HTTPS sin credenciales.');
    }
    if (!process.env.CSC_LINK && !process.env.WIN_CSC_LINK) {
      throw new Error('Para habilitar el canal público de actualizaciones configurá un certificado de firma (CSC_LINK o WIN_CSC_LINK).');
    }
    publish = [{ provider: 'generic', url: url.href }];
  }
  build({
    targets: Platform.WINDOWS.createTarget('nsis'),
    publish: 'never',
    config: {
      directories: { output: 'release-' + version },
      extraResources: [
        { from: '../api/dist', to: 'api/dist' },
        { from: '../web/dist', to: 'web/dist' },
        { from: '.pack-modules', to: 'node_modules' },
        {
          from: '../../packages/shared',
          to: 'node_modules/@termometro/shared',
          filter: ['**/*', '!**/node_modules/**'],
        },
      ],
      ...(publish ? { publish } : {}),
    },
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

if (require.main === module) main();

module.exports = { materializeRuntime, countFiles };
