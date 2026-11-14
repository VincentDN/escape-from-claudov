// Dev tool: map of a raid map (2 m cells) with the spots that pass the hidden-insert rules, to choose insertion points by hand.
// MAP=claudov node tools/dev/efc/find-inserts.mjs [postDist=55]
// Legend: # tall obstacle, + low obstacle, . walkable, P post centre, X extract, I current insert, o candidate (passes every rule).
import { openGame } from './harness.mjs';
const { browser, page, errors } = await openGame({ settings: { map: process.env.MAP || 'claudov' } });
const r = await page.evaluate((pd) => {
  const md = efcCall('map:data'), B = MAP, G = md.guards, X = md.extracts;
  const c = (x, z) => {
    const id = navNode(x, 0, z);
    return id >= 0 && Math.hypot(NAV.nx[id] - x, NAV.nz[id] - z) < 0.8 && NAV.comp[id] === NAV.mainComp ? id : -1;
  };
  const cand = efcInsertCandidates ? efcInsertCandidates(md, { post: pd, extract: 45, edge: 14, step: 2 }) : [];
  const key = (x, z) => Math.floor((x - B.x0) / 2) + ',' + Math.floor((z - B.z0) / 2), CS = new Set(cand.map((p) => key(p.x, p.z)));
  const rows = [];
  for (let z = B.z1 - 1; z > B.z0; z -= 2) {
    let s = '';
    for (let x = B.x0 + 1; x < B.x1; x += 2) {
      let ch = c(x, z) >= 0 ? '.' : ' ';
      const bx = queryBoxes(x - 1, z - 1, x + 1, z + 1).filter((b) => !b.ray && b.y1 > 0.4 && b.y0 < 2 && b.x0 < x + 1 && b.x1 > x - 1 && b.z0 < z + 1 && b.z1 > z - 1);
      if (bx.length) ch = bx.some((b) => b.y1 > 1.8) ? '#' : '+';
      if (CS.has(key(x, z))) ch = 'o';
      if (G.some((g) => Math.abs(g.x - x) <= 1 && Math.abs(g.z - z) <= 1)) ch = 'P';
      if (X.some((g) => Math.abs(g.x - x) <= 1 && Math.abs(g.z - z) <= 1)) ch = 'X';
      if (md.inserts.some((g) => Math.abs(g.x - x) <= 1 && Math.abs(g.z - z) <= 1)) ch = 'I';
      s += ch;
    }
    rows.push(String(z).padStart(4) + ' ' + s);
  }
  return { rows, n: cand.length, cand: cand.map((p) => [p.x, p.z, Math.round(p.dPost)]) };
}, +(process.argv[2] || 55));
console.log(r.rows.join('\n'));
console.log('candidates', r.n, JSON.stringify(r.cand));
await browser.close();
if (errors.length) { console.error(errors.slice(0, 10).join('\n')); process.exit(1); }
