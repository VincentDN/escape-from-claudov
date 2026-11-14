// Two-client raid with the real packages: shared loot, a looted body, squads. Build first (python3 build.py).
// node tools/dev/efc/test-e2e-net.mjs
import { openPair, createLobby, joinLobby, launch, waitInMatch, stepBoth, settle } from './net2.mjs';
const MAP = process.env.MAP || 'simoun', KEEP = 'PL.ent.health = 100; PL.ent.protT = 1;';
let fails = 0;
const ok = (c, name, info) => { console.log((c ? 'ok   ' : 'FAIL ') + name + (info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 400))); if (!c) fails++; };
const count = (l) => l.reduce((s, it) => s + (it.n || 1), 0);
const rig = await openPair({ map: MAP, init: 'try{localStorage.removeItem("efc_stash_v1")}catch(e){}' });
const { host, guest } = rig, both = [host, guest];
const code = await createLobby(host, { mode: 'raid', map: MAP });
await joinLobby(guest, code);
await guest.evaluate(() => netTeamSwap(NET.me)); await settle(500); // a new player joins the host's squad: move to the next one
await launch(host);
await Promise.all([waitInMatch(host), waitInMatch(guest)]);
await stepBoth(both, 2, KEEP); await settle(300); await stepBoth(both, 0.4, KEEP);
const view = () => { const w = efcCall('world:list') || []; return { n: w.length, items: w.reduce((s, c) => s + c.items.reduce((a, it) => a + (it.n || 1), 0), 0), ids: w.map((c) => c.id).sort().join(','), raid: efcCall('raid:state').state, squad: PL.ent.squad, inv: !!EFC.inv }; };
const h0 = await host.evaluate(view), g0 = await guest.evaluate(view);
ok(h0.raid === 'live' && g0.raid === 'live' && h0.inv && g0.inv, 'both players are in a live raid with a kit', { h: h0.raid, g: g0.raid });
ok(h0.n >= 8 && g0.n === h0.n && g0.ids === h0.ids && g0.items === h0.items, 'the guest sees the same containers and contents as the host', { host: [h0.n, h0.items], guest: [g0.n, g0.items] });
ok(h0.squad !== g0.squad, 'the two players are in different squads', [h0.squad, g0.squad]);
const foe = await host.evaluate(() => { const r = [...NET.remotes.values()].find((e) => !e.remoteBot && !e.netBot); return r ? { allied: allied(PL.ent, r), squad: r.squad } : null; });
ok(foe && foe.allied === false, 'players of different squads are hostile', foe);

// the guest takes an item: granted once, and the host's copy of the container changes
const tgt = await guest.evaluate(() => { const c = (efcCall('world:list') || []).find((x) => x.items.length && x.kind !== 'body'); PL.ent.pos.set(c.x + 0.8, c.y, c.z); PL.ent.vel.set(0, 0, 0); return { id: c.id, n: c.items.length, first: c.items[0], carried: efcCall('inv:all', EFC.inv).reduce((s, it) => s + (it.n || 1), 0) }; });
await stepBoth(both, 0.6, KEEP); await settle(200);
await guest.evaluate((t) => efcCall('world:take', t.id, 0), tgt);
await settle(300); await stepBoth(both, 0.6, KEEP); await settle(300); await stepBoth(both, 0.4, KEEP);
const after = async (pg, id) => pg.evaluate((id) => { const c = (efcCall('world:list') || []).find((x) => x.id === id); return { left: c ? c.items.length : -1, carried: efcCall('inv:all', EFC.inv).reduce((s, it) => s + (it.n || 1), 0) }; }, id);
const ga = await after(guest, tgt.id), ha = await after(host, tgt.id);
ok(ga.carried > tgt.carried && ga.left === tgt.n - 1, 'the guest received the item it took', { before: tgt.carried, after: ga.carried, left: ga.left });
ok(ha.left === tgt.n - 1, 'the host sees the container with one item less', ha.left);

// the guest dies: its body, with its kit, exists on the host, and the host can loot it
const gd = await guest.evaluate(() => { const carried = efcCall('inv:all', EFC.inv).length, p = { x: PL.ent.pos.x, z: PL.ent.pos.z }; PL.ent.protT = 0; applyDamage(PL.ent, 999, entities.find((e) => !e.isPlayer), 'M4A1', false, new V3(1, 0, 0)); return { carried, p, alive: PL.ent.alive }; });
const LIVE = 'if (PL.ent.alive) { PL.ent.health = 100; PL.ent.protT = 1; }'; // the host must survive to loot the body
await settle(300); await stepBoth(both, 1, LIVE); await settle(300); await stepBoth(both, 3, LIVE); await settle(300);
const hb = await host.evaluate((p) => { const b = (efcCall('world:list') || []).find((c) => c.kind === 'body' && Math.hypot(c.x - p.x, c.z - p.z) < 3); if (!b) return null; PL.ent.pos.set(b.x + 0.8, b.y, b.z); PL.ent.vel.set(0, 0, 0); return { id: b.id, items: b.items.length, name: b.name }; }, gd.p);
ok(!gd.alive && hb && hb.items === gd.carried, 'the dead guest left a body with its whole kit on the host', { hb, carried: gd.carried });
const gs = await guest.evaluate(() => ({ state: efcCall('raid:state').state, alive: PL.ent.alive }));
ok(gs.state === 'dead' && !gs.alive, 'the guest is dead for good', gs);
if (hb) {
  const hc = await host.evaluate(() => efcCall('inv:all', EFC.inv).reduce((s, it) => s + (it.n || 1), 0));
  await stepBoth(both, 0.5, KEEP);
  await host.evaluate((id) => efcCall('world:take', id, 0), hb.id);
  await settle(200); await stepBoth(both, 0.6, KEEP); await settle(200);
  const h2 = await after(host, hb.id), g2 = await guest.evaluate((id) => { const c = (efcCall('world:list') || []).find((x) => x.id === id); return c ? c.items.length : -1; }, hb.id);
  ok(h2.carried > hc && h2.left === hb.items - 1 && g2 === hb.items - 1, 'the host looted the body and both machines agree on what is left', { had: hc, now: h2.carried, left: h2.left, guestSees: g2 });
}
const errs = rig.errors || [];
if (errs.length) { console.error(errs.slice(0, 10).join('\n')); fails++; }
await rig.close();
console.log(fails ? 'test-e2e-net: ' + fails + ' failure(s)' : 'test-e2e-net ok');
process.exit(fails ? 1 : 0);
