/* C9a player movement rules. Wardens retain their existing movement set. */
const EFC_TACTICAL_SPRINT = { tapWindow: 0.28, duration: 0.82, cooldown: 1.55, multiplier: 1.17 };

function efcOmniState(entity) {
  if (!entity.onGround) return 'air';
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

function efcOmniReset(entity) {
  entity.efcSprintTap = Infinity;
  entity.efcSprintHeld = false;
  entity.efcTactical = 0;
  entity.efcTacticalCooldown = 0;
}
