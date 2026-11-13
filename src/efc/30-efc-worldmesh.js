/* WORLD meshes: low-poly crate, locker, duffel bag, body bag and pouch built by code, one static merged mesh per container. */
/* Each kind has two merged geometries (full, emptied) with vertex colours, shared by every container of that kind. The emptied look:
   crate and locker open (lid tilted, door swung), bag and body flatter, all darker. Meshes are static (matrixAutoUpdate false). */
const EFC_WM = { meshes: new Map(), geo: {}, mat: null, matEmpty: null };

/* Part list -> one non-indexed BufferGeometry with position, normal and color. part: [geometry, colour hex, matrix]. */
function efcWmMerge(parts) {
  const pos = [], nor = [], col = [], c = new THREE.Color();
  for (const [g0, hex, m] of parts) {
    const g = (g0.index ? g0.toNonIndexed() : g0).applyMatrix4(m);
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    c.setHex(hex);
    for (let i = 0; i < P.length; i += 3) { pos.push(P[i], P[i + 1], P[i + 2]); nor.push(N[i], N[i + 1], N[i + 2]); col.push(c.r, c.g, c.b); }
    g.dispose(); if (g !== g0) g0.dispose();
  }
  const G = new THREE.BufferGeometry();
  G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  G.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  G.computeBoundingSphere();
  return G;
}
/* Matrix from position, Euler rotation (x, y, z) and optional scale */
function efcWmM(x, y, z, rx, ry, rz, s) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
  return m.compose(new THREE.Vector3(x, y, z), q, s ? new THREE.Vector3(s[0], s[1], s[2]) : new THREE.Vector3(1, 1, 1));
}
function efcWmBox(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
function efcWmCyl(r, l, n) { return new THREE.CylinderGeometry(r, r, l, n || 8); }

/* Parts of one kind; open: the emptied variant */
function efcWmParts(kind, open) {
  const P = [];
  if (kind === 'crate') { // wooden box 1.0 x 0.6 x 0.6 with darker slats and a lid
    const wood = 0x8a6a3f, slat = 0x5e4526;
    P.push([efcWmBox(1.0, 0.52, 0.6), wood, efcWmM(0, 0.26, 0)]);
    for (const x of [-0.45, 0.45]) P.push([efcWmBox(0.08, 0.54, 0.62), slat, efcWmM(x, 0.27, 0)]);
    P.push([efcWmBox(1.02, 0.07, 0.62), slat, efcWmM(0, 0.26, 0)]);
    if (open) P.push([efcWmBox(1.04, 0.06, 0.64), wood, efcWmM(0, 0.62, -0.42, -1.2, 0, 0)]);
    else P.push([efcWmBox(1.04, 0.06, 0.64), wood, efcWmM(0, 0.55, 0)]);
  } else if (kind === 'locker') { // tall grey-green metal cabinet with a door handle and vents
    const metal = 0x56635a, dark = 0x2f3732;
    P.push([efcWmBox(0.6, 1.85, 0.5), metal, efcWmM(0, 0.925, 0)]);
    P.push([efcWmBox(0.62, 0.05, 0.52), dark, efcWmM(0, 1.87, 0)]);
    if (open) { // door swung open on its left hinge, cavity shows dark
      P.push([efcWmBox(0.5, 1.7, 0.02), dark, efcWmM(0, 0.93, 0.255)]);
      P.push([efcWmBox(0.56, 1.75, 0.03), metal, efcWmM(-0.3 - 0.2, 0.925, 0.25 + 0.2, 0, -0.9, 0)]);
    } else {
      P.push([efcWmBox(0.56, 1.75, 0.03), metal, efcWmM(0, 0.925, 0.26)]);
      P.push([efcWmBox(0.03, 0.18, 0.04), dark, efcWmM(0.2, 1.0, 0.29)]);
      for (let i = 0; i < 3; i++) P.push([efcWmBox(0.3, 0.025, 0.035), dark, efcWmM(0, 1.6 + i * 0.06, 0.28)]);
    }
  } else if (kind === 'bag') { // olive duffel lying on its side, with two straps
    const cloth = 0x4f5a34, strap = 0x2a2a22, s = open ? [1, 0.6, 1] : null;
    P.push([efcWmCyl(0.2, 0.8, 10), cloth, efcWmM(0, open ? 0.12 : 0.2, 0, 0, 0, Math.PI / 2, s)]);
    for (const x of [-0.2, 0.2]) P.push([efcWmCyl(0.21, 0.05, 10), strap, efcWmM(x, open ? 0.12 : 0.2, 0, 0, 0, Math.PI / 2, s)]);
    if (!open) P.push([efcWmBox(0.4, 0.03, 0.05), strap, efcWmM(0, 0.42, 0)]);
  } else if (kind === 'body') { // dark body bag with a kit bundle at its foot
    const bagC = 0x23262a, kit = 0x4a4f3a;
    P.push([efcWmBox(0.6, open ? 0.12 : 0.26, 1.8), bagC, efcWmM(0, open ? 0.06 : 0.13, 0)]);
    P.push([efcWmBox(0.5, open ? 0.08 : 0.16, 0.5), bagC, efcWmM(0, open ? 0.1 : 0.2, -0.55)]);
    P.push([efcWmBox(0.02, 0.02, 1.4), 0x8f8f86, efcWmM(0.1, open ? 0.13 : 0.27, 0.05)]); // zip
    if (!open) P.push([efcWmBox(0.4, 0.22, 0.3), kit, efcWmM(0.1, 0.11, 1.15, 0, 0.3, 0)]);
  } else { // drop: small khaki pouch with a flap
    const c1 = 0x7a6c46, c2 = 0x564b2f;
    P.push([efcWmBox(0.3, 0.16, 0.22), c1, efcWmM(0, 0.08, 0)]);
    P.push([efcWmBox(0.31, 0.03, 0.14), c2, efcWmM(0, 0.17, 0.05)]);
  }
  return P;
}
function efcWmGeo(kind, open) {
  const k = kind + (open ? ':o' : '');
  return EFC_WM.geo[k] || (EFC_WM.geo[k] = efcWmMerge(efcWmParts(kind, open)));
}
function efcWmMats() {
  if (!EFC_WM.mat) {
    EFC_WM.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    EFC_WM.matEmpty = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, color: 0x8a8a8a });
  }
}

/* Creates or refreshes the mesh of container c (after an add or an item change). */
function efcWorldMeshSet(c) {
  if (typeof scene === 'undefined' || typeof THREE === 'undefined') return;
  efcWmMats();
  const open = !c.items.length;
  let m = EFC_WM.meshes.get(c.id);
  if (m && m.userData.efcOpen === open && m.userData.efcKind === c.kind) return;
  if (!m) {
    m = new THREE.Mesh(efcWmGeo(c.kind, open), open ? EFC_WM.matEmpty : EFC_WM.mat);
    m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = 'efc-container-' + c.id;
    m.position.set(c.x, c.y, c.z); m.rotation.set(0, c.yaw || 0, 0); m.updateMatrix(); m.updateMatrixWorld(true);
    scene.add(m); EFC_WM.meshes.set(c.id, m);
  } else { m.geometry = efcWmGeo(c.kind, open); m.material = open ? EFC_WM.matEmpty : EFC_WM.mat; }
  m.userData.efcOpen = open; m.userData.efcKind = c.kind;
}
function efcWorldMeshDel(id) {
  const m = EFC_WM.meshes.get(id); if (!m) return;
  scene.remove(m); EFC_WM.meshes.delete(id); // geometries and materials are shared and kept
}
function efcWorldMeshClear() { for (const id of Array.from(EFC_WM.meshes.keys())) efcWorldMeshDel(id); }
