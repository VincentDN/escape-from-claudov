/* WORLD: host-owned lootable containers (crates, lockers, bags, bodies, drops), their services and their replication on the core bus. */
/* Every machine holds the full replicated copy in EFC_W.map; the host's copy is the truth. The host never mutates the map directly:
   it validates, then broadcasts 'w:add' / 'w:del' / 'w:upd' / 'w:all', and its own client handler applies the change like everybody
   else's. So the three cases (offline, host, guest) run the same code, and a host that takes over mid-raid already has the state. */
const EFC_W = {
  map: new Map(), // id -> Container
  next: 1, // id counter (host)
  seed: 0, // loot seed of the current raid
  wasHost: true, // last efcIsHost() seen by the tick listener (host migration)
  kinds: ['crate', 'locker', 'bag', 'body', 'drop'],
  maxItems: 40, maxN: 100000, nameLen: 24,
};

/* ---------- Validation (everything a client sends goes through here on the host) ---------- */
function efcWorldItem(it) {
  if (!it || typeof it !== 'object' || typeof it.id !== 'string' || !it.id || it.id.length > 48) return null;
  if (!Number.isInteger(it.n) || it.n < 1 || it.n > EFC_W.maxN) return null;
  const o = { id: it.id, n: it.n };
  for (const k of ['mag', 'res']) {
    if (it[k] === undefined) continue;
    if (typeof it[k] !== 'number' || !isFinite(it[k]) || it[k] < 0 || it[k] > EFC_W.maxN) return null;
    o[k] = Math.round(it[k]);
  }
  return o;
}
/* A list of items, or null when it is not an array, too long, or holds one bad item (the whole payload is refused). */
function efcWorldItems(a) {
  if (!Array.isArray(a) || a.length > EFC_W.maxItems) return null;
  const out = [];
  for (const it of a) { const o = efcWorldItem(it); if (!o) return null; out.push(o); }
  return out;
}
/* A position inside the map bounds (1 m margin), or null. y must be finite and plausible. */
function efcWorldPos(p) {
  if (!p || typeof p !== 'object') return null;
  const x = p.x, y = p.y, z = p.z;
  if (![x, y, z].every((v) => typeof v === 'number' && isFinite(v))) return null;
  if (x < MAP.x0 - 1 || x > MAP.x1 + 1 || z < MAP.z0 - 1 || z > MAP.z1 + 1 || y < -60 || y > 300) return null;
  return { x, y, z };
}
function efcWorldName(s) { return typeof s === 'string' ? s.slice(0, EFC_W.nameLen) : ''; }

/* ---------- Host side ---------- */
/* The soldier that sent a message: offline or the host itself is PL.ent, a guest's soldier is its remote entity. */
function efcWorldActor(from) {
  if (from === efcMyId()) return PL.ent;
  return typeof NET !== 'undefined' && NET.remotes ? NET.remotes.get(from) || null : null;
}
function efcWorldNear(c, e, r) {
  if (!c || !e || !e.pos || e.alive === false) return false;
  const dx = e.pos.x - c.x, dy = e.pos.y - c.y, dz = e.pos.z - c.z;
  return dx * dx + dy * dy + dz * dz <= r * r;
}
function efcWorldReach() { return EFC.cfg.interactR + 2; }
/* Host: create a container and broadcast it. Returns its id, or null when this machine is not the host or the data is invalid. */
function efcWorldSpawn(kind, pos, items, name) {
  if (!efcIsHost() || !EFC_W.kinds.includes(kind)) return null;
  const p = efcWorldPos(pos), list = efcWorldItems(items || []);
  if (!p || !list) return null;
  const yaw = typeof pos.yaw === 'number' && isFinite(pos.yaw) ? pos.yaw : 0;
  let id; do id = (EFC_W.next++).toString(36); while (EFC_W.map.has(id));
  const c = { id, kind, x: p.x, y: p.y, z: p.z, yaw, name: efcWorldName(name), items: list };
  efcNetToAll('w:add', { c });
  return id;
}
function efcWorldSnapshot() { return { list: Array.from(EFC_W.map.values()), seed: EFC_W.seed }; }
/* Host: roll the raid's containers from the map data and send the full snapshot to everybody. */
function efcWorldHostBegin() {
  const md = efcCall('map:data');
  EFC_W.next = 1;
  EFC_W.seed = typeof EFC.cfg.lootSeed === 'number' ? EFC.cfg.lootSeed >>> 0 : (Math.random() * 4294967296) >>> 0;
  const rng = efcRng(EFC_W.seed), list = [];
  for (const m of (md && md.containers) || []) {
    if (!m || !EFC_W.kinds.includes(m.kind) || typeof m.x !== 'number' || typeof m.z !== 'number') continue;
    const y = groundHeight(m.x, m.z, gy0(m.x, m.z) + 0.3);
    const p = efcWorldPos({ x: m.x, y, z: m.z }); if (!p) continue;
    const items = efcWorldItems(efcCall('loot:roll', m.table || m.kind, rng) || []) || [];
    list.push({ id: (EFC_W.next++).toString(36), kind: m.kind, x: p.x, y: p.y, z: p.z, yaw: +m.yaw || 0, name: '', items });
  }
  efcNetToAll('w:all', { list, seed: EFC_W.seed });
}
/* Host: take item idx (whose id must be `item`) from container id for the sender. Exactly one of two racing takers wins. */
efcNetOnHost('w:take', (d, from) => {
  if (!d || typeof d.id !== 'string' || !Number.isInteger(d.idx) || typeof d.item !== 'string') return;
  const c = EFC_W.map.get(d.id); if (!c) return;
  const it = c.items[d.idx]; if (!it || it.id !== d.item) return;
  if (!efcWorldNear(c, efcWorldActor(from), efcWorldReach())) return;
  const items = c.items.slice(); items.splice(d.idx, 1);
  if (c.kind === 'drop' && !items.length) efcNetToAll('w:del', { id: c.id });
  else efcNetToAll('w:upd', { id: c.id, items });
  efcNetTo(from, 'w:give', { item: efcClone(it), id: c.id });
});
/* Host: put an item into a container near the sender, otherwise into a new 'drop' at the given position (the sender's own position
   when the given one is invalid or out of reach). */
efcNetOnHost('w:put', (d, from) => {
  if (!d) return;
  const item = efcWorldItem(d.item); if (!item) return;
  const e = efcWorldActor(from), c = typeof d.id === 'string' ? EFC_W.map.get(d.id) : null;
  if (c && efcWorldNear(c, e, efcWorldReach()) && c.items.length < EFC_W.maxItems) {
    efcNetToAll('w:upd', { id: c.id, items: c.items.concat([item]) });
    return;
  }
  let p = efcWorldPos(d);
  if (e && e.pos && (!p || !efcWorldNear(p, e, efcWorldReach()))) p = efcWorldPos(e.pos);
  if (!p) return;
  efcWorldSpawn('drop', p, [item], '');
});
efcNetOnHost('w:body', (d) => {
  if (!d) return;
  efcWorldSpawn('body', d.pos, d.items, d.name);
});
efcNetOnHost('w:hello', (d, from) => { efcNetTo(from, 'w:all', efcWorldSnapshot()); });

/* ---------- Client side (runs on every machine, the host included) ---------- */
function efcWorldClean(c) {
  if (!c || typeof c.id !== 'string' || !EFC_W.kinds.includes(c.kind)) return null;
  const p = efcWorldPos(c); if (!p) return null;
  return { id: c.id, kind: c.kind, x: p.x, y: p.y, z: p.z, yaw: +c.yaw || 0, name: efcWorldName(c.name), items: efcWorldItems(c.items) || [] };
}
function efcWorldClear() {
  const ids = Array.from(EFC_W.map.keys());
  EFC_W.map.clear(); efcWorldMeshClear();
  for (const id of ids) efcEmit('world:changed', id);
}
efcNetOnClient('w:all', (d) => {
  if (!d || !Array.isArray(d.list)) return;
  const old = new Set(EFC_W.map.keys());
  EFC_W.map.clear(); efcWorldMeshClear();
  if (typeof d.seed === 'number') EFC_W.seed = d.seed;
  for (const raw of d.list) { const c = efcWorldClean(raw); if (c) { EFC_W.map.set(c.id, c); efcWorldMeshSet(c); old.add(c.id); } }
  efcWorldBumpNext();
  for (const id of old) efcEmit('world:changed', id);
});
efcNetOnClient('w:add', (d) => {
  const c = efcWorldClean(d && d.c); if (!c) return;
  EFC_W.map.set(c.id, c); efcWorldMeshSet(c); efcWorldBumpNext();
  efcEmit('world:changed', c.id);
});
efcNetOnClient('w:del', (d) => {
  if (!d || !EFC_W.map.has(d.id)) return;
  EFC_W.map.delete(d.id); efcWorldMeshDel(d.id);
  efcEmit('world:changed', d.id);
});
efcNetOnClient('w:upd', (d) => {
  const c = d && EFC_W.map.get(d.id); if (!c) return;
  c.items = efcWorldItems(d.items) || [];
  efcWorldMeshSet(c);
  efcEmit('world:changed', c.id);
});
efcNetOnClient('w:give', (d) => {
  const it = d && efcWorldItem(d.item); if (!it) return;
  efcEmit('loot:give', it, d.id);
});
/* Keeps the id counter above every known id, so a host that takes over never reuses one. */
function efcWorldBumpNext() {
  for (const id of EFC_W.map.keys()) { const n = parseInt(id, 36); if (isFinite(n) && n >= EFC_W.next) EFC_W.next = n + 1; }
}

/* ---------- Services ---------- */
efcProvide('world:spawn', (kind, pos, items, name) => efcWorldSpawn(kind, pos, items, name));
efcProvide('world:body', (pos, items, name) => {
  const p = pos ? { x: pos.x, y: pos.y, z: pos.z } : null;
  efcNetToHost('w:body', { pos: p, items: efcClone(items || []), name: typeof name === 'string' ? name : '' });
});
efcProvide('world:list', () => Array.from(EFC_W.map.values()));
efcProvide('world:near', (p, r) => {
  if (!p) return null;
  let best = null, bd = (r || 0) * (r || 0);
  for (const c of EFC_W.map.values()) {
    const dx = c.x - p.x, dy = c.y - (p.y || 0), dz = c.z - p.z, d = dx * dx + dy * dy + dz * dz;
    if (d <= bd) { bd = d; best = c; }
  }
  return best;
});
efcProvide('world:take', (id, idx) => {
  const c = EFC_W.map.get(id), it = c && c.items[idx];
  if (!it) return false;
  efcNetToHost('w:take', { id, idx, item: it.id });
  return true;
});
efcProvide('world:put', (id, item) => {
  const P = PL.ent, yaw = P.yaw || 0;
  // a little in front of the feet, so the pouch is visible
  efcNetToHost('w:put', { id: id || null, item: efcClone(item), x: P.pos.x - Math.sin(yaw) * 0.6, y: P.pos.y, z: P.pos.z - Math.cos(yaw) * 0.6 });
});

/* ---------- Lifecycle ---------- */
efcOn('raid:begin', () => {
  EFC_W.wasHost = efcIsHost();
  if (EFC_W.wasHost) { efcWorldClear(); efcWorldHostBegin(); }
  else { efcWorldClear(); efcNetToHost('w:hello', {}); } // late joiners and re-joiners get the full snapshot
});
// The local player's raid ending does not clear the world (the host keeps running it for the others). A left match does.
efcOn('match:left', () => { efcWorldClear(); });
/* Host migration: a guest that becomes the host carries on with its replicated copy and re-syncs everybody. */
efcOn('tick', () => {
  const h = efcIsHost();
  if (h && !EFC_W.wasHost) { efcWorldBumpNext(); efcNetToAll('w:all', efcWorldSnapshot()); }
  EFC_W.wasHost = h;
});
