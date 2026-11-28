/* Q2 raid rifles use Partisan geometry with the game's existing model and animation interfaces. */
const EFC_PARTISAN_PROFILES = [
  ['ak74m', 'ak74m', 'ak47', 30, 640, 1],
  ['ak15k', 'ak15k', 'ak47', 30, 690, 1.02],
  ['g3', 'g3', 'scarh', 20, 520, 1.12],
  ['m16', 'm16', 'm4', 20, 735, 0.98],
  ['mk14', 'mk14', 'svd', 20, 400, 1.05],
  ['spear', 'spear', 'scarh', 20, 590, 1.07],
  ['stg44classic', 'stg44', 'stg44', 30, 500, 0.98],
  ['ppsh41', 'ppsh41', 'mp5', 71, 870, 0.92],
  ['bren', 'bren', 'scarh', 30, 490, 1.04],
  ['chauchat', 'chauchat', 'scarh', 20, 270, 1.08],
  ['rpk', 'rpk', 'ak47', 40, 570, 1.04],
  ['spearretro', 'spear-retro', 'scarh', 20, 590, 1.07],
  ['stg44astraa', 'stg44-astra-a', 'stg44', 25, 520, 1],
  ['stg44astrab', 'stg44-astra-b', 'stg44', 25, 520, 1],
];
const EFC_PARTISAN_WEAPON_MODELS = new Map();
const EFC_PARTISAN_NEURO = 'stg44-neuro-bash';
const EFC_PARTISAN_GEOMETRY = new Map();
const EFC_PARTISAN_MATERIALS = new Map();

function efcPartisanBytes(encoded) {
  return Uint8Array.from(atob(encoded), c => c.charCodeAt(0)).buffer;
}
function efcPartisanMaterial(color) {
  if (!EFC_PARTISAN_MATERIALS.has(color)) {
    EFC_PARTISAN_MATERIALS.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.22 }));
  }
  return EFC_PARTISAN_MATERIALS.get(color);
}

function efcPartisanLowGeometry(source) {
  const { array, count } = source.attributes.position, index = source.index.array;
  const remap = new Uint32Array(count), cells = new Map(), positions = [], triangles = [], faces = new Set();
  const cellsPerMeter = 200;
  for (let i = 0, p = 0; i < count; i++, p += 3) {
    const x = array[p], y = array[p + 1], z = array[p + 2];
    const key = [x, y, z].map(value => Math.round(value * cellsPerMeter)).join(',');
    if (!cells.has(key)) {
      cells.set(key, positions.length / 3);
      positions.push(x, y, z);
    }
    remap[i] = cells.get(key);
  }
  for (let i = 0; i < index.length; i += 3) {
    const a = remap[index[i]], b = remap[index[i + 1]], c = remap[index[i + 2]];
    if (a === b || b === c || c === a) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(',');
    if (faces.has(key)) continue;
    faces.add(key);
    triangles.push(a, b, c);
  }
  if (!triangles.length) return source;
  const low = new THREE.BufferGeometry();
  low.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  low.setIndex(triangles);
  low.computeVertexNormals();
  return low;
}

function efcPartisanGeometry(model) {
  if (EFC_PARTISAN_GEOMETRY.has(model)) return EFC_PARTISAN_GEOMETRY.get(model);
  const [min, max] = model.bounds;
  const mount = model.mount;
  const magAt = mount.magazine || [0, min[1] * 0.45, 0];
  const meshes = model.meshes.map(([slot, color, vertices, indices, wide]) => {
    const geometry = new THREE.BufferGeometry();
    const positions = Float32Array.from(new Int16Array(efcPartisanBytes(vertices)), v => v / 10000);
    const IndexArray = wide ? Uint32Array : Uint16Array;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(new IndexArray(efcPartisanBytes(indices)), 1));
    if (slot === 'magazine') geometry.translate(...magAt.map(n => -n));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.userData.efcPartisanLow = efcPartisanLowGeometry;
    return { slot, geometry, material: efcPartisanMaterial(color) };
  });
  const set = { meshes, magAt, min, max };
  EFC_PARTISAN_GEOMETRY.set(model, set);
  return set;
}
function efcPartisanBuild(model, context, template = 'stg44') {
  const { g, info, M, spec, A } = context;
  const { meshes, magAt, min, max } = efcPartisanGeometry(model);
  const { mount } = model, length = max[2] - min[2];
  const sight = mount.optic || [0, max[1] * 0.75, -length * 0.18];
  const muzzle = mount.muzzle || [0, max[1] * 0.42, min[2]];
  const hand = mount.foregrip || [0, max[1] * 0.16, min[2] + length * 0.3];
  const side = mount.side || [min[0], sight[1] * 0.75, hand[2]];
  info.efcPartisanMount = mount;
  const replaced = new Set(Object.values(A).map(key => ATT[key]?.partisan?.slot));
  for (const part of meshes) if (part.slot !== 'magazine' && !replaced.has(part.slot)) {
    g.add(new THREE.Mesh(part.geometry, spec.camo ? M.metal : part.material));
  }
  info.buildMag = (parent, extension) => {
    for (const part of meshes) if (part.slot === 'magazine') {
      const mesh = new THREE.Mesh(part.geometry, spec.camo ? M.dark : part.material);
      mesh.scale.y = extension;
      parent.add(mesh);
    }
  };
  info.magHome.set(...magAt);
  info.magGrip = new V3(0, -0.065, 0);
  info.gripR.set(...(model.grip || [0, min[1] * 0.55, max[2] - length * 0.35]));
  info.gripL.set(...hand);
  info.muzzle.position.set(0, muzzle[1], min[2]);
  info.eject.position.set(max[0], sight[1] * 0.75, sight[2] + 0.05);
  info.butt = [0, sight[1] * 0.66, max[2]];
  efcPartisanViewGrip(info, template);
  efcPartisanIrons(context, model, muzzle, max);
  info.mount.optic = { y: sight[1], z: sight[2], len: 0.13, D: 0.22 };
  info.mount.muzzle = { y: muzzle[1], z: min[2], r: 0.011 };
  info.mount.under = { y: hand[1], z: hand[2], len: 0.09 };
  info.mount.side = { x: side[0], y: side[1], z: side[2] };
}

function efcPartisanViewGrip(info, template) {
  const referenceGrip = gripsFor(template).R;
  const hip = VM_HIP[info.kind] || VM_HIP.rifle;
  const hipRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(hip[3], hip[4], hip[5]));
  info.efcHip = new V3().subVectors(referenceGrip, info.gripR).applyQuaternion(hipRotation);
}

function efcPartisanIrons({ g, M, info, A }, model, muzzle, max) {
  const rear = Math.min(max[2] - 0.12, info.gripR.z - 0.045);
  const front = Math.min(muzzle[2] + 0.095, rear - 0.18);
  const center = model.name.toLowerCase().includes('bren') ? 0.049 : muzzle[0];
  const line = max[1] + 0.016, eyeRelief = info.kind === 'smg' ? 0.135 : 0.19;
  info.sightX = A.optic ? 0 : center;
  info.sightY = line;
  info.adsZ = rear + eyeRelief;
  info.efcIron = { rear, front, center, line };
  if (A.optic) return;
  const irons = new THREE.Group();
  irons.position.x = center;
  g.add(irons);
  const c = { g: irons, M, info };
  const rim = ironRing(c, rear, IRON.hole[info.kind] || IRON.hole.rifle);
  const base = model.mount.optic?.[1] ?? max[1] - 0.035;
  ironFoot(c, M.sight, rear, Math.min(base, rim - 0.008), rim, 0.014);
  const bladeBase = Math.min(muzzle[1] + 0.018, line - 0.014);
  bx(irons, M.sight, 0, (line + bladeBase) / 2, front, ironW(c, front, IRON.post), line - bladeBase, 0.008);
}

for (const [id, source, template, mag, rpm, impact] of EFC_PARTISAN_PROFILES) {
  const model = EFC_PARTISAN_MODELS[source], base = WEAPONS[template];
  EFC_PARTISAN_WEAPON_MODELS.set(id, model);
  const def = {
    ...base, id, key: id, model: id, name: model.name, unlock: undefined, mass: model.weight,
    mag, rpm, reserve: mag * 4, dmg: base.dmg.map(value => Math.round(value * impact)),
    slots: ['optic', 'muzzle', 'under', 'side', 'mag'],
  };
  def.base = def;
  WEAPONS[id] = def;
  WEAPON_ID_BY_NAME[def.name] = id;
  defineGun(id, base.fam, context => efcPartisanBuild(model, context, template));
}
