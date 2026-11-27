/* C9b low first-person holds. Offsets are in view space, before the existing hand solver. */
const EFC_PRONE_VIEW = [-0.025, -0.032, -0.100, -0.035, -0.05, 0.09];
const EFC_SUPINE_VIEW = [-0.065, 0.018, -0.140, 0.10, 0.64, 0.27];

function efcOmniViewPose(entity, offsets, dt) {
  if (!entity.isPlayer || !efcRaidMode()) {
    offsets.fill(0);
    return;
  }
  const prone = entity.onGround && entity.efcProne;
  if (!prone && !offsets.some(Boolean)) return;
  const turn = entity.efcProneTurn;
  const pose = turn?.onBack ? EFC_SUPINE_VIEW : EFC_PRONE_VIEW;
  const side = turn?.side || 0;
  // Face the body when prone and the opposite direction when holding across the chest.
  const bearing = (turn?.bodyYaw ?? entity.yaw) - entity.yaw + (turn?.onBack ? Math.PI : 0);
  const yawOffset = clamp(Math.atan2(Math.sin(bearing), Math.cos(bearing)), -0.45, 0.45) * 0.35;
  const sideX = side * 0.045, sideYaw = side * -0.12, sideRoll = side * 0.38;
  const target = [
    pose[0] + sideX, pose[1] - Math.abs(side) * 0.01, pose[2], pose[3],
    pose[4] + yawOffset + sideYaw, pose[5] + sideRoll,
  ];
  for (let i = 0; i < offsets.length; i++) {
    const value = prone ? target[i] : 0;
    const next = damp(offsets[i], value, 14, dt);
    offsets[i] = Math.abs(next - value) < 1e-4 ? value : next;
  }
}
