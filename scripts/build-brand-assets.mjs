import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';

// Native SVGs are the production sources; exports do not depend on fonts or AI calls.
const root = fileURLToPath(new URL('../', import.meta.url));
const brand = join(root, 'apps/web/public/brand');
const app = join(root, 'apps/web/src/app');
const mark = await readFile(join(brand, 'paralax-mark.svg'), 'utf8');
const logo = await readFile(join(brand, 'paralax-logo.svg'), 'utf8');
const mono = svg => svg.replace(/fill="#[A-Fa-f0-9]{6}"/g, 'fill="#F2F4F7"');
const light = logo.replace('fill="#F2F4F7"', 'fill="#141821"')
  .replace('fill="#BBA9FF" fill-rule="evenodd"', 'fill="#6847DC" fill-rule="evenodd"');
await mkdir(brand, { recursive: true });
for (const [name, svg] of [['paralax-logo-light', light], ['paralax-logo-mono', mono(logo)], ['paralax-mark-mono', mono(mark)]]) {
  await writeFile(join(brand, `${name}.svg`), svg);
}
for (const name of ['paralax-logo', 'paralax-logo-light', 'paralax-logo-mono']) {
  await sharp(join(brand, `${name}.svg`), { density: 144 }).resize(1152, 256).png().toFile(join(brand, `${name}.png`));
}
await sharp(Buffer.from(mark), { density: 288 }).resize(512, 512).png().toFile(join(brand, 'paralax-mark.png'));
await sharp(Buffer.from(mono(mark)), { density: 288 }).resize(512, 512).png().toFile(join(brand, 'paralax-mark-mono.png'));

const icon = mark.replace('</title>', '</title><rect width="128" height="128" rx="24" fill="#0D0F14"/>');
await writeFile(join(app, 'icon.svg'), icon);
const apple = await sharp(Buffer.from(icon), { density: 144 }).resize(180, 180).png().toBuffer();
await writeFile(join(app, 'apple-icon.png'), apple);
await writeFile(join(brand, 'apple-touch-icon.png'), apple);
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(size => sharp(Buffer.from(icon)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let n = 0; n < sizes.length; n++) {
  const entry = 6 + n * 16;
  header[entry] = sizes[n]; header[entry + 1] = sizes[n];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[n].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += pngs[n].length;
}
const favicon = Buffer.concat([header, ...pngs]);
await writeFile(join(app, 'favicon.ico'), favicon);
await writeFile(join(brand, 'favicon.ico'), favicon);
console.log('Logos SVG/PNG, favicon ICO 16/32/48, icon.svg e Apple 180 exportados.');
