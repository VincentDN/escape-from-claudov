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
    // every other gameplay input cancels in the same tick and leaves ammo and the model at rest (P9 brief, Acceptance)
    PL.ent.arms = makeArms(['ak47']);
    vmEquip(curW().def);
    const cancels = [];
    const cases = [
      ['fire', () => ({ fire: true })], ['sprint', () => ({ sprint: true })], ['jump', () => ({ jump: true })],
      ['crouch', () => ({ crouch: true })], ['reload', () => { PL.reload = true; return {}; }, () => { PL.reload = false; }],
      ['switch', () => { PL.switching = 0.2; return {}; }, () => { PL.switching = 0; }],
      ['move', () => { PL.ent.pos.x += 2; return {}; }, () => { PL.ent.pos.x -= 2; }],
    ];
    for (const [name, make, undo] of cases) {
      const weapon = curW(), before = [weapon.mag, weapon.reserve];
      EFC_WEAPON_CHECK_ORIGIN.copy(PL.ent.pos);
      efcWeaponCheckPending = true;
      efcWeaponCheckTick({}, false);
      const started = VM.action === 'raidCheck';
      for (let i = 0; i < 20; i++) updateViewmodel(1 / 60, input);
      efcWeaponCheckTick(make(), false);
      cancels.push({ name, started, canceled: VM.action === null && PL.ent.efcWeaponCheck === null && returnToReady(), before, after: [weapon.mag, weapon.reserve] });
      if (undo) undo();
    }
    Settings.efcWeaponCheck = false;
    efcWeaponCheckPending = true;
    efcWeaponCheckTick({}, false);
    const e = {};
    netEventIn(e, { k: 'weaponCheck', on: true, kind: 'sks' });
    const remoteStarted = efcWeaponCheckPose(e)?.kind === 'sks';
    netEventIn(e, { k: 'weaponCheck', on: false });
    return { results, cancels, skipped: VM.action === null && !efcWeaponCheckPending, remoteStarted, remoteCanceled: !efcWeaponCheckPose(e) };
  });
  for (const result of results.results) {
    assert.ok(result.started && result.motion > 0.02 && result.canceled && result.completed, JSON.stringify(result));
    assert.deepEqual(result.after, result.before);
  }
  for (const c of results.cancels) {
    assert.ok(c.started && c.canceled, 'cancel on ' + JSON.stringify(c));
    assert.deepEqual(c.after, c.before, 'ammo kept on ' + c.name);
  }
  assert.ok(results.skipped && results.remoteStarted && results.remoteCanceled);
  assert.deepEqual(errors, []);
  console.log('Insertion check moves each weapon family, cancels on aim, fire, sprint, jump, crouch, reload, switch and a 2 m move, preserves ammo, and dispatches the remote start and cancellation');
} finally { await browser.close(); }
