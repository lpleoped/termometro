const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { materializeRuntime, countFiles } = require('../scripts/package.cjs');

test('el runtime empaquetado no copia la aplicación dentro de su propia salida', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-pack-'));
  const desktop = path.join(root, 'desktop');
  const modules = path.join(desktop, '.runtime', 'node_modules');
  const copy = path.join(desktop, '.pack-modules');
  const hoisted = path.join(root, 'node_modules', 'builder-util');
  try {
    const updater = path.join(modules, 'electron-updater');
    fs.mkdirSync(path.join(updater, 'node_modules', 'semver'), { recursive: true });
    fs.writeFileSync(path.join(updater, 'package.json'), JSON.stringify({ dependencies: { semver: '1.0.0', 'builder-util-runtime': '1.0.0' } }));
    fs.writeFileSync(path.join(updater, 'index.js'), 'module.exports = {};\n');
    fs.writeFileSync(path.join(updater, 'node_modules', 'semver', 'package.json'), JSON.stringify({ dependencies: {} }));
    fs.writeFileSync(path.join(updater, 'node_modules', 'semver', 'index.js'), 'semver\n');
    fs.mkdirSync(path.join(updater, 'node_modules', '@termometro'), { recursive: true });
    fs.writeFileSync(path.join(desktop, 'main.js'), 'app\n');
    fs.writeFileSync(path.join(desktop, 'package.json'), JSON.stringify({ name: '@termometro/desktop' }));
    fs.symlinkSync(desktop, path.join(updater, 'node_modules', '@termometro', 'desktop'), 'junction');
    fs.mkdirSync(path.join(modules, '@termometro'), { recursive: true });
    fs.symlinkSync(desktop, path.join(modules, '@termometro', 'desktop'), 'junction');
    fs.mkdirSync(hoisted, { recursive: true });
    fs.mkdirSync(path.join(hoisted, 'node_modules', 'debug'), { recursive: true });
    fs.mkdirSync(path.join(hoisted, 'node_modules', 'ms'), { recursive: true });
    fs.writeFileSync(path.join(hoisted, 'package.json'), JSON.stringify({ dependencies: { debug: '1.0.0' } }));
    fs.writeFileSync(path.join(hoisted, 'index.js'), 'ok\n');
    fs.writeFileSync(path.join(hoisted, 'node_modules', 'debug', 'package.json'), JSON.stringify({ dependencies: { ms: '1.0.0' } }));
    fs.writeFileSync(path.join(hoisted, 'node_modules', 'debug', 'index.js'), 'debug\n');
    fs.writeFileSync(path.join(hoisted, 'node_modules', 'ms', 'package.json'), JSON.stringify({ dependencies: {} }));
    fs.writeFileSync(path.join(hoisted, 'node_modules', 'ms', 'index.js'), 'ms\n');
    fs.symlinkSync(hoisted, path.join(modules, 'builder-util-runtime'), 'junction');
    fs.mkdirSync(path.join(modules, 'vite'), { recursive: true });
    fs.writeFileSync(path.join(modules, 'vite', 'package.json'), JSON.stringify({ name: 'vite' }));
    fs.writeFileSync(path.join(modules, 'vite', 'index.js'), 'vite\n');

    materializeRuntime({ desktopRoot: desktop, runtimeModules: modules, runtimeCopy: copy });

    assert.deepEqual(fs.readdirSync(copy).sort(), ['builder-util-runtime', 'debug', 'electron-updater', 'ms', 'semver']);
    assert.equal(fs.existsSync(path.join(copy, '@termometro')), false);
    assert.equal(fs.existsSync(path.join(copy, 'vite')), false);
    assert.equal(fs.readFileSync(path.join(copy, 'builder-util-runtime', 'index.js'), 'utf8'), 'ok\n');
    assert.equal(fs.readFileSync(path.join(copy, 'semver', 'index.js'), 'utf8'), 'semver\n');
    assert.ok(countFiles(copy) < 20);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
