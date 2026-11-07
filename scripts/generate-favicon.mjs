import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The public repository uses the original demo avatar generated in this repo.
const source = path.join(root, 'seed-assets/male-avatar.png');
async function circle(size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(source)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}
const sizes = [16, 32, 48, 64];
const images = await Promise.all(sizes.map(circle));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const start = 6 + index * 16;
  header[start] = sizes[index];
  header[start + 1] = sizes[index];
  header.writeUInt16LE(1, start + 4);
  header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(image.length, start + 8);
  header.writeUInt32LE(offset, start + 12);
  offset += image.length;
});
const ico = Buffer.concat([header, ...images]);
await fs.writeFile(path.join(root, 'apps/web/app/icon.png'), images.at(-1));
await fs.writeFile(path.join(root, 'apps/web/app/favicon.ico'), ico);
await fs.mkdir(path.join(root, 'apps/admin/public'), { recursive: true });
await fs.writeFile(path.join(root, 'apps/admin/public/favicon.ico'), ico);
console.log('已生成圆形透明底 PNG 和 16/32/48/64px 多尺寸 ICO。');
