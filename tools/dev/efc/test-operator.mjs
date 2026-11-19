// A8 smoke: shared operator layout, item selection, quick slots and searched body.
import assert from 'node:assert/strict';
import { openGame, startSolo, simRun } from './harness.mjs';

const { browser, page, errors } = await openGame({ w: 1366, h: 900 });
page.setDefaultTimeout(90000);
try {
  await page.evaluate(() => uiOpen('hideout'));
  const operator = page.locator('#efcOpHideout canvas');
  await operator.waitFor();
  await page.waitForFunction(() => EFC_OPERATOR_VIEWS.get('efcOpHideout')?.drawn);
  assert.equal(await page.locator('#scr-hideout .efc-op-slot').count(), 8);
  assert.equal(await page.locator('#scr-hideout .efc-op-quick button').count(), 9);
  assert.match(await page.locator('#scr-hideout .efc-op-hands').textContent(), /MP5/i);

  const angle = () => page.evaluate(() => EFC_OPERATOR_VIEWS.get('efcOpHideout').angle);
  const firstAngle = await angle();
  await operator.focus();
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await angle(), firstAngle);

  const stash = page.locator('#efcOpStash [data-efc-id="med_kit"]');
  await stash.focus();
  await page.waitForFunction(() => document.querySelector('.efc-prev.show b')?.textContent === 'Trauma kit');
  assert.match(await page.locator('#efcPrev').textContent(), /Weight/);
  await page.mouse.move(4, 4);
  const stashTarget = page.locator('#efcOpHideoutGrids [data-op-target="carried"]').first();
  await stash.dragTo(stashTarget);
  assert.ok(await page.evaluate(() => efcCall('stash:get').loadout.bag.some(item => item.id === 'med_kit')));

  const quick = page.locator('#scr-hideout [data-op-target="quick"][data-op-key="0"]');
  await page.locator('#efcOpHideoutGrids [data-efc-id="med_kit"]').dragTo(quick);
  assert.match(await quick.textContent(), /Trauma kit/i);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('efc_operator_quick_v1'))[0]?.id), 'med_kit');

  if (process.env.EFC_A8_SHOTS) {
    await page.evaluate(() => { document.activeElement.blur(); efcPvHide(); });
    await page.screenshot({ path: process.env.EFC_A8_SHOTS + '/a8-hideout.png', timeout: 180000 });
  }

  await startSolo(page);
  await simRun(page, 1, 'PL.ent.health = 100; PL.ent.protT = 1;');
  await page.keyboard.press('Tab');
  await page.locator('#efcInv').waitFor();
  assert.equal(await page.evaluate(() => MATCH.state === 'playing' && efcCall('ui:busy') && !PL.held), true);
  assert.equal(await page.locator('#efcInv .efc-op-slot').count(), 8);
  await page.keyboard.press('Escape');
  await page.locator('#efcInv').waitFor({ state: 'hidden' });

  await page.evaluate(() => {
    const p = PL.ent.pos;
    const body = efcCall('world:spawn', 'body', { x: p.x, y: p.y, z: p.z }, [{ id: 'loot_wrench', n: 1 }], 'Search fixture');
    efcUirOpen('loot', body);
  });
  const bodyItem = page.locator('#efcOpLootGrid [data-efc-id="loot_wrench"]');
  await bodyItem.waitFor();
  assert.equal(await page.locator('#efcLootTitle').textContent(), 'Search fixture');
  if (process.env.EFC_A8_SHOTS) {
    await page.waitForFunction(() => EFC_OPERATOR_VIEWS.get('efcOpLoot')?.drawn);
    await page.evaluate(() => { document.activeElement.blur(); efcPvHide(); });
    await page.screenshot({ path: process.env.EFC_A8_SHOTS + '/a8-body.png', timeout: 180000 });
  }
  await bodyItem.dblclick();
  await bodyItem.waitFor({ state: 'detached' });
  assert.ok(await page.evaluate(() => EFC.inv.bag.some(item => item.id === 'loot_wrench')));

  await page.keyboard.press('Escape');
  await page.locator('#efcLoot').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => ![...EFC_OPERATOR_VIEWS.values()].some(view => view.frame));
  assert.equal(await page.evaluate(() => efcCall('ui:busy')), false);
  assert.deepEqual(errors, []);
  console.log('test-operator ok');
} finally {
  await browser.close();
}
