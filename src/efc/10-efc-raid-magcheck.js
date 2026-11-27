/* RAID: distinguish a tap of the bound Reload key from a held magazine check. */
const EFC_MAG_CHECK_HOLD = 0.30;
const EFC_MAG_CHECK_VIEW = 0.76;
const EFC_MAG_CHECK_RETURN = 0.42;
let efcRaidMagCheck = null;
Settings.efcMagCount ??= 'rough';

function efcRaidMagCheckReady() {
  return MATCH.state === 'playing' && pointerActive() && !CHAT.open && !KS.map.open &&
    !efcCall('ui:busy') && !busy() && !efcMedHolding();
}

function efcRaidMagCheckPress() {
  if (!efcRaidMagCheckReady()) return;
  efcRaidMagCheck = { weapon: curW(), start: MATCH.time, active: false };
}

function efcRaidMagCheckPose() {
  return VM.action === 'raidCheck' && VM.actionData.magazine ? VM.actionData : null;
}

function efcRaidMagCheckSend(on, kind, stow = false) {
  const event = { k: 'weaponCheck', held: true, on, kind, stow };
  efcWeaponCheckRemote(PL.ent, event);
  if (MATCH.online) netEvent(event);
}

function efcRaidMagCheckCancel(putBack = false) {
  const pose = efcRaidMagCheckPose();
  const stow = putBack === true && pose && VM.actionT >= 0.58;
  if (efcRaidMagCheck?.active) efcEmit('mag:readout', null);
  if (efcRaidMagCheck?.active || pose) efcRaidMagCheckSend(false, undefined, !!stow);
  efcRaidMagCheck = null;
  if (!pose) return;
  if (stow) {
    pose.returnStart = VM.actionT;
    VM.actionDur = VM.actionT + EFC_MAG_CHECK_RETURN;
  } else efcWeaponCheckResetPose();
}

function efcRaidMagCheckRelease() {
  const check = efcRaidMagCheck;
  if (!check) return;
  efcRaidMagCheckCancel(check.active);
  if (!check.active && MATCH.time - check.start < EFC_MAG_CHECK_HOLD &&
    efcRaidMagCheckReady() && check.weapon === curW()) startReload();
}

function efcRaidMagCheckPoseTime(data, duration) {
  if (data.returnStart === undefined) return Math.min(VM.actionT, EFC_MAG_CHECK_VIEW);
  const start = Math.min(data.returnStart, EFC_MAG_CHECK_VIEW);
  return lerp(start, duration, clamp((VM.actionT - data.returnStart) / EFC_MAG_CHECK_RETURN, 0, 1));
}

function efcRaidMagCheckTick(input, hold) {
  const check = efcRaidMagCheck;
  const pose = efcRaidMagCheckPose();
  if (!check && !pose) return;
  if (!efcRaidMagCheckReady() || (check && (!KEYS.KeyR || check.weapon !== curW() || (check.active && !pose)))) {
    efcRaidMagCheckCancel();
    return;
  }
  if (check && MATCH.time - check.start < EFC_MAG_CHECK_HOLD) return;
  if (hold || input.ads || input.fire || input.firePressed || input.sprint || PL.sprinting ||
    PL.reload || PL.boltT > 0 || PL.knifeOut) {
    efcRaidMagCheckCancel();
    return;
  }
  if (!check) return;
  if (!check.active) {
    efcWeaponCheckCancel();
    check.active = true;
    const kind = efcWeaponCheckKind(check.weapon.def);
    vmStartAction('raidCheck', Infinity, { kind, magazine: true });
    efcRaidMagCheckSend(true, kind);
  } else if (VM.actionT >= 0.62) efcEmit('mag:readout', check.weapon);
}

efcOn('ui:panel', (open) => { if (open) efcRaidMagCheckCancel(); });
efcOn('died', (victim) => { if (victim === PL.ent) efcRaidMagCheckCancel(); });
efcOn('raid:over', () => efcRaidMagCheckCancel());
efcOn('match:left', efcRaidMagCheckCancel);
addEventListener('blur', () => efcRaidMagCheckCancel());
