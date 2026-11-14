// End-to-end solo raid with the real packages (no fakes): hideout stash -> raid -> search a container with F -> take -> extract ->
// summary -> hideout has the loot; then a second raid: die -> body holds the kit -> gear is gone from the stash.
// node tools/dev/efc/test-e2e.mjs ; MAP=claudov
import { openGame, simRun } from './harness.mjs';
const MAP = process.env.MAP || 'simoun', KEEP = 'PL.ent.health = 100;';
let fails = 0;
const check = (c, name, info) => { console.log((c ? 'ok   ' : 'FAIL ') + name + (info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 500))); if (!c) fails++; };
const { browser, page, errors } = await openGame({ w: 960, h: 540, settings: { map: MAP, mode: 'raid' }, init: 'try{localStorage.removeItem("efc_stash_v1")}catch(e){}' });
const count = (list) => list.reduce((s, it) => s + (it.n || 1), 0);

// ---------- Hideout: starter stash ----------
const st0 = await page.evaluate(() => { const s = efcCall('stash:get'); return { items: s.items.length, prim: s.loadout.slots.primary && s.loadout.slots.primary.id, side: s.loadout.slots.sidearm && s.loadout.slots.sidearm.id, bag: s.loadout.bag.length }; });
check(st0.items > 0 && st0.prim && st0.side, 'starter stash and equipped loadout', st0);

// ---------- Raid 1: loot and extract ----------
await page.evaluate(() => { Settings.mode = 'raid'; LOCK.fallback = true; startMatch({}); });
await simRun(page, 1, KEEP);
const r0 = await page.evaluate(() => {
  const r = efcCall('raid:state'), w = efcCall('world:list') || [], md = efcCall('map:data');
  const ins = md.inserts.map((p) => Math.hypot(p.x - PL.ent.pos.x, p.z - PL.ent.pos.z));
  return { mode: MATCH.mode, state: r.state, extracts: r.extracts.length, inv: !!EFC.inv, prim: EFC.inv && EFC.inv.slots.primary && EFC.inv.slots.primary.id, gun: PL.weapons[0] && PL.weapons[0].def.key,
    cont: w.length, filled: w.filter((c) => c.items.length).length, stashLoadoutEmpty: !efcCall('stash:get').loadout.slots.primary, squadW: entities.filter((e) => !e.isPlayer).every((e) => e.squad === 'w'), insertDist: Math.round(Math.min(...ins)), squad: PL.ent.squad };
});
check(r0.mode === 'raid' && r0.state === 'live' && r0.extracts === 3, 'raid is live with three extracts', r0);
check(r0.inv && r0.prim === st0.prim && r0.gun === st0.prim.replace(/^w_/, ''), 'the raid kit is the hideout loadout and the engine weapon matches it', { prim: r0.prim, gun: r0.gun });
check(r0.stashLoadoutEmpty, 'the loadout left the stash (it is at risk)');
check(r0.cont >= 8 && r0.filled >= r0.cont * 0.6, 'containers were placed and filled by the loot tables', { cont: r0.cont, filled: r0.filled });
check(r0.squadW && r0.squad === 0, 'bots are Wardens (squad w), the player is squad 0');
check(r0.insertDist <= 6, 'the player was inserted at an insert point', r0.insertDist);

// walk up to a filled container and search it with F
const target = await page.evaluate(() => {
  const c = (efcCall('world:list') || []).find((x) => x.items.length >= 1 && x.kind !== 'body');
  PL.ent.pos.set(c.x + 0.9, gy0(c.x + 0.9, c.z), c.z); PL.ent.vel.set(0, 0, 0);
  return { id: c.id, kind: c.kind, name: c.name, items: c.items };
});
await simRun(page, 0.3, KEEP);
const pr = await page.evaluate(() => ({ show: $('efcPrompt').classList.contains('show'), text: $('efcPromptT').textContent }));
check(pr.show && /Search/.test(pr.text), 'search prompt at a real container', pr);
await page.keyboard.down('KeyF');
await simRun(page, 3.2, KEEP);
await page.keyboard.up('KeyF');
const lo = await page.evaluate(() => ({ open: !$('efcLoot').classList.contains('hidden'), busy: efcCall('ui:busy'), rows: $('efcLootList').querySelectorAll('.efc-it').length }));
check(lo.open && lo.busy === true && lo.rows === target.items.length, 'holding F opens the loot panel on the real container', { ...lo, want: target.items.length });
const before = await page.evaluate(() => efcCall('inv:all', EFC.inv));
await page.evaluate(() => efcUirTakeAll());
await simRun(page, 1.5, KEEP);
const after = await page.evaluate((id) => ({ inv: efcCall('inv:all', EFC.inv), left: ((efcCall('world:list') || []).find((c) => c.id === id) || { items: [] }).items, w: efcCall('inv:weight', EFC.inv), cap: efcCall('inv:cap', EFC.inv) }), target.id);
const gained = count(after.inv) - count(before);
check(gained > 0 && gained + count(after.left) >= count(target.items) - 400, 'Take all moved loot from the container into the inventory', { gained, left: count(after.left), had: count(target.items), w: after.w, cap: after.cap });
await page.keyboard.press('Escape');
await simRun(page, 0.3, KEEP);
check(await page.evaluate(() => efcCall('ui:busy') === false), 'Escape closes the loot panel');

// kill a Warden through the engine damage path: its body is lootable
const body = await page.evaluate(() => {
  const b = entities.find((e) => !e.isPlayer && e.alive); b.protT = 0;
  const n0 = (efcCall('world:list') || []).filter((c) => c.kind === 'body').length;
  applyDamage(b, 500, PL.ent, PL.weapons[0].def.name, false, new V3(1, 0, 0));
  return { dead: !b.alive, n0, kills: PL.ent.kills };
});
await simRun(page, 0.5, KEEP);
const body2 = await page.evaluate(() => { const l = (efcCall('world:list') || []).filter((c) => c.kind === 'body'); return { n: l.length, items: l.length ? l[l.length - 1].items.length : 0, name: l.length ? l[l.length - 1].name : '' }; });
check(body.dead && body2.n === body.n0 + 1 && body2.items > 0, 'a killed Warden leaves a body with loot', { ...body, ...body2 });

// extract
await page.evaluate(() => { const x = efcCall('raid:state').extracts.find((e) => !e.openAt); PL.ent.pos.set(x.x, gy0(x.x, x.z), x.z); PL.ent.vel.set(0, 0, 0); });
await simRun(page, 3, KEEP);
const mid = await page.evaluate(() => { const r = efcCall('raid:state'); return { state: r.state, hold: r.hold }; });
check(mid.state === 'live' && mid.hold > 2, 'the extraction hold is counting', mid);
await simRun(page, 5, KEEP);
await page.waitForTimeout(300);
const out = await page.evaluate(() => ({ state: efcCall('raid:state').state, sum: !$('efcSum') || !$('efcSum').classList.contains('hidden'), text: ($('efcSum') || document.body).innerText.slice(0, 300) }));
check(out.state === 'out' && /Extracted/.test(out.text), 'extracted, and the summary says so', out);
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^hideout$/i.test(x.textContent.trim()) && x.getClientRects().length); if (b) b.click(); });
await page.waitForFunction(() => MATCH.state === 'menu', null, { timeout: 30000, polling: 200 }).catch(() => {});
const st1 = await page.evaluate(() => { const s = efcCall('stash:get'); return { state: MATCH.state, screen: UI.screen, items: s.items, world: (efcCall('world:list') || []).length }; });
check(st1.state === 'menu' && st1.screen === 'hideout', 'the summary leads back to the Hideout', { state: st1.state, screen: st1.screen });
check(count(st1.items) >= count(after.inv) - 1 && st1.items.some((it) => it.id === st0.prim), 'the stash holds the kit and the loot brought out', { stash: count(st1.items), carried: count(after.inv) });
check(st1.world === 0, 'the world was cleared when the raid was left', st1.world);

// ---------- Raid 2: die ----------
await page.evaluate((prim) => { const s = efcCall('stash:get'); const i = s.items.findIndex((it) => it.id === prim); efcCall('stash:toLoadout', i); }, st0.prim);
const kit2 = await page.evaluate(() => efcCall('stash:get').loadout.slots.primary);
check(!!kit2, 'a weapon was equipped again from the stash');
await page.evaluate(() => { uiHide(); Settings.mode = 'raid'; LOCK.fallback = true; startMatch({}); });
await simRun(page, 1, KEEP);
const d = await page.evaluate(() => {
  const foe = entities.find((e) => !e.isPlayer), pos = { x: PL.ent.pos.x, z: PL.ent.pos.z }, carried = efcCall('inv:all', EFC.inv).length;
  applyDamage(PL.ent, 999, foe, 'M4A1', false, new V3(1, 0, 0));
  return { alive: PL.ent.alive, pos, carried };
});
await simRun(page, 14, '');
await page.waitForTimeout(300);
const dead = await page.evaluate((p) => {
  const b = (efcCall('world:list') || []).find((c) => c.kind === 'body' && Math.hypot(c.x - p.x, c.z - p.z) < 3);
  return { alive: PL.ent.alive, state: efcCall('raid:state').state, body: b ? b.items.length : -1, text: ($('efcSum') || document.body).innerText.slice(0, 200), prim: efcCall('stash:get').loadout.slots.primary };
}, d.pos);
check(!d.alive && !dead.alive && dead.state === 'dead', 'the player died and did not respawn in 14 s', { alive: dead.alive, state: dead.state });
check(dead.body === d.carried, 'the body holds everything the player carried', { body: dead.body, carried: d.carried });
check(/Killed in action/.test(dead.text) && !dead.prim, 'summary says killed in action and the loadout is gone', { text: dead.text.slice(0, 80) });

await browser.close();
if (errors.length) { console.error(errors.slice(0, 12).join('\n')); fails++; }
console.log(fails ? 'test-e2e: ' + fails + ' failure(s)' : 'test-e2e ok');
process.exit(fails ? 1 : 0);
