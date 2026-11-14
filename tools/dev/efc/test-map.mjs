// MAP package test: Claudov's raid data sits on walkable ground inside the bounds and is reachable on the nav grid from insert 0,
// containers are spread out, inserts cannot see each other, then a bot-only team deathmatch runs 90 game seconds of logic:
// bots move, nobody is stuck more than 10 s, nobody leaves the map, no page error. Exits non-zero on failure.
// node tools/dev/efc/test-map.mjs [seconds=90]
import { openGame, startSolo } from './harness.mjs';
const secs = +(process.argv[2] || 90);
const { browser, page, errors } = await openGame({ settings: { map: 'claudov', mode: 'tdm', difficulty: 2 } });
const fails = [];

const data = await page.evaluate(() => {
  const out = { fails: [], info: {} }, D = MAP_DEFS.claudov.efc, md = efcCall('map:data');
  if (md !== D) out.fails.push('map:data does not return MAP_DEFS.claudov.efc');
  if (EFC.cfg.raidMap !== 'claudov') out.fails.push('EFC.cfg.raidMap is not claudov');
  if (!MAPS.some((m) => m.id === 'claudov' && m.ok)) out.fails.push('claudov missing from MAPS');
  const B = MAP_DEFS.claudov.bounds, side = [B.x1 - B.x0, B.z1 - B.z0];
  if (!side.every((s) => s >= 150 && s <= 170) || !Object.values(B).every(Number.isInteger)) out.fails.push('bounds ' + JSON.stringify(B));
  // a point is walkable: inside the bounds, ground under it near y, room for a soldier, a nav node right there
  const check = (what, p) => {
    const y = p.y || 0;
    if (p.x < B.x0 + 1 || p.x > B.x1 - 1 || p.z < B.z0 + 1 || p.z > B.z1 - 1) return what + ' out of bounds';
    const g = groundHeight(p.x, p.z, y + 0.5);
    if (Math.abs(g - y) > 0.35) return `${what} ground ${g.toFixed(2)} not at y ${y}`;
    if (!navClear(p.x, p.z, g)) return what + ' blocked (no room for a soldier)';
    const n = navNode(p.x, g, p.z);
    if (n < 0) return what + ' has no nav node';
    if (Math.hypot(NAV.nx[n] - p.x, NAV.nz[n] - p.z) > 1.3 || Math.abs(NAV.ny[n] - g) > 0.6) return what + ' nearest nav node too far';
    return null;
  };
  const i0 = D.inserts[0], s0 = navNode(i0.x, groundHeight(i0.x, i0.z, 0.5), i0.z);
  const reach = (what, p) => {
    const g = groundHeight(p.x, p.z, (p.y || 0) + 0.5), n = navNode(p.x, g, p.z);
    if (n < 0 || NAV.comp[n] !== NAV.comp[s0]) return what + ' not connected to insert 0';
    const path = findPath(new V3(i0.x, 0, i0.z), new V3(p.x, g, p.z), s0);
    if (!path) return what + ' no path from insert 0';
    return null;
  };
  const all = [];
  D.inserts.forEach((p, i) => all.push(['insert ' + i, p]));
  D.extracts.forEach((p) => all.push(['extract ' + p.name, p]));
  D.containers.forEach((p, i) => all.push([`container ${i} (${p.kind}/${p.table})`, p]));
  D.guards.forEach((p, i) => all.push(['guard ' + i, p]));
  for (const [w, p] of all) { const e = check(w, p) || reach(w, p); if (e) out.fails.push(e); }
  // shapes from the brief
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  if (D.inserts.length !== 4) out.fails.push('4 inserts expected');
  if (D.extracts.length !== 3 || D.extracts.filter((e) => e.openAt === 0).length !== 2 || !D.extracts.some((e) => e.openAt === 600)) out.fails.push('extract opening times');
  for (const e of D.extracts) if (e.r < 4 || e.r > 5) out.fails.push('extract radius ' + e.name);
  if (D.containers.length < 28 || D.containers.length > 36) out.fails.push('container count ' + D.containers.length);
  if (D.guards.length !== 6 || D.guards.filter((g) => g.elite && g.n === 3).length !== 1) out.fails.push('guard posts');
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = D.inserts[i], b = D.inserts[j];
    if (d2(a, b) < 60) out.fails.push(`inserts ${i} and ${j} only ${d2(a, b).toFixed(1)} m apart`);
    const ya = groundHeight(a.x, a.z, 0.5) + 1.6, yb = groundHeight(b.x, b.z, 0.5) + 1.6;
    if (lineClear(new V3(a.x, ya, a.z), new V3(b.x, yb, b.z))) out.fails.push(`inserts ${i} and ${j} see each other`);
  }
  for (const [i, a] of D.inserts.entries()) for (const e of D.extracts) if (d2(a, e) < 45) out.fails.push(`insert ${i} within 45 m of ${e.name}`);
  let minC = 1e9;
  for (let i = 0; i < D.containers.length; i++) for (let j = i + 1; j < D.containers.length; j++) {
    const a = D.containers[i], b = D.containers[j], d = Math.hypot(a.x - b.x, (a.y || 0) - (b.y || 0), a.z - b.z); minC = Math.min(minC, d);
    if (d < 1.5) out.fails.push(`containers ${i} and ${j} ${d.toFixed(2)} m apart`);
  }
  const elite = D.guards.find((g) => g.elite), weap = D.containers.filter((c) => c.table === 'weapons');
  if (!weap.length || weap.some((c) => d2(c, elite) > 15)) out.fails.push('weapons crates are not at the elite post');
  // classic modes: spawns of both teams walkable and connected
  for (const t of [0, 1]) SPAWNS[t].forEach(([x, z], i) => { const e = check(`spawn ${t}.${i}`, { x, z }) || reach(`spawn ${t}.${i}`, { x, z }); if (e) out.fails.push(e); });
  out.info = { navNodes: NAV.count, mainComp: NAV.comp.filter((c) => c === NAV.mainComp).length, poi: POI.length, minContainerGap: +minC.toFixed(2), col: COL.length };
  return out;
});
fails.push(...data.fails);
console.log('static checks', JSON.stringify(data.info));

await startSolo(page);
const sim = await page.evaluate((secs) => {
  // the player is out of play: invulnerable in the far corner of the checkpoint
  const dt = 1 / 30, bots = entities.filter((e) => !e.isPlayer), B = MAP;
  const st = new Map(bots.map((e) => [e, { trail: [], still: 0, maxStill: 0, w: [], cm: 0, lost: 0, bumpT: 0, maxBump: 0, dist: 0, prev: e.pos.clone() }]));
  let out = 0, steps = 0;
  for (; steps < secs * 30 && MATCH.state === 'playing'; steps++) {
    PL.ent.health = 1e9; PL.ent.pos.set(78, 0, -78);
    const before = new Map(bots.map((e) => [e, [e.pos.x, e.pos.z, e.alive]]));
    matchTick(dt, false);
    for (const e of bots) {
      const s = st.get(e), [x0, z0, was] = before.get(e);
      if (!e.alive || !was) { s.trail.length = 0; s.still = 0; s.w.length = 0; s.cm = s.lost = 0; s.bumpT = 0; s.prev.copy(e.pos); continue; }
      if (e.pos.x < B.x0 - 0.5 || e.pos.x > B.x1 + 0.5 || e.pos.z < B.z0 - 0.5 || e.pos.z > B.z1 + 0.5 || e.pos.y < -1) out++;
      s.dist += Math.hypot(e.pos.x - s.prev.x, e.pos.z - s.prev.z); s.prev.copy(e.pos);
      // stuck against the decor: share of the wanted step taken back by collisions over 0.5 s
      const cx = e.vel.x * dt, cz = e.vel.z * dt, cm = Math.hypot(cx, cz), lost = cm > 1e-4 ? Math.max(0, cm - ((e.pos.x - x0) * cx + (e.pos.z - z0) * cz) / cm) : 0;
      s.w.push([cm, lost]); s.cm += cm; s.lost += lost; if (s.w.length > 15) { const o = s.w.shift(); s.cm -= o[0]; s.lost -= o[1]; }
      if (s.cm > 0.3 && s.lost / s.cm > 0.55) { s.bumpT += dt; s.maxBump = Math.max(s.maxBump, s.bumpT); } else if (s.cm < 0.3 || s.lost / s.cm < 0.25) s.bumpT = 0;
      // stuck in place: for the last 10 s it stayed within 2 m and ended under 0.5 m from where it was, though it is not fighting and its goal is further on
      s.trail.push([e.pos.x, e.pos.z]); if (s.trail.length > 300) s.trail.shift();
      const t0 = s.trail[0], moved = Math.hypot(e.pos.x - t0[0], e.pos.z - t0[1]);
      const fighting = e.target && MATCH.time - (e.lastSeenT || -99) < 6; // strafing in a firefight is not being stuck
      const wants = !fighting && (cm > 0.02 * dt * 30 || (e.path && e.path.length > 0));
      const span = s.trail.length >= 300 && moved < 0.5 ? Math.max(...s.trail.map((q) => Math.hypot(q[0] - t0[0], q[1] - t0[1]))) : 99;
      const arrived = !e.goal || Math.hypot(e.goal.x - e.pos.x, e.goal.z - e.pos.z) < 2;
      if (span < 2 && wants && !arrived) { s.still += dt; if (s.still > s.maxStill) { s.maxStill = s.still; s.where = [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1), Math.round(cm * 3000) / 100, e.path ? e.path.length : -1, +Math.max(...s.trail.map((q) => Math.hypot(q[0] - t0[0], q[1] - t0[1]))).toFixed(1), e.goal ? [+e.goal.x.toFixed(1), +e.goal.z.toFixed(1)] : null, e.target ? 'T' : '', +(MATCH.time - (e.lastSeenT || -99)).toFixed(1)]; } } else s.still = 0;
    }
  }
  const v = [...st.values()];
  return { ran: steps / 30, out, kills: bots.reduce((a, e) => a + e.kills, 0), metres: v.map((s) => Math.round(s.dist)), maxBump: +Math.max(...v.map((s) => s.maxBump)).toFixed(2), maxStill: +Math.max(...v.map((s) => s.maxStill)).toFixed(2), stuckAt: v.filter((s) => s.maxStill > 0).map((s) => [+s.maxStill.toFixed(1), s.where]) };
}, secs);
console.log('bot match', JSON.stringify(sim));
if (sim.ran < secs - 1) fails.push('match stopped at ' + sim.ran + ' s');
if (sim.out) fails.push(sim.out + ' bot steps out of the map');
if (sim.maxBump > 10) fails.push('a bot pushed against the decor for ' + sim.maxBump + ' s');
if (sim.maxStill > 0) fails.push('a bot stood stuck for ' + (10 + sim.maxStill).toFixed(1) + ' s');
if (sim.metres.filter((m) => m > 30).length < sim.metres.length * 0.75) fails.push('bots barely move: ' + sim.metres.join(','));
await browser.close();
if (errors.length) fails.push(...errors.slice(0, 10));
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('test-map ok');
