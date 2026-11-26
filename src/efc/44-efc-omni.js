/* C9a player movement rules. Wardens retain their existing movement set. */
const EFC_TACTICAL_SPRINT = { tapWindow: 0.28, duration: 0.82, cooldown: 1.55, multiplier: 1.17 };

function efcOmniState(entity) {
  if (!entity.onGround) return entity.efcDiving ? 'dive' : 'air';
  if (entity.slideT > 0) return 'slide';
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

function efcOmniDive(entity, sprint, dt) {
  if (!entity.isPlayer || !efcRaidMode()) return false;
  const input = entity.input;
  const crouchPressed = input.slide || (input.crouch && !entity.efcDiveCrouchHeld);
  entity.efcDiveCrouchHeld = !!input.crouch;
  entity.efcDiveCooldown = Math.max(0, (entity.efcDiveCooldown || 0) - dt);
  if (entity.efcDiving) return true;
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
  entity.efcDiveCooldown = EFC_DIVE.cooldown;
  entity.crouch = true;
}

function efcOmniReset(entity) {
  entity.efcSprintTap = Infinity;
  entity.efcSprintHeld = false;
  entity.efcTactical = 0;
  entity.efcTacticalCooldown = 0;
  entity.efcDiving = false;
  entity.efcDiveCrouchHeld = false;
  entity.efcDiveCooldown = 0;
}
