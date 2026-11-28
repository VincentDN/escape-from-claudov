/* Omnimovement starting values. The phase observer does not change movement forces or inputs. */
const EFC_OMNI_TUNING = {
  tactical: EFC_TACTICAL_SPRINT,
  airDive: EFC_DIVE,
  prone: EFC_PRONE,
  crouch: { diveHold: 0.18 },
  sprint: { forward: 1, forwardDiagonal: 0.95, side: 0.9, back: 0.8, tacticalArc: Math.PI / 4 },
  slide: { enter: 0.12, glide: 0.9, exit: 0.15, retainedSpeed: 0.7, retentionTime: 0.6 },
  dive: { anticipation: 0.08, launch: 0.06, flight: 0.5, impact: 0.12, settle: 0.25,
    apex: 0.45, minDistance: 3.5, maxDistance: 4.5, boostedDistance: 5 },
  landing: { backArc: 2 * Math.PI / 3, sideSettle: 0.3 },
  getup: { prone: 0.45, supine: 0.55, fast: 0.35 },
  flight: { airControl: 0.1, bodyTwist: Math.PI / 2, hipSpread: 1.5, aimSpeed: 0.5 },
  camera: { anticipationDrop: 0.06, anticipationPitch: 2, launchFov: 6, launchFovTime: 0.25,
    sideRoll: 12, backPitch: 10, impactDrop: 0.1, slideRoll: 4, slideFov: 4 },
  weapon: { sprintCantMin: 20, sprintCantMax: 30, impactRecovery: 0.2 },
};

function efcOmniTune(group, name) {
  const value = EFC.cfg.omni?.[group]?.[name];
  return Number.isFinite(value) ? value : EFC_OMNI_TUNING[group][name];
}

function efcOmniDirection(entity) {
  const { x, z } = entity.vel;
  if (x === 0 && z === 0) return 0;
  const yaw = entity.yaw, right = x * Math.cos(yaw) - z * Math.sin(yaw);
  const forward = -x * Math.sin(yaw) - z * Math.cos(yaw);
  return Math.atan2(right, forward);
}

function efcOmniPhase(entity) {
  if (!entity?.isPlayer || entity.alive === false || !efcRaidMode()) return null;
  return entity.efcPhase ??= efcOmniPhaseFromState(entity);
}

function efcOmniPhaseFromState(entity) {
  const dive = entity.efcGroundDive;
  if (dive?.phase === 'anticipation') return { move: 'dive', phase: dive.phase, t: 0, dir: dive.dir };
  const move = efcOmniState(entity);
  let phase = 'loop';
  if (move === 'slide') phase = 'enter';
  if (move === 'air' || move === 'dive') phase = dive?.phase === 'launch' ? 'launch' : 'flight';
  const dir = move === 'dive' && dive ? dive.dir : efcOmniDirection(entity);
  return { move, phase, t: 0, dir };
}

function efcOmniPhaseAdvance(entity, dt) {
  const previous = efcOmniPhase(entity);
  if (!previous) return;
  const next = efcOmniPhaseFromState(entity);
  const elapsed = previous.t + dt;
  const grounded = next.move === 'stand' || next.move === 'crouch';
  const flat = next.move === 'prone' || next.move === 'supine' || next.move === 'side';

  if (previous.move === 'dive' && flat) {
    if (previous.phase === 'flight' || previous.phase === 'launch') {
      Object.assign(next, { move: 'dive', phase: 'impact', dir: previous.dir });
    } else if (previous.phase === 'impact' && elapsed >= efcOmniTune('dive', 'impact')) {
      Object.assign(next, { move: 'dive', phase: 'settle', dir: previous.dir });
    } else if (previous.phase !== 'settle' || elapsed < efcOmniTune('dive', 'settle')) {
      Object.assign(next, previous, { t: elapsed });
    }
  } else if (previous.move === 'slide' && grounded) {
    if (previous.phase !== 'exit') Object.assign(next, { move: 'slide', phase: 'exit', dir: previous.dir });
    else if (elapsed < efcOmniTune('slide', 'exit')) Object.assign(next, previous, { t: elapsed });
  } else if (next.move === previous.move) {
    if (next.move === 'slide' && previous.phase === 'enter' && elapsed >= efcOmniTune('slide', 'enter')) {
      Object.assign(next, { phase: 'glide', dir: previous.dir });
    } else if (previous.phase !== 'exit' && (next.move !== 'dive' || next.phase === previous.phase)) {
      Object.assign(next, previous, { t: elapsed });
    }
  }
  entity.efcPhase = next;
}

// The raid tick observes the controller state from the previous simulation step.
efcOn('tick', (dt) => {
  const entity = PL.ent;
  if (!entity) return;
  if (!entity.alive) { entity.efcPhase = null; return; }
  efcOmniPhaseAdvance(entity, dt);
});
efcOn('raid:begin', () => { if (PL.ent) PL.ent.efcPhase = null; });
