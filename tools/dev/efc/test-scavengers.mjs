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
    MATCH.time = 1;
    efcCall('scav:update', b, 1 / 30, MATCH.time);
    const remaining = efcCall('world:list').find(o => o.id === c.id).items.length;
    const pairs = (inside) => {
      const posts = EFC.wd.posts;
      for (let i = 0; i < NAV.count; i += 3) {
        if (NAV.comp[i] !== NAV.mainComp) continue;
        const x = NAV.nx[i], y = NAV.ny[i], z = NAV.nz[i];
        const post = efcScavengerNearest({ pos: { x, z } }, posts);
        const dist = hyp(post.x - x, post.z - z);
        if (inside ? dist > post.r + 2 : dist < post.r + 5 || dist > post.r + 16) continue;
        b.pos.set(x, y, z);
        for (const [dx, dz] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) {
          const j = navNode(x + dx, y, z + dz);
          if (j < 0 || NAV.comp[j] !== NAV.mainComp) continue;
          p.pos.set(NAV.nx[j], NAV.ny[j], NAV.nz[j]);
          const distance = p.pos.distanceTo(b.pos);
          if (distance >= 4 && distance < 8 && lineClear(entEye(b, new V3()), entChest(p, new V3()))) return post;
        }
      }
      throw new Error('No clear Scavenger test placement');
    };
    pairs(false);
    MATCH.time = 2;
    efcCall('scav:update', b, 1 / 30, MATCH.time);
    MATCH.time += EFC_BARKS.spot.lead + 0.001;
    efcBarkActionTick();
    efcCall('scav:update', b, 1 / 30, MATCH.time);
    const retreat = b.efcScav.phase;
    const home = pairs(true);
    let alerts = 0;
    efcOn('scav:alert', () => { alerts++; });
    MATCH.time = 3.2;
    efcCall('scav:update', b, 1 / 30, MATCH.time);
    const alertBeforeLead = alerts;
    MATCH.time += EFC_BARKS.help.lead + 0.001;
    efcBarkActionTick();
    const cornered = b.efcScav.phase;
    const ignored = allied(w, b) && allied(b, w) && !allied(p, b);
    const alertFoe = home.members.some(member => member.chaseE === p);
    return { count, remaining, budget, expectedBudget: efcWardenNumber(1), scavs: scavs.length, alerts, alertBeforeLead, retreat, cornered, ignored, alertFoe };
  });
  assert.equal(result.scavs, 2);
  assert.equal(result.budget, result.expectedBudget);
  assert.equal(result.remaining, result.count - 1);
  assert.equal(result.retreat, 'flee', JSON.stringify(result));
  assert.equal(result.alertBeforeLead, 0);
  assert.equal(result.alerts, 1, JSON.stringify(result));
  assert.equal(result.cornered, 'cornered');
  assert.ok(result.ignored && result.alertFoe);
  assert.deepEqual(errors, []);
  console.log('Scavenger host loot, budget, Warden alert and factions passed', result);
} finally {
  await browser.close();
}
