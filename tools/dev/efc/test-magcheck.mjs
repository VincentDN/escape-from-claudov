import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { efcWeaponCheck: false } });
try {
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await startSolo(page);
  const result = await page.evaluate(() => {
    let reloadKey = 'KeyR';
    const key = (down, code = reloadKey, repeat = false) => {
      document.activeElement.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, repeat, bubbles: true }));
    };
    const step = (frames) => {
      for (let i = 0; i < frames; i++) matchTick(1 / 60, true);
    };
    const status = () => ({
      checking: !!efcRaidMagCheck?.active, pending: !!efcRaidMagCheck && !efcRaidMagCheck.active,
      reloading: !!PL.reload, mag: curW().mag, reserve: curW().reserve,
    });
    const readout = () => $('efcMagCheck').classList.contains('show') ? $('efcMagCheck').textContent : '';
    for (const ent of entities) if (ent !== PL.ent) ent.alive = false;
    PL.noFireT = 0;
    curW().mag = Math.round(curW().def.mag / 2);
    const initial = status();

    key(true);
    step(6);
    const tapDown = status();
    key(false);
    const tapUp = status();
    step(300);
    curW().mag = Math.round(curW().def.mag / 2);
    const ready = status();

    key(true);
    step(16);
    const beforeThreshold = status();
    key(true, reloadKey, true);
    step(4);
    const holding = status();
    const initialReadout = readout();
    step(75);
    const sustained = status();
    const rough = readout();
    const heldPose = VM.rlS;
    const detached = VM.cur.mag.position.distanceTo(VM.cur.magHome);
    const readoutOption = [...$('optMenu').querySelectorAll('.orow')].find((row) => row.textContent.includes('Magazine check readout'));
    const choose = (style) => [...readoutOption.querySelectorAll('button')].find((button) => button.textContent === style).click();
    choose('Exact');
    step(10);
    const exact = readout();
    const sameHeldPose = VM.rlS;
    choose('Rough');
    const small = efcRaidMagCheckText({ mag: 1, def: WEAPONS.sks });
    key(false);
    const released = status();
    const releasedReadout = readout(), returning = VM.action === 'raidCheck';
    step(30);
    const home = VM.cur.mag.position.distanceTo(VM.cur.magHome);

    const interrupt = (action, reset) => {
      key(true);
      step(20);
      const before = status().checking;
      action();
      step(1);
      key(false);
      const after = status();
      reset?.();
      return { before, after };
    };
    const panel = interrupt(() => key(true, 'Tab'), () => efcUirClose(true));
    const blur = interrupt(() => window.dispatchEvent(new Event('blur')));
    const ads = interrupt(() => { PL.adsWant = true; }, () => { PL.adsWant = false; });
    const sprint = interrupt(() => { key(true, 'ShiftLeft'); key(true, 'KeyW'); }, () => {
      key(false, 'ShiftLeft'); key(false, 'KeyW'); step(10);
    });
    const fire = interrupt(() => window.dispatchEvent(new MouseEvent('mousedown', { button: 0 })),
      () => window.dispatchEvent(new MouseEvent('mouseup', { button: 0 })));
    const switched = interrupt(() => key(true, 'Digit2'), () => key(false, 'Digit2'));
    step(70);

    bindSet('reload', 'KeyJ');
    key(true, 'KeyR');
    step(20);
    const oldKey = status();
    key(false, 'KeyR');
    reloadKey = 'KeyJ';
    key(true);
    step(20);
    const rebound = status();
    key(false);
    return { initial, tapDown, tapUp, ready, beforeThreshold, holding, sustained, released, panel, blur, ads, sprint, fire, switched, oldKey, rebound,
      initialReadout, rough, exact, small, heldPose, sameHeldPose, detached, releasedReadout, returning, home };
  });
  assert.equal(result.tapDown.pending, true);
  assert.equal(result.tapDown.reloading, false);
  assert.equal(result.tapUp.reloading, true);
  assert.equal(result.tapUp.mag, result.initial.mag);
  assert.equal(result.beforeThreshold.pending, true);
  assert.deepEqual(result.holding, { ...result.ready, checking: true });
  assert.deepEqual(result.sustained, result.holding);
  assert.deepEqual(result.released, result.ready);
  assert.equal(result.initialReadout, '');
  assert.equal(result.rough, 'About half');
  assert.equal(result.exact, `${result.ready.mag} rounds`);
  assert.equal(result.small, '1 round');
  assert.equal(result.heldPose, result.sameHeldPose);
  assert.ok(result.detached > 0.02);
  assert.equal(result.releasedReadout, '');
  assert.equal(result.returning, true);
  assert.ok(result.home < 0.001);
  for (const name of ['panel', 'blur', 'ads', 'sprint', 'fire', 'switched']) {
    assert.equal(result[name].before, true, name);
    assert.equal(result[name].after.checking, false, name);
    assert.equal(result[name].after.pending, false, name);
    assert.equal(result[name].after.reloading, false, name);
  }
  assert.equal(result.oldKey.checking, false);
  assert.equal(result.rebound.checking, true);
  assert.deepEqual(errors, []);
  console.log('magazine key tap, hold, cancellation, and rebinding ok');
} finally {
  await browser.close();
}
