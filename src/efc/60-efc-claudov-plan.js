/* Claudov map plan: the sealed port town, built district by district from the kit in 60-efc-claudov-kit.js.
   160 m square (x, z in -80..80). West: the sea, the quay lane, the flooded dry dock and the crane base platform. Middle: the container
   yard, Warehouse B (north) and Warehouse A with its mezzanine (south). East of the warehouses: the rail spur with its loading dock and the
   rail tunnel portal (north). Landward (east): the workers' housing block and the checkpoint gate in the perimeter wall. */
function clvLevel() {
  CLV.R = rngOf(6113);
  SR.rng = rngOf(6117); // shared prop helpers (crates, barrels) draw from it
  clvWater();
  clvQuayLane();
  clvDryDock();
  clvCranePlatform();
  clvYard();
  clvWarehouseA();
  clvWarehouseB();
  clvRailSpur();
  clvHousing();
  clvCheckpoint();
  clvSouth();
  clvPerimeter();
  clvBackdrop();
  clvGround();
}

/* ---------- Sea, quay edge, dock basin ---------- */
function clvWater() {
  const c = CLV.coast, D = CLV.dock;
  waterSetup({ y: CLV.wl, box: [-2000, D.x1, -2000, 2000], open: [-160, -120], east: D.x1 - 1 });
  waterLand(c, 1e4, D.z1, 1e4); waterLand(c, 1e4, -1e4, D.z0); waterLand(D.x1, 1e4, D.z0, D.z1);
  // quay walls: the long west face (on into the backdrop), the dock's north, south and east faces
  clvQuayWall(c, c + 1.2, D.z1, 220, '-x'); clvQuayWall(c, c + 1.2, -220, D.z0, '-x');
  clvQuayWall(c, D.x1, D.z1, D.z1 + 1.2, '-z'); clvQuayWall(c, D.x1, D.z0 - 1.2, D.z0, '+z'); clvQuayWall(D.x1, D.x1 + 1.2, D.z0, D.z1, '-x');
  // invisible edges: nobody falls in
  clvEdge(c - 0.4, c, D.z1, 81); clvEdge(c - 0.4, c, -81, D.z0);
  clvEdge(CLV.caisson, D.x1, D.z1, D.z1 + 0.4); clvEdge(CLV.caisson, D.x1, D.z0 - 0.4, D.z0); clvEdge(D.x1, D.x1 + 0.4, D.z0, D.z1);
}

/* ---------- West: the quay lane (x -64..-44), cranes, bollards, a moored pilot boat ---------- */
function clvQuayLane() {
  const M = DECOR, R = CLV.R, c = CLV.coast;
  // bollards along the edge
  for (let z = -76; z <= 76; z += 8) { if (z > CLV.dock.z0 - 2 && z < CLV.dock.z1 + 2) continue; M.place(PF.bitt(), c + 0.8, 0, z, Math.PI / 2); }
  // luffing cranes on the quay (their mast is the collision)
  for (const z of [-60, -2, 66]) M.place(PF.quayCrane(10), -59, 0, z, Math.PI / 2 + R.range(-0.4, 0.4));
  // the pilot boat, moored by the north steps (extract)
  const pilot = { L: 14, B: 4.6, name: 1, hull: [0.86, 0.34, 0.08], boot: [0.12, 0.12, 0.12], house: [0.92, 0.92, 0.9], seed: 41, bins: [] };
  M.place(PF.trawler(pilot), c - 3.4, CLV.wl, 52, 0);
  waterObstacle(hullOutline(HULL_TRAWLER, pilot.L, pilot.B, c - 3.4, 52, 0), 2.6, [0.86, 0.34, 0.08], 0.3);
  M.place(PF.quayLadder(1.6), c, 0, 46.5, -Math.PI / 2);
  M.place(PF.lifeRingStand(), c + 1.2, 0, 57.5, Math.PI / 2);
  // cover along the lane: pallet stacks, crates, net piles, a parked flatbed truck, coils of rope
  for (const [x, z] of [[-52, -66], [-49, -46], [-55, -6], [-50, 8], [-53, 40], [-49, 58], [-56, 72]]) {
    M.place(PF.pallet(), x, 0, z, R.range(0, 3)); M.place(PF.pallet(), x, 0.14, z, R.range(0, 3)); M.place(PF.pallet(), x, 0.28, z, R.range(0, 3));
    WORLD.col({ x0: x - 0.7, x1: x + 0.7, y0: 0, y1: 0.42, z0: z - 0.7, z1: z + 0.7 }, 'wood');
  }
  for (const [x, z, n] of [[-55.5, -40, 3], [-52, 14, 2], [-55, 48, 3], [-48.5, -72, 2]]) clvCrates(x, z, n);
  for (const [x, z] of [[-60.5, -48], [-61, 30], [-60.5, 74]]) M.place(PF.netPile(Math.round(x * z) % 5 + 1), x, 0, z, R.range(0, 3));
  vehicle(PF.truck('cargo'), -49.5, 0, -9, 0, { tint: [0.3, 0.36, 0.42] });
  vehicle(PF.truck('cargo'), -48, 0, 44, Math.PI, { tint: [0.52, 0.18, 0.12] });
  M.place(PF.forklift(), -50, 0, -56, 0.7); WORLD.col({ x0: -51.1, x1: -48.9, y0: 0, y1: 2.1, z0: -57.1, z1: -54.9 }, 'metal');
  // lamp posts on the landward side of the lane
  for (let z = -70; z <= 70; z += 20) M.place(PF.lampPost(), -45.5, 0, z, -Math.PI / 2);
  // a long low wall of jersey blocks splits the lane from the yard road at its north end
  for (const z of [62, 66.5]) { M.place(PF.jersey(4), -45, 0, z, 0, { nocol: true }); WORLD.col({ x0: -45.3, x1: -44.7, y0: 0, y1: 0.87, z0: z - 1.95, z1: z + 1.95 }, 'concrete'); }
}
/* Pile of n wooden crates (static, with collision) around (x, z) */
function clvCrates(x, z, n) {
  const R = CLV.R, M = DECOR;
  for (let i = 0; i < n; i++) {
    const s = 1.1, dx = (i % 2) * 1.2, dz = Math.floor(i / 2) * 1.2, y = i === 2 ? 1.1 : 0, px = i === 2 ? x + 0.6 : x + dx, pz = i === 2 ? z : z + dz;
    M.place(PF.crate(s), px, y, pz, R.range(-0.1, 0.1));
    WORLD.col({ x0: px - s / 2, x1: px + s / 2, y0: y, y1: y + s, z0: pz - s / 2, z1: pz + s / 2 }, 'wood');
  }
}

/* ---------- The flooded dry dock (x -64..-42, z -34..-16): a stranded trawler, the walkable caisson gate across its mouth ---------- */
function clvDryDock() {
  const M = DECOR, D = CLV.dock, c = CLV.coast;
  // caisson gate: steel deck flush with the quay, from the sea face to the basin
  box('rust', c, CLV.caisson, CLV.wl - 1.5, 0, D.z0, D.z1, { tint: [0.46, 0.36, 0.3], m: 'metal' });
  waterObstacle([c, CLV.caisson, D.z0, D.z1], -CLV.wl, [0.4, 0.3, 0.26], 0.6);
  clvRail(CLV.caisson - 0.1, CLV.caisson, D.z0, D.z1, 0); clvRail(c, c + 0.1, D.z0, D.z1, 0);
  // the hulk: an old trawler sitting low in the basin, bow to the gate
  const hulk = { L: 16, B: 5.2, name: 2, hull: [0.2, 0.22, 0.24], boot: [0.4, 0.18, 0.12], house: [0.6, 0.62, 0.6], seed: 77, bins: [] };
  M.place(PF.trawler(hulk), -51.5, CLV.wl - 0.25, -25, -Math.PI / 2);
  waterObstacle(hullOutline(HULL_TRAWLER, hulk.L, hulk.B, -51.5, -25, -Math.PI / 2), 2.4, [0.2, 0.22, 0.24], 0.25);
  // dock furniture: capstans (bitts), ladders, a warning sign, a pump house on the north side
  for (const x of [-58, -50, -44.5]) { M.place(PF.bitt(), x, 0, D.z1 + 0.8, 0); M.place(PF.bitt(), x, 0, D.z0 - 0.8, Math.PI); }
  M.place(PF.quayLadder(1.6), -47, 0, D.z1, Math.PI); M.place(PF.quayLadder(1.6), -55, 0, D.z0, 0);
  building(-40.5, -35.5, -15, -10, 4.2, { key: 'brick', tint: CLV_TINT.brick, style: 'colonial', faces: 'sw', pitched: false });
  M.place(PF.generator(), -44, 0, -40, Math.PI / 2); WORLD.col({ x0: -45.2, x1: -42.8, y0: 0, y1: 1.7, z0: -41.5, z1: -38.5 }, 'metal');
}

/* ---------- Crane base platform (x -57..-49, z 20..30, 3.2 m high) with its stair; a crane on top ---------- */
function clvCranePlatform() {
  const M = DECOR, y = 3.2;
  box('concrete', -57, -49, 0, y, 20, 30, { tint: CLV_TINT.concDark, m: 'concrete' });
  clvConcreteStair(-53.4, -51, 30, 37, 'z', y, 0);
  clvRail(-57, -49, 20, 20.1, y); clvRail(-57, -56.9, 20, 30, y); clvRail(-49.1, -49, 20, 30, y);
  clvRail(-57, -53.4, 29.9, 30, y); clvRail(-51, -49, 29.9, 30, y);
  clvStairRail(-53.5, -53.4, 30, 37, y); clvStairRail(-51, -50.9, 30, 37, y); // stair hand rails (keep people off the stair sides)
  M.place(PF.quayCrane(14), -55, y, 24, Math.PI * 0.75);
  // sandbag nest at the sea corner
  for (const [x, z, r] of [[-50.2, 21.2, 0], [-51.4, 20.6, Math.PI / 2]]) { M.place(PF.sandbagFat(), x, y, z, r); }
  WORLD.col({ x0: -51.8, x1: -49.6, y0: y, y1: y + 0.45, z0: 20.2, z1: 21.6 }, 'dirt');
}

/* ---------- Container yard (x -40..-9, z -4..56) ---------- */
function clvYard() {
  const R = rngOf(6203), cols = [-40, -31.5, -23, -14.5], rows = [-4, 12, 28, 44];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x0 = cols[i], z0 = rows[j];
    if (j === 0 && (i === 1 || i === 2)) continue; // the plaza (centre point)
    let tiers;
    if (i === 0 && j === 1) tiers = [1, 1, 1, 1]; // stair tower A: flat top
    else if (i === 3 && j === 2) tiers = [1, 1, 1, 1]; // stair tower B
    else tiers = [0, 1, 2, 3].map(() => (R() < 0.12 ? 0 : R() < 0.45 ? 2 : 1));
    if (tiers.every((t) => !t)) tiers[0] = 1;
    clvStack(x0, z0, 'z', 2, 2, tiers, R);
  }
  // stairs up to the two flat tops, with a second tier reached by a short stair on tower A
  clvStair(-35, -33, 12.3, 18, 'z', 0, 2.6);
  clvContainer(-38.78, 2.6, 21.15, 'z', [0.55, 0.16, 0.12]);
  clvStair(-39.9, -37.7, 12.4, 18.1, 'z', 2.6, 5.2);
  clvStair(-16.5, -14.56, 30, 36, 'z', 0, 2.6);
  // the plaza: an open container, a reach stacker's spreader on the ground, crates
  clvContainer(-27, 0, 4.5, 'x', [0.22, 0.4, 0.3], true);
  clvCrates(-21.5, -1.5, 3);
  DECOR.place(PF.reel(), -29.5, 0, -1, 0.3); WORLD.col({ x0: -30.3, x1: -28.7, y0: 0, y1: 1.4, z0: -1.8, z1: -0.2 }, 'wood');
  // lamp masts in the alleys
  for (const [x, z] of [[-33.3, 9.5], [-16.3, 9.5], [-24.8, 41.8], [-33.3, 41.8]]) DECOR.place(PF.lampPost(), x, 0, z, 0);
}

/* ---------- Warehouse A (x -4..26, z -46..-16): the elite post; mezzanine on the south side ---------- */
function clvWarehouseA() {
  const M = DECOR, Y = 3.6;
  clvHall(-4, 26, -46, -16, { h: 9.5, tint: CLV_TINT.clad,
    ops: { n: [{ a0: 4, a1: 10, b0: 0, b1: 5 }], w: [{ a0: -30, a1: -25, b0: 0, b1: 4.5 }], e: [{ a0: -40, a1: -38.8, b0: 0, b1: 2.4 }, { a0: -24, a1: -20, b0: 0, b1: 4.5 }], s: [{ a0: 18, a1: 19.4, b0: 0, b1: 2.4 }] } });
  // mezzanine: slab, steel columns, rail on its open edge, stair down to the floor
  clvSlab(-3.7, 25.7, -45.7, -38, Y);
  for (let x = 0; x <= 24; x += 6) box('steel', x - 0.15, x + 0.15, 0, Y - 0.22, -38.3, -38, { tint: CLV_TINT.steel, m: 'metal' });
  clvRail(-3.7, 20, -38.1, -38, Y); clvRail(22.4, 25.7, -38.1, -38, Y);
  clvStair(20, 22.4, -38, -30.5, 'z', Y, 0); clvStairRail(19.9, 20, -38, -30.5, Y); clvStairRail(22.4, 22.5, -38, -30.5, Y);
  // the cage under the mezzanine (mesh walls, door) where the best kit sits
  clvFence(-3.7, 8, -38.4, -38.3, 3.1, 3.3);
  // racks on the floor (their shelves carry loose crates)
  for (const x of [2, 7, 12]) { M.place(PF.rack(10), x, 0, -28, 0); WORLD.col({ x0: x - 0.5, x1: x + 0.5, y0: 0, y1: 3.2, z0: -33, z1: -23 }, 'metal'); }
  M.place(PF.forklift(), 16.5, 0, -23.5, -Math.PI / 2); WORLD.col({ x0: 15.4, x1: 17.6, y0: 0, y1: 2.1, z0: -24.6, z1: -22.4 }, 'metal');
  clvCrates(23, -27, 3); clvCrates(-1.5, -20, 2);
  clvBench(4, -44.9, 0, Y); clvBench(12, -44.9, 0, Y); clvLockers(-2.9, -42, Math.PI / 2, 3, Y);
  clvBench(14, -43.5, 0); clvLockers(25.4, -42, -Math.PI / 2, 4);
  // sandbags at the top of the stair: the guards' nest
  for (const x of [17.5, 18.1]) M.place(PF.sandbagFat(), x, Y, -38.6, 0);
}

/* ---------- Warehouse B (x -2..20, z 24..42): shelves and the yard office ---------- */
function clvWarehouseB() {
  const M = DECOR;
  clvHall(-2, 20, 24, 42, { h: 7, tint: CLV_TINT.cladB,
    ops: { w: [{ a0: 30, a1: 34.5, b0: 0, b1: 4.5 }], e: [{ a0: 27, a1: 28.3, b0: 0, b1: 2.4 }], n: [{ a0: 7.5, a1: 12.5, b0: 0, b1: 4.5 }] } });
  // office in the north-east corner: block walls with a door and a window, its own roof
  wallOpen('concrete', 'z', 14, 0.2, 35.5, 41.7, 0, 3, [{ a0: 36.0, a1: 37.3, b0: 0, b1: 2.2 }, { a0: 38.6, a1: 40.6, b0: 1.0, b1: 2.0 }], { tint: [0.78, 0.76, 0.7], frameTint: [0.3, 0.32, 0.34] });
  wallOpen('concrete', 'x', 35.5, 0.2, 13.9, 19.7, 0, 3, [{ a0: 16, a1: 18.4, b0: 1.0, b1: 2.0 }], { tint: [0.78, 0.76, 0.7] });
  box('concrete', 13.9, 19.7, 3, 3.15, 35.4, 41.7, { tint: [0.7, 0.7, 0.68] });
  DECOR.lamp(17, 2.6, 38.5, [1.0, 0.9, 0.75], 1.2, 5, 0.6);
  clvBench(17, 41.1, Math.PI); clvLockers(19.4, 38, -Math.PI / 2, 3);
  // shelving rows
  for (const z of [27.5, 31.5]) { M.place(PF.rack(9), 6, 0, z, Math.PI / 2); WORLD.col({ x0: 1.5, x1: 10.5, y0: 0, y1: 3.2, z0: z - 0.5, z1: z + 0.5 }, 'metal'); }
  clvCrates(3, 38, 3); clvCrates(10, 37.5, 2);
}

/* ---------- Rail spur (track x 37) with its loading dock (x 29..33) and the tunnel portal in the north ---------- */
function clvRailSpur() {
  const M = DECOR;
  trackBed(35, 39, -80, 74); railTrack(37, -80, 79.5);
  const W = (pf, z, rot, tint, shape, bogies) => { DECOR.place(pf, 37, RAIL.bed, z, rot, { tint, nocol: true }); colShape(37, RAIL.bed, z, rot, shape); for (const b of bogies) WORLD.col({ x0: 35.9, x1: 38.1, y0: RAIL.bed, y1: RAIL.bed + 0.85, z0: z + b - 1.35, z1: z + b + 1.35 }, 'metal'); };
  const S = {
    boxcar: [[-1.43, 1.43, 0.95, 3.72, -6.1, 6.1], [-1.48, 1.48, 3.72, 3.86, -6.16, 6.16], [-0.95, 0.95, 3.86, 4.04, -6.16, 6.16]],
    tankcar: [[-1.35, 1.35, 0.95, 1.2, -5.1, 5.1], [-0.95, 0.95, 1.2, 1.62, -4.65, 4.65], [-1.32, 1.32, 1.62, 3.48, -4.65, 4.65], [-0.95, 0.95, 3.48, 3.87, -4.65, 4.65]],
    flatcar: [[-1.35, 1.35, 0.95, 1.25, -6.0, 6.0], [-1.3, 1.3, 1.25, 1.89, -5.45, 5.45], [-0.92, 0.92, 1.89, 2.4, -5.45, 5.45], [-0.57, 0.57, 2.4, 2.85, -5.45, 5.45]],
  };
  W(PF.boxcar(), 36.5, 0, [0.4, 0.26, 0.2], S.boxcar, [-4.5, 4.5]);
  W(PF.flatcar(), 6, 0, null, S.flatcar, [-4.3, 4.3]);
  W(PF.tankcar(), -16, Math.PI, [0.18, 0.18, 0.19], S.tankcar, [-3.6, 3.6]);
  W(PF.boxcar(), -62, Math.PI, [0.3, 0.36, 0.42], S.boxcar, [-4.5, 4.5]);
  // loading dock: concrete platform 1.1 m high beside the track, ramps at both ends
  box('concrete', 29, 33, 0, 1.1, -24, 14, { tint: CLV_TINT.conc, m: 'concrete' });
  clvConcreteStair(29, 33, 14, 18, 'z', 1.1, 0); clvConcreteStair(29, 33, -28, -24, 'z', 0, 1.1);
  for (const z of [-18, -6, 6]) { M.place(PF.pallet(), 31, 1.1, z, 0.2); M.place(PF.pallet(), 31, 1.24, z, 0.1); WORLD.col({ x0: 30.3, x1: 31.7, y0: 1.1, y1: 1.38, z0: z - 0.7, z1: z + 0.7 }, 'wood'); }
  clvCrates(30, -12, 3);
  M.place(PF.railSignal(), 40.2, 0, 60, Math.PI); M.place(PF.relayCabinet(), 40.4, 0, -40, -Math.PI / 2); WORLD.col({ x0: 40, x1: 40.8, y0: 0, y1: 1.6, z0: -40.5, z1: -39.5 }, 'metal');
  M.place(PF.sleeperStack(6, 6), 41.5, 0, 20, 0); WORLD.col({ x0: 40.2, x1: 42.8, y0: 0, y1: 1.3, z0: 18.6, z1: 21.4 }, 'wood');
  // tunnel portal: two concrete abutments, the lintel, the dark bore
  box('concrete', 31, 33.6, 0, 8, 74, 80, { tint: CLV_TINT.concDark }); box('concrete', 40.4, 43, 0, 8, 74, 80, { tint: CLV_TINT.concDark });
  box('concrete', 33.6, 40.4, 6, 8, 74, 80, { tint: CLV_TINT.concDark });
  M.save().color([0.02, 0.02, 0.02]).local(1); M.boxB('dark', 33.6, 40.4, 0, 6, 79.4, 79.6); M.restore(); WORLD.col({ x0: 33.6, x1: 40.4, y0: 0, y1: 6, z0: 79.4, z1: 80 }, 'concrete');
  box('concrete', 22, 31, 0, 6, 77, 80, { tint: CLV_TINT.concDark }); box('concrete', 43, 56, 0, 6, 77, 80, { tint: CLV_TINT.concDark });
  DECOR.lamp(37, 5.5, 75, [1.0, 0.85, 0.6], 1.6, 9, 0.5);
}

/* ---------- Workers' housing (x 46..76, z 22..66): one enterable two-storey block, two solid blocks, the yard ---------- */
function clvHousing() {
  const M = DECOR, F = 3.2, t = 0.3, x0 = 50, x1 = 70, z0 = 40, z1 = 50, wt = { tint: CLV_TINT.brick, frameTint: [0.3, 0.32, 0.3] };
  const win = (a) => ({ a0: a, a1: a + 1.4, b0: 1.0, b1: 2.2 });
  // ground floor (walls end under the slab: no top face)
  const g = Object.assign({ top: false }, wt);
  wallOpen('brick', 'x', z0 + t / 2, t, x0, x1, 0, F - 0.22, [win(52.5), { a0: 63, a1: 64.2, b0: 0, b1: 2.2 }, win(66.5)], g);
  wallOpen('brick', 'x', z1 - t / 2, t, x0, x1, 0, F - 0.22, [{ a0: 55, a1: 56.2, b0: 0, b1: 2.2 }, win(61.5), win(66.5)], g);
  wallOpen('brick', 'z', x0 + t / 2, t, z0 + t, z1 - t, 0, F - 0.22, [win(44.3)], g);
  wallOpen('brick', 'z', x1 - t / 2, t, z0 + t, z1 - t, 0, F - 0.22, [win(44.3)], g);
  wallOpen('plaster', 'z', 60, 0.2, z0 + t, z1 - t, 0, F - 0.22, [{ a0: 46, a1: 47.2, b0: 0, b1: 2.2 }], Object.assign({ top: false }, { tint: [0.8, 0.78, 0.72] }));
  // first floor slab with the stairwell hole over the stair (x 51..57.5 along the south wall)
  clvSlab(x0 + t, x1 - t, z0 + t, z1 - t, F, [50.5, 57.5, 40.2, 42.6], [0.72, 0.7, 0.66]);
  clvConcreteStair(51, 57.5, 40.3, 42.3, 'x', 0, F);
  clvRail(50.3, 57.5, 42.6, 42.7, F); clvRail(50.4, 50.5, 40.3, 42.6, F);
  // first floor walls, windows all round, a door in the partition
  const u = Object.assign({ top: true }, wt);
  wallOpen('brick', 'x', z0 + t / 2, t, x0, x1, F, 3.0, [win(52.5), win(58), win(63), win(66.5)], u);
  wallOpen('brick', 'x', z1 - t / 2, t, x0, x1, F, 3.0, [win(52.5), win(57), win(61.5), win(66.5)], u);
  wallOpen('brick', 'z', x0 + t / 2, t, z0 + t, z1 - t, F, 3.0, [win(44.3)], u);
  wallOpen('brick', 'z', x1 - t / 2, t, z0 + t, z1 - t, F, 3.0, [win(44.3)], u);
  wallOpen('plaster', 'z', 60, 0.2, z0 + t, z1 - t, F, 3.0, [{ a0: 46, a1: 47.2, b0: 0, b1: 2.2 }], { tint: [0.8, 0.78, 0.72] });
  box('concrete', x0 - 0.2, x1 + 0.2, 2 * F - 0.2 + 0.0, 2 * F + 0.1, z0 - 0.2, z1 + 0.2, { tint: [0.5, 0.5, 0.5] });
  for (const [x, y, z] of [[55, 2.6, 46], [65, 2.6, 45], [55, F + 2.5, 46], [65, F + 2.5, 45]]) M.lamp(x, y, z, [1.0, 0.86, 0.66], 1.1, 6, 0.6);
  clvLockers(52, 49.4, Math.PI, 2); clvLockers(68, 49.4, Math.PI, 3); clvLockers(66, 40.6, 0, 2, F);
  clvBench(66, 47, 0); clvBench(54, 47.5, 0, F); clvBench(64.5, 48.5, 0, F);
  // solid blocks: three storeys, plain brick and plaster facades
  building(46, 56, 22, 32, 9.2, { key: 'brick', tint: CLV_TINT.brick, style: 'colonial', pitched: false });
  building(62, 74, 56, 66, 9.2, { key: 'plaster', tint: [0.72, 0.7, 0.64], style: 'colonial', pitched: false });
  // the yard: cars, bins, a washing line pole, a dumpster
  car(57, 36.5, Math.PI / 2, [0.42, 0.44, 0.46], false, 'hatch'); car(72.5, 44, 0.1, [0.5, 0.18, 0.14], true, 'sedan');
  dumpster(64, 34, 'x'); dumpster(47.5, 46, 'z');
  for (const [x, z] of [[47, 38], [75, 52], [58, 54]]) M.place(PF.pole(), x, 0, z, 0);
}

/* ---------- Checkpoint (east wall gate z -57..-47, booth, chicane) ---------- */
function clvCheckpoint() {
  const M = DECOR;
  // guard booth (x 64..68, z -46..-42)
  const w = { tint: [0.78, 0.76, 0.7], frameTint: [0.3, 0.32, 0.3] };
  wallOpen('plaster', 'x', -45.9, 0.2, 64, 68, 0, 2.8, [{ a0: 65, a1: 67, b0: 1.0, b1: 2.0 }], w);
  wallOpen('plaster', 'x', -42.1, 0.2, 64, 68, 0, 2.8, [{ a0: 65, a1: 67, b0: 1.0, b1: 2.0 }], w);
  wallOpen('plaster', 'z', 64.1, 0.2, -45.8, -42.2, 0, 2.8, [{ a0: -44.6, a1: -43.4, b0: 0, b1: 2.2 }], w);
  wallOpen('plaster', 'z', 67.9, 0.2, -45.8, -42.2, 0, 2.8, [{ a0: -44.8, a1: -43.2, b0: 1.0, b1: 2.0 }], w);
  box('concrete', 63.7, 68.3, 2.8, 3.0, -46.3, -41.7, { tint: [0.5, 0.5, 0.5] });
  M.lamp(66, 2.4, -44, [1.0, 0.9, 0.75], 1.0, 4, 0.5);
  clvLockers(66, -45.5, 0, 2); clvBench(66.5, -42.7, Math.PI);
  // barrier arm, jersey chicane, sandbag nests, a parked army truck
  for (const [x, z] of [[70, -54.5], [66, -50], [72, -48.5]]) { M.place(PF.jersey(4), x, 0, z, Math.PI / 2, { nocol: true }); WORLD.col({ x0: x - 1.95, x1: x + 1.95, y0: 0, y1: 0.87, z0: z - 0.3, z1: z + 0.3 }, 'concrete'); }
  box('concrete', 77.2, 77.8, 0, 1.0, -47.4, -46.8, { tint: [0.6, 0.6, 0.58] });
  M.save().color([0.9, 0.85, 0.2]).local(1); M.boxB('paint', 77.4, 77.6, 0.92, 1.04, -57, -47.4); M.restore();
  sandbagWall(70, -40.5, 3.5, 0); sandbagWall(60, -60, 3.5, Math.PI / 2);
  vehicle(PF.truck('army'), 58, 0, -44, Math.PI / 2, { tint: [0.34, 0.38, 0.3] });
  M.place(PF.lampPost(), 74, 0, -46, Math.PI); M.place(PF.lampPost(), 74, 0, -58, 0);
}

/* ---------- South edge: the net store and the fuel tanks (they also break the line between the two south inserts) ---------- */
function clvSouth() {
  const M = DECOR;
  building(-38, -20, -79, -66, 6.5, { key: 'brick', tint: [0.55, 0.45, 0.4], style: 'colonial', pitched: false, faces: 'n' });
  building(42, 52, -36, -26, 7, { key: 'plaster', tint: [0.7, 0.68, 0.62], style: 'colonial', pitched: false, faces: 'nw' }); // customs office
  for (const [x, z] of [[-13, -73], [-5.5, -73]]) {
    M.save().move(x, 0, z).color([0.8, 0.8, 0.78]).local(1); M.cyl('paint', 3.2, 7, 20); M.restore();
    WORLD.col({ x0: x - 2.9, x1: x + 2.9, y0: 0, y1: 7, z0: z - 2.9, z1: z + 2.9 }, 'metal');
  }
  for (const [x, z] of [[-12, -58], [6, -52], [24, -60]]) { M.place(PF.barrel(), x, 0, z, 0); WORLD.col({ x0: x - 0.35, x1: x + 0.35, y0: 0, y1: 0.9, z0: z - 0.35, z1: z + 0.35 }, 'metal'); }
  clvContainer(-2, 0, -60, 'x', [0.6, 0.34, 0.16]); clvContainer(14, 0, -58, 'z', [0.16, 0.3, 0.46]);
}

/* ---------- Perimeter: concrete walls on the land sides (gate and tunnel left open) ---------- */
function clvPerimeter() {
  clvWall(79.4, 80.4, -80.4, -57, 4); clvWall(79.4, 80.4, -47, 80.4, 4);
  clvWall(-46, 22, 79.4, 80.4, 3.2); clvWall(56, 80.4, 79.4, 80.4, 3.2);
  clvWall(-46, 80.4, -80.4, -79.4, 3.2);
  // gate posts
  box('concrete', 79, 80.4, 0, 5, -58, -57, { tint: CLV_TINT.conc }); box('concrete', 79, 80.4, 0, 5, -47, -46, { tint: CLV_TINT.conc });
}
