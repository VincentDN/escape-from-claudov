/* First-person treatment uses the standard sleeves, gloves and arm rig. */
let efcBandageRig = null;
const EFC_BANDAGE_STEPS = 72;
const EFC_BANDAGE_TURNS = 3;

function efcBandageFit(angle, out, radius, offset = 0) {
  return out.set(Math.sin(angle) * radius, Math.cos(angle) * radius, 0.06 + angle * 0.004 + offset);
}

function efcBandageCreate() {
  const group = new THREE.Group(), wrap = new THREE.Group();
  VM.root.add(group);
  group.add(wrap);
  const cloth = new THREE.MeshStandardMaterial({ color: 0xe8ddc1, roughness: 1, side: THREE.DoubleSide });
  const shadedCloth = new THREE.MeshStandardMaterial({ color: 0xb8a88a, roughness: 1 });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.035, 24), [cloth, shadedCloth, shadedCloth]);
  roll.rotation.x = Math.PI / 2;
  wrap.add(roll);
  const position = [], index = [], edge = new V3();
  for (let i = 0; i <= EFC_BANDAGE_STEPS; i++) {
    const angle = i / EFC_BANDAGE_STEPS * EFC_BANDAGE_TURNS * 2 * Math.PI;
    for (const offset of [-0.018, 0.018]) {
      efcBandageFit(angle, edge, 0.045 + i * 0.00015, offset);
      position.push(edge.x, edge.y, edge.z);
    }
    if (i > 0) index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2, i * 2 - 1, i * 2 + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  wrap.add(new THREE.Mesh(geometry, cloth));
  const M = gunMaterials();
  return { group, wrap, roll, geometry, left: makeArm(M, group, 1), right: makeArm(M, group, -1),
    leftShoulder: new V3(-0.20, -0.24, 0.2), leftElbowPole: new V3(-0.52, -0.40, -0.33), leftWrist: new V3(0.085, -0.18, -0.46),
    rightShoulder: new V3(0.20, -0.24, 0.2), rightElbowPole: new V3(0.5, -0.46, -0.34), rightWrist: new V3() };
}

function efcBandageHide() {
  if (efcBandageRig) efcBandageRig.group.visible = false;
}

function efcBandageUpdate() {
  if (!efcMedHolding()) return;
  const rig = efcBandageRig || (efcBandageRig = efcBandageCreate());
  const p = clamp(efcMedCur.t / efcMedCur.time, 0, 1);
  const armRise = env(p, 0, 0.14, 0.9, 1);
  const winding = smoothstep(0.14, 0.88, p);
  const angle = winding * EFC_BANDAGE_TURNS * 2 * Math.PI;
  rig.group.visible = true;
  rig.group.position.set(-0.14, 0.08 - 0.35 * (1 - armRise), 0);
  VM.holder.visible = false;
  VM.knifeRig.visible = false;
  placeArm(rig.left, rig.leftShoulder, rig.leftWrist, 0.34, 0.33, rig.leftElbowPole, 0.05, 0.043, -0.5, 0.12);
  rig.left.hand.userData.set('relaxed');
  rig.wrap.position.copy(rig.left.bones.wr.position);
  rig.wrap.quaternion.copy(rig.left.bones.wr.quaternion);
  rig.geometry.setDrawRange(0, Math.floor(winding * EFC_BANDAGE_STEPS) * 6);
  efcBandageFit(angle, rig.roll.position, 0.067);
  efcBandageFit(angle, rig.rightWrist, 0.095);
  rig.rightWrist.applyQuaternion(rig.wrap.quaternion).add(rig.wrap.position);
  rig.rightWrist.x += 0.085;
  rig.rightWrist.y -= 0.16 * (1 - armRise);
  placeArm(rig.right, rig.rightShoulder, rig.rightWrist, 0.34, 0.33, rig.rightElbowPole, 0.05, 0.043, 0.8 * Math.cos(angle), 0.2);
  rig.right.hand.userData.set('grip');
}
