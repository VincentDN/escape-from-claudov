import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
try {
  const result = await page.evaluate(() => {
    const dt = 1 / 60;
    const mode = MATCH.mode;
    const x = (MAP.x0 + MAP.x1) / 2, z = (MAP.z0 + MAP.z1) / 2, y = 30;
    MATCH.mode = 'raid';
    efcRuntimeBoxAdd('efc-dive-test-floor', {
      x0: x - 25, x1: x + 25, y0: y - 0.5, y1: y,
      z0: z - 25, z1: z + 25, m: 'concrete',
    });
    const sprinter = (mx, mz, isPlayer = true) => {
      const e = { isPlayer, pos: new V3(x, y, z), vel: new V3(), yaw: 0, crouchAmt: 0 };
      initCtl(e, ['ak47'], 1);
      Object.assign(e.input, { mx, mz, sprint: true });
      for (let tick = 0; tick < 30; tick++) ctlMove(e, dt);
      return e;
    };
    const jump = (e) => {
      e.input.jump = true;
      ctlMove(e, dt);
      e.input.jump = false;
    };
    const dive = (e) => {
      e.input.slide = true;
      ctlMove(e, dt);
      return efcOmniState(e);
    };
    const land = (e, observe = () => {}) => {
      for (let tick = 0; !e.onGround && tick < 60; tick++) {
        ctlMove(e, dt);
        observe();
      }
      return efcOmniState(e);
    };
    try {
      const directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
      const cases = directions.map(([mx, mz]) => {
        const e = sprinter(mx, mz);
        jump(e);
        const start = e.pos.clone();
        const began = dive(e);
        const landed = land(e);
        const displacement = e.pos.clone().sub(start);
        displacement.y = 0;
        const heading = new V3(mx, 0, -mz).normalize();
        const distance = displacement.length();
        const direction = displacement.normalize().dot(heading);

        jump(e);
        e.input.crouch = true;
        ctlMove(e, dt);
        const duringCooldown = efcOmniState(e);
        e.input.crouch = false;
        land(e);
        for (let tick = 0; tick < 45; tick++) ctlMove(e, dt);
        jump(e);
        e.input.crouch = true;
        ctlMove(e, dt);
        return { mx, mz, began, landed, distance, direction, duringCooldown, afterCooldown: efcOmniState(e) };
      });

      const blocked = sprinter(1, 0);
      jump(blocked);
      const wallX = blocked.pos.x + 1;
      efcRuntimeBoxAdd('efc-dive-test-wall', {
        x0: wallX, x1: wallX + 0.5, y0: y, y1: y + 4,
        z0: blocked.pos.z - 3, z1: blocked.pos.z + 3, m: 'concrete',
      });
      let wall;
      try {
        const began = dive(blocked);
        let maxX = blocked.pos.x;
        const landed = land(blocked, () => { maxX = Math.max(maxX, blocked.pos.x); });
        wall = { began, landed, clearance: wallX - maxX };
      } finally {
        efcRuntimeBoxRemove('efc-dive-test-wall');
      }

      const grounded = dive(sprinter(0, 1));
      const warden = sprinter(0, 1, false);
      jump(warden);
      const wardenState = dive(warden);
      MATCH.mode = 'tdm';
      const nonRaid = sprinter(0, 1);
      jump(nonRaid);
      return { cases, wall, grounded, wardenState, nonRaidState: dive(nonRaid) };
    } finally {
      MATCH.mode = mode;
      efcRuntimeBoxRemove('efc-dive-test-floor');
    }
  });

  for (const entry of result.cases) {
    const label = JSON.stringify(entry);
    assert.equal(entry.began, 'dive', label);
    assert.equal(entry.landed, 'crouch', label);
    assert.ok(entry.distance > 2 && entry.direction > 0.99, label);
    assert.equal(entry.duringCooldown, 'air', label);
    assert.equal(entry.afterCooldown, 'dive', label);
  }
  assert.equal(result.wall.began, 'dive');
  assert.equal(result.wall.landed, 'crouch');
  assert.ok(result.wall.clearance >= 0.35 && result.wall.clearance <= 0.5, JSON.stringify(result.wall));
  assert.equal(result.grounded, 'slide');
  assert.equal(result.wardenState, 'air');
  assert.equal(result.nonRaidState, 'air');

  await startSolo(page);
  const inputState = await page.evaluate(() => {
    groundHeight = () => 0;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    PL.ent.pos.y = 0;
    for (const entity of entities) {
      if (!entity.isPlayer) entity.off = true;
    }
    KEYS.KeyW = KEYS.ShiftLeft = true;
    for (let tick = 0; tick < 12; tick++) matchTick(1 / 30, false);
    KEYS.Space = true;
    matchTick(1 / 30, false);
    const before = efcOmniState(PL.ent);
    KEYS.Space = false;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c', bubbles: true }));
    matchTick(1 / 30, false);
    return { before, after: efcOmniState(PL.ent) };
  });
  assert.deepEqual(inputState, { before: 'air', after: 'dive' });
  assert.deepEqual(errors, []);
  console.log('Dive passed in eight directions, stops at a wall, lands crouched, respects cooldown and preserves grounded Slide');
} finally {
  await browser.close();
}
