import assert from 'node:assert/strict';
import { openGame } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true, w: 2048, h: 980 });
try {
  await page.evaluate(() => uiOpen('hideout'));
  for (const viewport of [{ width: 2048, height: 980 }, { width: 960, height: 600 }]) {
    await page.setViewportSize(viewport);
    const width = viewport.width;
    const inventory = await page.locator('#scr-hideout .efc-op-layout').boundingBox();
    const operator = await page.locator('#efcOpHideout').boundingBox();
    const bar = await page.locator('#scr-hideout .efc-op-bottom').boundingBox();
    assert.ok(inventory.width >= width - 72, 'Hideout uses the viewport width with desktop gutters');
    assert.ok(Math.abs(inventory.x * 2 + inventory.width - width) < 2, 'Hideout is centered');
    assert.ok(Math.abs(operator.x * 2 + operator.width - width) < 2, 'Operator stays centered between the grids');
    assert.equal(bar.width, inventory.width);
    const rifle = page.locator('#efcOpStash [data-efc-id="w_ak47"]');
    if (await rifle.getAttribute('aria-pressed') !== 'true') await rifle.click();
    await page.locator('[data-op-stash-bench]').click();
    const dialog = page.locator('.efc-bench');
    assert.deepEqual(await dialog.boundingBox(), { x: 0, y: 0, ...viewport });
    const stage = await dialog.locator('.efc-bench-stage').boundingBox();
    assert.deepEqual(await dialog.locator('iframe').boundingBox(), stage, 'Workbench preview fills its stage');
    const save = await dialog.locator('.efc-bench-save').boundingBox();
    assert.ok(save.y + save.height <= viewport.height, 'Save is visible when space is tight');
    await dialog.locator(width > 960 ? '.efc-bench-close' : '.efc-bench-save').click();
    assert.equal(await dialog.isVisible(), false);
  }
  await page.evaluate(() => {
    EFC.inv = efcCall('inv:new');
    efcUirOpen('inv');
  });
  for (const viewport of [{ width: 2048, height: 980 }, { width: 960, height: 600 }]) {
    await page.setViewportSize(viewport);
    assert.deepEqual(await page.locator('#efcInv .efc-op-box').boundingBox(), { x: 0, y: 0, ...viewport });
  }
  assert.deepEqual(errors, []);
  console.log('Hideout, raid inventory, and workbench use the centered viewport layout on both desktop sizes');
} finally { await browser.close(); }
