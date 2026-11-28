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
    const canvas = preview.locator('#stage[data-mods*="reddot"][data-mods*="kurz40"] canvas');
    await canvas.waitFor({ timeout: 120000 });
    await page.waitForFunction(() => sfxReady('workbench_foley') && sfxHas('wb_handle') && sfxHas('wb_hit'));
    await page.evaluate(() => {
      const play = sfxPlay;
      window.benchTurnSounds = [];
      sfxPlay = (id, ...args) => {
        const voice = play(id, ...args);
        if (voice && (id === 'wb_handle' || id === 'wb_hit')) benchTurnSounds.push(id);
        return voice;
      };
      window.restoreBenchTurnSounds = () => { sfxPlay = play; };
    });
    const bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.5);
    await page.mouse.down();
    await page.waitForFunction(() => benchTurnSounds.join() === 'wb_handle');
    await page.mouse.move(bounds.x + bounds.width * 0.25 + 25, bounds.y + bounds.height * 0.5);
    assert.deepEqual(await page.evaluate(() => benchTurnSounds), ['wb_handle']);
    await page.mouse.move(bounds.x + bounds.width * 0.25 + 100, bounds.y + bounds.height * 0.5);
    await page.waitForFunction(() => benchTurnSounds.join() === 'wb_handle,wb_handle');
    await page.waitForTimeout(110);
    await page.mouse.up();
    await page.waitForFunction(() => benchTurnSounds.join() === 'wb_handle,wb_handle,wb_hit');
    await preview.locator('#stage').press('ArrowLeft');
    await page.waitForFunction(() => benchTurnSounds.join() === 'wb_handle,wb_handle,wb_hit,wb_handle');
    await preview.locator('#stage').press('+');
    await page.mouse.wheel(0, 90);
    assert.deepEqual(await page.evaluate(() => { restoreBenchTurnSounds(); return benchTurnSounds; }), ['wb_handle', 'wb_handle', 'wb_hit', 'wb_handle']);
    console.log('Workbench grip, drag rotation, settle and keyboard Foley passed; zoom remained silent');
    await page.waitForFunction(() => sfxHas('wf_rifle_mount') && sfxHas('wf_rifle_unmount'));
    const cue = async (kind) => {
      await page.evaluate(() => { EFC_SND.invLast = -1; EFC_SND.last = {}; EFC_SND.log = []; });
      await bench.locator('[data-part-slot=optic]').selectOption(kind === 'mount' ? 'part_red' : '');
      return page.evaluate(() => {
        const ids = EFC_SND.log.map(({ id }) => id);
        EFC_SND.log = null;
        return ids;
      });
    };
    assert.deepEqual(await cue('unmount'), ['wf_rifle_unmount']);
    assert.deepEqual(await cue('mount'), ['wf_rifle_mount']);
    console.log('Workbench attachment fitting and removal use rifle Foley');
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
