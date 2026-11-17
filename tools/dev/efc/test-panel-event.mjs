// Panel lifecycle emits one open and close per panel, including silent replacement.
import assert from 'node:assert/strict';
import { openGame } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true });
try {
  const events = await page.evaluate(() => {
    const seen = [];
    EFC.inv = efcCall('inv:new');
    efcOn('ui:panel', (...event) => seen.push(event));
    efcUirOpen('inv');
    efcUirOpen('loot', 17);
    efcUirClose(true);
    efcUirClose(true);
    return seen;
  });
  assert.deepEqual(events, [[true, 'inv', null], [false, 'inv', null], [true, 'loot', 17], [false, 'loot', 17]]);
  assert.deepEqual(errors, []);
  console.log('test-panel-event ok');
} finally {
  await browser.close();
}
