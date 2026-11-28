// Verify the raid model, item and loot entry for each Partisan rifle configuration.
import assert from 'node:assert/strict';
import { openGame } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true });
try {
  const report = await page.evaluate(() => {
    const stats = EFC_PARTISAN_PROFILES.map(([id, , template]) => {
      const def = WEAPONS[id];
      const gun = buildGunModel(id), world = buildWorldGun(id);
      const arms = makeArms([id]);
      const geo = worldGunGeometry(id);
      const pose = VM_HIP[gun.kind] || VM_HIP.rifle;
      const shift = gun.gripR.clone().sub(gripsFor(template).R).applyEuler(new THREE.Euler(...pose.slice(3)));
      const eye = gun.efcIron;
      const triangles = level => Object.values(level).reduce((sum, mesh) => sum + (mesh?.index.count || 0) / 3, 0);
      return {
        id, armed: arms.slots[0]?.def.id === id,
        body: gun.group.children.some(node => node.isMesh),
        magazine: gun.mag.children.some(node => node.isMesh),
        world: world.group.children.length,
        lod: triangles(geo.lo) > 0 && triangles(geo.lo) < triangles(geo.hi),
        knownRemotely: netWeaponDef({ g: id }).id === id,
        loot: efcWeaponIds(['ar', 'smg', 'sniper']).includes('w_' + id),
        validWeight: efcCall('item:def', 'w_' + id)?.w > 0,
        hipMatchesTemplate: shift.add(gun.efcHip).length() < 0.00001,
        sightClearance: eye && gun.adsZ - eye.rear >= 0.13 && eye.rear - eye.front >= 0.17 &&
          gun.sightY === eye.line && gun.sightX === eye.center,
      };
    });
    const parts = EFC_PARTISAN_ITEM_PARTS.map(([id, item]) => {
      const base = { id: 'w_' + item.part.weapons[0], n: 1 };
      const mounted = { ...base, mods: { parts: [id], finish: 'stock' } };
      const def = efcCall('weaponmods:definition', mounted);
      const art = ATT[item.part.key].partisan;
      const gun = buildGunModel(def.key);
      let seen = false;
      gun.group.traverse(node => { if (node.geometry === efcPartisanPartMesh(art)) seen = true; });
      return { id, fit: !!efcCall('weaponmods:fit', base, id), mounted: def.att.includes(item.part.key), seen,
        normalized: efcItemNorm(mounted)?.mods?.parts[0] === id,
        mag: art.rounds === null || def.mag === art.rounds,
        remote: netWeaponDef({ g: def.key }).key === def.key };
    });
    const stg = buildGunModel('stg44');
    return { stats, parts, count: Object.keys(EFC_PARTISAN_MODELS).length, stgAligned: !!stg.efcHip && !!stg.efcIron };
  });
  assert.equal(report.stats.length, 14);
  assert.equal(report.stats.length + 1, report.count);
  assert.ok(report.stgAligned);
  for (const checks of report.stats) {
    const { id, ...fields } = checks;
    assert.ok(Object.values(fields).every(Boolean), JSON.stringify({ id, ...fields }));
  }
  assert.equal(report.parts.length, 41);
  for (const { id, ...checks } of report.parts) assert.ok(Object.values(checks).every(Boolean), JSON.stringify({ id, ...checks }));

  const part = await page.evaluate(() => {
    const [id] = EFC_PARTISAN_ITEM_PARTS.find(([, def]) =>
      def.part.weapons.includes('ak74m') && ATT[def.part.key].slot === 'optic');
    const stash = efcStash();
    stash.items = [{ id: 'w_ak74m', n: 1 }, { id, n: 1 }];
    efcStashSave();
    uiGo('hideout');
    return id;
  });
  await page.locator('#efcOpStash [data-efc-id="w_ak74m"]').click();
  await page.locator('[data-op-stash-bench]').click();
  const bench = page.locator('.efc-bench');
  const image = bench.locator('.efc-bench-stage img');
  const stock = await image.getAttribute('src');
  await bench.locator('[data-part-slot="optic"]').selectOption(part);
  assert.notEqual(await image.getAttribute('src'), stock);
  await bench.locator('.efc-bench-save').click();
  assert.deepEqual(await page.evaluate(() => {
    efcStashCur = null;
    return efcCall('stash:get').items.map(item => ({ id: item.id, parts: item.mods?.parts }));
  }), [{ id: 'w_ak74m', parts: [part] }]);
  assert.deepEqual(errors, []);
  console.log(report.stats.length + ' imported rifle profiles plus the StG 44: hip anchors, iron sight lines, geometry, inventory and remote keys passed');
} finally {
  await browser.close();
}
