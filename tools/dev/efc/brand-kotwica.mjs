// Draws the Polish-theme brand images from assets/brand/kotwica.svg (CC BY-SA 4.0, see NOTICE.md): the site icons in the
// style of the Partisan lambda icon (red tile, dark border, dithered drop shadow, Kotwica in the same dark green), the white
// proposal for the owner (outbound/favicon-proposal-white/), and the flag texture of the menu intro. Run from the repo root:
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

// the canvas-drawn image: the intro flag texture (icons are SVG, drawn further down)
const JOBS = [['showcase/intro/polish-resistance-flag.png', 760, 424, 'flag']];

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

// ---------- Icons, in the style of the Partisan lambda icon ----------
// 32-unit tile: a dithered drop shadow offset by 2.5, the tile with a 1-unit border, the emblem with a soft outline. Two variants:
// the shipped one (dark green emblem and border, as the lambda icon) and the owner's white proposal (white emblem and border).
const DARK = '#16200f';
const pathData = svg.match(/<path[^>]*\sd="([^"]+)"/)[1].trim();
const bbox = await (async () => {
  const p = await (await chromium.launch()).newPage();
  const b = await p.evaluate((d) => { const n = 'http://www.w3.org/2000/svg', el = document.createElementNS(n, 'svg'), q = document.createElementNS(n, 'path');
    q.setAttribute('d', d); el.appendChild(q); document.body.appendChild(el); const r = q.getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, pathData);
  await p.context().browser().close(); return b;
})();
function iconSvg({ emblem, border, framed = true }) {
  // emblem fitted to 76 % of the tile height, centred (the tile spans 0.5..28.5 when framed, 0..32 when full bleed)
  const t0 = framed ? 0.5 : 0, ts = framed ? 28 : 32, k = (ts * (framed ? 0.76 : 0.58)) / Math.max(bbox.w, bbox.h);
  const tx = t0 + ts / 2 - (bbox.x + bbox.w / 2) * k, ty = t0 + ts / 2 - (bbox.y + bbox.h / 2) * k;
  const glyph = `<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${k.toFixed(5)})"><path d="${pathData}" fill="${emblem}" stroke="${emblem}" stroke-opacity=".55" stroke-width="${(1 / k).toFixed(2)}" stroke-linejoin="round"/></g>`;
  if (!framed) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${RED}"/>${glyph}</svg>\n`;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="geometricPrecision">' +
    `<defs><pattern id="d" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${DARK}"/><rect x="1" y="1" width="1" height="1" fill="${DARK}"/></pattern></defs>` +
    '<rect x="3" y="3" width="28" height="28" fill="url(#d)" shape-rendering="crispEdges"/>' +
    `<rect x=".5" y=".5" width="28" height="28" fill="${RED}" stroke="${border}" stroke-width="1" shape-rendering="crispEdges"/>${glyph}</svg>\n`;
}
const SHIP = iconSvg({ emblem: DARK, border: DARK }), WHITE_PROPOSAL = iconSvg({ emblem: '#ffffff', border: '#ffffff' }), MASK = iconSvg({ emblem: DARK, border: DARK, framed: false });
async function rasterise(svgText, size, file) {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svgText.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await b.close();
}
for (const [file, size, art] of [['favicon-64', 64, SHIP], ['favicon-96', 96, SHIP], ['apple-touch-icon', 180, SHIP], ['icon-192', 192, SHIP],
  ['icon-512', 512, SHIP], ['maskable-192', 192, MASK], ['maskable-512', 512, MASK], ['favicon-256.tmp', 256, SHIP]]) {
  await rasterise(art, size, path.join(REPO, `assets/icon/${file}.png`)); console.log('wrote', `assets/icon/${file}.png`);
}
fs.writeFileSync(path.join(REPO, 'showcase/assets/img/favicon.svg'), SHIP); console.log('wrote showcase/assets/img/favicon.svg');
// favicon.ico (16, 32, 48) from the 256 px tile, then drop the temporary file
const tmp = path.join(REPO, 'assets/icon/favicon-256.tmp.png');
execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],sizes=[(16,16),(32,32),(48,48)])',
  tmp, path.join(REPO, 'assets/icon/favicon.ico')]);
fs.unlinkSync(tmp); console.log('wrote assets/icon/favicon.ico');
// the owner's white proposal, not shipped
const out = path.join(REPO, 'outbound/favicon-proposal-white'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'favicon-white.svg'), WHITE_PROPOSAL);
fs.writeFileSync(path.join(out, 'favicon-dark-green.svg'), SHIP);
for (const sz of [32, 64, 256]) { await rasterise(WHITE_PROPOSAL, sz, path.join(out, `favicon-white-${sz}.png`)); await rasterise(SHIP, sz, path.join(out, `favicon-dark-green-${sz}.png`)); }
console.log('wrote outbound/favicon-proposal-white/');
