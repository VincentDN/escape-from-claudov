// RAID package test (logic stepping, no rendering): raid start, one life, extraction, timer, squads, raid kit. Exits non-zero on failure.
// node tools/dev/efc/test-raid.mjs
import { openGame, startSolo, simRun } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { map: 'simoun', mode: 'raid' } });
let fails = 0;
const check = (name, ok, info) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fails++; };
const ev = (fn, arg) => page.evaluate(fn, arg);
// a fresh raid: leave the current one, start again, keep the player alive unless a test says otherwise
async function fresh() {
  await ev(() => { if (MATCH.state !== 'menu') efcCall('raid:leave'); window.__over = []; window.__bodies = []; });
  await startSolo(page);
}
const KEEP = 'PL.ent.health = 100;';
// listeners and a fake world body service, registered in the test page only
await ev(() => {
  window.__over = []; window.__bodies = [];
  efcOn('raid:over', (s) => window.__over.push(s));
  efcProvide('world:body', (p, items, name) => window.__bodies.push({ p, items, name }));
});

// (a) a solo raid on simoun starts in mode raid, state live
await startSolo(page);
let r = await ev(() => ({ mode: MATCH.mode, state: efcCall('raid:state').state, left: MATCH.timeLeft, limit: MATCH.limit, squad: PL.ent.squad, alive: PL.ent.alive, ext: efcCall('raid:state').extracts.length }));
check('(a) raid starts live', r.mode === 'raid' && r.state === 'live' && r.alive && r.squad === 0 && (r.limit === null || r.limit === Infinity), r);
check('(a) raid length from EFC.cfg.raidMinutes', Math.abs(r.left - (await ev(() => EFC.cfg.raidMinutes)) * 60) < 1, r.left);
check('(a) map has extracts', r.ext > 0, r.ext);
await simRun(page, 2, KEEP);

// (e) allied: player vs bot false, bot vs bot true
r = await ev(() => { const b = entities.filter((e) => !e.isPlayer && !e.off); return { pb: allied(PL.ent, b[0]), bb: allied(b[0], b[1]), n: b.length, sq: b[0].squad, total: entities.filter((e) => !e.isPlayer).length }; });
check('(e) player and bot are hostile', r.pb === false, r);
check('(e) two bots are allied (Wardens)', r.bb === true && r.sq === 'w', r);
check('(e) all bots in play in raid', r.n === r.total, r);

// (b) kill the player through the engine damage path: no respawn, state dead, raid:over 'dead'
r = await ev(() => { const b = entities.find((e) => !e.isPlayer && e.alive); applyDamage(PL.ent, 500, b, 'test', false); return { alive: PL.ent.alive, state: efcCall('raid:state').state }; });
check('(b) player killed', r.alive === false && r.state === 'dead', r);
let ran = await simRun(page, 15);
r = await ev(() => ({ alive: PL.ent.alive, state: efcCall('raid:state').state, over: window.__over, bodies: window.__bodies.length, mstate: MATCH.state }));
check('(b) no respawn after 15 s', ran >= 14.9 && r.alive === false && r.state === 'dead', { ran, ...r });
check('(b) raid:over fired once with result dead', r.over.length === 1 && r.over[0].result === 'dead', r.over);
check('(b) body spawned through world:body', r.bodies === 1, r.bodies);

// (c) extraction: hold 7 s in an open extract; leaving midway resets the hold
await fresh();
const ex = await ev(() => efcCall('raid:state').extracts.find((x) => x.open));
check('(c) an open extract exists', !!ex, ex);
const at = (x, z) => `${KEEP} PL.ent.pos.set(${x}, gy0(${x}, ${z}), ${z}); PL.ent.vel.set(0, 0, 0);`;
await simRun(page, 3, at(ex.x, ex.z));
r = await ev(() => efcCall('raid:state'));
check('(c) holding after 3 s', r.holdId === ex.id && r.hold > 2.5 && r.hold < 3.5 && r.state === 'live', { hold: r.hold, id: r.holdId });
await simRun(page, 0.2, at(ex.x + ex.r + 6, ex.z));
r = await ev(() => efcCall('raid:state'));
check('(c) leaving resets the hold', r.hold === 0 && r.holdId === '' && r.state === 'live', { hold: r.hold });
await simRun(page, 5, at(ex.x, ex.z));
r = await ev(() => efcCall('raid:state'));
check('(c) not out after 5 s back inside', r.state === 'live', { hold: r.hold });
await simRun(page, 3, at(ex.x, ex.z));
r = await ev(() => ({ s: efcCall('raid:state'), over: window.__over, out: PL.ent.out, alive: PL.ent.alive, vis: PL.ent.model ? PL.ent.model.root.visible : false, bodies: window.__bodies.length }));
check('(c) extracted: state out, e.out, not alive, no body', r.s.state === 'out' && r.out === true && r.alive === false && r.bodies === 0, r);
check('(c) raid:over extracted with extract name', r.over.length === 1 && r.over[0].result === 'extracted' && r.over[0].extract === ex.name, r.over);
await simRun(page, 10);
r = await ev(() => ({ alive: PL.ent.alive, hit: (() => { const b = entities.find((e) => !e.isPlayer && e.alive); const h = PL.ent.health; applyDamage(PL.ent, 50, b, 't', false); return PL.ent.health === h; })() }));
check('(c) out player never respawns and takes no damage', r.alive === false && r.hit, r);

// (d) timer: 1 s left, result mia
await fresh();
await ev(() => { MATCH.timeLeft = 1; });
await simRun(page, 3, KEEP);
r = await ev(() => ({ s: efcCall('raid:state').state, over: window.__over, mstate: MATCH.state }));
check('(d) timer at zero: mia', r.s === 'mia' && r.over.length === 1 && r.over[0].result === 'mia', r);

// (f) raid kit with fake item services: weapons from the inventory, rounds in sync, ammo top-up and ammo:give
await ev(() => {
  const defs = { ak: { id: 'ak', kind: 'weapon', value: 100, weapon: { wkey: 'ak47' } }, pist: { id: 'pist', kind: 'weapon', value: 20, weapon: { wkey: 'm9' } }, r762: { id: 'r762', kind: 'ammo', value: 1, ammo: { fam: 'rifle' } } };
  window.__inv = { slots: { primary: { id: 'ak', n: 1, mag: 7, res: 10 }, sidearm: { id: 'pist', n: 1 }, armor: null, pack: null }, bag: [{ id: 'r762', n: 500 }] };
  window.__commits = [];
  efcProvide('raid:kit', () => window.__inv);
  efcProvide('item:def', (id) => defs[id]);
  efcProvide('inv:weapons', (inv) => [inv.slots.primary, inv.slots.sidearm].filter(Boolean).map((it) => defs[it.id].weapon.wkey));
  efcProvide('inv:weaponItems', (inv) => [inv.slots.primary, inv.slots.sidearm]);
  efcProvide('inv:all', (inv) => [inv.slots.primary, inv.slots.sidearm].filter(Boolean).concat(inv.bag));
  efcProvide('inv:remove', (inv, i, n) => { const it = inv.bag[i]; if (!it) return null; const k = Math.min(n, it.n); it.n -= k; if (!it.n) inv.bag.splice(i, 1); return { id: it.id, n: k }; });
  efcProvide('raid:commit', (res) => window.__commits.push(res));
});
await fresh();
r = await ev(() => ({ ids: PL.weapons.map((s) => s.def.id), mag: PL.weapons[0].mag, res: PL.weapons[0].reserve, inv: EFC.inv === window.__inv }));
check('(f) weapons built from the inventory, item rounds applied', r.inv && r.ids.join() === 'ak47,m9' && r.mag === 7 && r.res === 10, r);
await simRun(page, 1.5, KEEP);
r = await ev(() => ({ res: PL.weapons[0].reserve, max: PL.weapons[0].def.reserve, bag: window.__inv.bag.map((i) => i.n), itemRes: window.__inv.slots.primary.res }));
check('(f) reserve topped up from bag ammo, item in sync', r.res === r.max && r.bag[0] === 500 - (r.max - 10) && r.itemRes === r.max, r);
r = await ev(() => { PL.weapons[0].reserve -= 30; const left = efcCall('ammo:give', 'rifle', 50); return { left, res: PL.weapons[0].reserve, max: PL.weapons[0].def.reserve }; });
check('(f) ammo:give fills to the maximum and returns the rest', r.left === 20 && r.res === r.max, r);
r = await ev(() => { window.__inv.slots.primary = null; efcEmit('inv:changed'); return { ids: PL.weapons.map((s) => s.def.id) }; });
check('(f) rebuild when the primary slot changes', r.ids.join() === 'm9', r);
await ev(() => { MATCH.timeLeft = 0.5; });
await simRun(page, 2, KEEP);
r = await ev(() => window.__commits);
check('(f) raid:commit called at raid end', r.length === 1 && r[0] === 'mia', r);

// leaving goes back to the main menu, and emits match:left
r = await ev(() => { window.__left = 0; efcOn('match:left', () => window.__left++); efcCall('raid:leave'); return { state: MATCH.state, inv: EFC.inv, st: efcCall('raid:state').state, left: window.__left }; });
check('raid:leave returns to the menu, match:left once', r.state === 'menu' && r.inv === null && r.st === 'idle' && r.left === 1, r);

// (g) nothing listens to raid:over: the built-in summary shows, and its Leave button returns to the menu
await startSolo(page);
await ev(() => { delete EFC.hooks['raid:over']; MATCH.timeLeft = 0.5; });
await simRun(page, 2, KEEP);
r = await ev(() => { const s = document.getElementById('efcRaidSum'); const txt = s ? s.textContent : ''; if (s) s.querySelector('button').click(); return { txt, state: MATCH.state, gone: !document.getElementById('efcRaidSum') }; });
check('(g) fallback summary with Leave button', /Missing in action/.test(r.txt) && r.state === 'menu' && r.gone, r);

await browser.close();
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); fails++; }
console.log(fails ? `test-raid: ${fails} failure(s)` : 'test-raid ok');
process.exit(fails ? 1 : 0);
