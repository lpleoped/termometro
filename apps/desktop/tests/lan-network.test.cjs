const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyNetworkCategory, collectShareableLanHosts, selectLanAddress } = require('../dist/lan-network');

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

test('la dirección LAN ignora virtuales, link-local e IPv6 y conserva el adaptador real', () => {
  assert.deepEqual(collectShareableLanHosts(interfaces), [
    { address: '192.168.1.20', interfaceName: 'Local Area Connection' },
    { address: '10.0.0.8', interfaceName: 'Wi-Fi' },
  ]);
  assert.equal(selectLanAddress(interfaces), '192.168.1.20');
  assert.equal(selectLanAddress({}), null);
  assert.equal(selectLanAddress({ eth0: [{ address: '169.254.1.1', family: 'IPv4', internal: false }] }), null);
});

test('la categoría de Windows reconoce el nombre del enum y el valor numérico', () => {
  assert.equal(classifyNetworkCategory('Public\r\n'), 'Public');
  assert.equal(classifyNetworkCategory('0'), 'Public');
  assert.equal(classifyNetworkCategory(' Private '), 'Private');
  assert.equal(classifyNetworkCategory('1'), 'Private');
  assert.equal(classifyNetworkCategory('Domain'), 'Domain');
  assert.equal(classifyNetworkCategory('DomainAuthenticated'), 'Domain');
  assert.equal(classifyNetworkCategory('2'), 'Domain');
  assert.equal(classifyNetworkCategory('public'), 'Unknown');
  assert.equal(classifyNetworkCategory(''), 'Unknown');
});
