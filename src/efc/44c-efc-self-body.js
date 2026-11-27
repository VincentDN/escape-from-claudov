/* The first-person body uses the same skinning and pose as the local soldier. */
const EFC_SELF_LEG_BONES = new Set([
  SB.PEL, SB.HPL, SB.HPR,
  SB.THL, SB.KNL, SB.SHL, SB.FTL, SB.TOL, SB.SHHL,
  SB.THR, SB.KNR, SB.SHR, SB.FTR, SB.TOR, SB.SHHR,
]);
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
  mesh.layers.mask = MASK_SCREEN;
  mesh.frustumCulled = false;
  mesh.userData.noPrepass = true;
  mesh.visible = false;
  scene.add(mesh);
  efcSelfLegsMesh = mesh;
  return mesh;
}
