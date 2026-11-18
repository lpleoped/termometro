/**
 * Enlaces que se muestran al publicar una ronda. Una interfaz virtual o una
 * dirección link-local no es alcanzable desde el celular del equipo; el
 * fallback es localhost y solo el dueño de una ronda activa obtiene URLs.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { classifyNetworkCategory, collectShareableLanHosts, selectLanAddress } from './services/lan-hosts';
import { obtenerEnlacesPublicosService } from './services/instancia.service';
import { initializeLocalStorage, saveLocal } from './storage/local-store';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-lan-links-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;
process.env.JWT_SECRET = 'lan-links-jwt-secret-with-at-least-32-characters';

const originalInterfaces = os.networkInterfaces;
const originalPort = process.env.PORT;
const token = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

const interfaces = {
  docker0: [{ address: '172.17.0.1', family: 'IPv4', internal: false }],
  'vEthernet (Default Switch)': [{ address: '172.22.0.1', family: 'IPv4', internal: false }],
  'br-abc123': [{ address: '172.18.0.1', family: 'IPv4', internal: false }],
  wsl: [{ address: '172.29.0.1', family: 'IPv4', internal: false }],
  vmnet8: [{ address: '192.168.88.1', family: 'IPv4', internal: false }],
  vboxnet0: [{ address: '192.168.56.1', family: 'IPv4', internal: false }],
  utun3: [{ address: '10.255.0.1', family: 'IPv4', internal: false }],
  tun0: [{ address: '10.8.0.1', family: 'IPv4', internal: false }],
  tap0: [{ address: '10.9.0.1', family: 'IPv4', internal: false }],
  lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  Ethernet: [
    { address: '169.254.10.2', family: 'IPv4', internal: false },
    { address: 'fe80::1', family: 'IPv6', internal: false },
  ],
  'Local Area Connection': [{ address: '192.168.1.20', family: 'IPv4', internal: false }],
  'Wi-Fi': [{ address: '10.0.0.8', family: 4, internal: false }],
};

const hosts = collectShareableLanHosts(interfaces);
assert.deepEqual(hosts, [
  { address: '192.168.1.20', interfaceName: 'Local Area Connection' },
  { address: '10.0.0.8', interfaceName: 'Wi-Fi' },
]);
assert.equal(selectLanAddress(interfaces), '192.168.1.20');
assert.equal(selectLanAddress({}), null);
assert.equal(selectLanAddress({ eth0: [{ address: '169.254.1.1', family: 'IPv4', internal: false }] }), null);

assert.equal(classifyNetworkCategory('Public\r\n'), 'Public');
assert.equal(classifyNetworkCategory('0'), 'Public');
assert.equal(classifyNetworkCategory(' Private '), 'Private');
assert.equal(classifyNetworkCategory('1'), 'Private');
assert.equal(classifyNetworkCategory('Domain'), 'Domain');
assert.equal(classifyNetworkCategory('DomainAuthenticated'), 'Domain');
assert.equal(classifyNetworkCategory('2'), 'Domain');
assert.equal(classifyNetworkCategory('public'), 'Unknown');
assert.equal(classifyNetworkCategory(''), 'Unknown');
assert.equal(classifyNetworkCategory('DomainFoo'), 'Unknown');

async function run() {
    os.networkInterfaces = (() => interfaces) as unknown as typeof os.networkInterfaces;
  process.env.PORT = '3210';
  try {
    initializeLocalStorage();
    saveLocal('evaluaciones', {
      _id: 'eval-lan',
      titulo: 'Clima',
      version: '1.0',
      tipo: 'CUSTOM',
      creadoPor: 'user-1',
      secciones: [],
    });
    saveLocal('equipos', {
      _id: 'equipo-lan',
      nombre: 'Equipo',
      creadoPor: 'user-1',
      miembros: [],
      activo: true,
      creadoEn: '2026-01-01T00:00:00.000Z',
    });
    saveLocal('equipos', {
      _id: 'equipo-archivado',
      nombre: 'Archivado',
      creadoPor: 'user-1',
      miembros: [],
      activo: false,
      creadoEn: '2026-01-01T00:00:00.000Z',
    });
    saveLocal('instancias', {
      _id: 'ronda-individual',
      evaluacion: 'eval-lan',
      alcance: 'individual',
      estado: 'activa',
      tokenPublico: token,
      activadoEn: '2026-01-01T00:00:00.000Z',
      cantidadEsperada: 1,
      modoRespuesta: 'anonima',
      minimoAnonimato: 1,
    });
    saveLocal('instancias', {
      _id: 'ronda-equipo',
      equipo: 'equipo-lan',
      evaluacion: 'eval-lan',
      alcance: 'equipo',
      estado: 'activa',
      tokenPublico: token,
      activadoEn: '2026-01-01T00:00:00.000Z',
      cantidadEsperada: 4,
      modoRespuesta: 'anonima',
      minimoAnonimato: 3,
    });
    saveLocal('instancias', {
      _id: 'ronda-cerrada',
      evaluacion: 'eval-lan',
      alcance: 'individual',
      estado: 'cerrada',
      tokenPublico: token,
      activadoEn: '2026-01-01T00:00:00.000Z',
      cantidadEsperada: 1,
      modoRespuesta: 'anonima',
      minimoAnonimato: 1,
    });
    saveLocal('instancias', {
      _id: 'ronda-sin-token',
      evaluacion: 'eval-lan',
      alcance: 'individual',
      estado: 'activa',
      activadoEn: '2026-01-01T00:00:00.000Z',
      cantidadEsperada: 1,
      modoRespuesta: 'anonima',
      minimoAnonimato: 1,
    });
    saveLocal('instancias', {
      _id: 'ronda-archivada',
      equipo: 'equipo-archivado',
      evaluacion: 'eval-lan',
      alcance: 'equipo',
      estado: 'activa',
      tokenPublico: token,
      activadoEn: '2026-01-01T00:00:00.000Z',
      cantidadEsperada: 2,
      modoRespuesta: 'anonima',
      minimoAnonimato: 1,
    });

    const enlaces = await obtenerEnlacesPublicosService('ronda-individual', 'user-1');
    assert.equal(enlaces.token, token);
    assert.deepEqual(enlaces.urls, [
      { url: `http://192.168.1.20:3210/r/${token}`, interface: 'Local Area Connection', address: '192.168.1.20' },
      { url: `http://10.0.0.8:3210/r/${token}`, interface: 'Wi-Fi', address: '10.0.0.8' },
    ]);
    assert.equal((await obtenerEnlacesPublicosService('ronda-equipo', 'user-1')).urls.length, 2);
    await assert.rejects(() => obtenerEnlacesPublicosService('ronda-individual', 'user-2'), /permiso/);
    await assert.rejects(() => obtenerEnlacesPublicosService('ronda-equipo', 'user-2'), /permiso/);
    await assert.rejects(() => obtenerEnlacesPublicosService('ronda-archivada', 'user-1'), /permiso/);
    await assert.rejects(() => obtenerEnlacesPublicosService('ronda-cerrada', 'user-1'), /no está disponible/);
    await assert.rejects(() => obtenerEnlacesPublicosService('ronda-sin-token', 'user-1'), /no está disponible/);
    await assert.rejects(() => obtenerEnlacesPublicosService('no-existe', 'user-1'), /no encontrada/);

    os.networkInterfaces = (() => ({})) as unknown as typeof os.networkInterfaces;
    const fallback = await obtenerEnlacesPublicosService('ronda-individual', 'user-1');
    assert.deepEqual(fallback.urls, [
      { url: `http://localhost:3210/r/${token}`, interface: 'loopback', address: 'localhost' },
    ]);
    console.log('lan-share-links.test: los enlaces públicos omiten interfaces virtuales y respetan el dueño');
  } finally {
    os.networkInterfaces = originalInterfaces;
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

void run();
