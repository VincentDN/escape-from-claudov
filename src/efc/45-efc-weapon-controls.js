/* Local raid controls. Safety and fire mode belong to the weapon held during this raid. */
function efcWeaponControlPress(cue) {
  const entity = PL.ent;
  if (!efcRaidMode() || !entity?.alive || busy() || playHold() || PL.knifeOut || PL.nadeState || KS.mode || entity.arms.switching > 0) return;
  const weapon = armsW(entity);
  if (cue === 'selector') {
    if (!weapon.def.auto || !['rifle', 'smg', 'pistol'].includes(weapon.def.fam)) return;
    weapon.efcSingle = !weapon.efcSingle;
    hudMsg(weapon.efcSingle ? 'Semi-auto' : 'Automatic', 'ally', 1);
  } else {
    weapon.efcSafe = !weapon.efcSafe;
    hudMsg(weapon.efcSafe ? 'Safety on' : 'Safety off', 'ally', 1);
  }
  PL.held = PL.queued = PL.runShot = false;
  sfxMech(cue, 0, null, weapon.def.fam);
}

function efcWeaponControlInput(entity) {
  if (!efcRaidMode() || !entity.isPlayer) return;
  const weapon = armsW(entity), input = entity.input;
  if (weapon.efcSafe) {
    input.fire = input.firePressed = false;
    PL.queued = PL.runShot = false;
  } else if (weapon.efcSingle) input.fire = input.firePressed;

  const supported = weapon.def.bipod && entity.onGround && entity.crouch && hyp(entity.vel.x, entity.vel.z) < 0.4 &&
    !PL.knifeOut && !PL.nadeState && !KS.mode && entity.arms.switching <= 0;
  const deployed = supported ? weapon : null;
  if (deployed && entity.efcBipodWeapon !== deployed) sfxMech('bipod_deploy', 0, null, weapon.def.fam);
  entity.efcBipodWeapon = deployed;
}
