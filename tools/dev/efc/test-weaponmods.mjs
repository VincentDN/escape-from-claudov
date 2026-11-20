import assert from 'node:assert/strict';
import { openGame, startSolo, simRun } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true, w: 1152, h: 720 });
try {
  const models = await page.evaluate(() => {
    const result = [];
    for (const key of ['stg44', 'ak47']) {
      const item = { id: 'w_' + key, n: 1 };
      for (const part of efcCall('weaponmods:parts')) {
        if (!efcCall('weaponmods:fit', item, part.id)) continue;
        const normalized = efcItemNorm({ ...item, mods: { parts: [part.id], finish: 'foret' } });
        const def = efcCall('weaponmods:definition', normalized), fp = buildGunModel(def.key), world = buildWorldGun(def.key);
        result.push([key, part.id, def.att.includes(part.part.key), fp.group.children.length > 3, world.group.children.length > 0,
          weaponDefByKey(def.key).key === def.key, netWeaponDef({ w: key, g: def.key }).key === def.key]);
      }
    }
    return result;
  });
  assert.ok(models.length >= 20 && models.every(row => row.slice(2).every(Boolean)), JSON.stringify(models));
  await page.evaluate(() => {
    // Bank the optic as at extraction, then open the supported rifle through the normal Hideout.
    efcStash().items = [{ id: 'w_stg44', n: 1, mag: 25, res: 50 }, { id: 'part_red', n: 1 }, { id: 'part_stg40', n: 1 }];
    efcStash().loadout = efcInvNew();
    efcStashSave();
    uiGo('hideout');
  });
  await page.locator('#efcOpStash [data-efc-id="w_stg44"]').click();
  await page.locator('[data-op-stash-bench]').click();
  const bench = page.locator('.efc-bench');
  await bench.locator('[data-part-slot=optic]').selectOption('part_red');
  await bench.locator('[data-part-slot=mag]').selectOption('part_stg40');
  await bench.locator('.efc-bench-finish').selectOption('foret');
  assert.match(await bench.locator('.efc-bench-stats').textContent(), /40 rounds/);
  if (process.env.EFC_TEST_URL?.startsWith('http')) {
    const preview = page.frameLocator('.efc-bench iframe');
    await preview.locator('#stage[data-mods*="reddot"][data-mods*="kurz40"] canvas').waitFor({ timeout: 120000 });
    if (process.env.EFC_BENCH_SHOT) await page.screenshot({ path: process.env.EFC_BENCH_SHOT, timeout: 120000 });
  }
  await bench.locator('.efc-bench-save').click();
  const saved = await page.evaluate(() => {
    const st = efcCall('stash:get'), weapon = st.items[0], clean = efcWorldItem(weapon);
    efcStashCur = null;
    const persisted = efcCall('stash:get').items[0];
    return [st.items.length, clean.mods, persisted.mods, efcCall('weaponmods:definition', persisted).mag];
  });
  const installed = { parts: ['part_red', 'part_stg40'], finish: 'foret' };
  assert.deepEqual(saved, [1, installed, installed, 40]);
  assert.equal(await page.evaluate(() => efcCall('stash:toLoadout', 0)), true);
  await page.evaluate(() => mapEnsure(Settings.map));
  await startSolo(page);
  await page.waitForFunction(() => MATCH.state === 'playing', null, { timeout: 120000 });
  await simRun(page, 1);
  const raid = await page.evaluate(() => {
    const current = curW().def;
    const picked = efcCall('inv:add', EFC.inv, { id: 'part_holo', n: 1 });
    const index = EFC.inv.bag.findIndex(it => it.id === 'part_holo');
    const mounted = efcCall('weaponmods:mountCarried', 'primary', index);
    return [current.att, current.mag, picked, mounted, curW().def.att, EFC.inv.bag.some(it => it.id === 'part_red')];
  });
  assert.deepEqual(raid, [['red', 'stg40'], 40, true, true, ['holo', 'stg40'], true]);
  if (process.env.EFC_RAID_SHOT) await page.screenshot({ path: process.env.EFC_RAID_SHOT, timeout: 120000 });
  await page.evaluate(() => { GPUX.halt = true; efcUirOpen('inv'); });
  const detach = page.locator('#efcInv [data-op-detach="optic"]');
  await detach.waitFor({ state: 'visible' });
  await detach.evaluate(button => button.click());
  assert.deepEqual(await page.evaluate(() => [
    curW().def.att, EFC.inv.bag.some(it => it.id === 'part_holo'), efcCall('ui:busy'),
  ]), [['stg40'], true, true]);
  assert.deepEqual(errors, []);
  console.log('Weapon mods passed supported model builds, ownership, storage, world payload, raid stats and field swaps');
} finally {
  await browser.close();
}
