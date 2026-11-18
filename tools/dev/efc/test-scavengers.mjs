import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';
const { browser, page, errors } = await openGame({ settings: { map: 'claudov' } });
try {
  await startSolo(page);
  const result = await page.evaluate(() => {
    GPUX.halt = true;
    const p = PL.ent, scavs = entities.filter(e => e.squad === 's' && e.alive), b = scavs[0];
    const wardens = entities.filter(e => e.squad === 'w' && e.alive), w = wardens[0];
    const budget = scavs.length + wardens.length;
    p.pos.set(290, 0, 290);
    const c = efcCall('world:list').find(c => ['crate', 'locker', 'bag'].includes(c.kind) && c.items.length);
    b.pos.set(c.x, c.y, c.z);
    const count = c.items.length;
    efcCall('scav:update', b, 1 / 30, 1);
    const remaining = efcCall('world:list').find(o => o.id === c.id).items.length;
    const spot = w.pos.clone(), home = EFC.wd.posts[w.efcPost];
    b.pos.copy(spot);
    p.pos.copy(spot).add(new V3(0.4, 0, 0.4));
    let alerts = 0;
    efcOn('scav:alert', () => { alerts++; });
    efcCall('scav:update', b, 1 / 30, 3);
    const cornered = b.efcScav.phase;
    const ignored = allied(w, b) && allied(b, w) && !allied(p, b);
    const alertFoe = home.members.some(member => member.chaseE === p);
    return { count, remaining, budget, expectedBudget: efcWardenNumber(1), scavs: scavs.length, alerts, cornered, ignored, alertFoe };
  });
  assert.equal(result.scavs, 2);
  assert.equal(result.budget, result.expectedBudget);
  assert.equal(result.remaining, result.count - 1);
  assert.equal(result.alerts, 1);
  assert.equal(result.cornered, 'cornered');
  assert.ok(result.ignored && result.alertFoe);
  assert.deepEqual(errors, []);
  console.log('Scavenger host loot, budget, Warden alert and factions passed', result);
} finally {
  await browser.close();
}
