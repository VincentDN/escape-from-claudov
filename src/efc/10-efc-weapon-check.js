/* C1 insertion choreography. Timelines use the existing viewmodel hand solver and foley. */
const EFC_WEAPON_CHECK_DURATION = 1.55;
Settings.efcWeaponCheck ??= true;
const EFC_WEAPON_CHECK_GUN = [
  [0, 0, 0, 0, 0, 0, 0], [0.24, -0.045, 0.033, 0.022, 0.12, 0.27, 0.42],
  [0.54, -0.056, 0.04, 0.035, 0.14, 0.36, 0.60],
  [0.92, -0.047, 0.036, 0.030, 0.08, 0.24, 0.45],
  [1.22, -0.020, 0.012, 0.012, 0.04, 0.10, 0.18], [EFC_WEAPON_CHECK_DURATION, 0, 0, 0, 0, 0, 0],
];
const EFC_WEAPON_CHECK_TIMELINES = {
  mag: {
    lh: [[0, 0, 0, 0, 3, 0, 0, 0], [0.34, 0, 0, 0, 1, 1, 1, 0], [0.40, 0, 0, 0, 1, 1, 1, 1],
      [0.63, -0.06, -0.105, 0.04, 1, 1, 1, 1], [0.78, -0.06, -0.10, 0.035, 1, 1, 1, 1],
      [1.04, 0, 0, 0, 1, 1, 1, 1], [1.08, 0, 0, 0, 1, 1, 1, 0], [1.43, 0, 0, 0, 3, 0, 0, 0]],
    ev: [[0.08, 'draw'], [0.40, 'magout'], [1.08, 'insert']],
  },
  bolt: {
    bolt: [[0, 0, 0], [0.38, 0, 0], [0.52, 0.72, 0], [0.67, 0.72, 0.033], [0.88, 0.72, 0.033], [1.04, 0.72, 0], [1.18, 0, 0]],
    rh: [[0, 0, 0, 0, 6, 0, 6], [0.38, 0, 0, 0, 5, 1, 2], [1.18, 0, 0, 0, 5, 1, 2], [1.43, 0, 0, 0, 6, 0, 6]],
    ev: [[0.08, 'draw'], [0.52, 'boltsnd'], [1.16, 'boltfwd']],
  },
  sks: {
    rh: [[0, 0, 0, 0, 6, 0, 6], [0.38, 0, 0, 0, 5, 1, 2], [1.18, 0, 0, 0, 5, 1, 2], [1.43, 0, 0, 0, 6, 0, 6]],
    ev: [[0.08, 'draw'], [0.52, 'boltsnd'], [1.05, 'boltfwd']],
  },
  pump: {
    lh: [[0, 0, 0, 0, 3, 0, 0, 0], [0.42, 0, 0, 0, 3, 1, 0, 0], [0.67, 0, 0, 0.041, 3, 1, 0, 0],
      [0.91, 0, 0, 0.041, 3, 1, 0, 0], [1.12, 0, 0, 0, 3, 1, 0, 0], [1.40, 0, 0, 0, 3, 0, 0, 0]],
    ev: [[0.08, 'draw'], [0.61, 'pumpsnd'], [1.10, 'shellin']],
  },
};
for (const timeline of Object.values(EFC_WEAPON_CHECK_TIMELINES)) {
  timeline.dur = EFC_WEAPON_CHECK_DURATION;
  timeline.gun = EFC_WEAPON_CHECK_GUN;
}
let efcWeaponCheckPending = false;
const EFC_WEAPON_CHECK_ORIGIN = new V3();
function efcWeaponCheckKind(def) {
  if (def.id === 'sks') return 'sks';
  if (def.bolt) return 'bolt';
  if (def.pump) return 'pump';
  return !def.tube ? 'mag' : 'pump';
}
function efcWeaponCheckResetPose() {
  VM.action = null;
  vmResetHandling(VM.cur);
  if (VM.cur?.bolt) { VM.cur.bolt.position.set(0.02, 0.045, 0.07); VM.cur.bolt.rotation.set(0, 0, 0); }
  if (VM.cur?.pump) VM.cur.pump.position.z = 0;
}
function efcWeaponCheckCancel() {
  efcWeaponCheckPending = false;
  if (VM.action !== 'raidCheck' || VM.actionData.magazine) return;
  efcWeaponCheckResetPose();
  PL.ent.efcWeaponCheck = null;
  if (MATCH.online) netEvent({ k: 'weaponCheck', on: false });
}
function efcWeaponCheckTick(input, hold) {
  if (VM.action === 'raidCheck' && VM.actionData.magazine) return;
  if (!efcWeaponCheckPending && VM.action !== 'raidCheck') return;
  const interrupted = input.ads || input.fire || input.firePressed || input.sprint || input.jump || input.crouch || efcLeanWant() ||
    PL.reload || PL.switching > 0 || PL.knifeOut || busy() || efcCall('ui:busy') || PL.ent.pos.distanceToSquared(EFC_WEAPON_CHECK_ORIGIN) > 1.8 ** 2;
  if (interrupted || Settings.efcWeaponCheck === false) { efcWeaponCheckCancel(); return; }
  if (!efcWeaponCheckPending || hold || VM.action) return;
  efcWeaponCheckPending = false;
  const kind = efcWeaponCheckKind(curW().def);
  PL.ent.efcWeaponCheck = { kind, start: MATCH.time };
  vmStartAction('raidCheck', EFC_WEAPON_CHECK_DURATION, { kind });
  if (MATCH.online) netEvent({ k: 'weaponCheck', on: true, kind });
}
function efcWeaponCheckRemote(entity, event) {
  entity.efcWeaponCheck = event.on === true && Object.hasOwn(EFC_WEAPON_CHECK_TIMELINES, event.kind) ? { kind: event.kind, start: MATCH.time } : null;
}
function efcWeaponCheckPose(entity) {
  const check = entity.efcWeaponCheck;
  if (!check) return null;
  const t = MATCH.time - check.start;
  if (t >= EFC_WEAPON_CHECK_DURATION || t < 0) return null;
  return { kind: check.kind, tilt: env(t, 0, 0.45, 0.95, EFC_WEAPON_CHECK_DURATION), reach: env(t, 0.20, 0.48, 0.98, 1.26) };
}
efcOn('raid:begin', () => {
  efcWeaponCheckPending = Settings.efcWeaponCheck !== false && location.hash !== '#artlab' && location.hash !== '#bench';
  EFC_WEAPON_CHECK_ORIGIN.copy(PL.ent.pos);
  PL.ent.efcWeaponCheck = null;
});
efcOn('raid:over', efcWeaponCheckCancel);
efcOn('match:left', efcWeaponCheckCancel);
