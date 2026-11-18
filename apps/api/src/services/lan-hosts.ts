/**
 * Selección de direcciones LAN compartibles y clasificación del perfil de red
 * de Windows. Lo usan los enlaces públicos de una ronda y el estado de red del
 * modo escritorio. Las interfaces virtuales y las direcciones link-local no
 * sirven para que un celular abra el cuestionario.
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
  // APIPA: el adaptador no obtuvo una dirección usable en la LAN.
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

/** Primera dirección que un respondente en la LAN puede alcanzar. */
export const selectLanAddress = (
  interfaces: Record<string, ReadonlyArray<LanInterfaceAddress> | undefined>,
): string | null => collectShareableLanHosts(interfaces)[0]?.address ?? null;

/**
 * Traduce la salida de Get-NetConnectionProfile. PowerShell devuelve el nombre
 * del enum (Public, Private, DomainAuthenticated) o, si se castea, 0, 1 o 2.
 */
export const classifyNetworkCategory = (raw: string): NetworkProfileType => {
  const category = raw.trim();
  if (category === 'Public' || category === '0') return 'Public';
  if (category === 'Private' || category === '1') return 'Private';
  if (category === 'Domain' || category === 'DomainAuthenticated' || category === '2') return 'Domain';
  return 'Unknown';
};
