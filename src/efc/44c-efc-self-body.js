/* The first-person body uses the same skinning and pose as the local soldier. */
const EFC_SELF_LEG_BONES = new Set([
  SB.PEL, SB.HPL, SB.HPR,
  SB.THL, SB.KNL, SB.SHL, SB.FTL, SB.TOL, SB.SHHL,
  SB.THR, SB.KNR, SB.SHR, SB.FTR, SB.TOR, SB.SHHR,
]);
const EFC_SELF_LEGS = { back: 0.14, crouchedBack: 0.10, downBack: 0.08, maxDown: Math.PI / 3, minCameraDistance: 0.25 };
const EFC_SELF_LEGS_PELVIS = new V3();
let efcSelfLegsMesh = null;

function efcSelfLegsBuild(model, skin) {
  if (efcSelfLegsMesh) return efcSelfLegsMesh;
  const source = soldierGeometry(skin, 'lo');
  const joints = source.attributes.skinIndex.array, weights = source.attributes.skinWeight.array;
  const lowerBody = new Uint8Array(source.attributes.position.count);
  for (let vertex = 0; vertex < lowerBody.length; vertex++) {
    let lowerWeight = 0;
    for (let influence = vertex * 4; influence < vertex * 4 + 4; influence++) {
      if (EFC_SELF_LEG_BONES.has(joints[influence])) lowerWeight += weights[influence];
    }
    lowerBody[vertex] = lowerWeight > 0.5;
  }
  const index = source.index.array, legs = [];
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i], b = index[i + 1], c = index[i + 2];
    if (lowerBody[a] && lowerBody[b] && lowerBody[c]) legs.push(a, b, c);
  }

  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute);
  geometry.setIndex(legs);
  const mesh = new THREE.SkinnedMesh(geometry, soldierMaterial(skin, model.lod.rel));
  mesh.bind(model.lod.lo.skeleton, model.lod.lo.bindMatrix);
  mesh.bindMode = 'detached'; // The shared bones stay in world space while this mesh is shifted.
  mesh.layers.mask = MASK_SCREEN;
  mesh.frustumCulled = false;
  mesh.userData.noPrepass = true;
  mesh.visible = false;
  scene.add(mesh);
  efcSelfLegsMesh = mesh;
  return mesh;
}

function efcSelfLegsHide() {
  if (efcSelfLegsMesh) efcSelfLegsMesh.visible = false;
}

function efcSelfLegsTick(e) {
  if (!e.isPlayer || !e.alive || e.out || !efcRaidLive() || KC.active || !VM.root.visible) {
    efcSelfLegsHide();
    return;
  }
  const mesh = efcSelfLegsBuild(e.model, e.model.lod.skin);
  const down = clamp(-camera.rotation.x / EFC_SELF_LEGS.maxDown, 0, 1);
  const back = lerp(EFC_SELF_LEGS.back, EFC_SELF_LEGS.crouchedBack, e.crouchAmt || 0) + EFC_SELF_LEGS.downBack * down;
  const bodyYaw = e.efcProneTurn?.bodyYaw ?? e.yaw;
  mesh.position.set(Math.sin(bodyYaw) * back, 0, Math.cos(bodyYaw) * back);
  const pelvis = e.model.P.pelvis.getWorldPosition(EFC_SELF_LEGS_PELVIS).add(mesh.position);
  mesh.visible = camera.position.distanceToSquared(pelvis) >= EFC_SELF_LEGS.minCameraDistance ** 2;
}

efcOn('died', (victim) => { if (victim === PL.ent) efcSelfLegsHide(); });
efcOn('raid:over', efcSelfLegsHide);
efcOn('match:left', efcSelfLegsHide);
