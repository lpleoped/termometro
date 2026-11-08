const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { runUpdateCheck } = require('../dist/update-flow');
const { installationSecrets } = require('../dist/installation-secrets');
const { prepareVersion } = require('../dist/version-recovery');
test('actualización: no disponible, cancelar, descargar, reiniciar, error',async()=>{
  const events = [];
  const client = { checkForUpdates:async()=>({isUpdateAvailable:true,updateInfo:{version:'0.1.0'}}),downloadUpdate:async()=>events.push('download'),quitAndInstall:()=>events.push('install') };
  const ui = {askDownload:async()=>false,askRestart:async()=>true,notify:async()=>events.push('notice'),beforeRestart:async()=>events.push('backup')};
  await runUpdateCheck(client,ui); assert.deepEqual(events,[]);
  ui.askDownload=async()=>true; ui.askRestart=async()=>false;
  await runUpdateCheck(client,ui); assert.deepEqual(events,['download','notice']); events.length=0;
  ui.askRestart=async()=>true; await runUpdateCheck(client,ui); assert.deepEqual(events,['download','backup','install']); events.length=0;
  client.downloadUpdate=async()=>{throw Error('network');};
  await assert.rejects(()=>runUpdateCheck(client,ui),/network/); assert.deepEqual(events,[]);
  client.checkForUpdates=async()=>({isUpdateAvailable:false,updateInfo:{version:'0.0.6'}});
  await runUpdateCheck(client,ui); assert.deepEqual(events,['notice']);
});
test('claves por instalación y copia antes de migrar',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'termometro-install-test-'));
  try {
    // OS encryption is exercised in installed Electron; this fixture tests persistence.
    const protect=value=>Buffer.from(value), unprotect=value=>value.toString();
    const first=installationSecrets(root,protect,unprotect);
    assert.deepEqual(installationSecrets(root,protect,unprotect),first);
    assert.notEqual(installationSecrets(path.join(root,'another'),protect,unprotect).jwt,first.jwt);
    fs.mkdirSync(path.join(root,'data')); fs.writeFileSync(path.join(root,'data','fixture.json'),'[1]');
    prepareVersion(root,'0.0.6')();
    assert.equal(fs.readdirSync(path.join(root,'recovery')).length,1);
    prepareVersion(root,'0.0.6')();
    assert.equal(fs.readdirSync(path.join(root,'recovery')).length,1);
    assert.equal(fs.readFileSync(path.join(root,'data','fixture.json'),'utf8'),'[1]');
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
