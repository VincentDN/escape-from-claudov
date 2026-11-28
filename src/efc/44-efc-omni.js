/* C9a player movement rules. Wardens retain their existing movement set. */
const EFC_TACTICAL_SPRINT = { tapWindow: 0.28, duration: 0.82, cooldown: 1.55, multiplier: 1.17 };

function efcOmniState(entity) {
  if (entity.efcTraversal) return entity.efcTraversal.kind;
  if (!entity.onGround) return entity.efcDiving ? 'dive' : 'air';
  if (entity.slideT > 0) return 'slide';
  if (entity.efcProne) {
    const turn = entity.efcProneTurn;
    return turn?.side ? 'side' : turn?.onBack ? 'supine' : 'prone';
  }
  if (entity.sprinting) return entity.efcTactical > 0 ? 'tactical' : 'sprint';
  return entity.crouch ? 'crouch' : 'stand';
}

function efcOmniSprintDirection(entity, input) {
  return entity.isPlayer && efcRaidMode() ? hyp(input.mx, input.mz) > 0.3 : input.mz > 0.3;
}

function efcOmniTacticalSprint(entity, allowed, dt) {
  if (!entity.isPlayer || !efcRaidMode()) return 1;
  const config = EFC_TACTICAL_SPRINT;
  entity.efcSprintTap = (entity.efcSprintTap ?? Infinity) + dt;
  entity.efcTacticalCooldown = Math.max(0, (entity.efcTacticalCooldown || 0) - dt);
  entity.efcTactical = allowed ? Math.max(0, (entity.efcTactical || 0) - dt) : 0;
  if (entity.input.sprint && !entity.efcSprintHeld && allowed) {
    if (entity.efcSprintTap <= config.tapWindow && entity.efcTacticalCooldown === 0 && entity.onGround) {
      entity.efcTactical = config.duration;
      entity.efcTacticalCooldown = config.cooldown;
    }
    entity.efcSprintTap = 0;
  }
  entity.efcSprintHeld = !!entity.input.sprint;
  return entity.efcTactical > 0 ? config.multiplier : 1;
}

const EFC_DIVE = { boost: 1.3, minSpeed: 7.5, maxSpeed: 10.3, lift: 2.5, cooldown: 0.65 };
Settings.efcSlideDive ??= 'tap-slide';

function efcOmniGroundDive(entity, sprint, requested, dt) {
  if (entity !== PL.ent) return false;
  const input = entity.input, mode = Settings.efcSlideDive;
  const canStart = mode !== 'slide-only' && entity.onGround && sprint && entity.sprinting && !entity.efcProne &&
    !(entity.slideT > 0) && !input.jump && hyp(entity.vel.x, entity.vel.z) > 3;
  if (!canStart) { entity.efcGroundDive = null; return false; }
  const held = efcOmniCrouchHeld(entity);
  if (!entity.efcGroundDive && (!requested || (!held && mode !== 'tap-dive'))) return false;

  const gesture = entity.efcGroundDive ??= { phase: 'hold', t: 0, dir: 0, yaw: 0 };
  input.slide = false;
  if (gesture.phase === 'hold') {
    if (held && (gesture.t += dt) < efcOmniTune('crouch', 'diveHold')) return false;
    const wantsDive = mode === 'tap-dive' ? !held : held;
    if (!wantsDive || entity.efcDiveCooldown > 0) {
      entity.efcGroundDive = null;
      input.slide = true;
      return false;
    }
    gesture.phase = 'anticipation';
    gesture.t = 0;
    gesture.dir = Math.atan2(input.mx, input.mz);
    gesture.yaw = entity.yaw - gesture.dir;
    return false;
  }
  if ((gesture.t += dt) < efcOmniTune('dive', 'anticipation')) return false;

  // ctlMove integrates gravity before position. Compensate for half a step to preserve the apex across frame rates.
  const gravity = 19;
  const lift = Math.sqrt(2 * gravity * efcOmniTune('dive', 'apex'));
  const distance = entity.efcTactical > 0 ? efcOmniTune('dive', 'boostedDistance') :
    (efcOmniTune('dive', 'minDistance') + efcOmniTune('dive', 'maxDistance')) / 2;
  const speed = distance / (2 * lift / gravity);
  entity.vel.x = -Math.sin(gesture.yaw) * speed;
  entity.vel.z = -Math.cos(gesture.yaw) * speed;
  entity.vy = lift + gravity * dt / 2;
  entity.onGround = false;
  entity.efcDiving = true;
  entity.slideBuf = 0;
  gesture.phase = 'launch';
  gesture.t = 0;
  return true;
}

function efcOmniDive(entity, sprint, dt) {
  if (!entity.isPlayer || !efcRaidMode()) return false;
  const input = entity.input;
  const crouchPressed = input.slide || (input.crouch && !entity.efcDiveCrouchHeld);
  entity.efcDiveCrouchHeld = !!input.crouch;
  entity.efcDiveCooldown = Math.max(0, (entity.efcDiveCooldown || 0) - dt);
  if (entity.efcDiving) {
    const gesture = entity.efcGroundDive;
    if (gesture?.phase === 'launch' && (gesture.t += dt) >= efcOmniTune('dive', 'launch')) gesture.phase = 'flight';
    return true;
  }
  if (efcOmniGroundDive(entity, sprint, input.slide, dt)) return true;
  if (entity.onGround || !sprint || !entity.sprinting || !crouchPressed || entity.efcDiveCooldown > 0) return false;

  const speed = hyp(entity.vel.x, entity.vel.z);
  if (speed <= 3) return false;
  const impulse = clamp(speed * EFC_DIVE.boost, EFC_DIVE.minSpeed, EFC_DIVE.maxSpeed) / speed;
  entity.vel.x *= impulse;
  entity.vel.z *= impulse;
  entity.vy = EFC_DIVE.lift;
  entity.efcDiving = true;
  input.slide = false;
  entity.slideBuf = 0;
  return true;
}

function efcOmniDiveLand(entity) {
  entity.efcDiving = false;
  entity.efcGroundDive = null;
  entity.efcDiveCooldown = EFC_DIVE.cooldown;
  entity.crouch = true;
  entity.efcProne = true;
  entity.efcProneHeldFor = 0;
  entity.efcProneWaitRelease = efcOmniCrouchHeld(entity);
}

const EFC_PRONE = { hold: 0.4, speed: 0.9, height: 0.5, eye: 0.35 };

function efcOmniCrouchHeld(entity) {
  return entity === PL.ent && !!(KEYS.KeyC || KEYS.ControlLeft);
}

function efcOmniProne(entity, sprint, diving, dt) {
  if (!entity.isPlayer || !efcRaidMode()) return false;
  const input = entity.input;
  const canHold = entity === PL.ent && !entity.busy && !playHold() && !KS.map.open;
  const crouchHeld = efcOmniCrouchHeld(entity);
  if (!crouchHeld) entity.efcProneWaitRelease = false;
  const trackingHold = canHold && crouchHeld && !entity.efcProneWaitRelease;
  const heldFor = entity.efcProneHeldFor || 0;

  if (entity.efcProne) {
    entity.efcProneHeldFor = trackingHold ? heldFor + dt : 0;
    const tapped = canHold && !crouchHeld && heldFor > 0 && heldFor < EFC_PRONE.hold - 1e-6;
    const jumpPressed = input.jump && !entity.jumpHeld;
    if (entity.onGround && (tapped || jumpPressed) &&
        ceilingAbove(entity.pos.x, entity.pos.z, entity.pos.y + 0.3, 0.36) >= entity.pos.y + 1.8) {
      entity.efcProne = false;
      entity.efcProneHeldFor = 0;
      entity.efcProneWaitRelease = crouchHeld;
      entity.crouch = input.crouch = false;
      if (entity === PL.ent) PL.crouchToggle = false;
    }
    return entity.efcProne;
  }

  const canEnter = entity.onGround && !sprint && !diving && !input.slide && !(entity.slideT > 0);
  entity.efcProneHeldFor = trackingHold && canEnter ? heldFor + dt : 0;
  entity.efcProne = entity.efcProneHeldFor >= EFC_PRONE.hold - 1e-6;
  if (entity.efcProne) {
    entity.efcProneHeldFor = 0;
    entity.efcProneWaitRelease = true;
  }
  return entity.efcProne;
}

const EFC_PRONE_TURN = {
  bodyRange: Math.PI / 4, bodySpeed: Math.PI, backEnter: 2 * Math.PI / 3, backExit: Math.PI / 2,
};

function efcOmniProneTurn(entity, prone, dt) {
  if (!entity.isPlayer || !efcRaidMode()) return;
  if (!prone || !entity.onGround) {
    entity.efcProneTurn = null;
    return;
  }

  const config = EFC_PRONE_TURN;
  const turn = entity.efcProneTurn ??= {
    anchorYaw: entity.yaw, bodyYaw: entity.yaw, onBack: false, side: 0,
  };
  const yaw = entity.yaw - turn.anchorYaw;
  const offset = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  // The torso follows within an arc around the grounded prone orientation.
  // The sine keeps the body target continuous at the rear yaw wrap.
  const target = turn.anchorYaw + Math.sin(offset) * config.bodyRange;
  const step = config.bodySpeed * dt;
  turn.bodyYaw += clamp(target - turn.bodyYaw, -step, step);
  turn.onBack = Math.abs(offset) >= (turn.onBack ? config.backExit : config.backEnter);
  if (entity === PL.ent) turn.side = Number(!!KEYS.LeanR) - Number(!!KEYS.LeanL);
}

function efcOmniReset(entity) {
  entity.efcTraversal = null;
  entity.efcSprintTap = Infinity;
  entity.efcSprintHeld = false;
  entity.efcTactical = 0;
  entity.efcTacticalCooldown = 0;
  entity.efcDiving = false;
  entity.efcGroundDive = null;
  entity.efcDiveCrouchHeld = false;
  entity.efcDiveCooldown = 0;
  entity.efcProne = false;
  entity.efcProneHeldFor = 0;
  entity.efcProneWaitRelease = false;
  entity.efcProneTurn = null;
}

// Use the standing controller cylinder. The normal collision resolver permits steps;
// a traversal pose must also be clear when its feet have not reached the top yet.
const EFC_TRAVERSAL = { radius: 0.36, height: 1.75, reach: 0.95, speed: 5, sample: 0.08 };

function efcOmniTraversalClear(from, to) {
  const { radius, height, sample } = EFC_TRAVERSAL;
  const steps = Math.max(1, Math.ceil(from.distanceTo(to) / sample));
  const pos = new V3();
  for (let i = 1; i <= steps; i++) {
    pos.lerpVectors(from, to, i / steps);
    const { x, y, z } = pos;
    const blocked = queryBoxes(x - radius, z - radius, x + radius, z + radius).some((box) => {
      if (box.ray || box.y1 <= y + 1e-5 || box.y0 >= y + height) return false;
      const dx = x - clamp(x, box.x0, box.x1), dz = z - clamp(z, box.z0, box.z1);
      return dx * dx + dz * dz < radius * radius - 1e-5;
    });
    if (blocked || groundHeight(x, z, y, 0) > y + 1e-5) return false;
    collideCircle(pos, radius, height);
    if (Math.abs(pos.x - x) > 1e-5 || Math.abs(pos.z - z) > 1e-5) return false;
  }
  return true;
}

function efcOmniTraversalPlan(entity) {
  const start = entity.pos;
  const { x, y, z } = start;
  const { reach, radius } = EFC_TRAVERSAL;
  const dx = -Math.sin(entity.yaw), dz = -Math.cos(entity.yaw);
  const knee = rayWorld(x, y + 0.48, z, dx, 0, dz, reach, 2);
  if (!knee || Math.abs(knee.ny) > 0.4) return null;
  const edge = knee.t;
  const waist = rayWorld(x, y + 0.9, z, dx, 0, dz, reach, 2);
  if (waist && waist.t < edge - 0.05) return null;

  const inside = edge + 0.05;
  const ledge = rayWorld(x + dx * inside, y + 1.21, z + dz * inside, 0, -1, 0, 0.72, 2);
  if (!ledge || ledge.ny < 0.9) return null;
  const top = y + 1.21 - ledge.t;
  if (top - y < 0.5 - 1e-5 || top - y > 1.2 + 1e-5) return null;

  const lift = new V3(x, top + 0.02, z);
  if (!efcOmniTraversalClear(start, lift)) return null;
  const route = (distance, landing) => {
    const above = new V3(x + dx * distance, lift.y, z + dz * distance);
    const end = new V3(above.x, landing, above.z);
    return efcOmniTraversalClear(lift, above) && efcOmniTraversalClear(above, end)
      ? [lift, above, end] : null;
  };
  const at = (distance, height, footprint = 0) => groundHeight(x + dx * distance, z + dz * distance, height, footprint);

  // A usable far side must support the landing and leave room for the whole body.
  for (let step = 4; step <= 10; step++) {
    const distance = edge + step / 10;
    const ground = at(distance, top, radius / 2);
    if (Math.abs(ground - y) > 0.2) continue;
    const points = route(distance, ground);
    if (points) return { kind: 'vault', points, next: 0 };
  }

  for (const offset of [0.55, 0.35, 0.2]) {
    const distance = edge + offset;
    if (Math.abs(at(distance, top) - top) > 1e-5) continue;
    const points = route(distance, top);
    if (points) return { kind: 'mantle', points, next: 0 };
  }
  return null;
}

function efcOmniTraversalStep(entity, dt) {
  if (!entity.isPlayer || !efcRaidMode()) return null;
  const input = entity.input;
  let traversal = entity.efcTraversal;
  const started = !traversal;
  if (started) {
    if (!input.jump || entity.jumpHeld || !entity.onGround || entity.efcProne || entity.crouch || input.crouch ||
        entity.slideT > 0 || input.slide || entity.slideBuf > 0) return null;
    traversal = efcOmniTraversalPlan(entity);
    if (!traversal) return null;
    entity.efcTraversal = traversal;
  }

  let remaining = EFC_TRAVERSAL.speed * dt;
  const next = new V3();
  while (remaining > 0 && traversal.next < traversal.points.length) {
    const target = traversal.points[traversal.next];
    const distance = entity.pos.distanceTo(target);
    next.lerpVectors(entity.pos, target, distance <= remaining ? 1 : remaining / distance);
    if (!efcOmniTraversalClear(entity.pos, next)) {
      entity.efcTraversal = null;
      return null;
    }
    entity.pos.copy(next);
    if (distance <= remaining) traversal.next++;
    remaining -= distance;
  }

  const finished = traversal.next === traversal.points.length;
  if (finished) entity.efcTraversal = null;
  entity.jumpHeld = !!input.jump;
  entity.onGround = finished;
  entity.vy = entity.airVy = 0;
  entity.vel.set(0, 0, 0);
  entity.sprinting = false;
  efcOmniTacticalSprint(entity, false, dt);
  efcOmniDive(entity, false, dt);
  entity.slideCd = Math.max(0, (entity.slideCd || 0) - dt);
  entity.slideAmt = damp(entity.slideAmt || 0, 0, 7, dt);
  entity.arms.sprintW = damp(entity.arms.sprintW, 0, 11, dt);
  return { landed: 0, jumped: started, slid: false };
}

const EFC_FLAT_HIT_LOWER_BODY = [
  { forward: -0.04, height: 0.22, radius: 0.19, part: 'body' },
  { forward: -0.36, height: 0.18, radius: 0.16, part: 'legs' },
  { forward: -0.65, height: 0.14, radius: 0.13, part: 'legs' },
];
// Centres are in body space. The leading two rows also supply the head and chest aim points.
const EFC_FLAT_HIT_VOLUMES = {
  prone: [
    { forward: 0.65, height: 0.30, radius: 0.14, part: 'head' },
    { forward: 0.32, height: 0.24, radius: 0.21, part: 'body' },
    ...EFC_FLAT_HIT_LOWER_BODY,
  ],
  supine: [
    { forward: 0.65, height: 0.22, radius: 0.14, part: 'head' },
    { forward: 0.32, height: 0.25, radius: 0.21, part: 'body' },
    ...EFC_FLAT_HIT_LOWER_BODY,
  ],
};

function efcOmniHitVolumes(entity) {
  const human = entity.isPlayer || (entity.isRemote && entity.remoteBot === false);
  if (!human || !entity.efcProne || !efcRaidMode()) return null;
  const stance = efcOmniState(entity);
  if (stance === 'side') return EFC_FLAT_HIT_VOLUMES[entity.efcProneTurn.onBack ? 'supine' : 'prone'];
  return stance === 'prone' || stance === 'supine' ? EFC_FLAT_HIT_VOLUMES[stance] : null;
}

function efcOmniHitPoint(entity, volume, out) {
  const yaw = entity.efcProneTurn?.bodyYaw ?? entity.yaw;
  return out.set(entity.pos.x - Math.sin(yaw) * volume.forward, entity.pos.y + volume.height,
    entity.pos.z - Math.cos(yaw) * volume.forward);
}
