/* Escape From Claudov thumbnails: small code-built props for every item that is not a weapon (armour, packs, ammunition, medical,
   valuables), drawn by 52-efc-thumbs.js with the same studio light as the guns. Each prop faces +z (the camera looks from the front
   right, above) and is 50 to 300 triangles. efcThumbProp(def) -> THREE.Group (geometries are the caller's to dispose). */
const EFC_TP_MATS = {};
/* Shared materials by colour, roughness and metalness (never disposed: a few dozen at most) */
function efcTpMat(hex, rough, metal, two) {
  const r = rough == null ? 0.7 : rough, m = metal || 0, k = hex + ':' + r + ':' + m + (two ? ':2' : '');
  return EFC_TP_MATS[k] || (EFC_TP_MATS[k] = new THREE.MeshStandardMaterial({ color: hex, roughness: r, metalness: m, side: two ? THREE.DoubleSide : THREE.FrontSide }));
}
function efcTpAdd(g, geo, mat, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0);
  g.add(m); return m;
}
function efcTpBox(g, w, h, d, mat, x, y, z, rx, ry, rz) { return efcTpAdd(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz); }
function efcTpCyl(g, r0, r1, h, seg, mat, x, y, z, rx, ry, rz, open) {
  return efcTpAdd(g, new THREE.CylinderGeometry(r0, r1, h, seg, 1, !!open), mat, x, y, z, rx, ry, rz);
}
function efcTpTorus(g, R, r, rs, ts, mat, x, y, z, rx, ry, rz, arc) {
  return efcTpAdd(g, new THREE.TorusGeometry(R, r, rs, ts, arc || Math.PI * 2), mat, x, y, z, rx, ry, rz);
}
const EFC_TP_HALF = Math.PI / 2;

/* Ammunition: a carton with the family's colour band and label, and two loose rounds in front */
const EFC_TP_AMMO = {
  rifle: { band: 0x5f8a3a, r: 0.045, len: 0.26, tip: 0.09, tipC: 0xb87333 },
  smg: { band: 0x3a6ab0, r: 0.042, len: 0.14, tip: 0.05, tipC: 0xb87333 },
  sniper: { band: 0xb0342c, r: 0.055, len: 0.36, tip: 0.13, tipC: 0x9a5a2a },
  shotgun: { band: 0xd8801e, r: 0.075, len: 0.26, tip: 0, tipC: 0xb02a22 },
  pistol: { band: 0xd8c23a, r: 0.05, len: 0.11, tip: 0.05, tipC: 0x8c8c8c },
};
function efcTpAmmo(g, fam) {
  const A = EFC_TP_AMMO[fam] || EFC_TP_AMMO.rifle, card = efcTpMat(0x9a8458, 0.85), brass = efcTpMat(0xc8a048, 0.35, 0.8);
  efcTpBox(g, 0.9, 0.5, 0.55, card, 0, 0.25, -0.15);
  efcTpBox(g, 0.92, 0.14, 0.57, efcTpMat(A.band, 0.6), 0, 0.33, -0.15);
  efcTpBox(g, 0.4, 0.12, 0.01, efcTpMat(0xe8e2d0, 0.8), -0.12, 0.14, 0.13);
  for (const [x, z, ry] of [[-0.22, 0.32, 0.5], [0.24, 0.3, -0.25]]) {
    const r = new THREE.Group(); g.add(r); r.position.set(x, A.r, z); r.rotation.set(0, ry, EFC_TP_HALF);
    if (fam === 'shotgun') { // shell: plastic hull on a brass head
      efcTpCyl(r, A.r, A.r, A.len * 0.7, 10, efcTpMat(A.tipC, 0.5), 0, A.len * 0.15, 0);
      efcTpCyl(r, A.r * 1.05, A.r * 1.05, A.len * 0.3, 10, brass, 0, -A.len * 0.35, 0);
    } else {
      efcTpCyl(r, A.r, A.r, A.len, 8, brass, 0, 0, 0);
      efcTpCyl(r, 0.004, A.r * 0.95, A.tip, 8, efcTpMat(A.tipC, 0.4, 0.6), 0, A.len / 2 + A.tip / 2, 0);
    }
  }
}

/* Armour by tier: quilted work vest, plate carrier with pouches, steel cuirass with gorget */
function efcTpArmor(g, tier) {
  if (tier <= 1) {
    // quilted work vest: two front panels with a V neck and an open zip, armholes, shoulder straps, quilting seams
    const cloth = efcTpMat(0x8f7a52, 0.9), seam = efcTpMat(0x5e4c30, 0.9), zip = efcTpMat(0x2a2a26, 0.6);
    efcTpBox(g, 0.86, 1.0, 0.06, efcTpMat(0x6e5c3c, 0.9), 0, 0.02, -0.22); // back, seen through the neck and armholes
    for (const s of [-1, 1]) {
      efcTpBox(g, 0.4, 0.66, 0.08, cloth, s * 0.215, -0.15, 0.02);
      efcTpBox(g, 0.17, 0.42, 0.08, cloth, s * 0.31, 0.38, 0.0, 0, 0, s * 0.32); // upper panel narrowing to the shoulder: V neck
      efcTpBox(g, 0.15, 0.06, 0.26, cloth, s * 0.36, 0.56, -0.1); // over the shoulder to the back
      for (const y of [-0.36, -0.15, 0.06]) efcTpBox(g, 0.4, 0.018, 0.01, seam, s * 0.215, y, 0.065);
      efcTpBox(g, 0.2, 0.16, 0.03, seam, s * 0.22, -0.3, 0.075); // pocket
    }
    efcTpBox(g, 0.02, 0.66, 0.02, zip, 0, -0.15, 0.065);
  } else if (tier === 2) {
    const nyl = efcTpMat(0x4f5634, 0.85), dark = efcTpMat(0x2c3020, 0.8), tag = efcTpMat(0xc89a2a, 0.6);
    efcTpBox(g, 0.7, 0.8, 0.12, nyl, 0, 0.05, 0.08);
    efcTpBox(g, 0.72, 0.84, 0.1, nyl, 0, 0.05, -0.3);
    efcTpBox(g, 0.8, 0.26, 0.42, dark, 0, -0.22, -0.11); // cummerbund
    for (const s of [-1, 1]) efcTpBox(g, 0.12, 0.08, 0.5, nyl, s * 0.24, 0.5, -0.11); // shoulder straps
    for (const x of [-0.21, 0, 0.21]) { efcTpBox(g, 0.18, 0.28, 0.1, nyl, x, -0.12, 0.19); efcTpBox(g, 0.14, 0.06, 0.04, dark, x, 0.04, 0.2); }
    efcTpBox(g, 0.36, 0.16, 0.05, dark, 0, 0.27, 0.16);
    efcTpBox(g, 0.12, 0.06, 0.01, tag, -0.08, 0.28, 0.19);
  } else {
    const steel = efcTpMat(0x8a9198, 0.32, 0.75, true), leather = efcTpMat(0x5a3820, 0.7), rivet = efcTpMat(0xc8a048, 0.35, 0.8);
    // breastplate and backplate: two open arcs of a tapered cylinder
    efcTpAdd(g, new THREE.CylinderGeometry(0.42, 0.36, 0.95, 10, 1, true, -1.25, 2.5), steel, 0, 0, -0.12);
    efcTpAdd(g, new THREE.CylinderGeometry(0.42, 0.36, 0.95, 10, 1, true, 1.9, 2.5), efcTpMat(0x6c737a, 0.38, 0.7, true), 0, 0, -0.12);
    efcTpTorus(g, 0.22, 0.05, 4, 10, steel, 0, 0.5, -0.12, EFC_TP_HALF, 0, 0); // gorget
    for (const s of [-1, 1]) {
      efcTpAdd(g, new THREE.CylinderGeometry(0.16, 0.2, 0.22, 8, 1, true, 0, Math.PI), steel, s * 0.38, 0.42, -0.12, 0, s > 0 ? -EFC_TP_HALF : EFC_TP_HALF, s * 0.5);
      efcTpBox(g, 0.06, 0.6, 0.04, leather, s * 0.3, -0.05, 0.3, 0.05, -s * 0.35, 0);
    }
    efcTpBox(g, 0.86, 0.08, 0.06, leather, 0, -0.35, 0.3);
    for (const x of [-0.18, 0, 0.18]) efcTpCyl(g, 0.025, 0.025, 0.02, 6, rivet, x, 0.36, 0.3, EFC_TP_HALF, 0, 0);
  }
}

/* Packs: canvas satchel, oilskin rucksack, rigger frame pack */
function efcTpPack(g, id) {
  if (id === 'pack_s') {
    const can = efcTpMat(0xa08c5c, 0.9), dk = efcTpMat(0x6a5634, 0.85), buc = efcTpMat(0xb0b0a8, 0.35, 0.8);
    efcTpBox(g, 0.9, 0.62, 0.26, can, 0, 0, 0);
    efcTpBox(g, 0.92, 0.36, 0.04, dk, 0, 0.14, 0.14, -0.06, 0, 0); // flap
    for (const x of [-0.24, 0.24]) { efcTpBox(g, 0.07, 0.3, 0.02, dk, x, -0.1, 0.165); efcTpBox(g, 0.1, 0.06, 0.03, buc, x, -0.16, 0.175); }
    efcTpTorus(g, 0.44, 0.03, 3, 12, dk, 0, 0.3, 0, 0, 0, 0, Math.PI); // shoulder strap
  } else if (id === 'pack_m') {
    const oil = efcTpMat(0x4c5032, 0.42), dk = efcTpMat(0x2e3020, 0.6), leather = efcTpMat(0x6a4224, 0.6);
    efcTpBox(g, 0.7, 0.8, 0.42, oil, 0, 0, 0);
    efcTpCyl(g, 0.21, 0.21, 0.7, 10, oil, 0, 0.4, 0, 0, 0, EFC_TP_HALF);
    efcTpBox(g, 0.74, 0.08, 0.5, dk, 0, 0.58, 0.02, 0.1, 0, 0); // top flap
    efcTpBox(g, 0.5, 0.36, 0.12, oil, 0, -0.14, 0.26); // front pocket
    for (const s of [-1, 1]) { efcTpBox(g, 0.12, 0.42, 0.22, oil, s * 0.41, -0.12, 0); efcTpBox(g, 0.06, 0.5, 0.03, leather, s * 0.16, 0.2, 0.33, -0.2, 0, 0); }
  } else {
    const can = efcTpMat(0x8a5a2c, 0.85), tube = efcTpMat(0x9aa0a6, 0.3, 0.8), roll = efcTpMat(0x48563a, 0.9), dk = efcTpMat(0x3a2a18, 0.8);
    efcTpBox(g, 0.66, 1.0, 0.42, can, 0, 0, 0.02);
    efcTpBox(g, 0.5, 0.4, 0.1, can, 0, -0.18, 0.27);
    for (const x of [-0.36, 0.36]) efcTpCyl(g, 0.025, 0.025, 1.5, 6, tube, x, 0.05, -0.24);
    for (const y of [-0.6, 0.66]) efcTpCyl(g, 0.025, 0.025, 0.74, 6, tube, 0, y, -0.24, 0, 0, EFC_TP_HALF);
    efcTpCyl(g, 0.15, 0.15, 0.8, 10, roll, 0, 0.66, 0.02, 0, 0, EFC_TP_HALF); // bedroll on top
    for (const x of [-0.22, 0.22]) efcTpBox(g, 0.05, 0.32, 0.34, dk, x, 0.66, 0.02);
  }
}

function efcTpMed(g, id) {
  if (id === 'med_bandage') {
    const gauze = efcTpMat(0xe6e0d0, 0.95);
    efcTpCyl(g, 0.34, 0.34, 0.5, 16, gauze, 0, 0.34, 0, 0, 0, EFC_TP_HALF);
    efcTpCyl(g, 0.1, 0.1, 0.51, 8, efcTpMat(0x9a9488, 0.9), 0, 0.34, 0, 0, 0, EFC_TP_HALF);
    efcTpBox(g, 0.48, 0.01, 0.6, gauze, 0, 0.005, 0.42); // unrolled tail
    efcTpBox(g, 0.5, 0.02, 0.1, efcTpMat(0x3a6a3a, 0.8), 0, 0.68, 0, 0, 0, 0); // paper band
  } else {
    const red = efcTpMat(0x9a2420, 0.75), wh = efcTpMat(0xeeeae0, 0.7), dk = efcTpMat(0x2a2a2a, 0.7);
    efcTpBox(g, 0.95, 0.6, 0.32, red, 0, 0, 0);
    efcTpBox(g, 0.97, 0.05, 0.34, dk, 0, 0.18, 0); // zip
    efcTpBox(g, 0.32, 0.09, 0.02, wh, 0, -0.04, 0.165); efcTpBox(g, 0.09, 0.32, 0.02, wh, 0, -0.04, 0.165);
    efcTpTorus(g, 0.14, 0.025, 3, 8, dk, 0, 0.3, 0, 0, 0, 0, Math.PI); // handle
  }
}

/* The thirteen valuables */
function efcTpLoot(g, id) {
  const brass = efcTpMat(0xc09040, 0.32, 0.85), steel = efcTpMat(0x9aa2a8, 0.3, 0.8), iron = efcTpMat(0x3a3e3c, 0.55, 0.6);
  const paper = efcTpMat(0xe4dcc4, 0.9), wood = efcTpMat(0x6a3e22, 0.55);
  switch (id) {
    case 'loot_tobacco':
      efcTpCyl(g, 0.5, 0.5, 0.16, 20, efcTpMat(0xa8acb0, 0.35, 0.8), 0, 0.08, 0);
      efcTpCyl(g, 0.52, 0.52, 0.07, 20, efcTpMat(0x7a2a1e, 0.4, 0.3), 0, 0.19, 0);
      efcTpCyl(g, 0.3, 0.3, 0.01, 12, efcTpMat(0xd8b04a, 0.4, 0.6), 0, 0.23, 0);
      break;
    case 'loot_wrench': {
      const can = efcTpMat(0x6a6a48, 0.9);
      efcTpBox(g, 1.0, 0.03, 0.62, can, 0, 0.015, 0.05);
      efcTpCyl(g, 0.16, 0.16, 1.0, 10, can, 0, 0.16, -0.36, 0, 0, EFC_TP_HALF);
      for (let i = 0; i < 4; i++) {
        const x = -0.36 + i * 0.24, s = 0.05 + i * 0.012;
        efcTpBox(g, 0.06, 0.03, 0.44, steel, x, 0.05, 0.08);
        efcTpCyl(g, s, s, 0.1, 8, steel, x, 0.06 + s * 0.5, 0.32, EFC_TP_HALF, 0, 0);
      }
      break;
    }
    case 'loot_bearing': {
      const ring = (r0, r1, h, y, mat) => {
        efcTpCyl(g, r1, r1, h, 18, mat, 0, y, 0, 0, 0, 0, true);
        efcTpCyl(g, r0, r0, h, 18, mat, 0, y, 0, 0, 0, 0, true);
        efcTpAdd(g, new THREE.RingGeometry(r0, r1, 18, 1), mat, 0, y + h / 2, 0, -EFC_TP_HALF, 0, 0);
      };
      ring(0.58, 0.8, 0.2, 0.1, efcTpMat(0x9aa2a8, 0.3, 0.8, true));
      ring(0.38, 0.56, 0.24, 0.12, efcTpMat(0x6e767c, 0.4, 0.75, true));
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; efcTpCyl(g, 0.035, 0.035, 0.04, 5, iron, Math.cos(a) * 0.69, 0.22, Math.sin(a) * 0.69); }
      break;
    }
    case 'loot_gauge':
      efcTpCyl(g, 0.5, 0.5, 0.16, 20, brass, 0, 0.62, 0, EFC_TP_HALF, 0, 0);
      efcTpAdd(g, new THREE.CircleGeometry(0.43, 20), efcTpMat(0xf0ead8, 0.6), 0, 0.62, 0.082);
      efcTpBox(g, 0.36, 0.035, 0.01, efcTpMat(0xb02a22, 0.5), 0.1, 0.68, 0.09, 0, 0, 0.5);
      efcTpCyl(g, 0.04, 0.04, 0.02, 6, iron, 0, 0.62, 0.09, EFC_TP_HALF, 0, 0);
      for (let i = 0; i < 5; i++) { const a = -0.6 + i * 0.95; efcTpBox(g, 0.012, 0.07, 0.006, iron, Math.sin(a) * 0.34, 0.62 + Math.cos(a) * 0.34, 0.086, 0, 0, -a); }
      efcTpCyl(g, 0.07, 0.07, 0.24, 8, brass, 0, 0.04, 0);
      efcTpCyl(g, 0.11, 0.11, 0.08, 6, brass, 0, 0.15, 0);
      break;
    case 'loot_coil': {
      const cu = efcTpMat(0xc06a34, 0.3, 0.85), fl = efcTpMat(0x2a2622, 0.6);
      efcTpCyl(g, 0.38, 0.38, 0.62, 16, cu, 0, 0.45, 0);
      for (const y of [0.12, 0.78]) efcTpCyl(g, 0.48, 0.48, 0.06, 16, fl, 0, y, 0);
      efcTpCyl(g, 0.12, 0.12, 0.08, 8, fl, 0, 0.84, 0);
      for (const x of [-0.12, 0.12]) efcTpBox(g, 0.025, 0.025, 0.5, cu, x, 0.16, 0.6, 0, 0, 0);
      break;
    }
    case 'loot_valves': {
      const card = efcTpMat(0xa88a50, 0.85), glass = efcTpMat(0xb8c4c8, 0.12, 0.3), base = efcTpMat(0x1e1e1e, 0.6);
      efcTpBox(g, 0.9, 0.04, 0.5, card, 0, 0.02, 0);
      for (const s of [-1, 1]) { efcTpBox(g, 0.9, 0.24, 0.03, card, 0, 0.14, s * 0.25); efcTpBox(g, 0.03, 0.24, 0.5, card, s * 0.45, 0.14, 0); }
      efcTpBox(g, 0.9, 0.02, 0.5, efcTpMat(0x8a6c3a, 0.85), 0, 0.5, -0.45, -1.2, 0, 0); // open lid
      for (const x of [-0.27, 0, 0.27]) { efcTpCyl(g, 0.09, 0.09, 0.12, 7, base, x, 0.08, 0.02); efcTpCyl(g, 0.075, 0.08, 0.34, 7, glass, x, 0.31, 0.02); }
      break;
    }
    case 'loot_board': {
      const pcb = efcTpMat(0x2e6a3a, 0.6), rel = efcTpMat(0x2a2c30, 0.55), cap = efcTpMat(0x3a5aa0, 0.5);
      efcTpBox(g, 1.2, 0.04, 0.78, pcb, 0, 0.02, 0);
      for (const x of [-0.36, -0.08]) for (const z of [-0.16, 0.16]) efcTpBox(g, 0.2, 0.18, 0.22, rel, x, 0.13, z);
      for (const [x, z] of [[0.22, -0.2], [0.34, -0.2], [0.22, 0.05], [0.34, 0.05]]) efcTpBox(g, 0.07, 0.1, 0.07, cap, x, 0.09, z);
      efcTpBox(g, 0.3, 0.05, 0.12, efcTpMat(0x1a1a1a, 0.6), 0.28, 0.06, 0.24);
      efcTpBox(g, 0.9, 0.012, 0.06, efcTpMat(0xd4aa40, 0.3, 0.9), 0, 0.046, 0.36); // edge connector
      break;
    }
    case 'loot_ledger': {
      const cov = efcTpMat(0x3e1410, 0.55);
      efcTpBox(g, 0.78, 0.03, 1.0, cov, 0, 0.015, 0); efcTpBox(g, 0.78, 0.03, 1.0, cov, 0, 0.245, 0);
      efcTpBox(g, 0.05, 0.26, 1.0, cov, -0.39, 0.13, 0);
      efcTpBox(g, 0.74, 0.2, 0.96, paper, 0.0, 0.13, 0);
      for (const z of [-0.3, 0.3]) efcTpBox(g, 0.06, 0.27, 0.05, brass, -0.39, 0.13, z);
      efcTpBox(g, 0.3, 0.005, 0.2, efcTpMat(0xd8c890, 0.6), 0.05, 0.262, 0.05);
      break;
    }
    case 'loot_stamp': {
      const cast = efcTpMat(0x2c3a32, 0.5, 0.5);
      efcTpBox(g, 0.9, 0.1, 0.6, cast, 0, 0.05, 0);
      efcTpBox(g, 0.12, 0.7, 0.16, cast, -0.34, 0.45, 0);
      efcTpBox(g, 0.6, 0.12, 0.16, cast, -0.08, 0.78, 0);
      efcTpCyl(g, 0.06, 0.06, 0.4, 8, steel, 0.12, 0.54, 0);
      efcTpCyl(g, 0.18, 0.18, 0.08, 12, brass, 0.12, 0.3, 0);
      efcTpCyl(g, 0.2, 0.2, 0.04, 12, brass, 0.12, 0.12, 0);
      efcTpCyl(g, 0.03, 0.03, 0.6, 6, steel, 0.4, 0.9, 0, 0, 0, -0.9);
      efcTpAdd(g, new THREE.SphereGeometry(0.07, 8, 6), efcTpMat(0x1a1a1a, 0.4), 0.64, 1.07, 0);
      break;
    }
    case 'loot_keys': {
      efcTpTorus(g, 0.32, 0.025, 3, 14, steel, 0, 0.03, -0.1, EFC_TP_HALF, 0, 0);
      [[-0.32, 0.5, brass], [0, 0.66, iron], [0.3, 0.4, brass]].forEach(([x, len, m], i) => {
        const k = new THREE.Group(); g.add(k); k.position.set(x * 0.6, 0.03 + i * 0.012, 0.22); k.rotation.y = -x * 1.2;
        efcTpCyl(k, 0.08, 0.08, 0.025, 8, m, 0, 0, 0);
        efcTpBox(k, 0.04, 0.025, len, m, 0, 0, len / 2 + 0.06);
        efcTpBox(k, 0.1, 0.025, 0.07, m, 0.05, 0, len + 0.0);
      });
      efcTpBox(g, 0.18, 0.02, 0.3, efcTpMat(0x7a2a1a, 0.6), 0.3, 0.03, -0.36, 0, 0.5, 0); // leather fob
      break;
    }
    case 'loot_sextant': {
      const s = new THREE.Group(); g.add(s); s.rotation.set(0, 0, 0);
      efcTpTorus(s, 0.9, 0.035, 3, 10, brass, 0, 1.0, 0, 0, 0, -EFC_TP_HALF - 0.55, 1.1); // graduated arc
      for (const a of [-0.55, 0.55]) efcTpBox(s, 0.05, 0.92, 0.03, brass, Math.sin(a) * 0.45, 1.0 - Math.cos(a) * 0.45, 0, 0, 0, a);
      efcTpBox(s, 0.04, 0.95, 0.025, steel, 0.1, 0.55, 0.03, 0, 0, 0.12); // index arm
      efcTpCyl(s, 0.05, 0.06, 0.5, 8, brass, -0.05, 0.75, 0.1, 0, 0, EFC_TP_HALF);
      efcTpBox(s, 0.14, 0.12, 0.015, efcTpMat(0x8ab0c8, 0.1, 0.7), 0.0, 0.92, 0.05);
      efcTpCyl(s, 0.04, 0.04, 0.32, 6, wood, 0.25, 0.75, -0.12, 0, 0, 0.3);
      break;
    }
    case 'loot_chrono': {
      efcTpBox(g, 0.9, 0.5, 0.9, wood, 0, 0.25, 0);
      efcTpBox(g, 0.9, 0.04, 0.9, wood, 0, 0.75, -0.5, -1.25, 0, 0); // open lid
      efcTpCyl(g, 0.38, 0.38, 0.05, 20, brass, 0, 0.52, 0);
      efcTpAdd(g, new THREE.CircleGeometry(0.33, 20), efcTpMat(0xf2ecdc, 0.6), 0, 0.548, 0, -EFC_TP_HALF, 0, 0);
      efcTpBox(g, 0.02, 0.01, 0.26, iron, 0.06, 0.555, -0.06, 0, -0.5, 0);
      efcTpBox(g, 0.02, 0.01, 0.18, iron, -0.06, 0.556, -0.04, 0, 0.9, 0);
      break;
    }
    case 'loot_dispatch': {
      efcTpBox(g, 1.0, 0.04, 0.68, efcTpMat(0xdcd0ac, 0.85), 0, 0.02, 0);
      const fl = new THREE.BufferGeometry();
      fl.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.34, 0.5, 0, -0.34, 0, 0, 0.06], 3)); fl.computeVertexNormals();
      efcTpAdd(g, fl, efcTpMat(0xc8bc96, 0.85, 0, true), 0, 0.042, 0);
      efcTpBox(g, 0.08, 0.012, 0.7, efcTpMat(0x24305a, 0.7), 0.25, 0.045, 0);
      efcTpCyl(g, 0.11, 0.12, 0.04, 12, efcTpMat(0xa01c18, 0.45), 0, 0.06, 0.06);
      break;
    }
    default: // an unknown valuable: a small crate
      efcTpBox(g, 0.8, 0.5, 0.6, efcTpMat(0x7a6040, 0.8), 0, 0.25, 0);
      efcTpBox(g, 0.82, 0.08, 0.62, iron, 0, 0.4, 0);
  }
}

function efcTpAttachment(g, def) {
  const iron = efcTpMat(0x383c37, 0.52), rubber = efcTpMat(0x171b16, 0.85), glass = efcTpMat(0x628b80, 0.22);
  const slot = ATT[def.part.key].slot;
  if (slot === 'optic') {
    efcTpBox(g, 0.52, 0.12, 0.29, iron, 0, 0.06, 0);
    efcTpBox(g, 0.43, 0.29, 0.31, iron, 0, 0.27, 0);
    efcTpBox(g, 0.035, 0.18, 0.22, glass, 0.224, 0.29, 0);
    for (const z of [-0.151, 0.151]) efcTpBox(g, 0.58, 0.045, 0.025, rubber, 0, 0.053, z);
  } else if (slot === 'muzzle') {
    efcTpBox(g, 0.74, 0.23, 0.23, rubber, 0, 0.15, 0);
    for (const x of [-0.34, -0.16, 0.16, 0.34]) efcTpBox(g, 0.05, 0.25, 0.25, iron, x, 0.15, 0);
  } else if (slot === 'mag') {
    efcTpBox(g, 0.26, 0.58, 0.17, iron, 0, 0.3, 0);
    efcTpBox(g, 0.31, 0.06, 0.2, rubber, 0, 0.046, 0);
    for (const y of [0.14, 0.31, 0.48]) efcTpBox(g, 0.28, 0.035, 0.19, rubber, 0, y, 0);
  } else {
    efcTpBox(g, 0.46, 0.1, 0.25, iron, 0, 0.38, 0);
    efcTpBox(g, slot === 'side' ? 0.5 : 0.22, 0.31, 0.23, rubber, 0, 0.22, 0);
    efcTpBox(g, 0.16, 0.12, 0.2, def.part.key === 'scout' ? glass : iron, 0.13, 0.26, 0);
    for (const z of [-0.11, 0.11]) efcTpBox(g, 0.18, 0.045, 0.035, iron, 0, 0.12, z);
  }
}
/* Prop for an item definition (any kind but weapon); an unknown item gets the generic prop of its kind */
function efcThumbProp(def) {
  const g = new THREE.Group(), k = def && def.kind;
  if (k === 'ammo') efcTpAmmo(g, def.ammo && def.ammo.fam);
  else if (k === 'armor') efcTpArmor(g, (def.armor && def.armor.tier) || 1);
  else if (k === 'pack') efcTpPack(g, def.id);
  else if (k === 'med') efcTpMed(g, def.id);
  else if (k === 'attachment') efcTpAttachment(g, def);
  else efcTpLoot(g, def && def.id);
  return g;
}
/* Triangle count of a built object (the test keeps props between 50 and 300) */
function efcThumbTris(obj) {
  let n = 0;
  obj.traverse((o) => { if (o.isMesh) { const gm = o.geometry; n += (gm.index ? gm.index.count : gm.attributes.position.count) / 3; } });
  return Math.round(n);
}
