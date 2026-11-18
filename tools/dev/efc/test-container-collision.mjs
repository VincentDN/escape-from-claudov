import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { map: 'claudov' } });
try {
  await startSolo(page);
  const result = await page.evaluate(() => {
    GPUX.halt = true;
    const p = PL.ent;
    const original = EFC_RUNTIME_BOXES.size;
    let center, from, to;
    for (let i = 0; i < NAV.count; i += 3) {
      if (NAV.comp[i] !== NAV.mainComp) continue;
      const x = NAV.nx[i], y = NAV.ny[i], z = NAV.nz[i];
      if (!navClear(x, z, y) || !navClear(x - 2, z, y) || !navClear(x + 2, z, y)) continue;
      const a = new V3(x - 2, y, z), b = new V3(x + 2, y, z);
      if (!navWalkable(a, b) || rayWorld(a.x, y + 0.4, z, 1, 0, 0, 4)) continue;
      if (!efcNavRuntimeClear(x, y, z) || !navLinkClear(a.x, a.z, y, b.x, b.z, y)) continue;
      center = new V3(x, y, z); from = a; to = b; break;
    }
    if (!center) throw new Error('No clear test lane');
    const id = efcWorldSpawn('crate', center, [], 'Collision fixture');
    p.pos.copy(from); p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true;
    p.yaw = -Math.PI / 2; p.input = makeInput(); p.input.mz = 1;
    for (let i = 0; i < 45; i++) ctlMove(p, 1 / 60);
    const stopped = p.pos.x < center.x - 0.65 && p.pos.x > from.x + 0.5;
    const hit = rayWorld(from.x, center.y + 0.4, center.z, 1, 0, 0, 4);
    const material = hit?.m;
    const counted = EFC_RUNTIME_BOXES.size;
    const direct = navWalkable(from, to);
    const alternate = findPath(from, to);
    const valid = !!alternate?.length && alternate.every(pt => efcNavRuntimeClear(pt.x, pt.y, pt.z));
    efcEmit('match:left');
    const after = rayWorld(from.x, center.y + 0.4, center.z, 1, 0, 0, 4);
    return { id, original, counted, stopped, material, direct, valid, left: EFC_RUNTIME_BOXES.size, clear: !after };
  });
  assert.ok(result.original > 0);
  assert.equal(result.counted, result.original + 1);
  assert.equal(result.stopped, true, JSON.stringify(result));
  assert.equal(result.material, 'wood');
  assert.equal(result.direct, false);
  assert.equal(result.valid, true);
  assert.equal(result.left, 0);
  assert.equal(result.clear, true);
  assert.deepEqual(errors, []);
  console.log('walk, shot, reroute and raid-leave cleanup passed', result);
} finally {
  await browser.close();
}
