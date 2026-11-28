import assert from 'node:assert/strict';
import { openGame, simRun, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
try {
  await startSolo(page);
  await page.evaluate(() => {
    GPUX.halt = true;
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
    'air:flight', 'dive:flight', 'dive:impact', 'dive:settle', 'prone:loop'];
  assert.deepEqual(states.slice(states.indexOf('sprint:loop')), expected);
  const dive = actual.phases.filter(({ move }) => move === 'dive');
  assert.ok(dive.every(({ dir }) => Math.abs(dir - Math.PI / 2) < 0.05), JSON.stringify(dive));
  assert.ok(Math.max(...dive.filter(({ phase }) => phase === 'impact').map(({ t }) => t)) >= 5 / 30);
  assert.equal(actual.legacyRefs, true);
  assert.equal(actual.override, 0.2);
  assert.equal(actual.base, 0.12);
  assert.equal(actual.bot, null);
  assert.deepEqual(errors, []);
  console.log('Movement phases passed: ' + states.join(' → '));
} finally {
  await browser.close();
}
