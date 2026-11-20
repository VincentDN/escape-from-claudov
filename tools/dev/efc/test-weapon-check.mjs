import assert from 'node:assert/strict';
import { openGame } from './harness.mjs';

const { browser, page, errors } = await openGame({ noMap: true });
try {
  const results = await page.evaluate(() => {
    PL.ent.alive = true;
    VM.action = null;
    const input = { speed: 0, grounded: true };
    const returnToReady = () => Math.abs(VM.cur.mag.position.distanceTo(VM.cur.magHome)) < 1e-6 &&
      (!VM.cur.efcCheckHandle || VM.cur.efcCheckHandle.position.z === 0) && (!VM.cur.pump || VM.cur.pump.position.z === 0);
    const results = [];
    for (const [id, kind] of [['ak47', 'mag'], ['l96', 'bolt'], ['sks', 'sks'], ['rem870', 'pump']]) {
      PL.ent.arms = makeArms([id]);
      vmEquip(curW().def);
      const weapon = curW(), before = [weapon.mag, weapon.reserve];
      EFC_WEAPON_CHECK_ORIGIN.copy(PL.ent.pos);
      efcWeaponCheckPending = true;
      efcWeaponCheckTick({}, false);
      const started = VM.action === 'raidCheck' && VM.actionData.kind === kind;
      for (let i = 0; i < 42; i++) updateViewmodel(1 / 60, input);
      const model = VM.cur;
      const motion = kind === 'mag' ? model.mag.position.distanceTo(model.magHome)
        : kind === 'sks' ? model.efcCheckHandle.position.z : kind === 'pump' ? model.pump.position.z : model.bolt.position.z - 0.07;
      efcWeaponCheckTick({ ads: true }, false);
      const canceled = VM.action === null && PL.ent.efcWeaponCheck === null && returnToReady();
      efcWeaponCheckPending = true;
      efcWeaponCheckTick({}, false);
      for (let i = 0; i < 110; i++) updateViewmodel(1 / 60, input);
      results.push({ id, started, motion, canceled, completed: VM.action === null && returnToReady(), before, after: [weapon.mag, weapon.reserve] });
    }
    Settings.efcWeaponCheck = false;
    efcWeaponCheckPending = true;
    efcWeaponCheckTick({}, false);
    const e = {};
    netEventIn(e, { k: 'weaponCheck', on: true, kind: 'sks' });
    const remoteStarted = efcWeaponCheckPose(e)?.kind === 'sks';
    netEventIn(e, { k: 'weaponCheck', on: false });
    return { results, skipped: VM.action === null && !efcWeaponCheckPending, remoteStarted, remoteCanceled: !efcWeaponCheckPose(e) };
  });
  for (const result of results.results) {
    assert.ok(result.started && result.motion > 0.02 && result.canceled && result.completed, JSON.stringify(result));
    assert.deepEqual(result.after, result.before);
  }
  assert.ok(results.skipped && results.remoteStarted && results.remoteCanceled);
  assert.deepEqual(errors, []);
  console.log('Insertion check moves each weapon family, cancels on aim, preserves ammo, and dispatches the remote start and cancellation');
} finally { await browser.close(); }
