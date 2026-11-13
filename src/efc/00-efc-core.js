/* Escape From Claudov core: event bus, service registry, host/client message bus, tunables, fallback map data.
   Every other src/efc file talks to the rest of the game through this file only (see docs/contracts/CONTRACT.md). */
const EFC = {
  v: 1,
  hooks: {}, services: {}, netHost: {}, netClient: {},
  inv: null, // the local player's inventory during a raid (set by the raid module from the service 'raid:kit')
  cfg: {
    raidMinutes: 20, extractHold: 7, squadMax: 3, squads: 4,
    wardens: 11, wardenRespawn: 75, bodyKeep: true,
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
   data derived from their bot points of interest, so every engine map can host a raid. Service: 'map:data'. */
function efcMapFallback() {
  const R = efcRng(MAPL.id.length * 7919 + 17), pts = POI.filter((p) => p[1] < gy0(p[0], p[2]) + 1 && !p[4]).map((p) => [p[0], p[2]]);
  const cx = (MAP.x0 + MAP.x1) / 2, cz = (MAP.z0 + MAP.z1) / 2, far = (p) => Math.hypot(p[0] - cx, p[1] - cz);
  const byFar = pts.slice().sort((a, b) => far(b) - far(a));
  // extracts: three points far from the centre and far from each other
  const ext = [];
  for (const p of byFar) { if (ext.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 35)) ext.push(p); if (ext.length === 3) break; }
  const names = ['North gate', 'Dry dock', 'Signal tower'];
  const extracts = ext.map((p, i) => ({ id: 'x' + i, name: names[i], x: p[0], z: p[1], r: 4, openAt: i === 2 ? 600 : 0 }));
  // inserts: points far from every extract, spread out
  const ins = [];
  for (const p of byFar.slice().reverse().concat(byFar)) {
    if (ext.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 30) || ins.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 25)) continue;
    ins.push(p); if (ins.length === 4) break;
  }
  const inserts = ins.map((p) => ({ x: p[0], z: p[1], yaw: Math.atan2(cx - p[0], cz - p[1]) }));
  const rest = pts.filter((p) => !ext.includes(p) && !ins.includes(p));
  const kinds = ['crate', 'locker', 'bag', 'crate'], tables = ['crate', 'locker', 'bag', 'weapons'];
  const containers = rest.filter((p, i) => i % 2 === 0).slice(0, 24).map((p, i) => ({ kind: kinds[i % 4], table: tables[i % 4], x: p[0] + (R() - 0.5) * 2, z: p[1] + (R() - 0.5) * 2, yaw: R() * 6.28 }));
  const guards = rest.filter((p, i) => i % 2 === 1).slice(0, 6).map((p, i) => ({ x: p[0], z: p[1], r: 12, n: i === 0 ? 3 : 2, elite: i === 0 }));
  return { inserts, extracts, containers, guards };
}
efcProvide('map:data', () => {
  if (typeof MAPL === 'undefined' || !MAPL.id) return null;
  if (EFC.mapData && EFC.mapData.id === MAPL.id) return EFC.mapData.d;
  const def = MAP_DEFS[MAPL.id], d = def && def.efc ? def.efc : efcMapFallback();
  EFC.mapData = { id: MAPL.id, d };
  return d;
});
