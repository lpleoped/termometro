const { build, Platform } = require('electron-builder');
const { version } = require('../package.json');
const updateUrl = process.env.TERMOMETRO_UPDATE_URL;
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
