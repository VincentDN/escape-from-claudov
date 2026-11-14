/* Escape From Claudov core: event bus, service registry, host/client message bus, tunables, fallback map data.
   Every other src/efc file talks to the rest of the game through this file only (see docs/contracts/CONTRACT.md). */
const EFC = {
  v: 1,
  hooks: {}, services: {}, netHost: {}, netClient: {},
  inv: null, // the local player's inventory during a raid (set by the raid module from the service 'raid:kit')
  cfg: {
    raidMinutes: 20, extractHold: 7, squadMax: 3, squads: 4,
    wardenRespawn: 75, bodyKeep: true,
    // Warden numbers (efcWardenNumber): one per wardenArea m² of play area, clamped, plus wardenPerSquad per extra player squad;
    // the elite post fields three Wardens only when the raid has at least wardenElite3 of them
    wardenArea: 3500, wardenMin: 3, wardenMax: 7, wardenPerSquad: 1, wardenElite3: 6,
    // hidden inserts (efcInsertOk): metres from every guard post centre and from every extract, never in sight of a post or another
    // insert; derived maps relax post and extract distances in steps down to insertPostMin / insertExtractMin
    insertPost: 55, insertPostMin: 30, insertExtract: 45, insertExtractMin: 30, insertGrid: 2.5, insertCount: 6,
    // raid start: no Warden starts within wardenStartR of an insert in use or in sight of it; for bubbleTime s Warden goals stay
    // out of bubbleR around used inserts; insertion grace (Wardens cannot detect a human) for graceTime s or until it fires or moves graceMove m
    wardenStartR: 50, bubbleR: 45, bubbleTime: 90, graceTime: 8, graceMove: 10,
    oneShotLeft: 5, // a single non-headshot hit of a regular Warden leaves a full-health human at least this much health
    searchTime: { crate: 2, locker: 2.5, bag: 1.5, body: 2, drop: 0.3 }, interactR: 2.2,
    bagBase: 8, // kg carried without a backpack
  },
};

/* ---------- Events: many listeners, called in registration order ---------- */
function efcOn(ev, fn) { (EFC.hooks[ev] || (EFC.hooks[ev] = [])).push(fn); }
/* Calls every listener. A listener that returns a value other than undefined replaces the running result, which starts as `undefined`
   and is what efcEmit returns: use it for filters such as 'damage' (see efcFilter). A throwing listener is logged and skipped. */
function efcEmit(ev, ...a) {
  const L = EFC.hooks[ev]; let r;
  if (L) for (const fn of L) { try { const x = fn(...a); if (x !== undefined) r = x; } catch (e) { console.error('[efc] listener of ' + ev, e); } }
  return r;
}
/* Filter: passes `value` through every listener as the first argument; each may return a replacement. */
function efcFilter(ev, value, ...a) {
  const L = EFC.hooks[ev];
  if (L) for (const fn of L) { try { const x = fn(value, ...a); if (x !== undefined) value = x; } catch (e) { console.error('[efc] filter of ' + ev, e); } }
  return value;
}

/* ---------- Services: one provider per name, safe to call when the provider is not loaded ---------- */
function efcProvide(name, fn) { EFC.services[name] = fn; }
function efcHas(name) { return typeof EFC.services[name] === 'function'; }
function efcCall(name, ...a) { const fn = EFC.services[name]; return fn ? fn(...a) : undefined; }

/* ---------- Mode and authority ---------- */
function efcRaidMode() { return typeof MATCH !== 'undefined' && MATCH.mode === 'raid'; }
function efcRaidLive() { return efcRaidMode() && (MATCH.state === 'playing' || MATCH.state === 'paused'); }
/* True on the machine that owns the world: always offline, the lobby host online. */
function efcIsHost() { return !MATCH.online || NET.role === 'host'; }
function efcMyId() { return MATCH.online && NET.me ? NET.me : 'local'; }

/* ---------- Host/client message bus (carried by the lobby connection as { t: 'efc', k, d }) ----------
   Client to host: efcNetToHost(k, d). Host to all players in the match, itself included: efcNetToAll(k, d). Host to one: efcNetTo(id, k, d).
   Offline, or on the host itself, the handler is called directly, so game code is written once for all three cases.
   Handlers: efcNetOnHost(k, (d, fromId) => ...), efcNetOnClient(k, (d) => ...). One handler per key and side.
   Payloads must be plain JSON and small. The host must validate everything a client sends. */
function efcNetOnHost(k, fn) { EFC.netHost[k] = fn; }
function efcNetOnClient(k, fn) { EFC.netClient[k] = fn; }
function efcNetRun(table, k, d, from) {
  const fn = table[k]; if (!fn) return;
  try { fn(d, from); } catch (e) { console.error('[efc] net handler ' + k, e); }
}
function efcNetToHost(k, d) {
  if (efcIsHost()) efcNetRun(EFC.netHost, k, d, efcMyId());
  else netSend({ t: 'efc', k, d });
}
function efcNetToAll(k, d) {
  if (!efcIsHost()) return;
  if (MATCH.online) netBroadcast({ t: 'efc', k, d }, true);
  efcNetRun(EFC.netClient, k, d);
}
function efcNetTo(id, k, d) {
  if (!efcIsHost()) return;
  if (id === efcMyId()) { efcNetRun(EFC.netClient, k, d); return; }
  const pl = MATCH.online ? NET.players.get(id) : null;
  if (pl) netSendTo(pl, { t: 'efc', k, d });
}
/* Called by the engine (src/09c-net.js) when an 'efc' message arrives. */
function efcNetHostIn(id, m) { if (m && typeof m.k === 'string') efcNetRun(EFC.netHost, m.k, m.d, id); }
function efcNetClientIn(m) { if (m && typeof m.k === 'string') efcNetRun(EFC.netClient, m.k, m.d); }

/* ---------- Small helpers ---------- */
function efcClone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
/* Seeded random (mulberry32): efcRng(seed)() gives 0..1. The host uses it so a raid's loot can be replayed in tests. */
function efcRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- Map data for the raid systems ----------
   A map definition may carry MAP_DEFS.<id>.efc = { inserts, extracts, containers, guards } (shapes in the contract). Maps without it get
   data derived from their bot points of interest and nav grid (efcMapFallback). Services: 'map:data', 'map:raidable'. */
/* Play area of a map (m²): its bounds */
function efcPlayArea(id) {
  const d = id && typeof MAP_DEFS !== 'undefined' && MAP_DEFS[id], B = (d && d.bounds) || MAP;
  return (B.x1 - B.x0) * (B.z1 - B.z0);
}
/* THE Warden number rule: one per EFC.cfg.wardenArea m² of play area, clamped to wardenMin..wardenMax, plus wardenPerSquad for each
   player squad after the first. squads: player squads in the raid (default 1); id: a map id (default: the loaded map). */
function efcWardenNumber(squads, id) {
  const C = EFC.cfg, base = Math.min(C.wardenMax, Math.max(C.wardenMin, Math.round(efcPlayArea(id) / C.wardenArea)));
  return base + Math.max(0, (squads | 0 || 1) - 1) * C.wardenPerSquad;
}
/* Eye of a soldier standing at (x, z) on the floor nearest y */
function efcEyeAt(x, z, y) { return new V3(x, groundHeight(x, z, (y || 0) + 0.5) + 1.6, z); }
/* Per-map cache of the derivation (post eye points, nav outline, insert sight results) */
function efcMapCache() {
  const C = EFC.mapCache || (EFC.mapCache = { map: null, eyes: new Map(), edge: null, free: new Map() });
  if (C.map !== MAPL.id) { C.map = MAPL.id; C.eyes.clear(); C.free.clear(); C.edge = null; }
  return C;
}
/* Eye points of a post area: the centre and every walkable point of an EFC.cfg.insertGrid grid inside the radius */
function efcPostEyes(g) {
  const C = efcMapCache(), k = g.x + ',' + g.z + ',' + g.r; if (C.eyes.has(k)) return C.eyes.get(k);
  const s = EFC.cfg.insertGrid, r = g.r || 10, L = [efcEyeAt(g.x, g.z, g.y)];
  for (let dz = -r; dz <= r; dz += s) for (let dx = -r; dx <= r; dx += s) {
    if (Math.hypot(dx, dz) > r || (!dx && !dz)) continue;
    const e = efcEyeAt(g.x + dx, g.z + dz, g.y);
    if (navClear(e.x, e.z, e.y - 1.6)) L.push(e);
  }
  C.eyes.set(k, L);
  return L;
}
/* Does the eye see any point of the post area? */
function efcSeesPost(eye, g) { for (const p of efcPostEyes(g)) if (lineClear(eye, p)) return true; return false; }
/* Why the insertion point p breaks the rules (a string), or null. o = { post, extract }: distances (default EFC.cfg); md: the map data.
   Inserts must also not see each other: checked where they are chosen (efcInsertPick) and in the tests. */
function efcInsertWhy(p, md, o = {}) {
  const C = EFC.cfg, pd = o.post || C.insertPost, ed = o.extract || C.insertExtract, eye = efcEyeAt(p.x, p.z, p.y);
  for (const g of md.guards || []) if (Math.hypot(p.x - g.x, p.z - g.z) < pd) return `${Math.round(Math.hypot(p.x - g.x, p.z - g.z))} m from a post`;
  for (const x of md.extracts || []) if (Math.hypot(p.x - x.x, p.z - x.z) < ed) return `${Math.round(Math.hypot(p.x - x.x, p.z - x.z))} m from extract ${x.name}`;
  for (const g of md.guards || []) if (efcSeesPost(eye, g)) return 'in sight of a post';
  return null;
}
/* Walkable ground points at the edge of the map's main nav area (within o.edge m of its outline), on an o.step m grid, next to a tall
   obstacle (inside or behind a structure; on maps with relief the dunes are the cover), far enough from posts and extracts, that see
   no post area */
function efcInsertCandidates(md, o = {}) {
  const edge = o.edge || 12, step = o.step || 2, C = efcMapCache(), G = md.guards || [], X = md.extracts || [];
  const pd = o.post || EFC.cfg.insertPost, ed = o.extract || EFC.cfg.insertExtract;
  if (!C.edge) { // outline of the main nav component
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < NAV.count; i++) if (NAV.comp[i] === NAV.mainComp) { x0 = Math.min(x0, NAV.nx[i]); x1 = Math.max(x1, NAV.nx[i]); z0 = Math.min(z0, NAV.nz[i]); z1 = Math.max(z1, NAV.nz[i]); }
    C.edge = { x0, x1, z0, z1 };
  }
  const E = C.edge, out = [], gkey = G.map((g) => g.x + ',' + g.z + ',' + g.r).join(';');
  for (let z = Math.floor(E.z0) + 0.5; z <= E.z1; z += step) for (let x = Math.floor(E.x0) + 0.5; x <= E.x1; x += step) {
    if (Math.min(x - E.x0, E.x1 - x, z - E.z0, E.z1 - z) > edge) continue;
    const dPost = Math.min(1e9, ...G.map((g) => Math.hypot(x - g.x, z - g.z))), dExt = Math.min(1e9, ...X.map((e) => Math.hypot(x - e.x, z - e.z)));
    if (dPost < pd || dExt < ed) continue;
    const id = navNode(x, 0, z);
    if (id < 0 || NAV.comp[id] !== NAV.mainComp || Math.hypot(NAV.nx[id] - x, NAV.nz[id] - z) > 0.8) continue;
    const y = NAV.ny[id]; if (Math.abs(y - gy0(x, z)) > 0.35 || !navClear(x, z, y)) continue; // on the ground, not on a roof or a deck
    if (!RELIEF.on && !queryBoxes(x - 3, z - 3, x + 3, z + 3).some((b) => !b.ray && !b.noRay && b.y1 - y > 1.8 && b.y0 - y < 1 && b.x0 < x + 3 && b.x1 > x - 3 && b.z0 < z + 3 && b.z1 > z - 3)) continue;
    const k = gkey + '|' + x + ',' + z; let free = C.free.get(k);
    if (free === undefined) { const eye = efcEyeAt(x, z, y); free = !G.some((g) => efcSeesPost(eye, g)); C.free.set(k, free); }
    if (free) out.push({ x, z, y, dPost, dExt });
  }
  return out;
}
/* Up to n inserts from the candidates, spread out: the one farthest from the posts first, then each time the candidate farthest from
   those already chosen that none of them can see and at least `gap` m from them */
function efcInsertPick(cands, n, gap = 30) {
  const pick = [], eyes = [], sorted = cands.slice().sort((a, b) => b.dPost - a.dPost || a.x - b.x || a.z - b.z);
  while (pick.length < n) {
    let best = null, bd = -1;
    for (const c of sorted) {
      const d = pick.length ? Math.min(...pick.map((q) => Math.hypot(q.x - c.x, q.z - c.z))) : c.dPost;
      if ((pick.length && d < gap) || d <= bd) continue;
      const eye = efcEyeAt(c.x, c.z, c.y);
      if (eyes.some((e) => lineClear(eye, e))) continue;
      best = c; bd = d;
    }
    if (!best) break;
    pick.push(best); eyes.push(efcEyeAt(best.x, best.z, best.y));
  }
  return pick;
}
/* Derived raid data for a map without MAP_DEFS.<id>.efc: three extracts far from the centre, guard posts sized for the map's Warden
   number (efcWardenNumber) near the centre, hidden inserts by the rules of efcInsertWhy with the distances relaxed 5 m at a time down
   to EFC.cfg.insertPostMin / insertExtractMin, loot points. raidable and why say whether the map can host a raid. Deterministic: every
   machine derives the same data. */
function efcMapFallback() {
  const R = efcRng(MAPL.id.length * 7919 + 17), pts = POI.filter((p) => p[1] < gy0(p[0], p[2]) + 1 && !p[4]).map((p) => [p[0], p[2]]);
  const cx = (MAP.x0 + MAP.x1) / 2, cz = (MAP.z0 + MAP.z1) / 2, far = (p) => Math.hypot(p[0] - cx, p[1] - cz), C = EFC.cfg;
  const byFar = pts.slice().sort((a, b) => far(b) - far(a)), dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  // extracts: three points far from the centre and far from each other
  const ext = [];
  for (const p of byFar) { if (ext.every((q) => dist(p, q) > 35)) ext.push(p); if (ext.length === 3) break; }
  const names = ['North gate', 'Dry dock', 'Signal tower'];
  const extracts = ext.map((p, i) => ({ id: 'x' + i, name: names[i], x: p[0], z: p[1], r: 4, openAt: i === 2 ? 600 : 0 }));
  // guard posts: as many as the Warden number needs (one or two each, three at the elite post), central ones first, spread out
  const N = efcWardenNumber(1), elite = N >= C.wardenElite3, P = elite ? 1 + Math.ceil((N - 3) / 2) : Math.ceil(N / 2), posts = [];
  const side = Math.min(MAP.x1 - MAP.x0, MAP.z1 - MAP.z0);
  for (const sep of [Math.max(24, side / 4), 24, 16, 10]) for (const p of byFar.slice().reverse()) {
    if (posts.length >= P) break;
    if (!posts.includes(p) && !ext.some((q) => dist(p, q) < 20) && !posts.some((q) => dist(p, q) < sep)) posts.push(p);
  }
  const guards = posts.map((p, i) => ({ x: p[0], z: p[1], r: 10, n: elite && i === 0 ? 3 : 2, elite: elite && i === 0 }));
  const rest = pts.filter((p) => !ext.includes(p) && !posts.includes(p));
  const kinds = ['crate', 'locker', 'bag', 'crate'], tables = ['crate', 'locker', 'bag', 'weapons'];
  const containers = rest.filter((p, i) => i % 2 === 0).slice(0, 24).map((p, i) => ({ kind: kinds[i % 4], table: tables[i % 4], x: p[0] + (R() - 0.5) * 2, z: p[1] + (R() - 0.5) * 2, yaw: R() * 6.28 }));
  // inserts: the strictest distances that give one hidden insert per squad (or the most found)
  const md = { extracts, guards }, want = Math.min(C.squads, C.insertCount);
  let best = { ins: [], post: 0, extract: 0 };
  for (let k = 0; ; k++) {
    const post = Math.max(C.insertPostMin, C.insertPost - 5 * k), extract = Math.max(C.insertExtractMin, C.insertExtract - 5 * k);
    const ins = efcInsertPick(efcInsertCandidates(md, { post, extract }), C.insertCount);
    if (ins.length > best.ins.length) best = { ins, post, extract };
    if (best.ins.length >= want || (post === C.insertPostMin && extract === C.insertExtractMin)) break;
  }
  const inserts = best.ins.map((p) => ({ x: p.x, z: p.z, yaw: Math.atan2(cx - p.x, cz - p.z) })); // facing the centre
  const raidable = inserts.length > 0;
  const why = raidable ? `${inserts.length} hidden inserts, ${best.post} m from posts, ${best.extract} m from extracts`
    : `no spot at the edge ${C.insertPostMin} m from every post, ${C.insertExtractMin} m from extracts and out of sight of the posts`;
  return { inserts, extracts, containers, guards, raidable, why, rule: { post: best.post, extract: best.extract } };
}
efcProvide('map:data', () => {
  if (typeof MAPL === 'undefined' || !MAPL.id || MAPL.state !== 'ready') return null;
  if (EFC.mapData && EFC.mapData.id === MAPL.id) return EFC.mapData.d;
  const def = MAP_DEFS[MAPL.id], d = def && def.efc ? def.efc : efcMapFallback();
  EFC.mapData = { id: MAPL.id, d };
  return d;
});
/* Can the map host a raid (offered in the Raid map list and the raid lobby)? Maps with hand-made raid data can; the loaded map answers
   from its derived data; the others from EFC.raidable, the result of tools/dev/efc/test-spawns.mjs for every map (that test fails when
   this table is out of date). */
// 14 November 2026 run: Simoun has no hidden spot at its edge (open desert); Givre, Meltem and Tephra are too small for a Warden to be
// reinforced away from the player, and Givre starts one within 40 m. They are not offered.
EFC.raidable = { claudov: true, sable: true, embruns: true, floreal: true, stratus: true, lotissement: true };
efcProvide('map:raidable', (id) => {
  if (!id || typeof MAP_DEFS === 'undefined' || !MAP_DEFS[id]) return false;
  if (MAP_DEFS[id].efc) return true;
  return !!EFC.raidable[id];
});

