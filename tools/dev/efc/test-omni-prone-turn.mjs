import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
try {
  await startSolo(page);
  const result = await page.evaluate(() => {
    // Use a level, empty test space. The real controller still processes the keyboard.
    groundHeight = () => 30;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    const entity = PL.ent;
    entity.pos.y = 30;
    for (const other of entities) {
      if (!other.isPlayer) other.off = true;
    }

    const dt = 1 / 30;
    const radians = (degrees) => degrees * Math.PI / 180;
    const wrap = (yaw) => Math.atan2(Math.sin(yaw), Math.cos(yaw));
    const key = (type, code, value) => window.dispatchEvent(new KeyboardEvent(type, {
      code, key: value, bubbles: true,
    }));
    const tick = (n = 1) => {
      for (let i = 0; i < n; i++) {
        entity.health = 100;
        matchTick(dt, false);
      }
    };
    const look = (yaw) => {
      PL.yaw = yaw;
      tick();
      const turn = entity.efcProneTurn;
      return {
        state: efcOmniState(entity), yaw, viewYaw: PL.yaw, controllerYaw: entity.yaw,
        anchor: turn?.anchorYaw, body: turn?.bodyYaw, side: turn?.side,
        lean: entity.leanX || 0,
      };
    };
    const prone = (yaw) => {
      PL.yaw = yaw;
      key('keydown', 'KeyC', 'c');
      tick(14);
      key('keyup', 'KeyC', 'c');
      return look(yaw);
    };
    const stand = () => {
      key('keydown', 'Space', ' ');
      const result = look(PL.yaw);
      key('keyup', 'Space', ' ');
      tick();
      return result;
    };
    const sweep = (sign) => {
      const entered = prone(0);
      const frames = [];
      for (let i = 0; i <= 120; i++) frames.push(look(wrap(radians(sign * i * 3))));
      return { entered, frames, stood: stand() };
    };

    Settings.leanToggle = false;
    const sweeps = [sweep(1), sweep(-1)];
    const entered = prone(0);
    const hysteresis = [115, 125, 105, 85].map((value) => look(radians(value)));
    key('keydown', 'KeyQ', 'q');
    const left = look(0);
    key('keydown', 'KeyE', 'e');
    const neutral = look(0);
    key('keyup', 'KeyQ', 'q');
    const right = look(radians(160));
    key('keyup', 'KeyE', 'e');
    const back = look(radians(160));

    Settings.leanToggle = true;
    key('keydown', 'KeyQ', 'q');
    const toggled = look(0);
    key('keyup', 'KeyQ', 'q');
    const released = look(0);
    const stood = stand();

    const newAnchor = prone(radians(35));
    stand();
    Settings.leanToggle = false;
    key('keydown', 'KeyE', 'e');
    tick(6);
    const normalLean = entity.leanX;
    key('keyup', 'KeyE', 'e');
    tick(6);

    const warden = { isPlayer: false, onGround: true, efcProne: true, yaw: 1 };
    efcOmniProneTurn(warden, true, dt);
    const mode = MATCH.mode;
    MATCH.mode = 'tdm';
    const nonRaid = { isPlayer: true, onGround: true, efcProne: true, yaw: 1 };
    efcOmniProneTurn(nonRaid, true, dt);
    MATCH.mode = mode;
    return {
      sweeps, entered, hysteresis, left, neutral, right, back, toggled, released,
      stood, newAnchor, normalLean, wardenTurn: warden.efcProneTurn,
      nonRaidTurn: nonRaid.efcProneTurn,
    };
  });

  for (const { entered, frames, stood } of result.sweeps) {
    assert.equal(entered.state, 'prone');
    assert.deepEqual([0, 15, 30, 45, 60, 75, 105, 120].map((i) => frames[i].state),
      ['prone', 'prone', 'prone', 'supine', 'supine', 'supine', 'prone', 'prone']);
    let previousBody = entered.body;
    for (const frame of frames) {
      assert.equal(frame.viewYaw, frame.yaw);
      assert.equal(frame.controllerYaw, frame.yaw);
      assert.ok(Math.abs(frame.body - frame.anchor) <= Math.PI / 4 + 1e-8);
      assert.ok(Math.abs(frame.body - previousBody) <= Math.PI / 30 + 1e-8);
      previousBody = frame.body;
    }
    assert.ok(Math.abs(frames[30].body - entered.body) > 0.5);
    assert.equal(stood.state, 'stand');
    assert.equal(stood.body, undefined);
  }
  assert.equal(result.entered.state, 'prone');
  assert.deepEqual(result.hysteresis.map(({ state }) => state), ['prone', 'supine', 'supine', 'prone']);
  assert.deepEqual([result.left, result.neutral, result.right, result.back, result.toggled, result.released]
    .map(({ state, side, lean }) => [state, side, lean]), [
    ['side', -1, 0], ['prone', 0, 0], ['side', 1, 0],
    ['supine', 0, 0], ['side', -1, 0], ['prone', 0, 0],
  ]);
  assert.equal(result.stood.state, 'stand');
  assert.equal(result.stood.lean, 0);
  assert.equal(result.stood.body, undefined);
  assert.ok(Math.abs(result.newAnchor.anchor - 35 * Math.PI / 180) < 1e-8);
  assert.ok(result.normalLean > 0.1);
  assert.equal(result.wardenTurn, undefined);
  assert.equal(result.nonRaidTurn, undefined);
  assert.deepEqual(errors, []);
  console.log('Prone turning passed in both directions, with bounded body yaw, stable rolls, Lean isolation and reset');
} finally {
  await browser.close();
}
