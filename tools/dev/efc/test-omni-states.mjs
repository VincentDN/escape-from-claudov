import assert from 'node:assert/strict';
import { openGame, simRun, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { mode: 'raid', map: 'simoun' } });
try {
  await startSolo(page);
  await page.evaluate(() => {
    // Use flat ground so the sequence depends on the inputs, rather than on the raid spawn.
    groundHeight = () => 0;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    PL.ent.pos.y = 0;
    for (const entity of entities) {
      if (!entity.isPlayer) entity.off = true;
    }
    window.efcStateTest = { tick: 0, states: [] };
  });
  const elapsed = await simRun(page, 1.5, `
    const test = window.efcStateTest;
    PL.ent.health = 100;
    switch (++test.tick) {
      case 1:
        test.states.push(efcOmniState(PL.ent));
        KEYS.ControlLeft = true;
        break;
      case 5:
        test.states.push(efcOmniState(PL.ent));
        KEYS.ControlLeft = false;
        KEYS.KeyW = KEYS.ShiftLeft = true;
        break;
      case 11:
        test.states.push(efcOmniState(PL.ent));
        KEYS.ShiftLeft = false;
        break;
      case 12:
        KEYS.ShiftLeft = true;
        break;
      case 15:
        test.states.push(efcOmniState(PL.ent));
        PL.ent.input.slide = true;
        break;
      case 17:
        test.states.push(efcOmniState(PL.ent));
        KEYS.KeyW = KEYS.ShiftLeft = false;
        KEYS.Space = true;
        break;
      case 19:
        test.states.push(efcOmniState(PL.ent));
        KEYS.Space = false;
        break;
      case 45:
        test.states.push(efcOmniState(PL.ent));
        break;
    }
  `);
  const states = await page.evaluate(() => window.efcStateTest.states);
  assert.equal(elapsed, 1.5);
  assert.deepEqual(states, ['stand', 'crouch', 'sprint', 'tactical', 'slide', 'air', 'stand']);
  assert.deepEqual(errors, []);
  console.log('Movement states passed: ' + states.join(' → '));
} finally {
  await browser.close();
}
