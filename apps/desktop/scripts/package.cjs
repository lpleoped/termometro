const { build, Platform } = require('electron-builder');
const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');
const updateUrl = process.env.TERMOMETRO_UPDATE_URL;

// #region agent log
function bytesOf(dir) {
  if (!fs.existsSync(dir)) return { exists: false, bytes: 0 };
  let bytes = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        try { bytes += fs.statSync(full).size; } catch { /* unreadable file */ }
      }
    }
  }
  return { exists: true, bytes };
}
const packed = {
  compression: 'store',
  api: bytesOf(path.resolve(__dirname, '../../api/dist')),
  web: bytesOf(path.resolve(__dirname, '../../web/dist')),
  runtime: bytesOf(path.resolve(__dirname, '../.runtime/node_modules')),
  shared: bytesOf(path.resolve(__dirname, '../../../packages/shared')),
};
process.stderr.write(`package-size ${JSON.stringify(packed)}\n`);
fetch('http://127.0.0.1:7896/ingest/1bc53dc5-4602-4767-b8ad-8a1bbeccd6eb', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '95390c' }, body: JSON.stringify({ sessionId: '95390c', runId: 'post-fix', hypothesisId: 'C', location: 'apps/desktop/scripts/package.cjs', message: 'tamaño a empaquetar sin recompresión', data: packed, timestamp: Date.now() }) }).catch(() => {});
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
  config: { directories: { output: 'release-' + version }, ...(publish ? { publish } : {}) },
}).catch(error => { console.error(error); process.exitCode = 1; });
