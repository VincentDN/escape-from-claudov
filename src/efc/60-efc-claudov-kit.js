/* Claudov map kit: shared constants and small building helpers (quay walls, halls, containers, stairs, railings, fences).
   The plan is in 60-efc-claudov-plan.js, the map definition in 60-efc-claudov.js. Built only from the engine's prefabs and
   materials (no new external assets). Every collision is an axis-aligned box, so the nav grid (src/03-nav.js) follows it. */
const CLV = {
  R: null, splat: null,
  wl: -1.5, // sea level under the quays
  coast: -64, // quay edge (x); the sea is to the west
  dock: { x0: -64, x1: -42, z0: -34, z1: -16 }, // the flooded dry dock cut into the quay (water inside)
  caisson: -61, // the dock gate deck runs from the coast to this x
};
const CLV_TINT = {
  conc: [0.6, 0.6, 0.58], concDark: [0.46, 0.47, 0.46], clad: [0.5, 0.56, 0.6], cladB: [0.62, 0.52, 0.42], roof: [0.42, 0.44, 0.46],
  brick: [0.62, 0.5, 0.44], steel: [0.36, 0.38, 0.4], rail: [0.85, 0.62, 0.1],
  boxes: [[0.55, 0.16, 0.12], [0.16, 0.3, 0.46], [0.22, 0.4, 0.3], [0.7, 0.5, 0.16], [0.42, 0.42, 0.44], [0.2, 0.22, 0.26], [0.6, 0.34, 0.16], [0.3, 0.46, 0.55]],
};

/* Masonry quay block under quay level, with the wet stone band at the waterline. side: which face looks at the water ('-x', '+x', '-z', '+z') */
function clvQuayWall(x0, x1, z0, z1, side) {
  const wl = CLV.wl, M = DECOR;
  box('ashlar', x0, x1, wl - 2.5, 0, z0, z1, { tint: [0.5, 0.51, 0.5], skip: 'yY', ao: false, m: 'concrete' });
  const o = 0.012, f = {
    '-x': [x0 - o, x0, z0, z1], '+x': [x1, x1 + o, z0, z1], '-z': [x0, x1, z0 - o, z0], '+z': [x0, x1, z1, z1 + o],
  }[side];
  M.save().color([0.14, 0.18, 0.12]).world(1); M.boxB('wetstone', f[0], f[1], wl - 0.7, wl + 0.55, f[2], f[3], { skip: 'yY' }); M.restore();
  // granite kerb that overhangs the water a little
  const b = 0.4, k = {
    '-x': [x0 - 0.06, x0 + b, z0, z1], '+x': [x1 - b, x1 + 0.06, z0, z1], '-z': [x0, x1, z0 - 0.06, z0 + b], '+z': [x0, x1, z1 - b, z1 + 0.06],
  }[side];
  M.save().color([0.6, 0.6, 0.58]).world(1); M.boxB('ashlar', k[0], k[1], -0.12, 0.08, k[2], k[3], { bevel: 0.03 }); M.restore();
  waterObstacle([x0, x1, z0, z1], -wl, [0.32, 0.33, 0.3], 0.5);
}
/* Invisible wall along a water edge: stops soldiers, not bullets (02m-water.js) */
function clvEdge(x0, x1, z0, z1) { waterEdge(x0, x1, z0, z1); }

/* Shipping container (20 ft) with its collision box; axis: 'x' or 'z' (length direction) */
function clvContainer(cx, y, cz, axis, tint, open = false) {
  DECOR.place(PF.container(open), cx, y, cz, axis === 'x' ? Math.PI / 2 : 0, { tint, nocol: true });
  const w = axis === 'x' ? 6.06 : 2.44, d = axis === 'x' ? 2.44 : 6.06;
  if (open) { // three walls and a roof: the doors face +length
    const t = 0.12, s = 1;
    if (axis === 'z') {
      WORLD.col({ x0: cx - w / 2, x1: cx - w / 2 + t, y0: y, y1: y + 2.6, z0: cz - d / 2, z1: cz + d / 2 }, 'metal');
      WORLD.col({ x0: cx + w / 2 - t, x1: cx + w / 2, y0: y, y1: y + 2.6, z0: cz - d / 2, z1: cz + d / 2 }, 'metal');
      WORLD.col({ x0: cx - w / 2, x1: cx + w / 2, y0: y, y1: y + 2.6, z0: cz - d / 2, z1: cz - d / 2 + t * s }, 'metal');
    } else {
      WORLD.col({ x0: cx - w / 2, x1: cx + w / 2, y0: y, y1: y + 2.6, z0: cz - d / 2, z1: cz - d / 2 + t }, 'metal');
      WORLD.col({ x0: cx - w / 2, x1: cx + w / 2, y0: y, y1: y + 2.6, z0: cz + d / 2 - t, z1: cz + d / 2 }, 'metal');
      WORLD.col({ x0: cx - w / 2, x1: cx - w / 2 + t, y0: y, y1: y + 2.6, z0: cz - d / 2, z1: cz + d / 2 }, 'metal');
    }
    WORLD.col({ x0: cx - w / 2, x1: cx + w / 2, y0: y + 2.45, y1: y + 2.6, z0: cz - d / 2, z1: cz + d / 2 }, 'metal');
    return;
  }
  WORLD.col({ x0: cx - w / 2, x1: cx + w / 2, y0: y, y1: y + 2.6, z0: cz - d / 2, z1: cz + d / 2 }, 'metal');
}
/* Container stack block: nx side by side (across), nl end to end, tiers per slot from `tiers` (array of nx*nl heights 0..2) */
function clvStack(x0, z0, axis, nx, nl, tiers, R) {
  const W = 2.44, L = 6.06, gap = 0.06;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nl; j++) {
    const n = tiers[i * nl + j]; if (!n) continue;
    const a = i * (W + gap) + W / 2, b = j * (L + gap) + L / 2;
    const cx = axis === 'z' ? x0 + a : x0 + b, cz = axis === 'z' ? z0 + b : z0 + a;
    for (let k = 0; k < n; k++) clvContainer(cx, k * 2.6, cz, axis, R.pick(CLV_TINT.boxes));
  }
}

/* Steel stair (walkable ramp with treads). axis 'x' or 'z'; h0 at the low coordinate, h1 at the high one */
function clvStair(x0, x1, z0, z1, axis, h0, h1, tint = [0.42, 0.44, 0.46]) {
  ramp(x0, x1, z0, z1, axis, h0, h1, 'paint', tint, { mat: 'paint' });
}
function clvConcreteStair(x0, x1, z0, z1, axis, h0, h1) { ramp(x0, x1, z0, z1, axis, h0, h1, 'concrete', CLV_TINT.conc, { mat: 'concrete' }); }

/* Guard rail: a visible bar and an invisible box that stops soldiers (bullets and sight pass). Along x or z at height y */
function clvRail(x0, x1, z0, z1, y, tint = CLV_TINT.rail) {
  const M = DECOR;
  glassWall(x0, x1, y, y + 1.05, z0, z1);
  M.save().color(tint).local(1); M.cls = 1;
  const alongX = x1 - x0 > z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = alongX ? x1 - x0 : z1 - z0;
  for (const h of [0.5, 1.0]) M.boxB('paint', alongX ? x0 : cx - 0.025, alongX ? x1 : cx + 0.025, y + h, y + h + 0.05, alongX ? cz - 0.025 : z0, alongX ? cz + 0.025 : z1);
  const n = Math.max(1, Math.round(L / 1.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = alongX ? lerp(x0, x1, t) : cx, pz = alongX ? cz : lerp(z0, z1, t);
    M.boxB('paint', px - 0.03, px + 0.03, y, y + 1.05, pz - 0.03, pz + 0.03);
  }
  M.restore();
}

/* Stair side rail: the invisible wall rises to hTop + 1 m so nobody steps off the side of a stair at any height */
function clvStairRail(x0, x1, z0, z1, hTop) {
  glassWall(x0, x1, 0, hTop + 1.05, z0, z1);
  const M = DECOR, alongX = x1 - x0 > z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  M.save().color(CLV_TINT.rail).local(1); M.cls = 1;
  if (alongX) M.boxB('paint', x0, x1, 0.95, 1.0, cz - 0.025, cz + 0.025); else M.boxB('paint', cx - 0.025, cx + 0.025, 0.95, 1.0, z0, z1);
  M.restore();
}

/* Industrial hall: corrugated walls with openings, steel roof on trusses, columns, hanging lamps.
   o.ops: { s, n, w, e } openings per wall [{ a0, a1, b0, b1 }] in world coordinates along the wall; o.h: wall height */
function clvHall(x0, x1, z0, z1, o) {
  const h = o.h, t = 0.3, tint = o.tint || CLV_TINT.clad, conc = { tint, frames: false, m: 'metal' }, ops = o.ops || {};
  // concrete plinth band then cladding: the plinth is part of the wall (one collision), drawn as a darker strip
  wallOpen('corrugated', 'x', z0 + t / 2, t, x0, x1, 0, h, ops.s || [], conc);
  wallOpen('corrugated', 'x', z1 - t / 2, t, x0, x1, 0, h, ops.n || [], conc);
  wallOpen('corrugated', 'z', x0 + t / 2, t, z0 + t, z1 - t, 0, h, ops.w || [], conc);
  wallOpen('corrugated', 'z', x1 - t / 2, t, z0 + t, z1 - t, 0, h, ops.e || [], conc);
  // roof: thin steel deck (collides, shades the inside) with a slight overhang
  box('corrugated', x0 - 0.35, x1 + 0.35, h, h + 0.2, z0 - 0.35, z1 + 0.35, { tint: o.roof || CLV_TINT.roof, m: 'metal' });
  // trusses under the roof every 6 m across the short side
  const M = DECOR, alongX = x1 - x0 >= z1 - z0, L = alongX ? x1 - x0 : z1 - z0, n = Math.max(1, Math.round(L / 6));
  M.save().color(CLV_TINT.steel).local(1); M.cls = 1;
  for (let i = 1; i < n; i++) {
    const s = (alongX ? x0 : z0) + (L * i) / n;
    if (alongX) M.boxB('steel', s - 0.12, s + 0.12, h - 0.7, h, z0 + t, z1 - t); else M.boxB('steel', x0 + t, x1 - t, h - 0.7, h, s - 0.12, s + 0.12);
  }
  M.restore();
  // lamps hung under the roof on a grid
  const lx = Math.max(1, Math.round((x1 - x0) / 9)), lz = Math.max(1, Math.round((z1 - z0) / 9));
  for (let i = 0; i < lx; i++) for (let j = 0; j < lz; j++) {
    const px = x0 + ((i + 0.5) * (x1 - x0)) / lx, pz = z0 + ((j + 0.5) * (z1 - z0)) / lz;
    if (o.noLamp && o.noLamp(px, pz)) continue;
    DECOR.place(PF.hangLamp(true, 1.2), px, h, pz);
    DECOR.lamp(px, h - 1.5, pz, [0.85, 0.92, 1.0], 1.6, 13, 0.7);
  }
}

/* Plain wall run with collision (fences, perimeter walls); key material, height h, thickness along the short side */
function clvWall(x0, x1, z0, z1, h, key = 'concrete', tint = CLV_TINT.concDark) { box(key, x0, x1, 0, h, z0, z1, { tint, m: matKind(key) }); }
/* Chain-link style fence: concrete footing, posts, top rail and a see-through mesh (stops soldiers, not bullets) */
function clvFence(x0, x1, z0, z1, h = 2.6, cap = h + 4) {
  const M = DECOR, alongX = x1 - x0 > z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = alongX ? x1 - x0 : z1 - z0;
  glassWall(x0, x1, 0, cap, z0, z1);
  box('concrete', alongX ? x0 : cx - 0.15, alongX ? x1 : cx + 0.15, 0, 0.3, alongX ? cz - 0.15 : z0, alongX ? cz + 0.15 : z1, { tint: CLV_TINT.conc, collide: false });
  M.save().color([0.5, 0.52, 0.5]).local(1); M.cls = 1;
  const n = Math.max(1, Math.round(L / 3));
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = alongX ? lerp(x0, x1, t) : cx, pz = alongX ? cz : lerp(z0, z1, t);
    M.boxB('steel', px - 0.04, px + 0.04, 0.3, h, pz - 0.04, pz + 0.04);
  }
  M.boxB('steel', alongX ? x0 : cx - 0.03, alongX ? x1 : cx + 0.03, h - 0.05, h, alongX ? cz - 0.03 : z0, alongX ? cz + 0.03 : z1);
  // the mesh: steel grating cut-out material on a thin quad pair
  M.color([0.62, 0.64, 0.62]).world(1);
  if (alongX) M.boxB('grating', x0, x1, 0.3, h, cz - 0.005, cz + 0.005, { skip: 'yYxX' });
  else M.boxB('grating', cx - 0.005, cx + 0.005, 0.3, h, z0, z1, { skip: 'yYzZ' });
  M.restore();
}

/* Floor slab with an optional hole (stairwell): slab top at y, 0.22 m thick */
function clvSlab(x0, x1, z0, z1, y, hole, tint = CLV_TINT.conc) {
  const parts = hole ? [[x0, x1, z0, hole[2]], [x0, x1, hole[3], z1], [x0, hole[0], hole[2], hole[3]], [hole[1], x1, hole[2], hole[3]]] : [[x0, x1, z0, z1]];
  for (const [a, b, c, d] of parts) if (b - a > 0.01 && d - c > 0.01) box('concrete', a, b, y - 0.22, y, c, d, { tint, m: 'concrete' });
}

/* Loot furniture: a row of steel lockers against a wall (decor only, low collision box) */
function clvLockers(x, z, rot, n = 3, y = 0) {
  const M = DECOR;
  M.save().move(x, y, z).rotY(rot).color([0.38, 0.44, 0.42]).local(1);
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * 0.62;
    M.boxB('paint', cx - 0.3, cx + 0.3, 0, 1.9, -0.25, 0.25);
    M.save().color([0.12, 0.12, 0.12]); M.cls = 1; for (const yy of [1.6, 1.68, 1.76]) M.boxB('dark', cx - 0.2, cx + 0.2, yy, yy + 0.03, 0.25, 0.26); M.restore();
  }
  M.col(-n * 0.31, n * 0.31, 0, 1.9, -0.25, 0.25, 'metal');
  M.restore();
}
/* Workbench / desk: decor with a collision box */
function clvBench(x, z, rot, y = 0, w = 1.8, d = 0.8) {
  const M = DECOR;
  M.save().move(x, y, z).rotY(rot).color([0.5, 0.42, 0.32]).local(1);
  M.boxB('wood', -w / 2, w / 2, 0.82, 0.88, -d / 2, d / 2);
  M.color(CLV_TINT.steel); for (const sx of [-1, 1]) for (const sz of [-1, 1]) M.boxB('steel', sx * (w / 2 - 0.08) - 0.03, sx * (w / 2 - 0.08) + 0.03, 0, 0.82, sz * (d / 2 - 0.06) - 0.03, sz * (d / 2 - 0.06) + 0.03);
  M.col(-w / 2, w / 2, 0, 0.88, -d / 2, d / 2, 'wood');
  M.restore();
}
/* Puddle on wet concrete (pond shader of the port), only where the ground is flat */
function clvPuddle(x, z, w, d, rot, seed) { puddleAdd(x, z, w, d, rot, seed); }
