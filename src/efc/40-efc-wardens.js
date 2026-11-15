/* Escape From Claudov, WARDEN package: in a raid the engine's bots are the Wardens, guards of the sealed port town. Each one belongs to a
   guard post of the map ('map:data' guards): it appears there, guards it (holds a spot in the post radius and scans, moves now and then),
   sometimes walks to a neighbouring post and back, radios its post mates when it is hurt or sees an enemy, and comes back as a reinforcement
   only where no human is near or watching. Combat stays the engine's (src/07b-tactics.js). Engine seams, all in the WARDEN files:
   spawnEntity -> efcWardenSpawn, pickGoal -> efcWardenGoal, squadReset -> efcWardenReset, squadIntel and botHurt -> efcWardenAlert,
   botSense -> efcWardenReact, updateBot (dead bot) -> efcWardenCanRespawn, botDiff(b) -> elite posts play at the hardest level. */
const EFC_WARDEN_NAMES = ['Brask', 'Ilse', 'Oderin', 'Vasko', 'Mirela', 'Tolvar', 'Henka', 'Dusan', 'Reyk', 'Ostra', 'Kalven', 'Yarna',
  'Petrik', 'Selda', 'Gorran', 'Lunet', 'Askel', 'Vira', 'Haldo', 'Nessa'];
EFC.cfg.wardenReassign = 20; // seconds a dead Warden waits for its own post before it may reinforce another one
EFC.cfg.wardenHumanR = 45;   // no reinforcement at a post with a living human this close (m)
EFC.cfg.wardenEliteCut = 0.6; // damage share an elite Warden takes from a non-headshot
EFC.wd = { map: null, posts: [], legs: 0 };

function efcWardenBots() { return entities.filter((e) => !e.isPlayer && !e.isRemote); }
function efcWardenPost(b) { return b && b.efcPost >= 0 ? EFC.wd.posts[b.efcPost] || null : null; }

/* New match (squadReset, called by modeStart): forget the last raid; in a raid, hand out the posts again */
function efcWardenReset() {
  const W = EFC.wd; W.map = null; W.posts = []; W.legs = 0;
  if (typeof entities === 'undefined') return;
  for (const e of efcWardenBots()) {
    if (e.efcName) { e.name = e.efcName; e.efcName = null; }
    if (e.squad === 'w') e.squad = undefined;
    e.efcPost = -1; e.efcElite = false; e.efcPatrol = null; e.efcSpot = null; e.efcWaitAt = 0; e.efcDeaths = -1; e.efcOff = false; e.efcStarted = false;
  }
  for (const e of entities) e.efcGrace = null;
  if (efcRaidMode()) efcWardenAssign();
}
efcOn('raid:placed', () => efcWardenAssign()); // RAID fixed the inserts in use: place the Wardens around them

/* Raid start: the raid's Warden number (efcWardenNumber: map size and player squads) of bots become Wardens (squad 'w', a Warden name);
   the other bots are out of play for the whole raid (efcOff: modeRoster keeps them off, never alive, never respawned; online the host
   activates only the bots in play, so the guests' copies follow). Posts: the elite post fields three when the raid has at least
   EFC.cfg.wardenElite3 Wardens, the others one each, then a second each, the posts farthest from the inserts in use first; more go round robin. */
function efcWardenAssign() {
  const W = EFC.wd, md = efcCall('map:data'), G = (md && md.guards) || [], C = EFC.cfg;
  const ri = efcCall('raid:inserts'), used = (ri && ri.used) || [], N = efcWardenNumber(ri && ri.squads ? ri.squads : 1);
  W.map = typeof MAPL !== 'undefined' ? MAPL.id : null; W.legs = 0; W.n = N; W.used = used.map((p) => ({ x: p.x, z: p.z, y: gy0(p.x, p.z) }));
  W.posts = G.map((g, i) => ({ i, x: g.x, z: g.z, r: g.r || 10, n: 0, elite: !!g.elite, y: gy0(g.x, g.z), nodes: null, members: [],
    patrolT: MATCH.time + rand(8, 30), alertT: -99 }));
  const all = efcWardenBots(), bots = all.slice(0, N);
  all.forEach((b, k) => {
    if (!b.efcName) b.efcName = b.name;
    b.name = 'Warden ' + EFC_WARDEN_NAMES[k % EFC_WARDEN_NAMES.length];
    b.squad = 'w'; b.efcPost = -1; b.efcElite = false; b.efcPatrol = null; b.efcSpot = null; b.efcWaitAt = 0; b.efcDeaths = -1; b.efcStarted = false;
    b.efcOff = k >= N;
    if (b.efcOff) { b.off = true; b.alive = false; b.respawnT = Infinity; b.target = null; if (b.model) { b.model.rag = null; b.model.root.visible = false; } }
  });
  if (!W.posts.length) return;
  const away = (p) => (W.used.length ? Math.min(...W.used.map((u) => hyp(u.x - p.x, u.z - p.z))) : 0);
  const order = W.posts.slice().sort((a, b) => b.elite - a.elite || away(b) - away(a) || a.i - b.i);
  let k = 0;
  const give = (p) => { if (k < bots.length) { p.members.push(bots[k++]); p.n++; } };
  if (order[0].elite && N >= C.wardenElite3) for (let j = 0; j < 3; j++) give(order[0]);
  for (let round = 0; round < 2 && k < bots.length; round++) for (const p of order) if (p.members.length <= round) give(p);
  for (let j = 0; k < bots.length; j++) give(order[j % order.length]);
  for (const p of W.posts) for (const b of p.members) { b.efcPost = p.i; b.efcElite = p.elite; }
}
function efcWardenEnsure() { if (efcRaidMode() && (!EFC.wd.posts.length || EFC.wd.map !== MAPL.id)) efcWardenAssign(); }

/* Ground nav nodes inside a post's radius (cached), or any node there when the post stands on a roof or a deck */
function efcPostNodes(p) {
  if (p.nodes) return p.nodes;
  const ground = [], any = [], r = p.r - 0.5;
  for (let cz = Math.floor(p.z - r - NAV.z0); cz <= Math.floor(p.z + r - NAV.z0); cz++) for (let cx = Math.floor(p.x - r - NAV.x0); cx <= Math.floor(p.x + r - NAV.x0); cx++) {
    if (cx < 0 || cz < 0 || cx >= NAV.W || cz >= NAV.H) continue;
    for (const id of NAV.cells[cz * NAV.W + cx]) {
      if (NAV.comp[id] !== NAV.mainComp || hyp(NAV.nx[id] - p.x, NAV.nz[id] - p.z) > r) continue;
      any.push(id); if (Math.abs(NAV.ny[id] - gy0(NAV.nx[id], NAV.nz[id])) < 0.6) ground.push(id);
    }
  }
  p.nodes = ground.length ? ground : any;
  if (!p.nodes.length) { const id = navNode(p.x, p.y, p.z); p.nodes = id >= 0 ? [id] : []; }
  return p.nodes;
}
/* A free spot of the post (no soldier within 0.9 m, room for the body), facing out from the post centre; inner: share of the radius used */
function efcWardenSpot(p, self, inner = 1, keep = null) {
  const N = efcPostNodes(p); if (!N.length) return null;
  let id = -1;
  for (let k = 0; k < (keep ? 40 : 24) && id < 0; k++) {
    const c = N[Math.floor(Math.random() * N.length)], x = NAV.nx[c], y = NAV.ny[c], z = NAV.nz[c];
    if (k < 16 && hyp(x - p.x, z - p.z) > p.r * inner) continue;
    if (keep && !keep(x, y, z)) continue;
    if (!botSpotFree(x, z, y, false)) continue;
    if (entities.some((o) => o !== self && o.alive && Math.abs(o.pos.y - y) < 1.2 && hyp(o.pos.x - x, o.pos.z - z) < 0.9)) continue;
    id = c;
  }
  if (id < 0 && keep) { const ok = N.filter((c) => keep(NAV.nx[c], NAV.ny[c], NAV.nz[c])); if (!ok.length) return null; id = ok[Math.floor(Math.random() * ok.length)]; }
  if (id < 0) id = N[Math.floor(Math.random() * N.length)];
  const v = new V3(NAV.nx[id], NAV.ny[id], NAV.nz[id]), dx = v.x - p.x, dz = v.z - p.z;
  v.yaw = hyp(dx, dz) > 0.5 ? Math.atan2(-dx, -dz) : Math.random() * TAU;
  return v;
}

/* ---------- Around the inserts in use (EFC.wd.used, from 'raid:inserts') ---------- */
/* No Warden starts within EFC.cfg.wardenStartR of a used insert or in sight of it */
function efcStartOk(x, y, z) {
  const R = EFC.cfg.wardenStartR, eye = new V3(x, y + 1.6, z);
  for (const u of EFC.wd.used || []) {
    if (hyp(x - u.x, z - u.z) < R) return false;
    if (hyp(x - u.x, z - u.z) < 160 && lineClear(eye, new V3(u.x, u.y + 1.6, u.z))) return false;
  }
  return true;
}
/* For the first EFC.cfg.bubbleTime seconds of the raid, Warden goals stay out of EFC.cfg.bubbleR around used inserts */
function efcBubbleOn() { return MATCH.time < EFC.cfg.bubbleTime && (EFC.wd.used || []).length > 0; }
function efcBubbleOk(x, y, z) { for (const u of EFC.wd.used || []) if (hyp(x - u.x, z - u.z) < EFC.cfg.bubbleR) return false; return true; }
/* Posts by distance from p (p first) */
function efcPostsFrom(p) { return EFC.wd.posts.slice().sort((a, b) => hyp(a.x - p.x, a.z - p.z) - hyp(b.x - p.x, b.z - p.z)); }
/* First placement of a Warden: a spot of its post that obeys efcStartOk, else of the nearest post that has one, else the post node
   farthest from the used inserts */
function efcWardenStartSpot(b) {
  const home = efcWardenPost(b); if (!home) return null;
  for (const p of efcPostsFrom(home)) { const s = efcWardenSpot(p, b, 1, efcStartOk); if (s) return s; }
  let best = null, bd = -1;
  for (const p of EFC.wd.posts) for (const c of efcPostNodes(p)) {
    const d = Math.min(...EFC.wd.used.map((u) => hyp(NAV.nx[c] - u.x, NAV.nz[c] - u.z))); if (d > bd) { bd = d; best = [p, c]; }
  }
  if (!best) return efcWardenSpot(home, b);
  const v = new V3(NAV.nx[best[1]], NAV.ny[best[1]], NAV.nz[best[1]]); v.yaw = Math.random() * TAU;
  return v;
}

/* spawnEntity seam: where a Warden appears (null: the engine's spawn) */
function efcWardenSpawn(e) {
  efcWardenEnsure();
  if (efcWardenPaced(e)) efcPaceReset(e); // a new life starts idle, weapon at low ready (41-efc-warden-pose.js)
  const s = e.efcSpot; e.efcSpot = null; e.efcPatrol = null;
  if (s) return s;
  const p = efcWardenPost(e); if (!p) return null;
  if (!e.efcStarted) { e.efcStarted = true; return efcWardenStartSpot(e); }
  return efcWardenSpot(p, e, 1, efcBubbleOn() ? efcBubbleOk : null) || efcWardenSpot(p, e);
}

/* ---------- Living humans near a post, or watching a spot (reinforcements) ---------- */
function efcHumans() { return entities.filter((e) => (e.isPlayer || e.isRemote) && e.alive && !e.off && e.squad !== 'w'); }
function efcWardenPostOk(p, spot) {
  const H = efcHumans(), at = new V3(spot.x, spot.y + 1.5, spot.z), mid = new V3(spot.x, spot.y + 0.9, spot.z), eye = new V3();
  for (const h of H) {
    if (hyp(h.pos.x - p.x, h.pos.z - p.z) < EFC.cfg.wardenHumanR) return false;
    entEye(h, eye);
    if (lineClear(eye, at) || lineClear(eye, mid)) return false;
  }
  return true;
}
/* updateBot seam, when a dead Warden's timer ends: true when it may come back now (its spot is stored for efcWardenSpawn). Its own post
   first; after EFC.cfg.wardenReassign seconds of waiting, the nearest other post that qualifies. */
function efcWardenCanRespawn(b, now) {
  efcWardenEnsure();
  const W = EFC.wd, home = efcWardenPost(b); if (!home) return true;
  if (!b.efcWaitAt) b.efcWaitAt = now;
  const order = [home];
  if (now - b.efcWaitAt >= EFC.cfg.wardenReassign) order.push(...W.posts.filter((p) => p !== home).sort((a, c) => hyp(a.x - home.x, a.z - home.z) - hyp(c.x - home.x, c.z - home.z)));
  for (const p of order) {
    const s = efcWardenSpot(p, b, 1, efcBubbleOn() ? efcBubbleOk : null); if (!s || !efcWardenPostOk(p, s)) continue;
    if (p !== home) { home.members = home.members.filter((o) => o !== b); p.members.push(b); b.efcPost = p.i; b.efcElite = p.elite; }
    b.efcSpot = s; b.efcWaitAt = 0;
    return true;
  }
  return false;
}

/* ---------- Guard and patrol: the raid's goal source (pickGoal seam) ---------- */
function efcGuardGoal(p, b, walk) {
  const taken = (v) => entities.some((o) => o !== b && o.alive && o.goal && o.squad === 'w' && hyp(o.goal.x - v.x, o.goal.z - v.z) < 2.5);
  let v = null;
  const keep = efcBubbleOn() ? efcBubbleOk : null; // (first seconds of the raid: never towards a used insert)
  for (let k = 0; k < 4 && (!v || taken(v)); k++) v = efcWardenSpot(p, b, 0.7, keep) || (keep ? efcWardenSpot(p, b, 1, keep) : null);
  if (!v && keep) { // the whole post is inside the bubble: hold where it stands (it starts outside), facing away from the insert
    v = b.pos.clone(); v.yaw = b.yaw || 0;
  }
  if (!v) return null;
  const a = v.yaw + rand(-0.6, 0.6); // look outwards, a little to one side
  v.hold = true; v.holdFor = rand(6, 14); v.look = { x: v.x - Math.sin(a) * 20, z: v.z - Math.cos(a) * 20 }; v.walk = walk; v.efc = 'guard';
  return v;
}
function efcNeighbour(p) {
  let best = null, bd = 1e9;
  for (const q of EFC.wd.posts) { // (a post whose area overlaps this one is not a patrol destination)
    const d = hyp(q.x - p.x, q.z - p.z); if (q === p || d < p.r + q.r) continue; if (d < bd) { bd = d; best = q; }
  }
  return best;
}
/* A patrol leaves now and then: one Warden, or two from a post of three or more when at least 14 Wardens are up; at most one patrol
   per ten Wardens at a time, so most of them stay at their posts */
function efcPatrolStart(p, b, now) {
  const W = EFC.wd, q = efcNeighbour(p); p.patrolT = now + rand(35, 70);
  if (!q || now - p.alertT < 30 || (efcBubbleOn() && !efcBubbleOk(q.x, q.y, q.z))) return;
  const alive = entities.filter((o) => o.alive && o.squad === 'w'), out = new Set(alive.filter((o) => o.efcPatrol).map((o) => o.efcPatrol.id));
  if (out.size >= Math.max(1, Math.floor(alive.length / 10))) return;
  const id = now + Math.random(), mates = p.members.filter((o) => o !== b && o.alive && !o.visible && o.tactic === 'roam' && o.efcPost === p.i);
  const group = [b].concat(mates.length >= 2 && alive.length >= 14 && Math.random() < 0.5 ? [mates[0]] : []); // a pair only when enough Wardens stay home
  for (const o of group) { o.efcPatrol = { id, to: q.i, stage: 'out', fails: 0 }; if (o !== b) { o.goal = null; o.path = null; o.holdT = 0; } }
}
function efcWardenGoal(b, now) {
  efcWardenEnsure();
  const W = EFC.wd, p = efcWardenPost(b); if (!p) return null;
  const P = b.efcPatrol;
  if (P) {
    const q = W.posts[P.to], tgt = P.stage === 'out' ? q : p, d = hyp(b.pos.x - tgt.x, b.pos.z - tgt.z);
    if (d < tgt.r) { W.legs++; if (P.stage === 'out') P.stage = 'back'; else b.efcPatrol = null; } // a leg is done
    else if (++P.fails > 8) b.efcPatrol = null; // asked again and again without getting there (no path, stuck): give up
    if (b.efcPatrol) {
      const g = efcGuardGoal(P.stage === 'out' ? q : p, b, true);
      if (g) { g.holdFor = rand(2.5, 5); g.efc = 'patrol'; return g; }
      b.efcPatrol = null;
    }
  } else if (now >= p.patrolT && hyp(b.pos.x - p.x, b.pos.z - p.z) < p.r + 2 && now - b.lastSeenT > 20) {
    efcPatrolStart(p, b, now);
    if (b.efcPatrol) return efcWardenGoal(b, now);
  }
  return efcGuardGoal(p, b, hyp(b.pos.x - p.x, b.pos.z - p.z) < p.r + 4);
}

/* ---------- Group alert (radio call) ---------- */
/* A Warden that sees an enemy or is hurt tells the mates of its post (not the other posts) where it is; they turn to it and converge
   through the engine's hunt and search tactics */
function efcWardenAlert(b, foe, now) {
  const p = efcWardenPost(b); if (!p || !foe || allied(foe, b)) return;
  b.efcPatrol = null;
  if (now - p.alertT < 1.5) return;
  p.alertT = now;
  for (const o of entities) {
    if (o === b || !o.alive || o.isPlayer || o.isRemote || o.efcPost !== p.i || o.visible) continue;
    const d = hyp(foe.pos.x - o.pos.x, foe.pos.z - o.pos.z);
    o.efcPatrol = null; o.holdT = 0; o.goal = null; o.path = null;
    o.lastKnown.copy(botGuess(o.pos, foe.pos, 2, 0.06)); o.lastSeenT = now - 1; o.warnT = now + 15;
    o.chaseE = foe; o.contactT = now; o.contactD = Math.min(d, 40); // (botChasing: they keep looking for it the engine's chase time)
    o.aw.set(foe, Math.max(o.aw.get(foe) || 0, 0.5));
    botLookAt(o, o.lastKnown, now, 1.5); o.decideT = Math.min(o.decideT, rand(0.2, 0.5));
  }
}
/* botSense seam: extra reaction time (s) of a Warden that had not noticed anything when it first sees an enemy far away */
function efcWardenReact(b, foe, now) {
  if (b.efcPost === undefined || b.efcPost < 0 || now - b.lastSeenT < 6 || now < b.warnT) return 0;
  return clamp((hyp(foe.pos.x - b.pos.x, foe.pos.z - b.pos.z) - 25) / 50, 0, 0.7);
}

/* ---------- Insertion grace: Wardens cannot see or hear a human for EFC.cfg.graceTime s after insertion, until it fires or has moved
   EFC.cfg.graceMove m (botSense asks efcWardenGrace). Not invulnerable: other players can still shoot it. ---------- */
function efcIsHumanEnt(e) { return !!e && (e.isPlayer || (e.isRemote && !e.remoteBot)); }
function efcGraceCheck(e) {
  if (!e.alive) return;
  const G = e.efcGrace || (e.efcGrace = { t: MATCH.time, x: e.pos.x, z: e.pos.z, shot: e.lastShotT, on: true });
  if (G.on && (MATCH.time - G.t > EFC.cfg.graceTime || e.lastShotT > G.shot || hyp(e.pos.x - G.x, e.pos.z - G.z) >= EFC.cfg.graceMove)) G.on = false;
}
function efcWardenGrace(e) {
  if (!efcRaidMode() || !efcIsHumanEnt(e)) return false;
  efcGraceCheck(e);
  return !!(e.efcGrace && e.efcGrace.on);
}
efcOn('tick', () => { for (const e of entities) if (efcIsHumanEnt(e)) efcGraceCheck(e); });

/* ---------- Damage, death, loot ---------- */
efcOn('damage', (dmg, victim, attacker, weapon, head) => (efcRaidMode() && victim && victim.efcElite && !head ? dmg * EFC.cfg.wardenEliteCut : undefined));
/* Elite Warden? A guest knows the host's Wardens by their bot id: its own copy of the assignment is the same (same rule, same inserts) */
function efcWardenIsElite(a) {
  if (a.efcElite) return true;
  const m = a.isRemote && a.remoteBot && typeof a.peer === 'string' ? /~b(\d+)$/.exec(a.peer) : null, o = m ? entities.find((e) => !e.isRemote && e.id === +m[1]) : null;
  return !!(o && o.efcElite);
}
/* One-shot rule: a single non-headshot hit (every pellet of the same shot) of a regular Warden leaves a human that was at full health
   with at least EFC.cfg.oneShotLeft health. Headshots and elite Wardens are unchanged. */
efcOn('damage', (dmg, v, a, weapon, head) => {
  if (!efcRaidMode() || !a || head || a.squad !== 'w' || !efcIsHumanEnt(v) || efcWardenIsElite(a)) return undefined;
  const S = v.efcShot, same = S && S.a === a && S.t === MATCH.time;
  if (!same) { if (v.health < 100) { v.efcShot = null; return undefined; } v.efcShot = { a, t: MATCH.time }; }
  return Math.max(0, Math.min(dmg, v.health - EFC.cfg.oneShotLeft));
});
efcOn('died', (v, a) => {
  if (!efcRaidMode() || !v || v.isPlayer || v.isRemote || v.squad !== 'w') return;
  v.efcPatrol = null; v.efcWaitAt = 0;
  if (a && a !== v) efcWardenAlert(v, a, MATCH.time);
  efcCall('world:body', { x: v.pos.x, y: v.pos.y, z: v.pos.z }, efcCall('loot:roll', v.efcElite ? 'warden_elite' : 'warden') || [], v.name);
});

/* ---------- Service ---------- */
efcProvide('warden:info', () => {
  const W = EFC.wd, ws = typeof entities === 'undefined' ? [] : entities.filter((e) => e.squad === 'w' && !e.isPlayer);
  return {
    alive: ws.filter((e) => e.alive).length,
    posts: W.posts.map((p) => ({ x: p.x, z: p.z, r: p.r, elite: p.elite, n: p.members.length, alive: p.members.filter((e) => e.alive).length })),
  };
});
