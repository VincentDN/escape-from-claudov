/* Raid squads: who is allied with whom (e.squad, see docs/contracts/CONTRACT.md). Humans get a player squad 0..3, every other soldier
   is a Warden (squad 'w'). allied() in src/09i-modes.js asks efcSquadOf during a raid.
   Online, a lobby package may provide service 'squad:of' (player id -> squad number); without it a human's squad is its engine team. */
function efcIsHuman(e) { return !!e && (e.isPlayer || (e.isRemote && !e.remoteBot)); }
/* Squad of a human from the lobby, else its team (online), else 0 (offline: the local player is squad 0) */
function efcSquadHuman(e) {
  if (!MATCH.online) return 0;
  const id = e.isPlayer ? NET.me : e.peer, s = id ? efcCall('squad:of', id) : undefined;
  return typeof s === 'number' ? s : e.team === 1 ? 1 : 0;
}
/* The soldier's squad, set on first use (a remote player who joins mid-raid gets it here) */
function efcSquadOf(e) {
  if (!e) return undefined;
  if (e.squad === undefined || e.squad === null) e.squad = efcIsHuman(e) ? efcSquadHuman(e) : 'w';
  return e.squad;
}
/* Raid start: humans take their current squad; others keep a squad a package gave them, else become Wardens */
function efcSquadAssign() {
  for (const e of entities) {
    if (efcIsHuman(e)) e.squad = efcSquadHuman(e);
    else if (e.squad === undefined || e.squad === null || typeof e.squad === 'number') e.squad = 'w';
  }
}
/* Humans of a squad, in the same order on every machine (the local player by its lobby id, remote players by theirs) */
function efcSquadMembers(squad) {
  const key = (e) => (e.isPlayer ? (MATCH.online ? NET.me || '' : '') : e.peer || '');
  return entities.filter((e) => efcIsHuman(e) && efcSquadOf(e) === squad).sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}
