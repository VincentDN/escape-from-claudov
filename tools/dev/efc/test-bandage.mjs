import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ w: 960, h: 540 });
try {
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await startSolo(page);
  const samples = await page.evaluate(() => {
    const key = (down, repeat = false, code = 'KeyH') => {
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, repeat }));
    };
    const me = PL.ent;
    const step = (frames) => {
      for (let i = 0; i < frames; i++) matchTick(1 / 30, true);
    };
    const snapshot = () => ({
      health: me.health,
      count: EFC.inv.bag.find((it) => it.id === 'med_bandage')?.n || 0,
      active: !!efcCall('med:state'),
      wrapping: !!efcBandageRig?.group.visible,
      weapon: VM.holder.visible,
    });

    for (const ent of entities) if (ent !== me) ent.alive = false;
    EFC.inv = efcCall('inv:new');
    efcCall('inv:add', EFC.inv, { id: 'med_bandage', n: 2 });
    key(true);
    const healthy = snapshot();
    key(false);
    me.health = 40;
    key(true);
    step(15);
    const early = snapshot(), earlyWrap = efcBandageRig.geometry.drawRange.count;
    step(9);
    const laterWrap = efcBandageRig.geometry.drawRange.count;
    key(false);
    step(1);
    const released = snapshot();

    key(true);
    step(10);
    efcFilter('damage', 10, me, null, null, false);
    step(1);
    const interrupted = snapshot();
    key(false);

    key(true);
    step(10);
    PL.held = true;
    step(1);
    PL.held = false;
    const firing = snapshot();
    key(false);

    key(true);
    step(10);
    window.dispatchEvent(new Event('blur'));
    step(1);
    const blurred = snapshot();
    key(false);

    key(true);
    step(61);
    const finished = snapshot();
    key(true, true);
    step(61);
    const repeating = snapshot();
    key(false);
    bindSet('heal', 'KeyJ');
    key(true);
    const oldKey = snapshot();
    key(false);
    key(true, false, 'KeyJ');
    step(61);
    const rebound = snapshot();
    key(false, false, 'KeyJ');
    const empty = snapshot();
    key(true, false, 'KeyJ');
    step(61);
    const noMed = snapshot();
    key(false, false, 'KeyJ');

    me.health = 20;
    efcCall('inv:add', EFC.inv, { id: 'med_kit', n: 1 });
    key(true, false, 'KeyJ');
    step(61);
    const kitPending = efcCall('med:state');
    step(76);
    const kitHealed = snapshot();
    key(false, false, 'KeyJ');
    return { healthy, early, earlyWrap, laterWrap, released, interrupted, firing, blurred, finished, repeating, oldKey, rebound,
      empty, noMed, kitPending, kitHealed, kitConsumed: !EFC.inv.bag.some((it) => it.id === 'med_kit') };
  });
  const state = (health, count, active = false) => ({ health, count, active, wrapping: active, weapon: !active });
  assert.deepEqual(samples.healthy, state(100, 2));
  assert.deepEqual(samples.early, state(40, 2, true));
  assert.ok(samples.earlyWrap > 0 && samples.laterWrap > samples.earlyWrap, 'cloth winds around the forearm during treatment');
  for (const name of ['released', 'interrupted', 'firing', 'blurred']) {
    assert.deepEqual(samples[name], state(40, 2), name);
  }
  for (const name of ['finished', 'repeating', 'oldKey']) assert.deepEqual(samples[name], state(65, 1), name);
  assert.deepEqual(samples.rebound, state(90, 0));
  assert.deepEqual(samples.noMed, samples.empty);
  assert.equal(samples.kitPending.time, 4.5);
  assert.deepEqual(samples.kitHealed, state(90, 0));
  assert.ok(samples.kitConsumed);
  assert.deepEqual(errors, []);
  console.log('bandage hold, animation, cancellation, consumption and rebinding ok');
} finally {
  await browser.close();
}
