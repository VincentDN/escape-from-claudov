import assert from 'node:assert/strict';
import { openGame, simRun, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
try {
  await startSolo(page);
  await page.evaluate(() => {
    GPUX.halt = true;
    window.omniCollision = collideCircle;
    groundHeight = () => 0;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    rayWorld = () => null;
    for (const entity of entities) if (!entity.isPlayer) entity.off = true;
    PL.ent.pos.y = 0;
    PL.ent.vel.set(0, 0, 0);
    PL.yaw = 0;
    EFC.cfg.omni = { dive: { impact: 0.2, settle: 0.1 } };
    window.omniPhases = [];
    KEYS.KeyW = KEYS.ShiftLeft = true;
  });
  const sample = 'omniPhases.push({ ...efcOmniPhase(PL.ent) });';
  await simRun(page, 0.6, sample);
  await page.evaluate(() => { PL.ent.input.slide = true; });
  await simRun(page, 0.1, sample);
  await page.evaluate(() => { KEYS.KeyW = KEYS.ShiftLeft = false; });
  await simRun(page, 1.1, sample);
  await page.evaluate(() => {
    PL.crouchToggle = false;
    KEYS.KeyD = KEYS.ShiftLeft = true;
  });
  await simRun(page, 0.6, sample);
  await page.evaluate(() => { KEYS.Space = true; });
  await simRun(page, 0.1, sample);
  await page.evaluate(() => { KEYS.Space = false; PL.ent.input.slide = true; });
  await simRun(page, 0.1, sample);
  await page.evaluate(() => { PL.yaw = Math.PI / 2; KEYS.KeyD = KEYS.ShiftLeft = false; });
  await simRun(page, 0.9, sample);

  const actual = await page.evaluate(() => ({
    phases: omniPhases,
    legacyRefs: EFC_OMNI_TUNING.tactical === EFC_TACTICAL_SPRINT &&
      EFC_OMNI_TUNING.airDive === EFC_DIVE && EFC_OMNI_TUNING.prone === EFC_PRONE,
    override: efcOmniTune('dive', 'impact'),
    base: EFC_OMNI_TUNING.dive.impact,
    bot: efcOmniPhase(entities.find((entity) => !entity.isPlayer)),
  }));
  const states = actual.phases.map(({ move, phase }) => `${move}:${phase}`).filter((entry, i, values) => i === 0 || entry !== values[i - 1]);
  const expected = ['sprint:loop', 'slide:enter', 'slide:glide', 'slide:exit', 'crouch:loop', 'stand:loop', 'sprint:loop',
    'air:flight', 'dive:flight', 'dive:impact', 'dive:settle', 'supine:loop'];
  assert.deepEqual(states.slice(states.indexOf('sprint:loop')), expected);
  const dive = actual.phases.filter(({ move }) => move === 'dive');
  assert.ok(dive.every(({ dir }) => Math.abs(dir - Math.PI / 2) < 0.05), JSON.stringify(dive));
  assert.ok(Math.max(...dive.filter(({ phase }) => phase === 'impact').map(({ t }) => t)) >= 5 / 30);
  assert.equal(actual.legacyRefs, true);
  assert.equal(actual.override, 0.2);
  assert.equal(actual.base, 0.12);
  assert.equal(actual.bot, null);
  const ground = await page.evaluate(() => {
    const saved = PL.ent, pitch = PL.pitch, dt = 1 / 60, y = 30, x = (MAP.x0 + MAP.x1) / 2, z = (MAP.z0 + MAP.z1) / 2;
    const ground = groundHeight;
    groundHeight = () => y;
    const controller = (mx, mz) => {
      const entity = { isPlayer: true, alive: true, pos: new V3(x, y, z), vel: new V3(), yaw: 0, pitch: 0, crouchAmt: 0 };
      PL.ent = entity;
      initCtl(entity, ['ak47'], 1);
      Object.assign(entity.input, { mx, mz, sprint: true });
      for (let i = 0; i < 30; i++) ctlMove(entity, dt);
      return entity;
    };
    const begin = (entity, ticks) => {
      KEYS.KeyC = true;
      entity.input.slide = true;
      const phases = [];
      for (let i = 0; i < ticks && !entity.efcDiving; i++) {
        ctlMove(entity, dt);
        efcOmniPhaseAdvance(entity, dt);
        const p = efcOmniPhase(entity).phase;
        if (p !== phases.at(-1)) phases.push(p);
      }
      return phases;
    };
    const dive = (mx, mz, wall = false, turn = 0) => {
      const entity = controller(mx, mz), phases = begin(entity, 30);
      if (!entity.efcDiving) return { phases, launched: false };
      const origin = entity.pos.clone().addScaledVector(entity.vel, -dt);
      const wallX = entity.pos.x + 0.75;
      if (wall) {
        efcRuntimeBoxAdd('efc-ground-dive-wall', { x0: wallX, x1: wallX + 1, y0: y - 1, y1: y + 4,
          z0: entity.pos.z - 3, z1: entity.pos.z + 3, m: 'concrete' });
        collideCircle = omniCollision;
      }
      entity.yaw += turn;
      let high = entity.pos.y, maxX = entity.pos.x;
      for (let i = 0; i < 60 && !entity.onGround; i++) {
        ctlMove(entity, dt);
        efcOmniPhaseAdvance(entity, dt);
        const p = efcOmniPhase(entity).phase;
        if (p !== phases.at(-1)) phases.push(p);
        high = Math.max(high, entity.pos.y);
        maxX = Math.max(maxX, entity.pos.x);
      }
      if (wall) { efcRuntimeBoxRemove('efc-ground-dive-wall'); collideCircle = () => {}; }
      KEYS.KeyC = false;
      const delta = entity.pos.clone().sub(origin);
      delta.y = 0;
      const stance = efcOmniState(entity), lean = entity.efcProneTurn?.side;
      const hold = Array(6).fill(0);
      efcOmniViewPose(entity, hold, 1);
      const cooldown = entity.efcDiveCooldown, angle = entity.pitch;
      const prone = entity.efcProne;
      entity.input.sprint = false;
      for (let i = 0; i < 17; i++) ctlMove(entity, dt);
      const beforeSettle = efcOmniState(entity);
      ctlMove(entity, dt);
      const afterSettle = efcOmniState(entity);
      return { phases, launched: true, apex: high - y, distance: delta.length(),
        dot: delta.normalize().dot(new V3(mx, 0, -mz).normalize()), prone, cooldown,
        stance, lean, angle, hold, beforeSettle, afterSettle, wallClearance: wallX - maxX };
    };
    const tap = (mode, heldTicks) => {
      Settings.efcSlideDive = mode;
      const entity = controller(0, 1);
      const phases = begin(entity, heldTicks);
      KEYS.KeyC = false;
      for (let i = 0; i < 9 && !entity.efcDiving && !(entity.slideT > 0); i++) ctlMove(entity, dt);
      return { slid: entity.slideT > 0, dived: !!entity.efcDiving, phases };
    };
    try {
      const defaultMode = Settings.efcSlideDive;
      Settings.efcSlideDive = 'tap-slide';
      const directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
      const paths = directions.map(([mx, mz]) => dive(mx, mz));
      const wall = dive(1, 0, true);
      const reversed = dive(0, 1, false, Math.PI);
      const lookedAlong = dive(0, -1, false, Math.PI);
      const impactRise = (input) => {
        const entity = controller(0, 1);
        KEYS.KeyC = false;
        efcOmniDiveLand(entity);
        entity.input.sprint = false;
        ctlMove(entity, dt);
        entity.input[input] = true;
        const proneStates = [];
        for (let i = 1; i < 13; i++) {
          ctlMove(entity, dt);
          proneStates.push(entity.efcProne);
        }
        return proneStates;
      };
      const jumpRise = impactRise('jump'), sprintRise = impactRise('sprint');
      const normalTap = tap('tap-slide', 3), swappedTap = tap('tap-dive', 3), swappedHold = tap('tap-dive', 16);
      const disabled = tap('slide-only', 16);
      const cooldown = controller(0, 1);
      Settings.efcSlideDive = 'tap-slide';
      cooldown.efcDiveCooldown = paths[0].cooldown;
      begin(cooldown, 16);
      return { defaultMode, paths, wall, reversed, lookedAlong, jumpRise, sprintRise, normalTap, swappedTap, swappedHold, disabled,
        cooldownBlocks: !cooldown.efcDiving && cooldown.slideT > 0 };
    } finally {
      PL.ent = saved;
      PL.pitch = pitch;
      groundHeight = ground;
      KEYS.KeyC = false;
      Settings.efcSlideDive = 'tap-slide';
    }
  });
  assert.equal(ground.defaultMode, 'tap-slide');
  for (const route of ground.paths) {
    assert.equal(route.launched, true);
    assert.ok(route.distance >= 3.5 && route.distance <= 4.5, JSON.stringify(route));
    assert.ok(Math.abs(route.apex - 0.45) < 0.03 && route.dot > 0.99 && route.prone, JSON.stringify(route));
    assert.deepEqual(route.phases, ['loop', 'anticipation', 'launch', 'flight', 'impact']);
  }
  assert.deepEqual(ground.paths.map(({ stance }) => stance), ['prone', 'prone', 'side', 'supine', 'supine', 'supine', 'side', 'prone']);
  assert.equal(ground.paths[2].lean, 1);
  assert.equal(ground.paths[6].lean, -1);
  for (const route of [ground.paths[2], ground.paths[6]]) {
    assert.equal(route.beforeSettle, 'side');
    assert.equal(route.afterSettle, 'prone');
  }
  assert.equal(ground.reversed.stance, 'supine');
  assert.equal(ground.lookedAlong.stance, 'prone');
  assert.ok(ground.reversed.angle >= Math.PI / 18 && ground.reversed.hold[4] > 0.5);
  for (const rise of [ground.jumpRise, ground.sprintRise]) {
    assert.ok(rise.slice(0, 10).every(Boolean), JSON.stringify(rise));
    assert.equal(rise[10], false);
  }
  assert.ok(ground.wall.wallClearance >= 0.34, JSON.stringify(ground.wall));
  assert.ok(ground.normalTap.slid && ground.swappedTap.dived && ground.swappedHold.slid && ground.disabled.slid);
  assert.ok(ground.cooldownBlocks);
  assert.deepEqual(errors, []);
  console.log('Movement phases passed: ' + states.join(' → '));
  console.log('Ground dive passed in eight directions with measured travel and apex, wall clearance, all three settings and cooldown');
} finally {
  await browser.close();
}
