/**
 * Misma regla que apps/api/src/services/lan-hosts.ts. El proceso de Electron no
 * importa la API, así que la selección de la dirección LAN y la categoría de
 * red viven acá y se prueban sin arrancar Electron.
 */

export interface LanInterfaceAddress {
  address: string;
  family: string | number;
  internal: boolean;
}

export type NetworkProfileType = 'Private' | 'Public' | 'Domain' | 'Unknown';

const VIRTUAL_INTERFACE_NAME = /^(vEthernet|docker|wsl|vmnet|vboxnet|utun|tun|tap|br-)/i;

export const isVirtualOrUnreachableInterface = (name: string, address: string): boolean => {
  if (VIRTUAL_INTERFACE_NAME.test(name)) return true;
  if (address.startsWith('169.254.')) return true;
  return false;
};

const isShareableIpv4 = (item: LanInterfaceAddress): boolean =>
  (item.family === 'IPv4' || item.family === 4) && !item.internal;

export const collectShareableLanHosts = (
  interfaces: Record<string, ReadonlyArray<LanInterfaceAddress> | undefined>,
): Array<{ address: string; interfaceName: string }> => {
  const hosts: Array<{ address: string; interfaceName: string }> = [];
  for (const [name, items] of Object.entries(interfaces)) {
    for (const item of items || []) {
      if (!isShareableIpv4(item)) continue;
      if (isVirtualOrUnreachableInterface(name, item.address)) continue;
      hosts.push({ address: item.address, interfaceName: name });
    }
  }
  return hosts;
};

export const selectLanAddress = (
  interfaces: Record<string, ReadonlyArray<LanInterfaceAddress> | undefined>,
): string | null => collectShareableLanHosts(interfaces)[0]?.address ?? null;

export const classifyNetworkCategory = (raw: string): NetworkProfileType => {
  const category = raw.trim();
  if (category === 'Public' || category === '0') return 'Public';
  if (category === 'Private' || category === '1') return 'Private';
  if (category === 'Domain' || category === 'DomainAuthenticated' || category === '2') return 'Domain';
  return 'Unknown';
};
