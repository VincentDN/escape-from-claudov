/* RAID: distinguish a tap of the bound Reload key from a held magazine check. */
const EFC_MAG_CHECK_HOLD = 0.30;
let efcRaidMagCheck = null;

function efcRaidMagCheckReady() {
  return MATCH.state === 'playing' && pointerActive() && !CHAT.open && !KS.map.open &&
    !efcCall('ui:busy') && !busy() && !efcMedHolding();
}

function efcRaidMagCheckPress() {
  if (!efcRaidMagCheckReady()) return;
  efcRaidMagCheck = { weapon: curW(), start: MATCH.time, active: false };
}

function efcRaidMagCheckCancel() { efcRaidMagCheck = null; }

function efcRaidMagCheckRelease() {
  const check = efcRaidMagCheck;
  efcRaidMagCheckCancel();
  if (check && !check.active && MATCH.time - check.start < EFC_MAG_CHECK_HOLD &&
    efcRaidMagCheckReady() && check.weapon === curW()) startReload();
}

function efcRaidMagCheckTick(input, hold) {
  const check = efcRaidMagCheck;
  if (!check) return;
  if (!KEYS.KeyR || !efcRaidMagCheckReady() || check.weapon !== curW()) {
    efcRaidMagCheckCancel();
    return;
  }
  if (MATCH.time - check.start < EFC_MAG_CHECK_HOLD) return;
  if (hold || input.ads || input.fire || input.firePressed || input.sprint || PL.sprinting ||
    PL.reload || PL.boltT > 0 || PL.knifeOut) {
    efcRaidMagCheckCancel();
    return;
  }
  if (!check.active) {
    efcWeaponCheckCancel();
    check.active = true;
  }
}

efcOn('ui:panel', (open) => { if (open) efcRaidMagCheckCancel(); });
efcOn('died', (victim) => { if (victim === PL.ent) efcRaidMagCheckCancel(); });
efcOn('raid:over', efcRaidMagCheckCancel);
efcOn('match:left', efcRaidMagCheckCancel);
addEventListener('blur', efcRaidMagCheckCancel);
