# Brief: RAID package

Add the `raid` mode and its rules. You own the engine files listed for RAID in the contract and new files
`src/efc/10-efc-raid.js`, `10-efc-raidhud.js`, `11-efc-squad.js`.

Engine sites: MODES, modeStart, modeRoster, modeUpdate, allied, soundFoe, chooseSpawn, spawnOpening in `src/09i-modes.js`;
applyDamage, killEnt, startMatch, endMatch, matchTick in `src/09-game.js`; giveLoadout and the respawn test
(`PL.deathT > modeDef().respawn ... respawnPlayer()`) in `src/08-player.js`; killcam respawns in `src/09b-killcam.js`; matchFinish
in `src/09l-fin.js`. Today there are three modes (tdm, ffa, dom), all with respawn and two teams.

1. `MODES.raid` exists; startMatch accepts `Settings.mode === 'raid'` offline and `NET.cfg.mode === 'raid'` online. No kill limit.
   Raid length is `EFC.cfg.raidMinutes` (drives `MATCH.timeLeft`).
2. Hostility by squad: in raid `allied(a, b)` is true only when `a === b` or `a.squad === b.squad` (squad defined); soundFoe
   likewise. Audit every `MATCH.mode === 'ffa'` / `!== 'ffa'` and direct `.team` comparison in your files: raid behaves like
   free-for-all wherever ffa means "there are not two sides" (scoring, scoreboard, spawns, outfit colours: squadmates look allied,
   everyone else hostile). Offline the local player has squad 0. A soldier that is not a human gets squad `'w'` at raid start if it
   has none. In raid all bots are in play (modeRoster must not cut the roster as ffa does).
3. One life for humans: the local player never respawns in a raid (the player respawn test and both killcam respawn sites); the
   killcam is off in raid. Bots keep respawning, with delay `EFC.cfg.wardenRespawn`.
4. Insertion: the local player spawns at `efcCall('map:data').inserts[squad % inserts.length]` with a small offset per squad
   member; fall back to the engine's ffa spawn when map data is missing. Leave bots to the engine's ffa spawn logic.
5. Seams, only for soldiers simulated on this machine: in applyDamage after the remote-victim branch
   `dmg = efcFilter('damage', dmg, victim, attacker, weapon, head)`; in killEnt `efcEmit('died', victim, attacker)`; in modeUpdate
   during a live raid `efcEmit('tick', dt)`. In raid killEnt does not call dropKilledWeapon, and killstreaks are disabled
   (rewards, HUD, calls).
6. Inventory and weapons: at raid start `EFC.inv = efcCall('raid:kit')` (null when ITEMS is absent: use the engine class loadout).
   giveLoadout in raid builds weapons from `efcCall('inv:weapons', EFC.inv)` when it returns something. Keep `Item.mag` /
   `Item.res` of the equipped weapon items in sync with the engine weapon state: write engine to item before any rebuild and at raid
   end; apply item to engine after a rebuild. On event `inv:changed`, rebuild the player's weapons only if the primary or sidearm
   slot item changed. Provide service `ammo:give(fam, n) -> leftover` (adds rounds to the reserve of an equipped weapon of that
   family up to the engine's maximum). Once a second, top up equipped weapons' reserve from `ammo` items in `EFC.inv.bag` of the
   matching family (services `item:def`, `inv:remove`; emit `inv:changed` when something moved). Emit `loadout` after each rebuild.
7. Death of the local player in a raid: `efcCall('world:body', {x,y,z}, efcCall('inv:all', EFC.inv) || [], name)`, state `'dead'`,
   build the Summary, `efcCall('raid:commit', 'dead', EFC.inv)`, then `efcEmit('raid:over', summary)` about 2.5 s after death.
8. Extraction: alive inside an open extract (distance <= r, raid time >= openAt) for `EFC.cfg.extractHold` seconds without
   leaving: state `'out'`, `e.out = true`, the soldier leaves play without a death or a body (not alive, hidden, cannot be targeted
   or damaged, never respawns), `raid:commit('extracted', EFC.inv)`, then `raid:over`.
9. Timer: at zero every human still in the raid is `'mia'` (gear lost): commit and `raid:over`. In raid, matchFinish leads there
   instead of the engine's win/loss sequence.
10. After the local player's raid is over: offline the match ends and the game returns to the main menu when the summary is
    dismissed. Online the match continues for the others; the host keeps simulating (bots, world) even when its own player is dead
    or out, and ends the match for everybody when no human remains in the raid or the timer hits zero. Service `raid:leave()` goes
    back to the menu cleanly (offline: end the match and open the main menu; online: leave as the engine's quit does). If nothing
    listens to `raid:over`, show a minimal built-in summary overlay with a "Leave" button so the game is never stuck.
11. Service `raid:state` per the contract. Raid HUD (`10-efc-raidhud.js`, DOM built from JS with an injected `<style>`; do not edit
    `shell.html`): hide the team score parts, keep the timer, list the extracts with name, distance and open/closed, an
    "Extracting 4.2 s" progress bar, squad members' names with alive / out / dead.
12. Test `tools/dev/efc/test-raid.mjs` (logic stepping): (a) a solo raid on simoun starts in mode raid, state `'live'`; (b) kill the
    player through the engine damage path: no respawn after 15 game seconds, state `'dead'`, `raid:over` fired with result `'dead'`;
    (c) fresh raid: teleport the player into an extract, 8 s: state `'out'`, result `'extracted'`; leaving midway resets the hold;
    (d) fresh raid: force 1 s left: result `'mia'`; (e) allied() is false between the player and a bot, true between two bots.
    Also run `MODE=raid node tools/dev/efc/smoke.mjs`, and the default tdm smoke must still pass.
