/* Claudov map definition: ground, backdrop, atmosphere, bot data, raid data (inserts, extracts, loot, guard posts) and registration
   in the engine's map list. The plan itself is in 60-efc-claudov-plan.js, the helpers in 60-efc-claudov-kit.js. */

/* ---------- Ground: wet concrete, asphalt roads, pavers in the housing yard, ballast and grit; land only (no ground over the water) ---------- */
const CLV_GROUND = { base: 'concrete', l1: 'asphalt', l2: 'pavers', l3: 'gravel', pom: [0, 0, 0.03, 0], dirt: [0.4, 0.41, 0.4], mul: 0, env: 0.75 };
function clvGround() {
  const sp = new Splat();
  sp.rect(0, -44, 80, -56, -48, 0.4, 1, 0.6); // checkpoint road
  sp.rect(0, -44, 30, 57, 65, 0.4, 1, 0.6); // north yard road
  sp.rect(0, -45, -41, -80, 80, 0.4, 0.9, 0.6); // quay road
  sp.rect(0, 22, 28, -80, 57, 0.4, 0.9, 0.6); // road along the warehouses
  sp.rect(1, 44, 78, 33, 56, 0.5, 1, 0.8); // housing yard
  sp.rect(2, 33, 41, -80, 80, 0.4, 1, 0.5); // ballast
  sp.rect(2, -41, -8, -6, 58, 1.0, 0.45, 1.4); // grit in the container yard
  for (const [x, z, r] of [[-30, 20, 6], [10, -10, 7], [50, 0, 8], [-50, -30, 5], [60, -60, 7]]) sp.disc(3, x, z, r, 2, 0.7, 2);
  CLV.splat = sp;
  MAT.ground = groundMat(sp.finish(0.2), [SPLAT.x0, SPLAT.z0, SPLAT.w, SPLAT.d], CLV_GROUND);
  const M = DECOR, D = CLV.dock, c = CLV.coast; WORLD.force = 'g';
  M.save().color([0.5, 0.5, 0.5]).local(1); M.aoFn = null;
  const quad = (x0, x1, z0, z1) => { M.save().move((x0 + x1) / 2, 0, (z0 + z1) / 2); M.plane('ground', x1 - x0, z1 - z0, 1, 1); M.restore(); };
  quad(c, 360, D.z1, 360); quad(c, 360, -360, D.z0); quad(D.x1, 360, D.z0, D.z1);
  M.restore(); WORLD.force = null;
  // standing water on the wet concrete
  for (const [x, z, w, d, r, s] of [[-52, -20 + 30, 3, 2, 0.3, 1], [-28, 10, 2.5, 1.6, 1.1, 2], [12, -8, 3.2, 2, 0.2, 3], [55, -52, 2.6, 1.8, 0.8, 4], [24, 30, 2, 1.4, 0.5, 5], [-5, 62, 3, 1.8, 0.1, 6]]) clvPuddle(x, z, w, d, r, s);
}
/* Footsteps: steel on stairs and decks, gravel on the ballast, concrete elsewhere */
function clvSurface(p) {
  if (p.y > 0.3 && p.y < 3.0) return 'metal';
  if (p.x > 34.5 && p.x < 39.5) return 'gravel';
  return 'concrete';
}

/* ---------- Backdrop (far chunk): the outer harbour, a breakwater and its light, the town inland, more quay and cranes ---------- */
function clvBackdrop() {
  const M = DECOR, R = rngOf(6301);
  WORLD.force = 'far';
  // breakwater: a long rubble mound in the sea, the harbour light at its head
  M.save().color([0.42, 0.42, 0.4]).world(1); M.boxB('concrete', -160, -152, CLV.wl - 1, 1.8, -260, 90, { skip: 'y' }); M.restore();
  lighthouse(-156, 96, 14, [0.2, 0.5, 0.25], 1.8);
  // the quay goes on north and south: cranes and container stacks
  for (const z of [110, 150, -110, -150]) M.place(PF.quayCrane(12), -58, 0, z, Math.PI / 2 + R.range(-0.5, 0.5));
  for (const z of [100, 130, -100, -135]) for (let i = 0; i < 3; i++) { M.place(PF.container(), -36 + i * 2.5, 0, z, 0, { tint: R.pick(CLV_TINT.boxes), nocol: true }); if (R() < 0.6) M.place(PF.container(), -36 + i * 2.5, 2.6, z, 0, { tint: R.pick(CLV_TINT.boxes), nocol: true }); }
  // the town inland: grey blocks of flats and sheds
  for (let z = -200; z <= 200; z += 26) for (const x of [100, 135, 175]) { if (R() < 0.25) continue; farBuilding(x + R.range(-5, 5), z + R.range(-5, 5), R.range(14, 24), R.range(10, 16), R.range(9, 22), R.pick([[0.62, 0.6, 0.56], [0.55, 0.55, 0.56], [0.68, 0.64, 0.58]]), R); }
  for (let x = -40; x <= 80; x += 30) { farBuilding(x + R.range(-4, 4), 110 + R.range(0, 10), 22, 14, R.range(7, 12), [0.58, 0.58, 0.58], R); farBuilding(x + R.range(-4, 4), -112 - R.range(0, 10), 22, 14, R.range(7, 12), [0.58, 0.58, 0.58], R); }
  WORLD.force = null;
}

/* ---------- Atmosphere: overcast cold daylight, light sea fog low on the water and the quays, lamps still on ---------- */
const ATMO_CLAUDOV = Object.assign({}, ATMO_DEFAULT, {
  sun: [0.35, 0.62, 0.55], sunColor: 0xdce4ec, sunI: 1.0, vmSun: 0xdce4ec,
  fog: [0.6, 0.64, 0.68], fogD: 0.0085, fogH: [12, 0], fogSun: 0.15,
  hemi: [0xb6c2ce, 0x4c5156, 0.95], vmHemi: [0xb6c2ce, 0x4c5156],
  sky: {
    zen: [0.4, 0.45, 0.5], mid: [0.56, 0.6, 0.64], hor: [0.68, 0.7, 0.72], gnd: [0.36, 0.38, 0.4],
    glow: [0.72, 0.75, 0.78], halo: [0.82, 0.84, 0.87], disk: [3, 3, 3], cloudLo: [0.48, 0.5, 0.54], cloudHi: [0.82, 0.84, 0.87], cloud: [0.95, 0.9, 0.5],
    ridge: [0, 0, 0], ridgeSnow: [1, 1, 1], ridgeRock: [0.5, 0.5, 0.5],
  },
  envGround: 0x40464c, hdri: null, lit: true, lamps: 1.0, winLit: 0.25,
  bounce: [0.9, 0.95, 1.0], dust: [0.36, 0.37, 0.38], motes: [0.9, 0.95, 1.0],
  grade: { lo: [0.95, 1.0, 1.08], hi: [0.98, 1.0, 1.04], exp: 1.0, sat: 0.78, con: 1.05 }, rays: [0.55, 0.6, 0.65],
  impact: [0.5, 0.5, 0.5], wind: [300, 0.08],
  bloom: [0.3, 0.5, 0.95], aoFloor: 0.3, raysThr: 2.5, raysCap: 4, satExp: 0.9,
  volOpen: true,
});

/* ---------- Bots: points of interest [x, y, z, lane, hold] ; lanes L (quay), M (yard and warehouses), E (rail, housing, checkpoint) ---------- */
const CLV_POI = [
  [-58, 0, -70, 'L'], [-52, 0, -44, 'L'], [-58, 0, -10, 'L'], [-62.5, 0, -25, 'L', 1], [-53, 3.2, 24, 'L', 1], [-50.5, 3.2, 28, 'L', 1],
  [-56, 0, 40, 'L'], [-58, 0, 62, 'L'], [-50, 0, 74, 'L'], [-46, 0, -38, 'L'], [-50, 0, -13, 'L'],
  [-29.5, 0, 10, 'M'], [-20.5, 0, 2, 'M'], [-33.3, 0, 26, 'M'], [-24.8, 0, 26, 'M'], [-16.3, 0, 26, 'M'], [-36.3, 2.6, 15, 'M', 1], [-38.8, 5.2, 21, 'M', 1],
  [-11, 2.6, 34, 'M', 1], [-24.8, 0, 58, 'M'], [-5, 0, 60, 'M'], [10, 0, 62, 'M'],
  [4, 0, 35, 'M'], [16, 0, 29, 'M'], [17, 0, 39, 'M', 1],
  [4.5, 0, -20, 'M'], [9.5, 0, -28, 'M'], [17, 0, -30, 'M'], [10, 3.6, -41, 'M', 1], [2, 3.6, -42, 'M', 1], [24, 3.6, -42, 'M', 1], [4, 0, -41, 'M', 1],
  [-8, 0, -30, 'M'], [10, 0, -12, 'M'], [10, 0, -52, 'M'], [-2, 0, 0, 'M'], [12, 0, 10, 'M'], [24, 0, -4, 'M'],
  [31, 1.1, -4, 'E', 1], [31, 1.1, 10, 'E'], [37, 0.16, 24, 'E'], [37, 0.16, -30, 'E'], [37, 0.16, 66, 'E'], [42, 0, -50, 'E'],
  [60, 0, 36, 'E'], [55, 0, 46, 'E', 1], [65, 0, 45, 'E', 1], [55, 3.2, 46, 'E', 1], [65, 3.2, 45, 'E', 1], [60, 0, 54, 'E'],
  [66, 0, -44, 'E', 1], [70, 0, -52, 'E'], [62, 0, -62, 'E'], [74, 0, -30, 'E'], [70, 0, 10, 'E'], [48, 0, 10, 'E'], [60, 0, -10, 'E'], [70, 0, 70, 'E'],
];
const CLV_SPAWNS = [];
for (let i = 0; i < 8; i++) CLV_SPAWNS.push([i * 3, 66]);
for (let i = 0; i < 7; i++) CLV_SPAWNS.push([1.5 + i * 3, 70]);

/* ---------- Raid data (docs/contracts/CONTRACT.md, MapData) ---------- */
const CLV_RAID = {
  inserts: [[-56, -74], [20, -76], [76, 10], [-20, 76]].map(([x, z]) => ({ x, z, yaw: Math.atan2(-x, -z) })),
  extracts: [
    { id: 'x0', name: 'Pilot boat', x: -60, z: 52, r: 4.5, openAt: 0 },
    { id: 'x1', name: 'Checkpoint gate', x: 75, z: -52, r: 4.5, openAt: 0 },
    { id: 'x2', name: 'Rail tunnel', x: 37, z: 71, r: 4, openAt: 600 },
  ],
  containers: [
    // Warehouse A: the elite post, the best loot (mezzanine and cage)
    ['crate', 'weapons', 1.5, 3.6, -42.5], ['crate', 'weapons', 8, 3.6, -42.5], ['crate', 'weapons', 14, 3.6, -41.5], ['locker', 'locker', -2, 3.6, -42],
    ['crate', 'medical', 22, 0, -44], ['crate', 'crate', 4.5, 0, -20], ['crate', 'crate', 19, 0, -28], ['bag', 'bag', 2, 0, -44],
    // Warehouse B and its office
    ['locker', 'locker', 18.6, 0, 38], ['locker', 'locker', 15.5, 0, 40.4], ['crate', 'crate', 4, 0, 35], ['crate', 'crate', 12, 0, 25.5], ['crate', 'medical', -0.5, 0, 26],
    // housing block
    ['locker', 'locker', 52, 0, 48.6], ['locker', 'locker', 68, 0, 48.6], ['locker', 'locker', 66, 3.2, 41.4], ['bag', 'bag', 51.5, 3.2, 47.5], ['crate', 'medical', 64, 0, 44],
    // checkpoint
    ['locker', 'locker', 65.5, 0, -44.2], ['crate', 'crate', 70, 0, -42.5],
    // container yard
    ['crate', 'crate', -26, 0, 4.5], ['crate', 'crate', -33.3, 0, 26], ['bag', 'bag', -36.3, 2.6, 15], ['crate', 'crate', -11, 2.6, 36], ['crate', 'crate', -16.3, 0, 50],
    // quay, crane platform, dry dock
    ['crate', 'crate', -50, 0, -60], ['bag', 'bag', -61.5, 0, -12], ['crate', 'crate', -51, 3.2, 23], ['crate', 'medical', -44, 0, -36.6],
    // rail, south sheds
    ['crate', 'crate', 31, 1.1, 2], ['bag', 'bag', 33.5, 0, 46], ['bag', 'bag', -18, 0, -64],
  ].map(([kind, table, x, y, z], i) => ({ kind, table, x, y, z, yaw: (i * 2.39996) % 6.283 })),
  guards: [
    { x: 12, z: -34, r: 10, n: 3, elite: true }, // Warehouse A
    { x: -50, z: -40, r: 12, n: 2, elite: false }, // dry dock
    { x: -25, z: 30, r: 14, n: 2, elite: false }, // container yard
    { x: 60, z: 36, r: 12, n: 2, elite: false }, // housing
    { x: 64, z: -54, r: 10, n: 2, elite: false }, // checkpoint
    { x: 27, z: -2, r: 12, n: 2, elite: false }, // rail loading dock
  ],
};

MAP_DEFS.claudov = {
  type: 'open', // long quay and rail lanes, close quarters in the yard and the buildings
  bounds: { x0: -80, x1: 80, z0: -80, z1: 80 },
  near: { x: 82, z: 82 }, // decor chunks over the whole play area; beyond is the backdrop
  light: { d: 0.75 }, // baked light cells of 0.75 m (large map, as Simoun)
  textures: ['plaster', 'plaster2', 'stone', 'brick', 'cobble', 'pavers', 'asphalt', 'wood', 'concrete', 'rock', 'boards', 'slate', 'crate', 'canvas', 'rust', 'rollshutter', 'steel', 'paintwood', 'timber'],
  surfaces: PORT_SURFACES,
  kit: () => portKit(),
  materials: (M) => makePortMaterials(M),
  sound: { pack: 'amb_embruns', bed: 0.4,
    water: (x, z) => Math.max(0, x - CLV.coast),
    loops: [[-65, -1, 60], [-65, -1, 20], [-65, -1, -45], [-55, -1.2, -25]].map((p) => ({ id: 'a_waves', p, gain: 0.4, ref: 5, roll: 1.3, max: 120 })),
    spots: [
      { id: 'a_gull', every: [8, 20], gain: 0.35, at: () => new V3(rand(-120, -50), rand(8, 22), rand(-80, 80)), ref: 10 },
      { id: 'a_creak', every: [14, 32], gain: 0.25, at: () => new V3(rand(-70, -60), rand(-0.5, 1.5), rand(-60, 60)), ref: 5 },
      { id: 'a_foghorn', every: [70, 160], gain: 0.45, at: () => new V3(-400, 5, rand(-200, 200)), ref: 80, roll: 0.5 },
    ] },
  art: { cam: [-70, 13, -52], look: [-22, 3, 8], fov: 55 },
  landmarks: [[-55, 20, 24, 'crane platform'], [37, 8, 77, 'rail tunnel'], [-156, 16, 96, 'harbour light']],
  splat: { x0: -100, z0: -100, w: 200, d: 200, ppm: 2 },
  far: 520,
  build() { clvLevel(); },
  after() { waterBuild({ deep: [0.008, 0.018, 0.022], shallow: [0.016, 0.03, 0.032], scatter: [0.012, 0.03, 0.034], foam: [0.7, 0.73, 0.74], refl: 0.9, floor: [2.2, 7, 20], abs: [1.2, 0.85, 0.8], sand: [0.3, 0.3, 0.28], caus: 0.15 }); },
  ready() { waterReady(); },
  unload() { CLV.splat = null; CLV.R = null; },
  spawns: CLV_SPAWNS,
  poi: CLV_POI,
  dom: [[10, 52], [-20.5, 2], [10, -52]],
  mecha: [[-24, 2], [10, 60], [60, 0], [-52, -60]],
  lane: (x) => (x < -44 ? 'L' : x > 28 ? 'E' : 'M'),
  sniper: [-51, 3.2, 22], // the crane base platform: the whole quay lane and the yard
  coverZ: 62,
  heli: [70, 70],
  cam: 80,
  surface: (p) => clvSurface(p),
  zones: [
    ['Dry dock', -64, -40, -36, -14], ['Crane platform', -58, -48, 19, 37], ['Quay', -64, -44, -80, 80],
    ['Warehouse A', -4, 26, -46, -16], ['Warehouse B', -2, 20, 24, 42], ['Container yard', -41, -8, -6, 58],
    ['Loading dock', 28, 34, -28, 18], ['Rail tunnel', 30, 44, 66, 80], ['Rail spur', 34, 41, -80, 80],
    ['Housing', 44, 78, 18, 68], ['Checkpoint', 54, 80, -66, -36], ['Customs office', 40, 54, -38, -24],
    ['Fuel depot', -40, 0, -80, -62], ['North road', -44, 34, 56, 80], ['Yard road', -8, 34, -80, 56], ['Landward', 41, 80, -80, 80],
  ],
  skyPhoto: { key: 'kloofendal_misty_morning', rot: 0.2, gain: 0.95 },
  atmo: ATMO_CLAUDOV,
  efc: CLV_RAID,
};

/* ---------- Registration: menu entry, cloth breeze, raid map ---------- */
MAPS.push({ id: 'claudov', name: 'Claudov', tag: 'Sealed port town', ok: true, desc: 'A sealed industrial port in the cold grey season. The cranes have not moved in months.' });
CLOTH_BREEZE.claudov = [0.9, 0.3, 3.2];
EFC.cfg.raidMap = 'claudov';
