// Quick probe of a map build: load it, print build stats and errors; with AT=x,z also the collision boxes and nav nodes around that point.
// MAP=claudov AT=55,32 node tools/dev/efc/probe-map.mjs
import { openGame } from './harness.mjs';
const { browser, page, errors } = await openGame({ settings: { map: process.env.MAP || 'claudov' } });
const r = await page.evaluate((at) => {
  const o = { map: MAPL.id, state: MAPL.state, col: COL.length, ramps: RAMPS.length, nav: NAV.count, tris: WORLD.tris, meshes: WORLD.meshes.length };
  if (at) {
    const [x, z] = at.split(',').map(Number), r = 3;
    o.boxes = COL.filter((c) => c.x1 > x - r && c.x0 < x + r && c.z1 > z - r && c.z0 < z + r).map((c) => [c.x0, c.x1, c.y0, c.y1, c.z0, c.z1, c.m, c.ray ? 'ray' : c.noRay ? 'noRay' : ''].map((v) => (typeof v === 'number' ? +v.toFixed(2) : v)));
    const rows = [];
    for (let zz = Math.floor(z) + r; zz >= Math.floor(z) - r; zz--) {
      let s = '';
      for (let xx = Math.floor(x) - r; xx <= Math.floor(x) + r; xx++) { const id = navNode(xx + 0.5, 0, zz + 0.5); s += id >= 0 && Math.hypot(NAV.nx[id] - xx - 0.5, NAV.nz[id] - zz - 0.5) < 0.1 ? 'o' : '.'; }
      rows.push(zz + 0.5 + ' ' + s);
    }
    o.navRows = rows;
  }
  return o;
}, process.env.AT || '');
console.log(JSON.stringify(r));
await browser.close();
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
