import assert from 'node:assert/strict';
import { openPair, createLobby, joinLobby, launch, waitInMatch, stepBoth, settle } from './net2.mjs';
const rig = await openPair({ map: 'claudov' });
const { host, guest } = rig;
const keep = 'PL.ent.protT = 1; PL.ent.health = 100;';
const snapshot = () => ({
  role: NET.role, left: MATCH.timeLeft, state: efcCall('raid:state').state,
  loot: efcCall('world:list').map(c => [c.id, c.items]).sort((a, b) => a[0].localeCompare(b[0])),
  bots: entities.filter(e => e.remoteBot || e.netBot)
    .map(e => ({ id: e.peer || e.netId, squad: e.squad, alive: e.alive, health: e.health, pos: e.pos.toArray() }))
    .sort((a, b) => a.id.localeCompare(b.id)),
});
try {
  const code = await createLobby(host, { map: 'claudov' });
  await joinLobby(guest, code);
  await launch(host);
  await Promise.all([waitInMatch(host), waitInMatch(guest)]);
  await stepBoth([host, guest], 2, keep);
  const target = await guest.evaluate(() => {
    const c = efcCall('world:list').find(c => c.items.length);
    PL.ent.pos.set(c.x + 0.8, c.y, c.z);
    return { id: c.id, length: c.items.length };
  });
  await stepBoth([host, guest], 0.6, keep);
  await guest.evaluate(id => efcCall('world:take', id, 0), target.id);
  await stepBoth([host, guest], 0.6, keep);
  await guest.waitForFunction(({id, length}) => efcCall('world:list').find(c => c.id === id)?.items.length === length - 1, target);
  const slain = await host.evaluate(() => {
    const w = entities.find(e => e.netBot && e.alive && e.squad === 'w');
    applyDamage(w, 1000, PL.ent, 'test', true, new V3(1, 0, 0));
    return w.netId;
  });
  await stepBoth([host, guest], 0.6, keep);
  await guest.waitForFunction(id => NET.remotes.get(id)?.alive === false, slain);
  const before = await guest.evaluate(snapshot);
  assert.ok(before.bots.some(w => w.alive) && before.bots.some(w => w.id === slain && !w.alive));
  await guest.evaluate(() => {
    // A public relay sends hostdown and keeps the guest connection open during the grace period.
    const conn = NET.hostConn;
    NET.srv = true;
    NET.hostConn = null;
    conn.close();
    netMigShow('Waiting for the replacement host');
    SRV.on = true;
    netHostRelay = () => { netOldConnClose(); netMigDone(true); };
  });
  await host.close();
  await settle(350);
  await guest.evaluate(code => srvHostMatch({ code, migr: true, key: 'mock-migration-key' }), code);
  const after = await guest.evaluate(snapshot);
  assert.equal(after.role, 'host');
  assert.equal(after.left, before.left);
  assert.equal(after.state, before.state);
  assert.deepEqual(after.loot, before.loot);
  assert.deepEqual(after.bots.map(w => [w.id, w.squad, w.alive]), before.bots.map(w => [w.id, w.squad, w.alive]));
  for (const w of after.bots.filter(w => w.alive)) {
    const original = before.bots.find(b => b.id === w.id);
    assert.deepEqual(w.pos, original.pos);
    assert.equal(w.health, original.health);
  }
  await stepBoth([guest], 2, keep);
  const later = await guest.evaluate(snapshot);
  assert.ok(later.left < after.left);
  assert.ok(later.bots.some(w => w.alive && w.pos.some((value, i) => Math.abs(value - after.bots.find(b => b.id === w.id).pos[i]) > 0.05)));
  await guest.evaluate(() => {
    const active = efcRaidExtracts().find(x => x.open);
    PL.ent.pos.set(active.x, gy0(active.x, active.z), active.z);
    PL.ent.vel.set(0, 0, 0);
  });
  await stepBoth([guest], 10, keep);
  assert.equal(await guest.evaluate(() => efcCall('raid:state').state), 'out');
  assert.deepEqual(rig.errors, []);
  console.log('host loss preserves loot, Warden lives and timer, and extraction still works');
} finally {
  await rig.close();
}
