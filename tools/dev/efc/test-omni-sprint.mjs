import assert from 'node:assert/strict';
import { openGame } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true });
try {
  const result = await page.evaluate(() => {
    MATCH.mode = 'raid';
    groundHeight = () => 0;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    const h = 1 / 60;
    const soldier = isPlayer => {
      const entity = { isPlayer, pos: new V3(), vel: new V3(), yaw: 0, crouchAmt: 0 };
      initCtl(entity, ['ak47'], 1);
      return entity;
    };
    const move = (mx, mz) => {
      const e = soldier(true);
      Object.assign(e.input, { mx, mz, sprint: true });
      for (let i = 0; i < 30; i++) ctlMove(e, h);
      const sprinting = e.sprinting, before = e.vel.clone().normalize();
      e.input.slide = true;
      const { slid } = ctlMove(e, h);
      const heading = e.vel.clone().normalize().dot(before);
      return { mx, mz, sprinting, slid, heading };
    };
    const headings = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
    const e = soldier(true);
    Object.assign(e.input, { mx: -1, sprint: true });
    ctlMove(e, h);
    e.input.sprint = false;
    for (let i = 0; i < 4; i++) ctlMove(e, h);
    e.input.sprint = true;
    ctlMove(e, h);
    const tactical = e.efcTactical;
    for (let i = 0; i < 60; i++) ctlMove(e, h);
    const after = e.efcTactical;
    const warden = soldier(false);
    Object.assign(warden.input, { mx: 1, sprint: true });
    for (let i = 0; i < 30; i++) ctlMove(warden, h);
    return { direction: headings.map(([mx, mz]) => move(mx, mz)), tactical, after, wardenSprinted: warden.sprinting };
  });
  for (const entry of result.direction) assert.ok(entry.sprinting && entry.slid && entry.heading > 0.999, JSON.stringify(entry));
  assert.ok(result.tactical > 0 && result.after === 0);
  assert.equal(result.wardenSprinted, false);
  assert.deepEqual(errors, []);
  console.log('Sprint and slide passed in eight directions, tactical sprint expires, Warden movement preserved');
} finally { await browser.close(); }
