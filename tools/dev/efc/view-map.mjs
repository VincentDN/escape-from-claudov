// Renders fixed views of a map headless (no soldiers, no interface) and reports renderer.info for each: triangles and draw calls of one
// whole frame (shadow passes and post-processing included). Optional screenshots.
// MAP=claudov Q=high VIEWS=quay,yard SHOTS=/tmp/dir W=960 H=540 node tools/dev/efc/view-map.mjs
import fs from 'node:fs';
import path from 'node:path';
import { openGame } from './harness.mjs';
const map = process.env.MAP || 'claudov', q = process.env.Q || 'high';
// [camera, look-at, fov]; heights are above the ground under the point
const VIEWS = {
  claudov: {
    quay: [[-56, 1.7, -77], [-56, 1.5, 0], 70], // down the quay lane, north
    overview: [[-20, 95, -95], [0, 0, 5], 55],
    yard: [[-29, 1.7, -2], [-24, 1.5, 30], 70],
    warehouse: [[24, 5.3, -43], [4, 1.5, -24], 72], // from the mezzanine
    housing: [[42, 1.7, 30], [62, 3, 45], 70],
    gate: [[60, 1.7, -60], [79, 1.5, -51], 70],
    art: null,
  },
  simoun: { quay: [[0, 1.7, 72], [0, 1.5, 0], 70] },
};
const V = VIEWS[map] || {};
const names = (process.env.VIEWS || 'quay').split(',');
const { browser, page, errors } = await openGame({ settings: { map, quality: q, sv: 2 }, w: +(process.env.W || 960), h: +(process.env.H || 540) });
await page.evaluate(() => {
  document.querySelectorAll('body > *:not(canvas)').forEach((e) => { e.style.display = 'none'; });
  for (const e of entities) if (e.model) e.model.root.visible = false;
  VM.root.visible = false; MATCH.state = 'capture';
});
const out = [];
for (const n of names) {
  let v = V[n];
  if (n === 'art' || !v) { const a = await page.evaluate((m) => MAP_DEFS[m].art, map); v = [a.cam, a.look, a.fov || 60]; }
  const info = await page.evaluate(async ([cam, look, fov]) => {
    const g = (p) => [p[0], p[1] + groundHeight(p[0], p[2], 0.3), p[2]];
    camera.position.set(...g(cam)); camera.lookAt(...g(look)); camera.fov = fov; camera.updateProjectionMatrix();
    for (const l of csm.lights) l.shadow.needsUpdate = true;
    const wait = async (k) => { const n0 = frameN; while (frameN < n0 + k) await new Promise((r) => setTimeout(r, 20)); };
    await wait(3); // settle (shadow cascades, detail culling)
    await wait(1);
    return { tris: renderer.info.render.triangles, calls: renderer.info.render.calls, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures };
  }, v);
  const row = { map, q, view: n, ...info };
  if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); row.shot = path.join(process.env.SHOTS, `${map}-${n}-${q}.png`); await page.screenshot({ path: row.shot, timeout: 900000 }); }
  console.log(JSON.stringify(row)); out.push(row);
}
await browser.close();
if (errors.length) { console.error(errors.slice(0, 10).join('\n')); process.exit(1); }
