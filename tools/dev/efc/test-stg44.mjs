import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { map: 'claudov' } });
try {
  const geometry = await page.evaluate(() => {
    const fp = buildGunModel('stg44'), world = buildWorldGun('stg44');
    let triangles = 0;
    fp.group.traverse(mesh => { if (mesh.isMesh) triangles += mesh.geometry.index.count / 3; });
    return { triangles, fpMagazine: fp.mag.children.length, worldHi: world.group.children.some(m => m.userData.gunLod === 'hi'),
      worldLo: world.group.children.some(m => m.userData.gunLod === 'lo'), sight: fp.sightY, item: efcCall('item:def', 'w_stg44'),
      loot: efcWeaponIds(['ar']).includes('w_stg44') };
  });
  assert.ok(geometry.triangles <= 4200 && geometry.triangles > 3000);
  assert.ok(geometry.fpMagazine && geometry.worldHi && geometry.worldLo && geometry.sight > 0);
  assert.equal(geometry.item.weapon.fam, 'rifle');
  assert.ok(geometry.loot);
  await startSolo(page);
  const result = await page.evaluate(() => {
    GPUX.halt = true;
    efcOn('damage', (dmg, v) => v === PL.ent ? 0 : undefined);
    PL.ent.arms = makeArms(['stg44']);
    vmEquip(WEAPONS.stg44);
    const w = curW(), d = w.def;
    PL.adsWant = true;
    for (let i = 0; i < 45; i++) matchTick(1 / 30, false);
    const ads = PL.ent.arms.adsW;
    for (let i = 0; i < 60 && w.mag === 25; i++) { PL.held = PL.queued = true; matchTick(1 / 30, false); }
    PL.held = PL.queued = false;
    const spent = w.mag;
    ctlStartReload(PL.ent);
    for (let i = 0; i < 150; i++) matchTick(1 / 30, false);
    const damage = d.dmg[0] + (d.dmg[1] - d.dmg[0]) * Math.min(1, Math.max(0, (25 - d.range[0]) / (d.range[1] - d.range[0])));
    return { ads, spent, reloaded: w.mag, shots: Math.ceil(100 / damage), ttk: (Math.ceil(100 / damage) - 1) * 60 / d.rpm };
  });
  assert.ok(result.ads > 0.9);
  assert.equal(result.spent, 24);
  assert.equal(result.reloaded, 25);
  assert.equal(result.shots, 3);
  assert.ok(result.ttk > 0.2 && result.ttk < 0.3);
  assert.deepEqual(errors, []);
  console.log('StG 44 geometry, loot, ADS, live firing, reload and 25 m damage model passed', result);
} finally {
  await browser.close();
}
