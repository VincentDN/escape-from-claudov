import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
try {
  await startSolo(page);
  const result = await page.evaluate(() => {
    const e = PL.ent;
    const x = (MAP.x0 + MAP.x1) / 2, y = 30, z = (MAP.z0 + MAP.z1) / 2;
    const originalMode = MATCH.mode;
    const floor = { x0: x - 25, x1: x + 25, y0: y - 0.5, y1: y, z0: z - 25, z1: z + 25, m: 'concrete' };
    const roof = { x0: x - 2, x1: x + 2, y0: y + 0.72, y1: y + 1.4, z0: z - 2, z1: z + 2, m: 'concrete' };
    const tick = (count = 1) => {
      for (let i = 0; i < count; i++) {
        e.health = 100;
        matchTick(1 / 30, false);
      }
    };
    const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
    const state = () => efcOmniState(e);
    function place(px = x, pz = z) {
      for (const key of ['KeyC', 'ControlLeft', 'Space', 'ShiftLeft', 'KeyW', 'KeyA', 'KeyS', 'KeyD']) KEYS[key] = false;
      efcOmniReset(e);
      e.pos.set(px, y, pz);
      e.vel.set(0, 0, 0);
      e.vy = e.airVy = e.slideT = e.slideBuf = 0;
      e.crouch = e.sprinting = e.jumpHeld = PL.crouchToggle = PL.wasSliding = false;
      e.onGround = PL.onGround = true;
      PL.yaw = PL.pitch = 0;
      tick();
    }
    function enterProne() {
      key('KeyC', true);
      tick(12);
      key('KeyC', false);
      tick();
    }
    function tapCrouch() {
      key('KeyC', true);
      tick();
      key('KeyC', false);
      tick();
      return state();
    }
    for (const entity of entities) if (!entity.isPlayer) entity.off = true;
    efcRuntimeBoxAdd('prone-test-floor', floor);
    try {
      place();
      tapCrouch();
      tick(20);
      const shortTap = state();

      place();
      key('KeyC', true);
      tick(11);
      const beforeThreshold = state();
      tick();
      const atThreshold = state();
      key('KeyC', false);
      tick(16);
      const releasedHold = state(), eye = e.eyeH;

      const directions = [
        [0, 1, 'KeyW'], [1, 1, 'KeyD', 'KeyW'], [1, 0, 'KeyD'], [1, -1, 'KeyD', 'KeyS'],
        [0, -1, 'KeyS'], [-1, -1, 'KeyA', 'KeyS'], [-1, 0, 'KeyA'], [-1, 1, 'KeyA', 'KeyW'],
      ].map(([mx, mz, ...codes]) => {
        place();
        enterProne();
        for (const code of codes) KEYS[code] = true;
        KEYS.ShiftLeft = true;
        tick(48);
        const travel = e.pos.clone().sub(new V3(x, y, z));
        const heading = new V3(mx, 0, -mz).normalize();
        return { state: state(), distance: travel.length(), heading: travel.normalize().dot(heading), speed: e.vel.length() };
      });

      place();
      enterProne();
      const tapRise = tapCrouch();
      place();
      key('KeyC', true);
      tick(12);
      key('Space', true);
      tick(18);
      const jumpRise = { state: state(), ground: e.onGround, height: e.pos.y };

      place(x - 2.65);
      enterProne();
      efcRuntimeBoxAdd('prone-test-roof', roof);
      KEYS.KeyD = true;
      tick(65);
      KEYS.KeyD = false;
      tick(8);
      const underRoof = { x: e.pos.x, height: e.pos.y, state: state() };
      key('Space', true);
      tick();
      const blockedJump = state();
      key('Space', false);
      tick();
      const blockedTap = tapCrouch();
      efcRuntimeBoxRemove('prone-test-roof');
      tick(8);
      const noAutomaticRise = state();
      const freshTap = tapCrouch();

      place();
      KEYS.KeyW = KEYS.ShiftLeft = true;
      tick(24);
      key('Space', true);
      tick();
      key('Space', false);
      key('KeyC', true);
      tick();
      const beganDive = state();
      for (let i = 0; i < 45 && !e.onGround; i++) tick();
      const diveLanding = state();
      tick(3);
      key('KeyC', false);
      tick();
      const releasedDive = state();

      MATCH.mode = 'tdm';
      place();
      key('KeyC', true);
      tick(20);
      const outsideRaid = state();
      key('KeyC', false);
      MATCH.mode = originalMode;

      const warden = { isPlayer: false, pos: new V3(x, y, z), vel: new V3(), yaw: 0, crouchAmt: 0 };
      initCtl(warden, ['ak47'], 1);
      warden.input.crouch = true;
      for (let i = 0; i < 20; i++) ctlMove(warden, 1 / 30);
      return {
        shortTap, beforeThreshold, atThreshold, releasedHold, eye, directions, tapRise, jumpRise,
        underRoof, roofX: x, floorY: y, blockedJump, blockedTap, noAutomaticRise, freshTap,
        beganDive, diveLanding, releasedDive, outsideRaid, warden: efcOmniState(warden),
      };
    } finally {
      MATCH.mode = originalMode;
      efcRuntimeBoxRemove('prone-test-roof');
      efcRuntimeBoxRemove('prone-test-floor');
    }
  });

  assert.equal(result.shortTap, 'crouch');
  assert.equal(result.beforeThreshold, 'crouch');
  assert.equal(result.atThreshold, 'prone');
  assert.equal(result.releasedHold, 'prone');
  assert.ok(Math.abs(result.eye - 0.35) < 0.01, String(result.eye));
  for (const entry of result.directions) {
    const detail = JSON.stringify(entry);
    assert.equal(entry.state, 'prone', detail);
    assert.ok(entry.distance > 1.25 && entry.distance < 1.5, detail);
    assert.ok(entry.heading > 0.999 && Math.abs(entry.speed - 0.9) < 0.01, detail);
  }
  assert.equal(result.tapRise, 'stand');
  assert.deepEqual(result.jumpRise, { state: 'stand', ground: true, height: result.floorY });
  assert.ok(Math.abs(result.underRoof.x - result.roofX) < 1.5, JSON.stringify(result.underRoof));
  assert.equal(result.underRoof.height, result.floorY);
  assert.equal(result.underRoof.state, 'prone');
  assert.equal(result.blockedJump, 'prone');
  assert.equal(result.blockedTap, 'prone');
  assert.equal(result.noAutomaticRise, 'prone');
  assert.equal(result.freshTap, 'stand');
  assert.equal(result.beganDive, 'dive');
  assert.equal(result.diveLanding, 'prone');
  assert.equal(result.releasedDive, 'prone');
  assert.equal(result.outsideRaid, 'crouch');
  assert.equal(result.warden, 'crouch');
  assert.deepEqual(errors, []);
  console.log('Prone holds, crawls in all eight directions, respects headroom, and follows Dive');
} finally {
  await browser.close();
}
