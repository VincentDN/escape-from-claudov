// C0-1: R does not reload while a raid panel is open, and does once it is closed. Logic stepping, no rendering.
// node tools/dev/efc/test-inventory-keys.mjs
import assert from 'node:assert/strict';
import { openGame, startSolo, simRun } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { map: 'simoun', mode: 'raid' } });
const KEEP = 'PL.ent.health = 100;';
try {
  await startSolo(page);
  await simRun(page, 2, KEEP);
  const before = await page.evaluate(() => {
    const w = curW();
    w.mag = 5;
    return { reserve: w.reserve, full: w.def.mag };
  });
  assert.ok(before.reserve > 0 && before.full > 5, 'the starting weapon can reload ' + JSON.stringify(before));

  // panel open: R is swallowed by the raid UI guard (efcUirKey) and the engine never starts a reload
  const open = await page.evaluate(() => { efcUirOpen('inv'); return !!efcCall('ui:busy'); });
  assert.equal(open, true, 'the inventory panel is open');
  await page.keyboard.press('KeyR');
  await simRun(page, 3, KEEP);
  const blocked = await page.evaluate(() => ({ reload: !!PL.reload, mag: curW().mag, reserve: curW().reserve }));
  assert.deepEqual(blocked, { reload: false, mag: 5, reserve: before.reserve }, 'R did not reload while the panel was open');

  // panel closed: the same key reloads, which proves the test can see a reload at all
  await page.evaluate(() => efcUirClose());
  await page.keyboard.press('KeyR');
  await simRun(page, 4, KEEP);
  const after = await page.evaluate(() => ({ mag: curW().mag, reserve: curW().reserve }));
  assert.ok(after.mag > 5 && after.reserve < before.reserve, 'R reloads once the panel is closed ' + JSON.stringify(after));

  assert.deepEqual(errors, []);
  console.log('inventory keys ok');
} finally { await browser.close(); }
