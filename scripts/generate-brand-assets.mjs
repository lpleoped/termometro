import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'apps', 'web', 'src', 'assets', 'brand');
const pngDir = path.join(sourceDir, 'png');
const legacyAssets = path.join(root, 'apps', 'web', 'src', 'assets');
const webPublic = path.join(root, 'apps', 'web', 'public');
const webIcons = path.join(webPublic, 'icons');
const desktopAssets = path.join(root, 'apps', 'desktop', 'assets');

const svg = async (name) => fs.readFile(path.join(sourceDir, name), 'utf8');

async function render(page, markup, output, width, height, { transparent = false } = {}) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:${transparent ? 'transparent' : '#fff'}}#asset{width:${width}px;height:${height}px}svg{display:block;width:100%;height:100%}</style><div id="asset">${markup}</div>`);
  await page.locator('#asset').screenshot({ path: output, omitBackground: transparent });
}

function withIconBackground(symbolSvg, size, maskable = false, sourceViewBoxSize = 256) {
  const inner = symbolSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const inset = maskable ? size * 0.23 : size * 0.16;
  const markSize = size - inset * 2;
  const radius = maskable ? 0 : size * 0.18;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#12263A"/><g transform="translate(${inset} ${inset}) scale(${markSize / sourceViewBoxSize})">${inner}</g></svg>`;
}

function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const directory = Buffer.alloc(entries.length * 16);
  let offset = header.length + directory.length;
  const images = [];
  entries.forEach(({ size, png }, index) => {
    const base = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, base);
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1);
    directory.writeUInt8(0, base + 2);
    directory.writeUInt8(0, base + 3);
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(png.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    images.push(png);
    offset += png.length;
  });
  return Buffer.concat([header, directory, ...images]);
}

await fs.mkdir(pngDir, { recursive: true });
await fs.mkdir(webIcons, { recursive: true });
await fs.mkdir(desktopAssets, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

const variants = {
  default: 'termometro-emblema.svg',
  azul: 'termometro-emblema-azul.svg',
  celeste: 'termometro-emblema-celeste.svg',
  blanco: 'termometro-emblema-blanco.svg',
  salud: 'termometro-emblema-salud.svg',
  negro: 'termometro-emblema-negro.svg',
};

for (const [name, file] of Object.entries(variants)) {
  const source = await svg(file);
  await render(page, source, path.join(pngDir, `termometro-emblema-${name}.png`), 1024, 1024, { transparent: true });
}

await render(page, await svg('termometro-emblema.svg'), path.join(legacyAssets, 'termometro-logo.png'), 1024, 1024, { transparent: true });
await render(page, await svg('termometro-emblema-azul.svg'), path.join(legacyAssets, 'termometro-logo2.png'), 1024, 1024, { transparent: true });
await render(page, await svg('termometro-emblema-celeste.svg'), path.join(legacyAssets, 'termometro-logo3.png'), 1024, 1024, { transparent: true });
await render(page, await svg('bars.svg'), path.join(legacyAssets, 'bars.png'), 1024, 1024);
await render(page, await svg('results.svg'), path.join(legacyAssets, 'results.png'), 1024, 1024);
await fs.copyFile(path.join(legacyAssets, 'termometro-logo.png'), path.join(sourceDir, 'termometro-logo.png'));
await fs.copyFile(path.join(legacyAssets, 'termometro-logo2.png'), path.join(sourceDir, 'termometro-logo2.png'));
await fs.copyFile(path.join(legacyAssets, 'termometro-logo3.png'), path.join(sourceDir, 'termometro-logo3.png'));
await fs.copyFile(path.join(legacyAssets, 'bars.png'), path.join(sourceDir, 'bars.png'));
await fs.copyFile(path.join(legacyAssets, 'results.png'), path.join(sourceDir, 'results.png'));

const smallSymbol = await svg('termometro-favicon.svg');
const iconPng = new Map();
for (const size of [16, 32, 48, 64, 128, 180, 192, 256, 512]) {
  const markup = withIconBackground(smallSymbol, size, false, 64);
  const output = path.join(pngDir, `icon-${size}.png`);
  await render(page, markup, output, size, size);
  iconPng.set(size, await fs.readFile(output));
}

for (const size of [192, 512]) {
  const markup = withIconBackground(smallSymbol, size, true, 64);
  await render(page, markup, path.join(webIcons, `icon-maskable-${size}.png`), size, size);
}
await fs.copyFile(path.join(pngDir, 'icon-192.png'), path.join(webIcons, 'icon-192.png'));
await fs.copyFile(path.join(pngDir, 'icon-512.png'), path.join(webIcons, 'icon-512.png'));
await fs.copyFile(path.join(pngDir, 'icon-180.png'), path.join(webPublic, 'apple-touch-icon.png'));
await fs.copyFile(path.join(pngDir, 'icon-32.png'), path.join(webPublic, 'favicon-32.png'));
await fs.copyFile(path.join(pngDir, 'icon-16.png'), path.join(webPublic, 'favicon-16.png'));

const favicon = ico([{ size: 16, png: iconPng.get(16) }, { size: 32, png: iconPng.get(32) }]);
await fs.writeFile(path.join(webPublic, 'favicon.ico'), favicon);
const desktopIcon = ico([48, 64, 128, 256, 32, 16].map((size) => ({ size, png: iconPng.get(size) })));
await fs.writeFile(path.join(desktopAssets, 'icon.ico'), desktopIcon);

await browser.close();
console.log('Brand assets generated from canonical SVG sources.');
