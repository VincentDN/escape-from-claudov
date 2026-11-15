/* Escape From Claudov, WARDEN package: pace and posture of the Wardens (raid only). Three states, each with its own pace:
   idle (guarding, patrolling, walking back to its post: a slow walk, weapon at low ready, head scanning on its own), alert (heard or was
   told something, searching: a careful walk, weapon up at high ready) and combat (the engine's speeds times EFC.cfg.wardenCombatMul,
   sprinting only to reach cover or to flank). Going from idle to alert or combat raises the weapon in EFC.cfg.wardenRaise seconds, during
   which the Warden cannot fire (on top of its reaction time). An idle Warden turns its head toward a stimulus first, then its body, at a
   calmer rate. Engine seams (all in the WARDEN files): updateBot -> efcWardenPace, efcWardenSpeed, efcWardenAds, efcWardenTurn;
   poseSoldier -> efcPoseStep, efcPoseAiming, efcPoseAw, efcPoseLowReady; netPresence / netApply -> efcWardenPub / efcWardenNet.
   e.efcPose, the posture code read by the soldier pose (a guest receives it with the bot's state): 0 none (engine), 1 idle, 2 alert, 3 combat. */
EFC.cfg.wardenPace = true;       // false: Wardens move at the engine's speeds (tests measure the engine's own figures with it)
EFC.cfg.wardenIdleSpeed = 1.3;   // m/s, idle: guarding, patrolling, walking back to the post
EFC.cfg.wardenAlertSpeed = 2.2;  // m/s, alert: heard something, was told by radio, searching
EFC.cfg.wardenCombatMul = 0.8;   // combat: share of the engine's speed
EFC.cfg.wardenRaise = 0.4;       // s, idle to alert or combat: the weapon comes up, no shot meanwhile
EFC.cfg.wardenCalmTurn = 0.5;    // share of the engine's turn rate of an idle (or just raised) Warden's body
EFC.cfg.wardenHeadLead = 0.3;    // s the head leads before an idle Warden's body starts a large turn
EFC.cfg.wardenSawHold = 8;       // s a Warden stays in combat after it last saw an enemy itself
EFC.cfg.wardenAlertHold = 15;    // s a Warden stays alert after the last thing it heard, was told or saw
const EFC_POSE = { idle: 1, alert: 2, combat: 3 };
const EFC_COMBAT_TACTICS = new Set(['fight', 'push', 'flank', 'cover', 'mecha']);

function efcWardenPaced(b) { return b.squad === 'w' && EFC.cfg.wardenPace !== false && efcRaidMode(); }
/* New life (efcWardenSpawn): idle, weapon down */
function efcPaceReset(b) { b.efcState = 'idle'; b.efcPose = EFC_POSE.idle; b.efcSawT = -99; b.efcRaiseT = -99; b.efcCalmT = -99; b.efcTurnT = 0; b.efcHead = 0; b.efcSprint0 = false; }
/* The state from what the Warden knows */
function efcWardenStateOf(b, now, vis) {
  const C = EFC.cfg;
  if (vis) b.efcSawT = now;
  if (vis || EFC_COMBAT_TACTICS.has(b.tactic) || now - (b.efcSawT ?? -99) < C.wardenSawHold || now < (b.blindT || 0)) return 'combat';
  if (b.tactic === 'hunt' || b.tactic === 'search' || now < b.warnT || now < b.lookAtT || now - b.lastSeenT < C.wardenAlertHold || now - b.lastHitT < C.wardenAlertHold) return 'alert';
  return 'idle';
}
/* updateBot seam, once the tactic has set the wish: updates the state, starts the raise, and returns the sprint flag (idle and alert never
   sprint; in combat only toward cover or on a flank). Not a Warden in a raid: clears the posture and returns sprint unchanged. */
function efcWardenPace(b, now, vis, sprint) {
  if (!efcWardenPaced(b)) { if (b.efcState) { b.efcState = null; b.efcPose = 0; b.efcHead = 0; } return sprint; }
  const was = b.efcState || 'idle', st = efcWardenStateOf(b, now, vis), C = EFC.cfg;
  if (was === 'idle' && st !== 'idle') { b.efcRaiseT = now + C.wardenRaise; b.efcCalmT = now + C.wardenRaise + C.wardenHeadLead; }
  b.efcState = st; b.efcPose = EFC_POSE[st]; b.efcSprint0 = sprint;
  if (st !== 'combat') return false;
  return sprint && (b.tactic === 'flank' || (b.tactic === 'cover' && !b.atCover));
}
/* No shot while the weapon comes up */
function efcWardenRaising(b, now) { return !!b.efcState && now < b.efcRaiseT; }
/* updateBot seam: the ground speed asked of the controller. gs: the engine's ground speed (already bounded by what its sprint, aim and
   crouch allow) */
function efcWardenSpeed(b, gs) {
  const C = EFC.cfg;
  if (!b.efcState || gs <= 0) return gs;
  if (b.efcState === 'idle') return Math.min(gs, C.wardenIdleSpeed);
  if (b.efcState === 'alert') return Math.min(gs, C.wardenAlertSpeed);
  return gs * C.wardenCombatMul;
}
/* updateBot seam: an idle Warden does not shoulder its weapon (low ready, even holding its spot) */
function efcWardenAds(b, ads) { return b.efcState === 'idle' ? false : ads; }
/* updateBot seam, before the turn: true when the body turns calmly (idle, or just out of idle). Sets b.efcHead (the head's yaw in the body,
   which leads toward the wanted direction) and returns in b.efcFace the yaw the body turns to: it waits EFC.cfg.wardenHeadLead s on a large
   turn, so the head moves first. */
function efcWardenTurn(b, faceYaw, now, dt) {
  const calm = !!b.efcState && (b.efcState === 'idle' || now < b.efcCalmT);
  b.efcFace = faceYaw;
  if (!calm) { b.efcHead = damp(b.efcHead || 0, 0, 8, dt); b.efcTurnT = 0; return false; }
  const want = angDiff(b.lookYaw, faceYaw), a = Math.abs(want);
  if (a < 0.25) b.efcTurnT = 0; else if (!b.efcTurnT) b.efcTurnT = now + EFC.cfg.wardenHeadLead;
  b.efcHead = damp(b.efcHead || 0, clamp(want, -1.2, 1.2), 9, dt);
  if (b.efcTurnT && now < b.efcTurnT) b.efcFace = b.lookYaw;
  return true;
}

/* ---------- Online: the posture of a host's Warden reaches the guests' copy (smallest field: p.wp = [pose, head yaw]) ---------- */
function efcWardenPub(e) { return e.efcPose ? [e.efcPose, Math.round((e.efcHead || 0) * 100) / 100] : undefined; }
function efcWardenNet(e, wp) {
  if (Array.isArray(wp)) { e.efcPose = clamp(wp[0] | 0, 0, 3); e.efcHead = clamp(+wp[1] || 0, -1.5, 1.5); } else { e.efcPose = 0; e.efcHead = 0; }
}

/* ---------- Soldier pose (06b-soldier.js) ---------- */
/* Each frame: the posture weights. S.efcLR low ready (1 idle), S.efcRaise the raise (0 weapon down, 1 up), S.efcHR high ready (alert).
   Raise: smooth over EFC.cfg.wardenRaise; lowering back to idle is slower. Not a posed soldier: all zero, the engine's pose. */
function efcPoseStep(e, S, dt) {
  if (S.efcRaise === undefined) { S.efcRaise = 1; S.efcLR = 0; S.efcHR = 0; S.efcFresh = -1; } // (all three at once, the same object shape for every model)
  const p = e.alive ? e.efcPose || 0 : 0;
  if (!p && !S.efcLR && !S.efcHR) { S.efcRaise = 1; return; }
  const up = p !== EFC_POSE.idle, R = EFC.cfg.wardenRaise;
  if (S.efcFresh !== e.deaths) { S.efcFresh = e.deaths; if (!up) S.efcRaise = 0; } // a new life starts lowered
  S.efcRaise = clamp(S.efcRaise + (up ? dt / R : -dt / (R * 2)), 0, 1);
  const k = smoothstep(0, 1, S.efcRaise);
  S.efcLR = p ? 1 - k : 0;
  S.efcHR = damp(S.efcHR || 0, p === EFC_POSE.alert ? 1 : 0, 6, dt);
}
/* Is the weapon up? idle: never (it is lowered); alert: always (high ready) */
function efcPoseAiming(e, aiming) {
  const p = e.alive ? e.efcPose || 0 : 0;
  if (p === EFC_POSE.idle) return false;
  if (p === EFC_POSE.alert) return !e.sprinting;
  return aiming;
}
/* The aim weight follows the raise: the weapon comes up in an arc over EFC.cfg.wardenRaise */
function efcPoseAw(S, aw) { return S.efcRaise === undefined || S.efcRaise >= 1 ? aw : aw * smoothstep(0, 1, S.efcRaise); }
/* Low ready, blended into the engine's low carry (qB orientation and lowP position, body space): off the shoulder, held in front of the
   belly, muzzle down and forward (less across the body), swinging a little with the stride */
const _efcLrE = new THREE.Euler(0, 0, 0, 'YXZ'), _efcLrQ = new THREE.Quaternion(), _efcLrV = new V3();
function efcPoseLowReady(S, qB, lowP, qT, shc, k, TW, amp) {
  if (!(k > 0)) return;
  const sw = Math.sin(TW) * amp;
  _efcLrE.set(-0.95 + sw * 0.03, 0.18 + sw * 0.04, 0.12); _efcLrQ.setFromEuler(_efcLrE).premultiply(qT);
  qB.slerp(_efcLrQ, k);
  _efcLrV.set(0.06, -0.24 + Math.abs(sw) * 0.01, -0.25).applyQuaternion(qT).add(shc);
  lowP.lerp(_efcLrV, k);
}
