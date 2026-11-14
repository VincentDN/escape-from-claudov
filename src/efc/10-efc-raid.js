/* Raid rules for the local player: one life, insertion, extraction, timer, death to a lootable body, end of raid and its summary.
   Engine seams (src/09i-modes.js, 09-game.js, 08-player.js, 09l-fin.js) call the efcRaid* functions below; other packages use the
   events and services of docs/contracts/CONTRACT.md. Weapons and ammunition are in 10-efc-raidkit.js, the HUD in 10-efc-raidhud.js. */
const EFC_RAID = {
  state: 'idle', // 'idle'|'live'|'out'|'dead'|'mia' (the local player)
  len: 0, hold: 0, holdId: '', extract: '', overAt: -1, overSent: false, ended: false, summary: null, killer: '',
  secT: 0, done: {}, // host: lobby id -> result of each human whose raid is over
};

/* Raid seconds elapsed (the host's timer online) */
function efcRaidTime() { return Math.max(0, EFC_RAID.len - Math.max(0, MATCH.timeLeft)); }
function efcRaidExtracts() {
  const md = efcCall('map:data'), t = efcRaidTime(), me = PL.ent;
  return (md && Array.isArray(md.extracts) ? md.extracts : []).map((x) => ({
    id: x.id, name: x.name, x: x.x, z: x.z, r: x.r, openAt: x.openAt || 0, open: t >= (x.openAt || 0), d: Math.hypot(me.pos.x - x.x, me.pos.z - x.z),
  }));
}
efcProvide('raid:state', () => {
  const R = EFC_RAID;
  return { state: R.state, t: efcRaidTime(), left: Math.max(0, MATCH.timeLeft), extracts: efcRaidMode() ? efcRaidExtracts() : [], hold: R.hold, holdId: R.holdId };
});

/* ---------- Start (modeStart, then the end of startMatch) ---------- */
function efcRaidModeStart() {
  const R = EFC_RAID;
  Object.assign(R, { state: 'live', len: EFC.cfg.raidMinutes * 60, hold: 0, holdId: '', extract: '', overAt: -1, overSent: false, ended: false, summary: null, killer: '', secT: 0, done: {} });
  efcRaidKitReset();
  efcSquadAssign();
  efcRaidPlan(true); // players are placed first: the inserts in use are fixed now, then the Wardens are placed around them
  efcEmit('raid:placed');
  for (const e of entities) e.out = false;
  const kit = efcCall('raid:kit');
  EFC.inv = kit && kit.slots ? kit : null; // null without the items package: the engine class loadout is used
}
function efcRaidBegun() { PL.efcKiller = ''; efcEmit('raid:begin'); }

/* ---------- Insert plan: which insert each player squad uses, decided at raid start before any Warden is placed ----------
   Every machine of a lobby derives the same plan without messages: the squads are those of the lobby list, the seed comes from the
   lobby code and the map. The first squad gets a seeded insert (EFC.cfg.insertForce forces it, for tests); each next squad, in squad
   order, the unused insert farthest from those already taken. Offline the seed is random (EFC.cfg.insertSeed fixes it). */
const EFC_INS = { key: '', seed: 0, squads: [], by: {}, used: [] };
function efcRaidSquadList() {
  const S = new Set([0]);
  if (MATCH.online && NET.players) { S.clear(); for (const id of NET.players.keys()) { const s = efcCall('squad:of', id); if (typeof s === 'number') S.add(s); } if (!S.size) S.add(0); }
  return [...S].sort((a, b) => a - b);
}
function efcStrHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function efcRaidPlan(fresh) {
  const md = efcCall('map:data'), L = md && Array.isArray(md.inserts) ? md.inserts : [];
  const P = EFC_INS, map = typeof MAPL !== 'undefined' ? MAPL.id : '';
  if (fresh || P.key !== map) {
    P.key = map; P.by = {}; P.used = [];
    P.seed = MATCH.online ? efcStrHash((NET.code || '') + '|' + map) : typeof EFC.cfg.insertSeed === 'number' ? EFC.cfg.insertSeed >>> 0 : (Math.random() * 4294967296) >>> 0;
    P.squads = [];
    for (const s of efcRaidSquadList()) efcRaidPlanAdd(s, L);
  }
  return P;
}
function efcRaidPlanAdd(s, L) {
  const P = EFC_INS; if (P.by[s] !== undefined || !L.length) return;
  let idx;
  if (!P.used.length) idx = typeof EFC.cfg.insertForce === 'number' ? ((EFC.cfg.insertForce % L.length) + L.length) % L.length : Math.floor(efcRng(P.seed)() * L.length);
  else {
    let bd = -1; const free = L.map((p, i) => i).filter((i) => !P.used.includes(i)), pool = free.length ? free : L.map((p, i) => i);
    for (const i of pool) { const d = Math.min(...P.used.map((j) => Math.hypot(L[i].x - L[j].x, L[i].z - L[j].z))); if (d > bd) { bd = d; idx = i; } }
  }
  P.by[s] = idx; P.squads.push(s); if (!P.used.includes(idx)) P.used.push(idx);
}
/* Service 'raid:inserts': the inserts in use this raid ({ x, z, y, i, squad }) and the squad count; Wardens are placed from it */
efcProvide('raid:inserts', () => {
  if (!efcRaidMode()) return { used: [], squads: 0 };
  const P = efcRaidPlan(false), md = efcCall('map:data'), L = (md && md.inserts) || [];
  return { used: P.squads.map((s) => ({ ...L[P.by[s]], i: P.by[s], squad: s })).filter((p) => p.x !== undefined), squads: P.squads.length };
});

/* Insertion point of the player's squad; members line up behind the leader (inside the shelter: ins.line), else spread around it.
   null falls back to the engine's free-for-all spawn */
function efcRaidInsert(e) {
  const md = efcCall('map:data'), L = md && Array.isArray(md.inserts) ? md.inserts : null;
  if (!L || !L.length) return null;
  const sq = efcSquadOf(e), s = typeof sq === 'number' ? sq : 0;
  efcRaidPlan(false); efcRaidPlanAdd(s, L); // a squad that joined after the start takes the next insert
  const ins = L[EFC_INS.by[s]];
  const k = Math.max(0, efcSquadMembers(sq).indexOf(e)), a = k * 2.1 + (ins.yaw || 0), r = k ? 1.6 : 0;
  const x = ins.line ? ins.x + ins.line[0] * 1.2 * k : ins.x + Math.sin(a) * r, z = ins.line ? ins.z + ins.line[1] * 1.2 * k : ins.z + Math.cos(a) * r;
  const y = gy0(x, z), id = navNode(x, y, z);
  e.efcYaw = ins.yaw || 0;
  return id >= 0 && Math.hypot(NAV.nx[id] - x, NAV.nz[id] - z) < 4 ? new V3(NAV.nx[id], NAV.ny[id], NAV.nz[id]) : new V3(x, y, z);
}

/* ---------- Every logic step of a live raid (modeUpdate) ---------- */
function efcRaidUpdate(dt) {
  const R = EFC_RAID, me = PL.ent;
  for (const e of entities) if (e.out) { e.alive = false; if (e.model) e.model.root.visible = false; } // extracted soldiers stay out of play
  if (R.state === 'live' && me.alive) {
    efcRaidKitTick(dt);
    let inside = null;
    for (const x of efcRaidExtracts()) if (x.open && x.d <= x.r) { inside = x; break; }
    if (!inside) { R.hold = 0; R.holdId = ''; }
    else {
      if (R.holdId !== inside.id) { R.holdId = inside.id; R.hold = 0; }
      R.hold += dt;
      if (R.hold >= EFC.cfg.extractHold) efcRaidExtract(inside);
    }
  } else { R.hold = 0; R.holdId = ''; }
  if (R.overAt >= 0 && MATCH.time >= R.overAt) efcRaidOver();
  if ((R.secT += dt) >= 1) { R.secT = 0; efcRaidHostCheck(); }
}

/* ---------- Ways out ---------- */
function efcRaidValue(items) {
  let v = 0;
  for (const it of items) { const d = it && efcCall('item:def', it.id); if (d && d.value) v += d.value * (it.n || 1); }
  return v;
}
function efcRaidSummary(result) {
  const items = result === 'extracted' ? efcClone(efcCall('inv:all', EFC.inv) || []) : [];
  return { result, kills: PL.ent.kills, time: Math.round(efcRaidTime()), extract: EFC_RAID.extract, items, value: efcRaidValue(items) };
}
/* The local player's raid ends with result: stash committed, then 'raid:over' (now, or after `delay` game seconds) */
function efcRaidEnd(result, delay) {
  const R = EFC_RAID;
  efcRaidKitSync();
  R.state = result === 'extracted' ? 'out' : result; R.hold = 0; R.holdId = '';
  R.summary = efcRaidSummary(result);
  efcCall('raid:commit', result, EFC.inv);
  efcNetToHost('raid:done', { r: result });
  if (delay > 0) R.overAt = MATCH.time + delay; else efcRaidOver();
}
efcOn('died', (v, a) => {
  if (v !== PL.ent || !efcRaidMode() || EFC_RAID.state !== 'live') return;
  efcRaidKitSync();
  const name = MATCH.online && NET.nick ? NET.nick : v.name;
  efcCall('world:body', { x: v.pos.x, y: v.pos.y, z: v.pos.z }, efcClone(efcCall('inv:all', EFC.inv) || []), name);
  EFC_RAID.killer = a && a !== v ? a.name : '';
  efcRaidEnd('dead', 2.5);
});
function efcRaidExtract(x) {
  const e = PL.ent;
  EFC_RAID.extract = x.name;
  efcRaidKitSync();
  // out of play without a death: not alive, hidden, never respawns, no body
  e.out = true; e.alive = false; e.target = null; PL.reload = null; PL.nadeState = null; PL.held = false;
  if (e.model) e.model.root.visible = false;
  VM.root.visible = false;
  efcNetToHost('raid:out', {});
  hudMsg('Extracted at ' + x.name, 'ally', 3);
  efcRaidEnd('extracted', 0);
}
/* Timer at zero (matchFinish in a raid), or the host ends the raid for everybody */
function efcRaidTimeUp() {
  const R = EFC_RAID;
  if (R.ended || !efcRaidMode()) return;
  R.ended = true; MATCH.over = true; MATCH.timeLeft = Math.max(0, MATCH.timeLeft);
  if (MATCH.online && NET.role === 'host') netBroadcast({ t: 'end' }); // the others end their raid too (09c-net.js calls matchFinish)
  if (R.state === 'live') { hudMsg('Missing in action', 'enemy', 3); efcRaidEnd('mia', 0); }
  else if (R.overAt >= 0) efcRaidOver();
}
function efcRaidOver() {
  const R = EFC_RAID;
  if (R.overSent || !R.summary) return;
  R.overSent = true; R.overAt = -1;
  if ((EFC.hooks['raid:over'] || []).length) efcEmit('raid:over', R.summary);
  else efcRaidFallbackSummary(R.summary); // nothing listens: minimal built-in summary with a Leave button (10-efc-raidhud.js)
}
/* Host: the raid ends for everybody once no human is still inside */
function efcRaidHostCheck() {
  const R = EFC_RAID;
  if (!MATCH.online || NET.role !== 'host' || R.ended || efcRaidTime() < 3) return;
  let inside = 0;
  for (const pl of NET.players.values()) {
    if (!pl.ig) continue;
    if (pl.id === NET.me) { if (R.state === 'live') inside++; } else if (!R.done[pl.id]) inside++;
  }
  if (!inside) efcRaidTimeUp();
}
efcNetOnHost('raid:done', (d, from) => { if (typeof from === 'string') EFC_RAID.done[from] = String((d && d.r) || 'dead').slice(0, 12); });
efcNetOnHost('raid:out', (d, from) => { if (typeof from === 'string') efcNetToAll('raid:out', { id: from }); });
efcNetOnClient('raid:out', (d) => {
  if (!d || typeof d.id !== 'string') return;
  const e = d.id === efcMyId() ? PL.ent : MATCH.online && NET.remotes ? NET.remotes.get(d.id) : null;
  if (e) { e.out = true; e.alive = false; if (e.model) e.model.root.visible = false; }
});

/* Back to the menus: offline the match ends and the main menu opens; online, leave as the engine's quit does */
efcProvide('raid:leave', () => {
  efcRaidSummaryClose();
  if (MATCH.state === 'menu') return;
  if (MATCH.online) toMenu(); else toMenu('main');
});
/* Leaving the match (toMenu calls modeEnd): a raid left while still alive inside is lost, like a raid that times out */
function efcRaidModeEnd() {
  const R = EFC_RAID;
  if (R.state === 'idle') return;
  if (R.state === 'live') { efcRaidKitSync(); efcCall('raid:commit', 'mia', EFC.inv); } // (the lobby connection already left: the host sees the player go)
  R.state = 'idle'; R.overAt = -1; R.hold = 0; R.holdId = '';
  EFC.inv = null;
  for (const e of entities) e.out = false;
  efcRaidSummaryClose(); efcRaidHudHide();
  efcEmit('match:left'); // the world package clears its containers and meshes
}
