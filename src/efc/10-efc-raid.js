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
  for (const e of entities) e.out = false;
  const kit = efcCall('raid:kit');
  EFC.inv = kit && kit.slots ? kit : null; // null without the items package: the engine class loadout is used
}
function efcRaidBegun() { PL.efcKiller = ''; efcEmit('raid:begin'); }

/* Insertion point of the player's squad, members spread around it; null falls back to the engine's free-for-all spawn */
function efcRaidInsert(e) {
  const md = efcCall('map:data'), L = md && Array.isArray(md.inserts) ? md.inserts : null;
  if (!L || !L.length) return null;
  const sq = efcSquadOf(e), ins = L[(typeof sq === 'number' ? sq : 0) % L.length];
  const k = Math.max(0, efcSquadMembers(sq).indexOf(e)), a = k * 2.1 + (ins.yaw || 0), r = k ? 1.6 : 0;
  const x = ins.x + Math.sin(a) * r, z = ins.z + Math.cos(a) * r, y = gy0(x, z), id = navNode(x, y, z);
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
