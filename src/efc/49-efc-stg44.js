/* The raid GLB is prepared offline. This loader intentionally supports only indexed, uncompressed static meshes with baked transforms. */
let efcStgGeometries = null;

function efcStgLoad() {
  if (efcStgGeometries) return efcStgGeometries;
  const raw = atob(document.querySelector('meta[name="efc-stg44"]').content);
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const header = new DataView(bytes.buffer);
  const jsonLength = header.getUint32(12, true), binary = 28 + jsonLength;
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 ||
      header.getUint32(16, true) !== 0x4e4f534a || header.getUint32(binary - 4, true) !== 0x004e4942) {
    throw new Error('Invalid raid StG 44 model');
  }
  const doc = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  const types = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const read = (id, width) => {
    const accessor = doc.accessors[id], view = doc.bufferViews[accessor.bufferView];
    const Type = types[accessor.componentType];
    if (!Type || accessor.sparse || view.byteStride || view.buffer !== 0) throw new Error('Unsupported raid StG 44 accessor');
    return new Type(bytes.buffer, binary + (view.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * width);
  };
  efcStgGeometries = doc.nodes.flatMap(node => doc.meshes[node.mesh].primitives.map(prim => {
    if (node.matrix || node.translation || node.rotation || node.scale || (prim.mode ?? 4) !== 4) throw new Error('Raid StG 44 transforms must be baked');
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(read(prim.attributes.POSITION, 3).slice(), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(read(prim.attributes.NORMAL, 3).slice(), 3));
    geo.setIndex(new THREE.BufferAttribute(read(prim.indices, 1), 1));
    geo.rotateY(Math.PI / 2);
    if (node.name.startsWith('mag_')) {
      geo.computeBoundingBox();
      const { min, max } = geo.boundingBox, height = node.name === 'mag_40' ? 0.26 : 0.205;
      const scale = height / (max.y - min.y);
      geo.scale(1, scale, 1).translate(0, max.y * (1 - scale) - 0.05, 0.105);
    }
    geo.computeBoundingSphere();
    return { name: node.name, geo };
  }));
  return efcStgGeometries;
}

defineGun('stg44', 'rifle', context => {
  const { g, M, info, A } = context;
  // Use the source body for swaps that need its original mesh groups and sockets.
  if (Object.values(A).some(key => ATT[key]?.partisan)) {
    efcPartisanBuild(EFC_PARTISAN_MODELS[EFC_PARTISAN_NEURO], context);
    return;
  }
  for (const { name, geo } of efcStgLoad()) {
    if (name.startsWith('mag_') || name === 'rear_sight' && A.optic || name === 'muzzle_device' && A.muzzle) continue;
    if (name === 'rail_teeth' && !A.optic || name === 'side_rail' && !A.side) continue;
    const material = ['grip', 'handguard', 'stock_fixed'].includes(name) ? M.olive : M.metal;
    g.add(new THREE.Mesh(geo, material));
  }
  info.buildMag = parent => {
    for (const { name, geo } of efcStgLoad()) if (name === (A.mag === 'stg40' ? 'mag_40' : 'mag_25')) parent.add(new THREE.Mesh(geo, M.dark));
  };
  info.magHome.set(0, 0.05, -0.105);
  info.magGrip = new V3(0, -0.085, 0);
  info.muzzle.position.set(0, 0.05, -0.6);
  info.mount.optic = { y: 0.126, z: -0.2, len: 0.14, D: 0.22 };
  info.mount.under = { y: 0.033, z: -0.24, len: 0.07 };
  info.mount.side = { x: -0.028, y: 0.054, z: -0.32 };
  info.mount.muzzle = { y: 0.05, z: -0.554, r: 0.012 };
  info.eject.position.set(0.035, 0.075, -0.04);
  info.sightY = 0.128; info.adsZ = 0.012;
  info.butt = [0, 0.05, 0.36];
  info.gripR.set(0, -0.035, 0.063); info.gripL.set(0, 0.025, -0.31);
  info.gripDef = {
    R: [{ c: [0, -0.03, 0.063], h: [0.017, 0.05, 0.036], r: 0.011, rx: -0.36 }],
    L: [{ c: [0, 0.047, -0.31], h: [0.026, 0.024, 0.09], r: 0.01 }],
  };
  info.trigDef = { at: [0.004, 0.015, -0.002], xTip: -0.005, guard: [] };
});
