const { build, Platform } = require('electron-builder');
const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');
const updateUrl = process.env.TERMOMETRO_UPDATE_URL;

const desktopRoot = path.resolve(__dirname, '..');
const runtimeModules = path.join(desktopRoot, '.runtime', 'node_modules');
const runtimeCopy = path.join(desktopRoot, '.pack-modules');

function copyInside(from, to, boundary) {
  const stat = fs.lstatSync(from);
  if (stat.isSymbolicLink()) {
    const target = fs.realpathSync(from);
    if (target !== boundary && !target.startsWith(boundary + path.sep)) return;
    copyInside(target, to, boundary);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      if (name === 'node_modules') continue;
      copyInside(path.join(from, name), path.join(to, name), boundary);
    }
    return;
  }
  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function materializeRuntime() {
  fs.rmSync(runtimeCopy, { recursive: true, force: true });
  fs.mkdirSync(runtimeCopy, { recursive: true });
  for (const name of fs.readdirSync(runtimeModules)) {
    if (name === '.bin') continue;
    const from = path.join(runtimeModules, name);
    const top = fs.lstatSync(from);
    if (name.startsWith('@') && top.isDirectory() && !top.isSymbolicLink()) {
      for (const child of fs.readdirSync(from)) {
        const source = path.join(from, child);
        copyInside(source, path.join(runtimeCopy, name, child), fs.realpathSync(source));
      }
      continue;
    }
    copyInside(from, path.join(runtimeCopy, name), fs.realpathSync(from));
  }
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

materializeRuntime();
const runtimeFiles = countFiles(runtimeCopy);
console.log(`runtime empaquetado: ${runtimeFiles} archivos`);
if (runtimeFiles > 8000) {
  throw new Error(`El runtime a empaquetar tiene ${runtimeFiles} archivos. No se arma el instalador.`);
}

// #region agent log
function surveyTree(dir) {
  let files = 0;
  let bytes = 0;
  let links = 0;
  const linkSamples = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      let stat;
      try { stat = fs.lstatSync(full); } catch { continue; }
      if (stat.isSymbolicLink()) {
        links += 1;
        if (linkSamples.length < 8) {
          let target = '';
          try { target = fs.readlinkSync(full); } catch { target = '?'; }
          linkSamples.push({ path: path.relative(dir, full), target });
        }
        continue;
      }
      if (stat.isDirectory()) stack.push(full);
      else if (stat.isFile()) { files += 1; bytes += stat.size; }
    }
  }
  return { files, bytes, links, linkSamples };
}
function reportTree(message, data) {
  process.stderr.write(`${message} ${JSON.stringify(data)}\n`);
  fetch('http://127.0.0.1:7896/ingest/1bc53dc5-4602-4767-b8ad-8a1bbeccd6eb', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '95390c' }, body: JSON.stringify({ sessionId: '95390c', runId: 'post-fix', hypothesisId: 'G', location: 'apps/desktop/scripts/package.cjs', message, data, timestamp: Date.now() }) }).catch(() => {});
}
reportTree('runtime-copy', surveyTree(runtimeCopy));
// #endregion

let publish;
if (updateUrl) {
  const url = new URL(updateUrl);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('TERMOMETRO_UPDATE_URL debe ser HTTPS sin credenciales.');
  if (!process.env.CSC_LINK && !process.env.WIN_CSC_LINK) throw new Error('Para habilitar el canal público de actualizaciones configurá un certificado de firma (CSC_LINK o WIN_CSC_LINK).');
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
    afterPack: async context => {
      reportTree('unpacked-size', { dir: context.appOutDir, ...surveyTree(context.appOutDir) });
    },
  },
}).catch(error => { console.error(error); process.exitCode = 1; });
