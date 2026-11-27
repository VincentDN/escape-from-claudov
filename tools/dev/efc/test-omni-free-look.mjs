import assert from 'node:assert/strict';
import { openGame, startSolo } from './harness.mjs';

const { browser, page, errors } = await openGame({ settings: { map: 'simoun', mode: 'raid' } });
try {
  await startSolo(page);
  const result = await page.evaluate(() => {
    const entity = PL.ent, dt = 1 / 30;
    LOCK.fallback = true;
    groundHeight = () => 30;
    ceilingAbove = () => Infinity;
    collideCircle = () => {};
    entity.pos.y = 30;
    for (const other of entities) if (!other.isPlayer) other.off = true;

    const tick = (count = 1) => {
      for (let i = 0; i < count; i++) {
        entity.health = 100;
        matchTick(dt, false);
      }
    };
    const key = (type, code, value) => window.dispatchEvent(new KeyboardEvent(type, {
      code, key: value, bubbles: true, cancelable: true,
    }));
    const mouse = (x, y) => window.dispatchEvent(new MouseEvent('mousemove', {
      movementX: x, movementY: y, bubbles: true,
    }));
    const weaponHeading = () => camera.quaternion.clone().multiply(vmCamera.quaternion.clone().invert());
    const shotCount = () => entity.arms.shots;

    PL.yaw = 0.4;
    PL.pitch = 0.2;
    tick(20);
    const heading = weaponHeading(), view = camera.quaternion.clone(), yaw = PL.yaw, pitch = PL.pitch;
    const rounds = shotCount();
    const consumed = key('keydown', 'AltLeft', 'Alt') === false;
    mouse(250, 80);
    tick(8);
    const detached = {
      consumed,
      active: EFC_FREE_LOOK.active,
      viewMoved: camera.quaternion.angleTo(view) > 0.1,
      aimFixed: PL.yaw === yaw && PL.pitch === pitch && weaponHeading().angleTo(heading) < 0.001,
    };

    key('keydown', 'AltRight', 'Alt');
    key('keyup', 'AltLeft', 'Alt');
    tick();
    const otherAltHeld = EFC_FREE_LOOK.active;
    key('keyup', 'AltRight', 'Alt');
    tick();
    const recentered = !EFC_FREE_LOOK.active && camera.quaternion.angleTo(view) < 0.001 &&
      weaponHeading().angleTo(heading) < 0.001 && shotCount() === rounds;
    // A primary trigger pressed on the release frame must use the restored view, even
    // though the weapon controller runs before the frame's new camera pose is applied.
    key('keydown', 'AltLeft', 'Alt');
    mouse(280, 0);
    tick();
    const controlWeapon = ctlWeapon;
    let releaseAim = false;
    ctlWeapon = (actor, ...args) => {
      if (actor === entity && (actor.input.fire || actor.input.firePressed)) {
        releaseAim = camera.quaternion.angleTo(view) < 0.001;
        actor.input.fire = actor.input.firePressed = false;
      }
      return controlWeapon(actor, ...args);
    };
    try {
      key('keyup', 'AltLeft', 'Alt');
      PL.queued = PL.held = true;
      tick();
    } finally {
      ctlWeapon = controlWeapon;
      PL.queued = PL.held = false;
    }
    mouse(110, 0);
    tick();
    const normalAim = Math.abs(PL.yaw - yaw) > 0.05;

    key('keydown', 'AltLeft', 'Alt');
    mouse(-240, 0);
    tick();
    window.dispatchEvent(new Event('blur'));
    tick();
    const blurred = !EFC_FREE_LOOK.active && EFC_FREE_LOOK.yaw === 0;

    const shotsAtEntry = shotCount();
    key('keydown', 'AltLeft', 'Alt');
    mouse(280, -60);
    tick();
    const aimDirection = efcActionForward(new V3());
    const viewDirection = camera.getWorldDirection(new V3());
    const originalSpread = coneDir;
    let shotAxis = null;
    try {
      coneDir = (axis, ...args) => {
        shotAxis = axis.clone();
        return originalSpread(axis, ...args);
      };
      PL.noFireT = 0;
      window.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      tick();
      window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    } finally {
      coneDir = originalSpread;
    }
    const firedWhileDetached = EFC_FREE_LOOK.active && shotCount() > shotsAtEntry &&
      !!shotAxis && shotAxis.angleTo(aimDirection) < 0.001 && shotAxis.angleTo(viewDirection) > 0.1;

    const missingRound = armsW(entity).mag;
    key('keydown', 'KeyR', 'r');
    key('keyup', 'KeyR', 'r');
    const reloadStarted = !!entity.arms.reload;
    tick(180);
    const reloadedWhileDetached = reloadStarted && EFC_FREE_LOOK.active && armsW(entity).mag > missingRound;

    const originalSpawn = spawnNade;
    let thrown = false;
    try {
      spawnNade = (owner, origin, velocity, ...args) => {
        if (owner === entity) {
          const forward = new V3(-Math.sin(PL.yaw), 0, -Math.cos(PL.yaw));
          const heading = velocity.clone().setY(0).normalize();
          thrown = EFC_FREE_LOOK.active && heading.angleTo(forward) < 0.001;
        }
        return originalSpawn(owner, origin, velocity, ...args);
      };
      PL.nades = 1;
      PL.nadeType = 'frag';
      key('keydown', 'KeyG', 'g');
      tick(3);
      key('keyup', 'KeyG', 'g');
      tick(36);
    } finally {
      spawnNade = originalSpawn;
    }
    const threwWhileDetached = thrown && PL.nades === 0 && EFC_FREE_LOOK.active;
    key('keyup', 'AltLeft', 'Alt');
    tick(4);
    const roundsAfterActions = shotCount();

    key('keydown', 'KeyC', 'c');
    tick(15);
    key('keyup', 'KeyC', 'c');
    tick(2);
    const prone = efcOmniState(entity) === 'prone';
    const anchor = entity.efcProneTurn.bodyYaw;
    const yawLimit = !efcOmniAimBlocked(entity, anchor + EFC_OMNI_AIM_YAW, 0) &&
      efcOmniAimBlocked(entity, anchor + EFC_OMNI_AIM_YAW + 0.02, 0);
    PL.pitch = 1.1;
    PL.held = PL.queued = true;
    tick(5);
    const pitchBlocked = efcOmniAimBlocked(entity, PL.yaw, PL.pitch) && shotCount() === roundsAfterActions &&
      Math.abs(camera.rotation.x - PL.pitch) < 0.02;
    PL.pitch = 0;
    PL.held = PL.queued = true;
    tick(5);
    const fireRestored = shotCount() > roundsAfterActions;

    // Switch using the keyboard while detached, then check that a scope still
    // zooms normally after Alt release.
    PL.queued = PL.held = false;
    entity.arms = makeArms(['ak47', 'l96']);
    tick(20);
    const beforeSwitch = PL.yaw;
    key('keydown', 'AltLeft', 'Alt');
    mouse(200, 0);
    key('keydown', 'Digit2', '2');
    tick(25);
    key('keyup', 'Digit2', '2');
    const switchedDuringLook = curW().def.id === 'l96' && EFC_FREE_LOOK.active && PL.yaw === beforeSwitch;
    key('keyup', 'AltLeft', 'Alt');
    PL.adsWant = true;
    tick(30);
    const zoomedFov = camera.fov;
    key('keydown', 'AltLeft', 'Alt');
    mouse(200, 0);
    tick(20);
    const detachedFov = camera.fov;
    key('keyup', 'AltLeft', 'Alt');
    tick(20);
    const scopeViewRestored = detachedFov > zoomedFov + 5 && Math.abs(camera.fov - zoomedFov) < 0.1;
    return { ...detached, otherAltHeld, recentered, releaseAim, normalAim, blurred, firedWhileDetached, reloadedWhileDetached, threwWhileDetached, prone, yawLimit, pitchBlocked, fireRestored, switchedDuringLook, scopeViewRestored };
  });
  for (const [check, passed] of Object.entries(result)) assert.equal(passed, true, check);
  assert.deepEqual(errors, []);
  console.log('omni free-look and aim limits ok');
} finally {
  await browser.close();
}
