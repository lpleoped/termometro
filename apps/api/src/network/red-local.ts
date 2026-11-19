import { execFile } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';

export interface DireccionLan {
  address: string;
  interfaceName: string;
}

const INTERFAZ_VIRTUAL = /^(vEthernet|docker|wsl|vmnet|vboxnet|utun|tun|tap|br-|lo)/i;

export function listarDireccionesLan(): DireccionLan[] {
  const addresses: DireccionLan[] = [];
  for (const [name, items] of Object.entries(os.networkInterfaces())) {
    if (INTERFAZ_VIRTUAL.test(name)) continue;
    for (const item of items || []) {
      if (item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.')) {
        addresses.push({ address: item.address, interfaceName: name });
      }
    }
  }
  return addresses;
}

let interfazDeSalida: Promise<string | null> | undefined;

function interfazConSalidaAInternet(): Promise<string | null> {
  if (interfazDeSalida) return interfazDeSalida;
  interfazDeSalida = new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(null);
      return;
    }
    execFile(
      'powershell.exe',
      ['-NoProfile', '-Command', "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1).InterfaceAlias"],
      { timeout: 4000, windowsHide: true },
      (error, stdout) => resolve(error ? null : stdout.trim() || null),
    );
  });
  return interfazDeSalida;
}

/** La red por la que sale el tráfico va primero. Así el QR no apunta a un adaptador virtual. */
export async function direccionesParaCompartir(): Promise<DireccionLan[]> {
  const todas = listarDireccionesLan();
  const preferida = await interfazConSalidaAInternet();
  const prioridad = (item: DireccionLan) => {
    if (preferida && item.interfaceName === preferida) return 0;
    if (item.address.startsWith('192.168.56.')) return 2;
    return 1;
  };
  return [...todas].sort((a, b) => prioridad(a) - prioridad(b));
}

let abierta = process.env.LOCAL_NETWORK === 'true';
const servidores: http.Server[] = [];

export function laRedLocalEstaAbierta(): boolean {
  return abierta;
}

export function direccionesLan(): string[] {
  return listarDireccionesLan().map((item) => item.address);
}

/** Abre la encuesta en las direcciones de la red local. El puerto de esta computadora sigue igual. */
export async function abrirRedLocal(handler: http.RequestListener): Promise<string[]> {
  if (abierta) return direccionesLan();
  const addresses = direccionesLan();
  if (addresses.length === 0) throw new Error('No hay una red local para compartir la encuesta.');
  const port = Number(process.env.PORT) || 3000;
  const results = await Promise.allSettled(addresses.map((address) => new Promise<string>((resolve, reject) => {
    const server = http.createServer(handler);
    server.once('error', reject);
    server.listen(port, address, () => {
      servidores.push(server);
      resolve(address);
    });
  })));
  const opened = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  if (opened.length === 0) throw new Error('No se pudo abrir la encuesta en la red local.');
  abierta = true;
  process.env.LOCAL_NETWORK = 'true';
  return opened;
}
