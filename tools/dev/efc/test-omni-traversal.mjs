import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
try {
  await startSolo(page);
  const results = await page.evaluate(() => {
    const player = PL.ent;
    const x = (MAP.x0 + MAP.x1) / 2, y = 30, z = (MAP.z0 + MAP.z1) / 2;
    const floor = { x0: x - 5, x1: x + 5, y0: y - 0.5, y1: y, z0: z - 5, z1: z + 5, m: 'concrete' };
    const results = [];
    for (const entity of entities) if (!entity.isPlayer) entity.off = true;
    efcRuntimeBoxAdd('traversal-test-floor', floor);

    function overlaps(pos, box) {
      if (!box || pos.y >= box.y1 - 1e-5 || pos.y + 1.75 <= box.y0) return false;
      const dx = Math.max(box.x0 - pos.x, 0, pos.x - box.x1);
      const dz = Math.max(box.z0 - pos.z, 0, pos.z - box.z1);
      return dx * dx + dz * dz < 0.36 ** 2 - 1e-5;
    }

    function run(kind, octant) {
      const angle = octant * Math.PI / 4;
      const dx = -Math.sin(angle), dz = -Math.cos(angle);
      const half = kind === 'mantle' || kind === 'blocked landing' ? 1.15 : 0.20;
      const box = { x0: x - half, x1: x + half, y0: y, y1: y + 0.85, z0: z - half, z1: z + half, m: 'concrete' };
      const ceiling = { ...box, y0: y + 1.85, y1: y + 2.2 };
      if (kind !== 'ordinary jump') efcRuntimeBoxAdd('traversal-test-box', box);
      if (kind === 'blocked landing') efcRuntimeBoxAdd('traversal-test-ceiling', ceiling);
      const startDistance = half / Math.max(Math.abs(dx), Math.abs(dz)) + 0.62;
      player.pos.set(x - dx * startDistance, y, z - dz * startDistance);
      player.vel.set(0, 0, 0);
      player.vy = player.airVy = player.slideT = player.slideBuf = 0;
      player.onGround = true;
      player.crouch = player.sprinting = player.jumpHeld = false;
      efcOmniReset(player);
      player.efcSprintTap = 0.20;
      player.efcTacticalCooldown = player.efcDiveCooldown = player.slideCd = 1;
      PL.crouchToggle = false;
      PL.onGround = true;
      PL.yaw = angle;
      PL.pitch = 0;
      KEYS.Space = true;

      let state, intrusion = false, settled = false;
      try {
        for (let tick = 0; tick < 48; tick++) {
          player.health = 100;
          matchTick(1 / 30, false);
          const current = efcOmniState(player);
          if (tick === 0) state = current;
          intrusion ||= kind !== 'ordinary jump' && overlaps(player.pos, box);
          intrusion ||= kind === 'blocked landing' && overlaps(player.pos, ceiling);
          if (player.onGround && tick > 0) { settled = true; break; }
        }
        const along = (player.pos.x - x) * dx + (player.pos.z - z) * dz;
        const support = groundHeight(player.pos.x, player.pos.z, player.pos.y, 0);
        return {
          kind, octant, state, intrusion, settled, along, height: player.pos.y - y, support: support - y,
          sprintTapExpired: player.efcSprintTap > EFC_TACTICAL_SPRINT.tapWindow,
          cooldowns: [player.efcTacticalCooldown, player.efcDiveCooldown, player.slideCd],
        };
      } finally {
        KEYS.Space = false;
        efcRuntimeBoxRemove('traversal-test-box');
        efcRuntimeBoxRemove('traversal-test-ceiling');
      }
    }

    try {
      for (const kind of ['mantle', 'vault']) {
        for (let octant = 0; octant < 8; octant++) results.push(run(kind, octant));
      }
      results.push(run('blocked landing', 0), run('ordinary jump', 0));
      return results;
    } finally {
      efcRuntimeBoxRemove('traversal-test-floor');
    }
  });

  for (const result of results) {
    const detail = JSON.stringify(result);
    const expected = result.kind === 'mantle' || result.kind === 'vault' ? result.kind : 'air';
    assert.equal(result.state, expected, detail);
    assert.equal(result.intrusion, false, detail);
    assert.equal(result.settled, true, detail);
    assert.ok(Math.abs(result.support - result.height) < 1e-5, detail);
    assert.ok(Math.abs(result.height - (result.kind === 'mantle' ? 0.85 : 0)) < 1e-5, detail);
    if (result.kind === 'vault') assert.ok(result.along > 0.20, detail);
    assert.equal(result.sprintTapExpired, true, detail);
    assert.ok(result.cooldowns.every((cooldown) => cooldown < 1), detail);
  }
  assert.deepEqual(errors, []);
  console.log('Mantle and vault passed in all eight headings, with blocked and ordinary jump fallbacks.');
} finally {
  await browser.close();
}
