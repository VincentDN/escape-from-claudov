import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame();
try {
  await startSolo(page);
  const result = await page.evaluate(() => {
    const e = PL.ent, dt = 1 / 60, y = 30;
    groundHeight = () => y;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    rayWorld = () => null;
    for (const other of entities) if (other !== e) other.off = true;
    const w = armsW(e);
    w.def = WEAPONS.m4;
    vmEquip(w.def);
    e.pos.y = y;
    e.health = 65;
    const tick = () => matchTick(dt, false);
    PL.pitch = PL.yaw = 0;
    KEYS.KeyW = KEYS.ShiftLeft = true;
    for (let i = 0; i < 35; i++) tick();
    KEYS.KeyC = e.input.slide = true;
    for (let i = 0; i < 24 && !e.efcDiving; i++) tick();
    const launched = efcOmniInFlight(e), launchYaw = e.efcDiveYaw;
    KEYS.KeyW = KEYS.ShiftLeft = KEYS.KeyC = false;
    const vx = e.vel.x, vz = e.vel.z;
    tick();
    const coasts = e.vel.x === vx && e.vel.z === vz;
    KEYS.KeyD = true;
    tick();
    KEYS.KeyD = false;
    const steer = e.vel.x - vx;

    w.reserve = w.def.mag;
    w.mag = w.def.mag - 1;
    const reloadBlocked = !ctlStartReload(e);
    const med = { id: 'med_kit', n: 1 };
    EFC.inv.bag.push(med);
    const healBlocked = !efcCall('med:use', EFC.inv.bag.length - 1) && med.n === 1;
    const inventoryBlocked = !efcUirOpen('inv') && !efcCall('ui:busy');

    PL.adsWant = true;
    e.arms.adsW = VM.ads = 0;
    tick();
    const aim = e.arms.adsW, viewAim = VM.ads;
    const aimExpected = damp(0, 1, 2.2 / Math.max(0.05, w.def.adsTime) * 0.5, dt);

    const shots = e.arms.shots, origCone = coneDir, shoot = ctlShoot;
    let actual, expected, direction;
    coneDir = (forward, spread) => { direction = forward.toArray(); actual = spread; return origCone(forward, spread); };
    ctlShoot = (entity, now) => {
      const arms = entity.arms, ads = arms.adsW, d = w.def;
      const base = lerp(d.spread[0], d.spread[1], ads * ads) +
        d.moveSpread * clamp(hyp(entity.vel.x, entity.vel.z) / MOVE_SPEED, 0, 1.5) * (1 - ads * 0.7) +
        arms.bloom * (1 - ads * 0.6) + 0.05;
      expected = base * 0.8 * 1.5;
      return shoot(entity, now);
    };
    PL.yaw = launchYaw + Math.PI + 0.1;
    PL.pitch = 0;
    PL.queued = PL.held = true;
    e.arms.fireCd = 0;
    e.arms.sprintW = 1;
    try { tick(); } finally { ctlShoot = shoot; coneDir = origCone; }
    PL.held = PL.queued = PL.adsWant = false;
    const fired = e.arms.shots === shots + 1 && w.mag === w.def.mag - 2;
    const twist = efcOmniFlightBodyYaw(e) - launchYaw;
    const facingBack = direction?.[2] > 0.98;
    for (let i = 0; i < 60 && !e.onGround; i++) tick();
    return { launched, coasts, steer, reloadBlocked, healBlocked, inventoryBlocked, aim, viewAim, aimExpected,
      fired, facingBack, twist, actual, expected, normalAimRate: efcOmniFlightAimRate(e), landed: e.onGround };
  });
  assert.ok(result.launched && result.coasts && result.steer > 0 && result.steer < 0.03, JSON.stringify(result));
  assert.ok(result.reloadBlocked && result.healBlocked && result.inventoryBlocked, JSON.stringify(result));
  assert.ok(Math.abs(result.aim - result.aimExpected) < 1e-8 && Math.abs(result.viewAim - result.aimExpected) < 1e-8, JSON.stringify(result));
  assert.ok(result.fired && result.facingBack && Math.abs(result.twist - Math.PI / 2) < 1e-8, JSON.stringify(result));
  assert.ok(Math.abs(result.actual - result.expected) < 1e-8 && result.landed && result.normalAimRate === 1, JSON.stringify(result));
  assert.deepEqual(errors, []);
  console.log('Dive flight passed: backward firing, body twist, spread, ADS, steering, and action gates');
} finally {
  await browser.close();
}
