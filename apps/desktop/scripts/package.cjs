const { build, Platform } = require('electron-builder');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '../..');
const desktopPackage = require('../package.json');
const updateUrl = process.env.TERMOMETRO_UPDATE_URL;
const bannedPackages = new Set(['vite', 'electron', 'typescript']);

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

function readManifest(packageDir) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
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

function copyReal(from, to, boundary, seen, onEscape) {
  const stat = fs.lstatSync(from);
  if (stat.isSymbolicLink()) {
    let target;
    try {
      target = fs.realpathSync(from);
    } catch {
      throw new Error(`Enlace roto: ${from}`);
    }
    if (!isInside(target, boundary)) {
      if (onEscape === 'throw') throw new Error(`Un enlace sale del directorio empaquetado: ${from}`);
      return;
    }
    if (seen.has(normalize(target))) return;
    copyReal(target, to, boundary, seen, onEscape);
    return;
  }
  const real = fs.realpathSync(from);
  if (seen.has(normalize(real))) return;
  seen.add(normalize(real));
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      if (name === 'node_modules' || name === '.bin' || name === '.git') continue;
      copyReal(path.join(from, name), path.join(to, name), boundary, seen, onEscape);
    }
    return;
  }
  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function copyTree(from, to) {
  if (!fs.existsSync(from)) throw new Error(`No existe ${from}. Compilá antes de empaquetar.`);
  const boundary = fs.realpathSync(from);
  copyReal(boundary, to, boundary, new Set(), 'throw');
}

function copyProductionTree(options) {
  const destination = options.destination;
  const appRoot = options.appRoot ? path.resolve(options.appRoot) : '';
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  const seen = new Set();
  const queue = options.roots.map(name => ({ name, parentDir: options.fromDir, optional: false }));
  while (queue.length) {
    const current = queue.pop();
    if (seen.has(current.name)) continue;
    if (bannedPackages.has(current.name) || current.name.startsWith('@vitejs/')) {
      throw new Error(`El armado iba a incluir ${current.name}, que no va en el instalador.`);
    }
    const location = resolveDependency(current.name, current.parentDir);
    if (!location) {
      if (current.optional) {
        seen.add(current.name);
        continue;
      }
      throw new Error(`No se encontró la dependencia ${current.name}.`);
    }
    let real;
    try {
      real = fs.realpathSync(location);
    } catch {
      if (current.optional) {
        seen.add(current.name);
        continue;
      }
      throw new Error(`Enlace roto en la dependencia ${current.name}.`);
    }
    const isAppSource = Boolean(appRoot) && isInside(real, appRoot) && !isInstalledModule(real);
    if (!isInstalledModule(real) || isAppSource) {
      seen.add(current.name);
      continue;
    }
    seen.add(current.name);
    const packageDir = path.join(destination, ...current.name.split('/'));
    if (isInside(packageDir, real)) throw new Error(`La copia de ${current.name} se cruzaría con su origen.`);
    copyReal(real, packageDir, real, new Set(), 'skip');
    const manifest = readManifest(real);
    for (const dependency of Object.keys(manifest.dependencies || {})) {
      queue.push({ name: dependency, parentDir: real, optional: false });
    }
    for (const dependency of Object.keys(manifest.optionalDependencies || {})) {
      queue.push({ name: dependency, parentDir: real, optional: true });
    }
  }
  return destination;
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

function assertIsolated(staging) {
  const resolved = path.resolve(staging);
  if (isInside(resolved, repoRoot)) throw new Error('El armado quedó dentro del repositorio.');
  let cursor = resolved;
  while (true) {
    if (path.basename(cursor).toLowerCase() === 'node_modules') {
      throw new Error('El armado quedó dentro de node_modules.');
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    if (fs.existsSync(path.join(parent, 'node_modules'))) {
      throw new Error(`El armado no puede vivir bajo un directorio con node_modules (${parent}).`);
    }
    cursor = parent;
  }
}

function assertStaged(staging) {
  const required = [
    'dist/main.js',
    'assets/icon.ico',
    'bundled/api/dist/app.js',
    'bundled/web/dist/index.html',
    'node_modules/electron-updater/package.json',
    'bundled/node_modules/express/package.json',
    'bundled/node_modules/mongoose/package.json',
    'bundled/node_modules/cors/package.json',
    'bundled/node_modules/dotenv/package.json',
    'bundled/node_modules/jsonwebtoken/package.json',
    'bundled/node_modules/zod/package.json',
    'bundled/node_modules/bcryptjs/package.json',
    'bundled/node_modules/axios/package.json',
    'bundled/node_modules/@termometro/shared/dist/index.js',
  ];
  for (const relative of required) {
    if (!fs.existsSync(path.join(staging, relative))) throw new Error(`El armado está incompleto: falta ${relative}.`);
  }
  const files = countFiles(staging);
  for (const tree of ['node_modules', path.join('bundled', 'node_modules')]) {
    for (const name of bannedPackages) {
      if (fs.existsSync(path.join(staging, tree, name, 'package.json'))) {
        throw new Error(`El armado incluyó ${name}, que no va en el instalador.`);
      }
    }
  }
  console.log(`armado aislado: ${files} archivos, sin enlaces`);
}

function stageInstaller() {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-stage-'));
  assertIsolated(staging);
  copyTree(path.join(desktopRoot, 'dist'), path.join(staging, 'dist'));
  fs.mkdirSync(path.join(staging, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(desktopRoot, 'assets', 'icon.ico'), path.join(staging, 'assets', 'icon.ico'));
  fs.copyFileSync(path.join(desktopRoot, 'installer-firewall.nsh'), path.join(staging, 'installer-firewall.nsh'));
  copyTree(path.join(repoRoot, 'apps', 'api', 'dist'), path.join(staging, 'bundled', 'api', 'dist'));
  copyTree(path.join(repoRoot, 'apps', 'web', 'dist'), path.join(staging, 'bundled', 'web', 'dist'));

  const apiPackage = readManifest(path.join(repoRoot, 'apps', 'api'));
  const apiRoots = Object.keys(apiPackage.dependencies || {}).filter(name => name !== '@termometro/shared');
  copyProductionTree({
    fromDir: path.join(repoRoot, 'apps', 'api'),
    destination: path.join(staging, 'bundled', 'node_modules'),
    roots: apiRoots,
    appRoot: repoRoot,
  });
  copyTree(path.join(repoRoot, 'packages', 'shared', 'dist'), path.join(staging, 'bundled', 'node_modules', '@termometro', 'shared', 'dist'));
  fs.copyFileSync(
    path.join(repoRoot, 'packages', 'shared', 'package.json'),
    path.join(staging, 'bundled', 'node_modules', '@termometro', 'shared', 'package.json'),
  );

  copyProductionTree({
    fromDir: desktopRoot,
    destination: path.join(staging, 'node_modules'),
    roots: Object.keys(desktopPackage.dependencies || {}),
    appRoot: repoRoot,
  });

  fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify({
    name: desktopPackage.name,
    private: true,
    version: desktopPackage.version,
    description: desktopPackage.description,
    main: 'dist/main.js',
    dependencies: desktopPackage.dependencies,
  }, null, 2));
  assertStaged(staging);
  return staging;
}

function copyArtifacts(fromDir, toDir) {
  fs.rmSync(toDir, { recursive: true, force: true });
  fs.mkdirSync(toDir, { recursive: true });
  const produced = fs.readdirSync(fromDir).filter(name => name.endsWith('.exe') || name.endsWith('.blockmap') || name === 'latest.yml');
  if (!produced.some(name => name.endsWith('.exe'))) throw new Error('electron-builder no generó el instalador .exe.');
  for (const name of produced) fs.copyFileSync(path.join(fromDir, name), path.join(toDir, name));
  return toDir;
}

function builderConfig(outputDir, publish) {
  return {
    appId: 'com.termometrodeequipo.desktop',
    productName: 'Termómetro',
    executableName: 'Termometro',
    artifactName: 'Termometro-de-Equipo-Setup-${version}.${ext}',
    compression: 'store',
    asar: true,
    npmRebuild: false,
    nodeGypRebuild: false,
    buildDependenciesFromSource: false,
    electronVersion: desktopPackage.devDependencies.electron,
    files: ['dist/**/*', 'assets/**/*', 'package.json', 'node_modules/**/*', '!bundled/**'],
    extraResources: [
      { from: 'bundled/api/dist', to: 'api/dist' },
      { from: 'bundled/web/dist', to: 'web/dist' },
      { from: 'bundled/node_modules', to: 'node_modules' },
    ],
    win: {
      icon: 'assets/icon.ico',
      target: ['nsis'],
      requestedExecutionLevel: 'asInvoker',
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      include: 'installer-firewall.nsh',
      differentialPackage: false,
    },
    directories: { output: outputDir },
    ...(publish ? { publish } : {}),
  };
}

async function main() {
  const staging = stageInstaller();
  console.log(`Armando el instalador fuera del repositorio: ${staging}`);
  try {
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
    const outputDir = path.join(staging, 'out');
    await build({
      projectDir: staging,
      targets: Platform.WINDOWS.createTarget('nsis'),
      publish: 'never',
      config: builderConfig(outputDir, publish),
    });
    const releaseDir = copyArtifacts(outputDir, path.join(desktopRoot, 'release-' + desktopPackage.version));
    console.log(`Instalador listo en ${releaseDir}`);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { copyProductionTree, countFiles };
