// WARDEN package test: Wardens in raid mode on simoun (posts, guard and patrol, group alert, reinforcements, loot), then tdm unchanged.
// NODE_PATH=/opt/node22/lib/node_modules node tools/dev/efc/test-warden.mjs ; RESPAWN=30 shortens the reinforcement delay (default: the game's EFC.cfg.wardenRespawn, 75 s)
// Stand-ins, in this page only, for what other packages add (each used only when missing): MODES.raid, allied()/soundFoe() by squad,
// the 'damage' filter in applyDamage and the 'died' event in killEnt (RAID), 'world:body' (WORLD) and 'loot:roll' (ITEMS).
import { openGame, startSolo, simRun } from './harness.mjs';
const RESPAWN = +(process.env.RESPAWN || 75);
const { browser, page, errors } = await openGame({ settings: { map: 'simoun', mode: 'raid' } });
const fails = [], ok = (cond, msg, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!cond) fails.push(msg); };
const stand = await page.evaluate((RESPAWN) => {
  const used = [];
  if (!MODES.raid) { MODES.raid = Object.assign({}, MODES.tdm, { name: 'Raid', botRespawn: EFC.cfg.wardenRespawn, prot: 0 }); used.push('MODES.raid'); }
  const was = MATCH.mode; MATCH.mode = 'raid';
  const squadAware = !allied({ team: 0, squad: 'w' }, { team: 0, squad: 0 });
  MATCH.mode = was;
  if (!squadAware) {
    const a0 = allied, s0 = soundFoe;
    allied = (a, b) => (MATCH.mode === 'raid' ? a === b || (a.squad !== undefined && a.squad === b.squad) : a0(a, b));
    soundFoe = (s, b) => (MATCH.mode === 'raid' ? !(s.who === b || (s.squad !== undefined && s.squad === b.squad)) : s0(s, b));
    used.push('allied/soundFoe');
  }
  window.T = { inv: false, kills: [], ff: 0, bodies: [] };
  const hasFilter = /efcFilter\(\s*'damage'/.test(applyDamage.toString()), hasDied = /'died'/.test(killEnt.toString());
  const ad0 = applyDamage;
  applyDamage = function (v, dmg, a, w, head, ...r) {
    if (v.isPlayer && T.inv) return;
    if (v.squad === 'w' && a && a.squad === 'w' && a !== v) T.ff++;
    if (!hasFilter && efcRaidMode() && !v.isRemote) dmg = efcFilter('damage', dmg, v, a, w, head);
    return ad0(v, dmg, a, w, head, ...r);
  };
  const ke0 = killEnt;
  killEnt = function (v, a, ...r) { T.kills.push({ v: v.name, vs: v.squad, as: a && a.squad, self: a === v }); ke0(v, a, ...r); if (!hasDied && efcRaidMode()) efcEmit('died', v, a); };
  if (!hasFilter) used.push('damage filter'); if (!hasDied) used.push('died event');
  if (!efcHas('world:body')) { efcProvide('world:body', (p, items, name) => T.bodies.push({ p, items, name })); used.push('world:body'); }
  if (!efcHas('loot:roll')) { efcProvide('loot:roll', (t) => [{ id: 'test_' + t, n: 1 }]); used.push('loot:roll'); }
  EFC.cfg.wardenRespawn = RESPAWN;
  return used;
}, RESPAWN);
console.log('stand-ins:', stand.join(', ') || 'none');
await startSolo(page);
// (a) after start
const a = await page.evaluate(() => {
  MATCH.timeLeft = 1e5; T.inv = true;
  const W = EFC.wd, bots = entities.filter((e) => !e.isPlayer);
  return { mode: MATCH.mode, posts: W.posts.map((p) => ({ x: Math.round(p.x), z: Math.round(p.z), r: p.r, n: p.n, m: p.members.length, elite: p.elite })),
    bots: bots.map((b) => { const p = W.posts[b.efcPost]; return { name: b.name, squad: b.squad, alive: b.alive, post: b.efcPost, d: p ? +hyp(b.pos.x - p.x, b.pos.z - p.z).toFixed(1) : null, r: p ? p.r : null, elite: b.efcElite }; }) };
});
console.log('posts', JSON.stringify(a.posts));
ok(a.mode === 'raid', '(a) match runs in raid mode', a.mode);
ok(a.posts.length > 1, '(a) guard posts from map:data', a.posts.length);
ok(a.bots.length >= 8 && a.bots.every((b) => b.squad === 'w' && /^Warden /.test(b.name)), '(a) every bot is a Warden (squad w, Warden name)', a.bots.map((b) => b.name));
ok(a.bots.every((b) => b.alive), '(a) every Warden is alive');
ok(a.bots.every((b) => b.d !== null && b.d <= b.r + 3), '(a) every Warden within its post radius + 3 m', a.bots.map((b) => b.d));
ok(a.posts.every((p) => p.m >= 1) && a.bots.some((b) => b.elite) === a.posts.some((p) => p.elite), '(a) every post manned, elite flag follows the post');
// (b) player parked far away, invulnerable, 60 s
const park = await page.evaluate(() => {
  const P = EFC.wd.posts; let best = -1, bd = -1;
  for (let id = 0; id < NAV.count; id += 7) { if (NAV.comp[id] !== NAV.mainComp) continue; const d = Math.min(...P.map((p) => hyp(NAV.nx[id] - p.x, NAV.nz[id] - p.z))); if (d > bd) { bd = d; best = id; } }
  window.PARK = [NAV.nx[best], NAV.ny[best], NAV.nz[best]]; PL.ent.pos.set(...PARK);
  return { x: Math.round(PARK[0]), z: Math.round(PARK[2]), d: Math.round(bd) };
});
console.log('park', JSON.stringify(park));
await page.evaluate(() => { T.near = []; T.n = 0; });
const ranB = await simRun(page, 60, `PL.ent.pos.set(...PARK); PL.ent.vel.set(0, 0, 0); if (++T.n % 30 === 0) { const ws = entities.filter((e) => e.squad === 'w' && e.alive); T.near.push(ws.filter((e) => { const p = EFC.wd.posts[e.efcPost]; return hyp(e.pos.x - p.x, e.pos.z - p.z) < 25; }).length / Math.max(1, ws.length)); }`);
const b = await page.evaluate(() => {
  const ws = entities.filter((e) => e.squad === 'w');
  return { ff: T.ff, wk: T.kills.filter((k) => k.vs === 'w' && k.as === 'w' && !k.self).length, deaths: T.kills.length, legs: EFC.wd.legs, avg: T.near.reduce((s, x) => s + x, 0) / T.near.length, min: Math.min(...T.near),
    end: ws.filter((e) => e.alive && hyp(e.pos.x - EFC.wd.posts[e.efcPost].x, e.pos.z - EFC.wd.posts[e.efcPost].z) < 25).length / ws.filter((e) => e.alive).length,
    seeing: ws.filter((e) => e.visible && e.target === PL.ent).length, info: efcCall('warden:info') };
});
ok(ranB >= 59.9, '(b) 60 game seconds ran', ranB);
ok(b.wk === 0 && b.ff === 0, '(b) no Warden hurt or killed another', { ff: b.ff, kills: b.wk, deaths: b.deaths });
ok(b.avg >= 0.8 && b.end >= 0.8, '(b) at least 80 % of Wardens within 25 m of their post (mean of 1 s samples, and at the end)', { mean: +b.avg.toFixed(2), min: +b.min.toFixed(2), end: +b.end.toFixed(2) });
ok(b.legs >= 1, '(b) at least one patrol leg', b.legs);
ok(b.seeing === 0, '(b) no Warden sees the parked player', b.seeing);
ok(b.info && b.info.alive === a.bots.length && b.info.posts.length === a.posts.length, '(b) warden:info', b.info);
// (c) player 15 m from a post, in view
const c0 = await page.evaluate(() => {
  const P = EFC.wd.posts, eye = new V3(), at = new V3();
  for (const p of P.slice().sort((x, y) => Math.max(...P.map((q) => hyp(q.x - y.x, q.z - y.z))) - Math.max(...P.map((q) => hyp(q.x - x.x, q.z - x.z))))) {
    const far = P.filter((q) => hyp(q.x - p.x, q.z - p.z) > 80); if (!far.length) continue;
    const ws = entities.filter((e) => e.alive && e.efcPost === p.i); if (!ws.length) continue;
    for (let id = 0; id < NAV.count; id++) {
      if (NAV.comp[id] !== NAV.mainComp) continue;
      const d = hyp(NAV.nx[id] - p.x, NAV.nz[id] - p.z); if (d < 14 || d > 16) continue;
      eye.set(NAV.nx[id], NAV.ny[id] + 1.6, NAV.nz[id]);
      if (!lineClear(eye, at.set(p.x, p.y + 1.5, p.z)) || !ws.some((w) => lineClear(eye, entChest(w, at)))) continue;
      window.SPOT = [NAV.nx[id], NAV.ny[id], NAV.nz[id]]; window.CP = p.i; window.FAR = far.map((q) => q.i);
      return { post: p.i, d: +d.toFixed(1), far: FAR };
    }
  }
  return null;
});
ok(!!c0, '(c) found a spot 15 m from a post in view, with posts more than 80 m away', c0);
if (c0) {
  await page.evaluate(() => { T.tFirst = -1; T.farT = 0; T.n = 0; });
  await simRun(page, 10, `PL.ent.pos.set(...SPOT); PL.ent.vel.set(0, 0, 0); T.n++;
    if (T.tFirst < 0 && entities.some((e) => e.alive && e.efcPost === CP && e.visible && e.target === PL.ent)) T.tFirst = T.n / 30;
    T.farT += entities.filter((e) => e.alive && FAR.includes(e.efcPost) && e.visible && e.target === PL.ent).length;`);
  const c = await page.evaluate(() => ({ first: T.tFirst, far: T.farT, mates: entities.filter((e) => e.alive && e.efcPost === CP).map((e) => ({ t: e.tactic, sees: e.visible && e.target === PL.ent })) }));
  ok(c.first >= 0 && c.first <= 10, '(c) a Warden of that post targets the player within 10 s', c);
  ok(c.far === 0, '(c) Wardens of posts more than 80 m away do not target the player', c.far);
}
// (d) kill a Warden through the engine damage path, reinforcement rules
const d0 = await page.evaluate(() => {
  const avoid = window.CP;
  const w = entities.find((e) => e.alive && e.squad === 'w' && e.efcPost !== avoid && !e.efcElite) || entities.find((e) => e.alive && e.squad === 'w');
  window.W = w; T.bodies.length = 0; const at = w.pos.clone(), p = EFC.wd.posts[w.efcPost];
  // elite damage filter, checked on the same path the raid uses
  const el = entities.find((e) => e.efcElite), fe = el ? [efcFilter('damage', 100, el, PL.ent, 'test', false), efcFilter('damage', 100, el, PL.ent, 'test', true)] : null, fn = efcFilter('damage', 100, w, PL.ent, 'test', false);
  T.inv = true; PL.ent.pos.set(...PARK);
  applyDamage(w, 500, PL.ent, 'test', false, new V3(0, 0, -1));
  const body = T.bodies[0];
  // the player moves near that post: 20 m off its centre on the nav mesh
  let near = null; for (let id = 0; id < NAV.count && !near; id++) if (NAV.comp[id] === NAV.mainComp && Math.abs(hyp(NAV.nx[id] - p.x, NAV.nz[id] - p.z) - 20) < 1) near = [NAV.nx[id], NAV.ny[id], NAV.nz[id]];
  window.NEAR = near || [p.x, p.y, p.z];
  return { name: w.name, post: w.efcPost, alive: w.alive, bodies: T.bodies.length, bodyD: body ? +hyp(body.p.x - at.x, body.p.z - at.z).toFixed(2) : null, items: body ? body.items : null, bodyName: body && body.name, elite: fe, plain: fn };
});
ok(!d0.alive, '(d) the Warden died through applyDamage', d0.name);
ok(d0.bodies === 1 && d0.bodyD < 1.5 && d0.bodyName === d0.name && Array.isArray(d0.items), '(d) world:body called once at the body with the loot roll', d0);
ok(d0.plain === 100 && (!d0.elite || (Math.abs(d0.elite[0] - 60) < 1e-9 && d0.elite[1] === 100)), '(d) damage filter: elite non-headshot x0.6, headshot and plain Warden unchanged', { elite: d0.elite, plain: d0.plain });
const ranD = await simRun(page, RESPAWN + 10, 'PL.ent.pos.set(...NEAR); PL.ent.vel.set(0, 0, 0);');
const d1 = await page.evaluate(() => ({ alive: W.alive, t: W.respawnT }));
ok(ranD >= RESPAWN + 9.9 && !d1.alive, `(d) player near the post: still dead after the delay (${RESPAWN} s) + 10 s`, d1);
await page.evaluate(() => { T.backT = -1; T.n = 0; });
await simRun(page, 10, 'PL.ent.pos.set(...PARK); PL.ent.vel.set(0, 0, 0); T.n++; if (T.backT < 0 && W.alive) T.backT = T.n / 30;');
const d2 = await page.evaluate(() => { const p = EFC.wd.posts[W.efcPost]; return { alive: W.alive, after: T.backT, post: W.efcPost, d: +hyp(W.pos.x - p.x, W.pos.z - p.z).toFixed(1), r: p.r }; });
ok(d2.alive && d2.d <= d2.r + 3, '(d) player far away: the Warden is back at a post', d2);
// (e) tdm still runs
await page.evaluate(() => { T.inv = false; Settings.mode = 'tdm'; endMatch(); LOCK.fallback = true; startMatch({}); });
const ranE = await simRun(page, 20, 'PL.ent.health = 100;');
const e = await page.evaluate(() => ({ mode: MATCH.mode, squads: entities.filter((x) => x.squad === 'w').length, names: entities.filter((x) => /^Warden/.test(x.name)).length, alive: entities.filter((x) => x.alive).length }));
ok(e.mode === 'tdm' && ranE >= 19.9, '(e) tdm runs 20 s', { ...e, ran: ranE });
ok(e.squads === 0 && e.names === 0, '(e) no Warden left in tdm (squad and names restored)', e);
ok(errors.length === 0, 'no page errors', errors.slice(0, 10));
await browser.close();
console.log(fails.length ? `test-warden: ${fails.length} FAILED` : 'test-warden: all passed');
process.exit(fails.length ? 1 : 0);
