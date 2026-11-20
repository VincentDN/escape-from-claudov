// Draws the Polish-theme brand images from assets/brand/kotwica.svg (CC BY-SA 4.0, see NOTICE.md): the site icons (red tile,
// black Kotwica) and the flag texture of the menu intro (white over red, black Kotwica). Run from the repo root:
//   node tools/dev/efc/brand-kotwica.mjs     (needs Playwright with Chromium; ICO is written by Pillow afterwards)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const RED = '#dc143c', WHITE = '#f4f1ea', REPO = process.cwd();
// emblem centre and size on the flag texture, as fractions of its width and height (tuned against the bench shot)
const FLAG_EMBLEM = { x: +(process.env.FX || 0.6), y: +(process.env.FY || 0.76), size: +(process.env.FS || 0.36) };
const svg = fs.readFileSync(path.join(REPO, 'assets/brand/kotwica.svg'), 'utf8');
const src = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

// [file, width, height, kind]; icons: the emblem fills 78 % of the tile (62 % for maskable icons, which are cropped to a circle)
const JOBS = [
  ['assets/icon/favicon-64.png', 64, 64, 'icon'], ['assets/icon/favicon-96.png', 96, 96, 'icon'],
  ['assets/icon/apple-touch-icon.png', 180, 180, 'icon'], ['assets/icon/icon-192.png', 192, 192, 'icon'],
  ['assets/icon/icon-512.png', 512, 512, 'icon'], ['assets/icon/maskable-192.png', 192, 192, 'mask'],
  ['assets/icon/maskable-512.png', 512, 512, 'mask'], ['assets/icon/favicon-256.tmp.png', 256, 256, 'icon'],
  ['showcase/intro/polish-resistance-flag.png', 760, 424, 'flag'],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
for (const [file, w, h, kind] of JOBS) {
  const data = await page.evaluate(async ({ src, w, h, kind, RED, WHITE, FLAG_EMBLEM }) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    if (kind === 'flag') {
      // The intro drapes this texture turned 180 degrees (flipY off, see drapeFlag in showcase/intro/workbench.js), with the
      // image's top edge hanging over the table edge towards the camera. So the image is authored upside down: red band on top,
      // white below, the emblem turned over, and placed where the bench shot sees open table beside the rifle stock.
      g.fillStyle = RED; g.fillRect(0, 0, w, h / 2); g.fillStyle = WHITE; g.fillRect(0, h / 2, w, h - h / 2);
      const s = h * FLAG_EMBLEM.size;
      g.save(); g.translate(w * FLAG_EMBLEM.x, h * FLAG_EMBLEM.y); g.rotate(Math.PI); g.drawImage(img, -s / 2, -s / 2, s, s); g.restore();
    } else {
      g.fillStyle = RED; g.fillRect(0, 0, w, h);
      const s = w * (kind === 'mask' ? 0.62 : 0.78); g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, { src, w, h, kind, RED, WHITE, FLAG_EMBLEM });
  fs.writeFileSync(path.join(REPO, file), Buffer.from(data, 'base64'));
  console.log('wrote', file, w + 'x' + h);
}
await browser.close();

// favicon.ico (16, 32, 48) from the 256 px tile, then drop the temporary file
const tmp = path.join(REPO, 'assets/icon/favicon-256.tmp.png');
execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],sizes=[(16,16),(32,32),(48,48)])',
  tmp, path.join(REPO, 'assets/icon/favicon.ico')]);
fs.unlinkSync(tmp);
console.log('wrote assets/icon/favicon.ico');

// the showcase pages' vector favicon: red tile, black Kotwica, same proportions as the PNG icons
const pathData = svg.match(/<path[^>]*\sd="([^"]+)"/)[1];
const pad = 360 * 0.11;
fs.writeFileSync(path.join(REPO, 'showcase/assets/img/favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360"><rect width="360" height="360" fill="${RED}"/>` +
  `<g transform="translate(${pad} ${pad}) scale(${(360 - 2 * pad) / 360})"><path fill="#030504" d="${pathData.trim()}"/></g></svg>\n`);
console.log('wrote showcase/assets/img/favicon.svg');
