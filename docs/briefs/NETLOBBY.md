# Brief: NETLOBBY package

Make the online lobby and match support raids with squads, and build the two-client test rig. You own `src/09c-net.js`,
`src/09cb-serveurs.js`, `src/09d-netrelay.js`, new `src/efc/35-efc-netlobby.js`, `tools/dev/efc/fakepeer.js`,
`tools/dev/efc/net2.mjs`, `tools/dev/efc/test-net.mjs`.

Engine: `src/09c-net.js` (1450 lines) is the online layer: host-centred lobbies over PeerJS (WebRTC) with an optional WebSocket
relay; its header comment explains the model. `NET.players` holds lobby players with a team `t` that is 0 or 1 (validated in
several places as `t === 1 ? 1 : 0`); `NET_MAX = 8`. The host simulates bots (`netBot`, netRebalanceBots, netBotOn/Off). Each
participant publishes its state about 15 times a second (netPresence / netApply). The core bus message `{ t: 'efc', k, d }` is
already wired. The RAID package adds `MODES.raid` and makes `allied` use `e.squad`; it may be missing in your worktree: accept the
string `'raid'` directly and guard `MODES.raid`.

1. Lobby configuration accepts mode `'raid'` wherever a mode is validated or listed, and `'raid'` is the default mode of a new
   lobby. Raid length comes from `EFC.cfg.raidMinutes`; the kill-limit setting is hidden or ignored in raid.
2. Squads: in a raid lobby a player's `t` is a squad index `0..EFC.cfg.squads-1` (4 squads), at most `EFC.cfg.squadMax` (3) per
   squad. A new player goes to the first squad with room. A player (and the host for others, as today's team swap allows) can cycle
   squads; full squads are skipped. Update every site that assumes two teams for lobby players (validation, counts, lobby rows,
   swap). The lobby shows "Squad 1..4" with members. Other modes keep working as before.
3. In a raid match: `PL.ent.squad` is my squad index; every remote soldier gets `e.squad` from its lobby entry (kept right when
   lobby data changes or a player joins late); `e.team` of all humans stays 0. All host bots are active in a raid regardless of
   player counts (netRebalanceBots must not balance two teams in raid) and carry `squad = 'w'`, on guests' copies too.
4. A soldier whose raid is over is gone for everybody: publish an "out" flag in the per-participant state from `e.out` of the local
   player's soldier (RAID sets it) and apply it to the remote copy (`e.out = true`, not alive, hidden, not targetable, no death
   animation, no kill-feed line). A dead human stays dead for the rest of the raid on every machine.
5. The kill feed, score rows and end-of-match flow of online games must not break in raid: when the host ends the raid (`'end'`
   message) guests go through matchFinish, which RAID handles; do not add your own summary.
6. Test rig. `fakepeer.js`: a stand-in for the PeerJS `Peer` class (the subset the game uses: constructor(id, opts), on('open' |
   'connection' | 'error' | 'close' | 'disconnected'), connect(id, opts) returning a DataConnection with send, close, on('open' |
   'data' | 'close' | 'error'), open, peer; destroy...) over BroadcastChannel, so two same-origin pages in one browser can talk.
   `net2.mjs`: a tiny static HTTP server on `dist/` (node http, random port), two pages (host and guest) with fakepeer injected
   before the game's scripts (the real PeerJS CDN script is blocked by routing), helpers `createLobby(hostPage, { mode, map })`,
   `joinLobby(guestPage, code)`, `launch(hostPage)`, `waitInMatch(page)`, `stepBoth(pages, seconds)` (alternates 0.2 s slices of
   `matchTick` between the pages and yields to the event loop between slices so messages are delivered). Drive the same functions
   the menus call (netHost, netJoinLobby, netLaunch, the loading phase).
7. `test-net.mjs`: (a) host creates a raid lobby, guest joins by code, both listed, squads as specified; (b) launch: both reach
   `MATCH.state === 'playing'` in mode raid (if `MODES.raid` is missing in your worktree add a minimal stand-in in the test page
   only); each sees the other's soldier in `entities` as remote with the right squad; (c) bus round trip: guest
   `efcNetToHost('t:ping', 1)` -> host handler -> `efcNetToAll('t:pong', 2)` -> received on both; `efcNetTo(guestId, ...)` reaches
   only the guest; (d) the guest moves and the host's copy follows; (e) `PL.ent.out = true` on the guest makes the host's copy not
   alive and hidden within 2 s of game time; (f) a tdm lobby still launches.

In your final report also say how another test should use `net2.mjs`.
