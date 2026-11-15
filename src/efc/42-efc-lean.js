/* Leaning (P2c): Q and E lean the player left and right, held or toggled (Settings.leanToggle, Options, Controls).
   One number carries a lean everywhere: e.leanX, the signed sideways shift of the eye in metres (+ to the right of the view), after the
   wall check. The first-person camera shifts and rolls by it (efcLeanCam), the third-person soldier rolls its torso and head so its head
   lands the same distance aside (efcLeanTorso, called from poseSoldier), the player's own hit volumes, eye, head and chest points follow
   it (efcLeanShift, used by src/06b-soldier.js), and it is published online as one field of the per-participant state (src/09c-net.js). */
const EFC_LEAN = {
  eye: 0.35, eyeCrouch: 0.25, // sideways eye shift at full lean (m), standing and crouched
  roll: 15 * Math.PI / 180, // camera roll at full lean
  gunRoll: 0.07, // extra cant of the first-person weapon, on top of the camera roll it shares
  ease: 0.15, // seconds from upright to full lean
  margin: 0.17, // the eye stays this far from a wall (head radius plus the camera's near plane)
  drop: 0.05, // the eye dips this much at full lean (the head arcs about the hips)
  pelvis: 0.15, // share of the shift taken by the hips in third person; the rest is the torso roll
  reach: 0.633, // pelvis to head in the soldier model (SD.trunk + SD.head[1])
  tog: 0, // toggle mode: the side chosen (-1, 0, 1)
  last: 0, // hold mode: the side pressed last (both held: that one wins)
  w: 0, // eased lean before the wall check (-1..1)
};
/* Key press of a lean action (dir -1 left, 1 right), from onKey */
function efcLeanPress(dir) {
  EFC_LEAN.last = dir;
  if (Settings.leanToggle) EFC_LEAN.tog = EFC_LEAN.tog === dir ? 0 : dir;
}
/* Side the player asks for now */
function efcLeanWant() {
  if (Settings.leanToggle) return EFC_LEAN.tog;
  const l = !!KEYS.LeanL, r = !!KEYS.LeanR;
  return l && r ? EFC_LEAN.last : r ? 1 : l ? -1 : 0;
}
/* Sprinting, sliding and being in the air cancel a lean (a toggled lean is cleared, a held one waits for the key to be held after) */
function efcLeanBlocked(e) { return !e.alive || !!e.sprinting || (e.slideT || 0) > 0 || e.onGround === false || !!PILOT.d || !!MECHA_P.me; }
function efcLeanReset() { EFC_LEAN.w = 0; EFC_LEAN.tog = 0; PL.ent.leanX = 0; vmCamera.rotation.z = 0; }
/* Full eye shift for this entity's posture (m) */
function efcLeanMax(e) { return lerp(EFC_LEAN.eye, EFC_LEAN.eyeCrouch, clamp(e.crouchAmt || 0, 0, 1)); }
/* Right of the view, flat */
function efcLeanRight(e, out) { return out.set(Math.cos(e.yaw), 0, -Math.sin(e.yaw)); }
/* Per frame, from updatePlayer before the camera: eases the lean and shortens it against geometry */
function efcLeanTick(dt) {
  const e = PL.ent, L = EFC_LEAN;
  const blocked = efcLeanBlocked(e);
  if (blocked) L.tog = 0;
  const want = blocked ? 0 : efcLeanWant(), step = dt / L.ease;
  L.w = L.w < want ? Math.min(want, L.w + step) : Math.max(want, L.w - step);
  const k = Math.sign(L.w) * smoothstep(0, 1, Math.abs(L.w)), wantX = k * efcLeanMax(e);
  e.leanX = efcLeanClip(e, wantX);
}
/* The shift allowed from the upright eye towards x (signed m): a ray along the side stops it L.margin short of any wall */
function efcLeanClip(e, x) {
  if (!x) return 0;
  const s = Math.sign(x), rx = Math.cos(e.yaw) * s, rz = -Math.sin(e.yaw) * s, y = e.pos.y + (e.isPlayer ? PL.eyeH : lerp(1.62, 1.12, e.crouchAmt || 0));
  let room = Math.abs(x);
  for (const dy of [0, -0.22]) { // eye and neck
    const h = rayWorld(e.pos.x, y + dy, e.pos.z, rx, 0, rz, room + EFC_LEAN.margin);
    if (h) room = Math.min(room, Math.max(0, h.t - EFC_LEAN.margin));
  }
  return s * room;
}
/* Sideways shift of a point of the soldier at height y above its feet (m along the view's right): none at the hips, the full lean at the
   eye, in between in proportion (the body pivots about the hips) */
function efcLeanShift(e, y) {
  const x = e.leanX || 0; if (!x) return 0;
  const k = 1 - (e.crouchAmt || 0) * 0.33, pv = 0.95 * k, eye = e.isPlayer ? PL.eyeH : lerp(1.62, 1.12, e.crouchAmt || 0);
  return x * clamp((y - pv) / Math.max(0.2, eye - pv), 0, 1.15);
}
/* Moves `out` (a point of e at height y above its feet) by the lean */
function efcLeanApply(e, out, y) {
  const s = efcLeanShift(e, y); if (!s) return out;
  out.x += Math.cos(e.yaw) * s; out.z -= Math.sin(e.yaw) * s;
  out.y -= EFC_LEAN.drop * Math.abs(e.leanX) / EFC_LEAN.eye * clamp(y / 1.6, 0, 1);
  return out;
}
/* Exposed point of the upper body of a leaning soldier (what a Warden aims at instead of the chest behind cover): the leading shoulder,
   blended in with the lean. `chest`: the upright chest point, changed in place. Model soldiers pass their shoulder joint. */
function efcLeanChest(e, chest, shoulder) {
  const x = e.leanX || 0; if (!x) return chest;
  const f = clamp(Math.abs(x) / EFC_LEAN.eyeCrouch, 0, 1);
  if (shoulder) return chest.lerp(shoulder, f);
  const k = 1 - (e.crouchAmt || 0) * 0.33, y = 1.36 * k, s = efcLeanShift(e, y) + Math.sign(x) * 0.14 * f, cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
  return chest.set(lerp(chest.x, e.pos.x + cy * s, f), lerp(chest.y, e.pos.y + y, f), lerp(chest.z, e.pos.z - sy * s, f));
}
/* First person, from applyCamera after the camera is placed: shift and roll the eye, cant the weapon */
function efcLeanCam() {
  const e = PL.ent, x = e.leanX || 0, k = x / EFC_LEAN.eye;
  if (x) { camera.position.x += Math.cos(e.yaw) * x; camera.position.z -= Math.sin(e.yaw) * x; camera.position.y -= EFC_LEAN.drop * Math.abs(k); }
  camera.rotation.z -= k * EFC_LEAN.roll;
  vmCamera.rotation.z = k * EFC_LEAN.gunRoll;
}
/* Third person, from poseSoldier just before the chest is placed: rolls the torso quaternion qT (body frame) about the facing axis and
   moves the hips, so the head ends up e.leanX aside. Returns the roll (to apply to the head too) or null. */
const _efcLeanQ = new THREE.Quaternion(), _efcLeanZ = new V3(0, 0, 1);
function efcLeanTorso(e, qT, pel) {
  const x = e.alive ? e.leanX || 0 : 0; if (Math.abs(x) < 1e-3) return null;
  pel.x += x * EFC_LEAN.pelvis;
  const a = Math.asin(clamp((x * (1 - EFC_LEAN.pelvis)) / EFC_LEAN.reach, -0.8, 0.8));
  _efcLeanQ.setFromAxisAngle(_efcLeanZ, -a);
  qT.premultiply(_efcLeanQ);
  return _efcLeanQ;
}
/* Remote copy: smoothed towards the published lean */
function efcLeanRemote(e, dt) { e.leanX = damp(e.leanX || 0, (e.net && e.net.lean) || 0, 30, dt); } // about 0.1 s behind the owner's own easing
