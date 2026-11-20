import assert from 'node:assert/strict';
import { openGame } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true, w: 1366, h: 900 });
try {
  await page.evaluate(() => {
    const stash = efcStash();
    stash.items = [efcItemNorm({ id: 'w_ak47', n: 1 }), { id: 'med_bandage', n: 3 }];
    stash.loadout = efcInvNew();
    stash.loadout.slots.pack = efcItemNorm({ id: 'pack_m', n: 1 });
    efcStashSave();
    uiOpen('hideout');
  });
  const weapon = page.locator('#efcOpStash [data-efc-id="w_ak47"]');
  const pack = page.locator('#efcOpHideoutGrids [data-op-area="pack"]');
  await weapon.focus();
  await pack.scrollIntoViewIfNeeded();
  const source = await weapon.boundingBox(), dest = await pack.boundingBox();
  assert.ok(source && dest);
  const cell = (x, y) => [dest.x + dest.width * (x + 0.5) / 5, dest.y + dest.height * (y + 0.5) / 5];
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(...cell(3, 0), { steps: 5 });
  assert.equal(await pack.getAttribute('data-op-drop'), 'invalid');
  assert.equal(await pack.locator('.efc-placement.blocked').count(), 1);
  if (process.env.EFC_GRID_SHOTS) await page.screenshot({ path: process.env.EFC_GRID_SHOTS + '/blocked.png' });
  await page.keyboard.press('r');
  assert.equal(await pack.getAttribute('data-op-drop'), 'valid');
  if (process.env.EFC_GRID_SHOTS) await page.screenshot({ path: process.env.EFC_GRID_SHOTS + '/valid.png' });
  await page.mouse.up();
  const saved = await page.evaluate(() => {
    efcStashCur = null;
    const stash = efcCall('stash:get'), entry = efcCall('stash:grids').loadout.pack.entries[0];
    return { item: entry.item.id, x: entry.x, y: entry.y, rotated: entry.rotated, inStash: stash.items.some(i => i.id === 'w_ak47') };
  });
  assert.deepEqual(saved, { item: 'w_ak47', x: 3, y: 0, rotated: true, inStash: false });

  const packed = pack.locator('[data-efc-id="w_ak47"]');
  await packed.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => efcCall('stash:grids').loadout.pack.entries[0].x), 2);

  const splits = await page.evaluate(() => {
    const from = { kind: 'stash', key: 0, id: 'med_bandage', count: 1 };
    const at = { area: 'pockets', x: 5, y: 2, rotated: false };
    const moved = efcCall('stash:place', from, at);
    const invalid = efcCall('stash:place', from, at);
    efcStashCur = null;
    return { moved, invalid, stash: efcCall('stash:get').items[0].n, entry: efcCall('stash:grids').loadout.pockets.entries[0] };
  });
  assert.deepEqual(splits, { moved: true, invalid: false, stash: 2, entry: { item: { id: 'med_bandage', n: 1 }, x: 5, y: 2, rotated: false, index: 1 } });
  const mods = await page.evaluate(() => {
    const stash = efcStash();
    stash.items.push({ id: 'part_red', n: 1 });
    efcStashSave();
    efcCall('stash:equip', 0);
    const fitted = efcCall('weaponmods:stashDrag', { kind: 'stash', key: 1, id: 'part_red' }, 'optic');
    const removed = efcCall('weaponmods:stashDrag', { id: 'part_red' }, 'optic', { area: 'stash', page: 0, x: 9, y: 2, rotated: false });
    return { fitted, removed, cell: efcCall('stash:grids').stash[0].entries.find(entry => entry.item.id === 'part_red') };
  });
  assert.deepEqual(mods, { fitted: true, removed: true, cell: { item: { id: 'part_red', n: 1 }, x: 9, y: 2, rotated: false, index: 1 } });
  assert.deepEqual(errors, []);
  console.log('exact cell placement, R rotation, split, overlap rejection, and save reload passed');
} finally { await browser.close(); }
