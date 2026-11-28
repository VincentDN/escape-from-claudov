/* Hideout poses use the game's original soldier, equipped model and two-bone arm solver. */
const EFC_OPERATOR_IDLE = [
  { duration: 5, gun: [0.06, -0.12, -0.23], angle: [-0.55, -0.9, 0.23], hands: [[-0.09, -0.09, -0.26], [0.05, -0.08, -0.27]], grip: [1, 1] },
  { duration: 5, gun: [0.29, -0.28, -0.04], angle: [-1.43, 0.05, -0.09], hands: [[-0.26, -0.34, -0.04], [0.28, -0.31, -0.05]], grip: [0, 1] },
  { duration: 4, gun: [0.21, -0.20, -0.15], angle: [-1.16, -0.3, 0.16], hands: [[-0.10, 0.03, -0.29], [0.12, 0.08, -0.26]], grip: [0, 0] },
];

function efcOperatorIdle(model, seconds) {
  let time = seconds % 14;
  let index = 0;
  while (time >= EFC_OPERATOR_IDLE[index].duration) time -= EFC_OPERATOR_IDLE[index++].duration;
  const a = EFC_OPERATOR_IDLE[index], b = EFC_OPERATOR_IDLE[(index + 1) % EFC_OPERATOR_IDLE.length];
  const mix = smoothstep(a.duration - 1.15, a.duration, time);
  const joints = model.J, chest = joints[J_CHE];
  const breath = Math.sin(seconds * 2.1) * 0.009, sway = Math.sin(seconds * 1.1) * 0.014;
  for (const j of [J_CHE, J_HEAD, J_SHL, J_SHR]) { joints[j].x += sway; joints[j].y += breath; }
  model.headQ.setFromEuler(new THREE.Euler(-0.05 + breath * 2, Math.sin(seconds * 0.75) * 0.17, sway * 3));
  const vector = (p, q) => new V3(...p).lerp(new V3(...q), mix);
  model.gun.position.copy(vector(a.gun, b.gun)).add(chest);
  const angle = vector(a.angle, b.angle);
  model.gun.quaternion.setFromEuler(new THREE.Euler(angle.x + breath, angle.y, angle.z + sway));
  const frames = soldierHandFrames(model);
  for (const [i, side] of [-1, 1].entries()) {
    const arm = SIDE_B(side), frame = frames[i], q = model.gun.quaternion;
    const grip = (i ? model.grips.R : model.grips.L).clone().applyQuaternion(q).add(model.gun.position);
    const hand = new V3(0, 0, WRIST_OFF).sub(frame.off).applyQuaternion(frame.q).applyQuaternion(q).add(grip);
    const target = vector(a.hands[i], b.hands[i]).add(chest);
    if (model.gun.visible) target.lerp(hand, lerp(a.grip[i], b.grip[i], mix));
    const pole = joints[arm.jSh].clone().add(new V3(side * 0.32, -0.4, 0.12));
    ik2(joints[arm.jSh], target, SD.ua, SD.fa, pole, joints[arm.jEl], joints[arm.jHa]);
  }
}
