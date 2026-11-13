/* Escape From Claudov, NETLOBBY package: online raids with squads.
   The engine's online layer (src/09c-net.js) calls these helpers wherever it used to assume two teams:
   - in a raid lobby a player's `t` is a squad index 0..EFC.cfg.squads-1, at most EFC.cfg.squadMax per squad;
   - in a raid match every human keeps e.team = 0 and carries e.squad (its lobby squad), host bots carry squad 'w' (Wardens);
   - a soldier whose raid is over (e.out, set by RAID) publishes the flag `o` and is removed from play on every machine;
   - a dead human is never revived on another machine for the rest of the raid.
   Other modes keep the engine's two teams. MODES.raid may be missing (RAID package): the string 'raid' is accepted directly. */

/* Is the lobby (or the given mode) a raid? */
function efcNetIsRaid(mode) { return (mode === undefined ? NET.cfg && NET.cfg.mode : mode) === 'raid'; }
/* Number of lobby groups: squads in a raid, two teams otherwise */
function efcNetGroups(mode) { return efcNetIsRaid(mode) ? Math.max(1, EFC.cfg.squads | 0) : 2; }
/* Seats per group (a team in other modes is only limited by NET_MAX) */
function efcNetCap(mode) { return efcNetIsRaid(mode) ? Math.max(1, EFC.cfg.squadMax | 0) : NET_MAX; }
/* A received lobby group index, validated for the lobby mode */
function efcNetTeamOk(t, mode) {
  if (!efcNetIsRaid(mode)) return t === 1 ? 1 : 0;
  return Number.isInteger(t) && t >= 0 && t < efcNetGroups(mode) ? t : 0;
}
/* Players per group; `except`: a player id left out of the count (the one moving) */
function efcNetCounts(except) {
  const c = new Array(efcNetGroups()).fill(0);
  for (const p of NET.players.values()) if (p.id !== except && p.t >= 0 && p.t < c.length) c[p.t]++;
  return c;
}
/* Squad of a new raid player: the first with room (else the emptiest) */
function efcNetFirstSquad(cnt) {
  const cap = efcNetCap();
  for (let s = 0; s < cnt.length; s++) if (cnt[s] < cap) return s;
  return cnt.indexOf(Math.min(...cnt));
}
/* Next group for a player who asks to change: raid cycles through the squads and skips full ones; other modes swap teams */
function efcNetNextTeam(t, id) {
  if (!efcNetIsRaid()) return 1 - t;
  const cnt = efcNetCounts(id), n = cnt.length, cap = efcNetCap();
  for (let i = 1; i < n; i++) { const s = (t + i) % n; if (cnt[s] < cap) return s; }
  return t;
}
/* Host, after a mode change: every player gets a valid group (kept when it still fits) */
function efcNetFixTeams() {
  const raid = efcNetIsRaid(), n = efcNetGroups(), cap = efcNetCap(), cnt = new Array(n).fill(0), moved = [];
  for (const p of NET.players.values()) {
    if (Number.isInteger(p.t) && p.t >= 0 && p.t < n && cnt[p.t] < cap) cnt[p.t]++;
    else moved.push(p);
  }
  for (const p of moved) { p.t = raid ? efcNetFirstSquad(cnt) : cnt[1] < cnt[0] ? 1 : 0; cnt[p.t]++; }
}
/* Raid settings of a lobby configuration: length from EFC.cfg.raidMinutes, no kill limit (a value no score reaches) */
function efcNetRaidCfg() { return { time: EFC.cfg.raidMinutes, limit: 9999 }; }

/* ---------- Lobby screen: one column per squad, mine first ---------- */
function efcNetSquadName(t) { return 'Squad ' + (t + 1); }
function efcNetStage(head, note, foot) {
  const n = efcNetGroups(), me = NET.players.get(NET.me), mine = me ? efcNetTeamOk(me.t) : 0, cnt = efcNetCounts(), cap = efcNetCap();
  const order = [mine]; for (let t = 0; t < n; t++) if (t !== mine) order.push(t);
  return { head, note, foot, cols: order.map((t) => ({ cls: t === mine ? 'ally' : 'enemy', head: `${esc(efcNetSquadName(t))} <span>${cnt[t]}/${cap}</span>`, rows: netPlayerRows(t, false) })) };
}

/* ---------- In a raid match ---------- */
/* My squad: set when the match starts (netStartOnline) from my lobby entry */
function efcNetSquadSet(t) { NET.squad = efcNetTeamOk(t); }
/* Kept right every network update: my soldier's squad, and every remote human's from its lobby entry (late joiners and lobby changes
   included); bots of the host are Wardens */
function efcNetSquads() {
  if (!efcNetIsRaid()) return;
  if (PL.ent && NET.squad != null) PL.ent.squad = NET.squad;
  for (const [id, e] of NET.remotes) {
    if (e.remoteBot) { e.squad = 'w'; continue; }
    const p = NET.players.get(id);
    if (p) e.squad = efcNetTeamOk(p.t);
    else if (e.squad == null) e.squad = -1; // not in the lobby list (yet): nobody's ally
  }
}
/* A remote soldier was seen dying (state or kill event): in a raid a human stays dead */
function efcNetDied(e) { if (efcNetIsRaid() && !e.remoteBot) e.netDied = true; }
/* May a remote soldier that publishes "alive" again come back? Not a dead or out human in a raid */
function efcNetMayRevive(e) { return !e.out && !(efcNetIsRaid() && e.netDied && !e.remoteBot); }
/* The remote soldier's raid is over (it published `o`): gone for everybody, without death animation or kill-feed line */
function efcNetOut(e) {
  e.out = true; e.alive = false; e.pred = false; e.visible = false; e.health = 0; e.target = null;
  if (e.model) { e.model.rag = null; e.model.root.visible = false; }
  for (const o of entities) if (o.target === e) o.target = null;
}

/* Service 'squad:of' (used by RAID online): a lobby player's squad index, or undefined when the id is not a lobby player or the lobby
   is not a raid. My own id gives my squad. */
efcProvide('squad:of', (id) => {
  if (!efcNetIsRaid() || NET.role === 'off') return undefined;
  const p = NET.players.get(id);
  if (p) return efcNetTeamOk(p.t);
  return id === NET.me && NET.squad != null ? NET.squad : undefined;
});
