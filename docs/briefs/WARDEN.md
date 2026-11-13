# Brief: WARDEN package

In raid mode the bots are "Wardens", AI guards of the sealed port town of Claudov. You own the `src/07*.js` engine files listed in
the contract and new `src/efc/40-efc-wardens.js`. See `tools/dev/visual/bots.js` for stepping bots without rendering.

Engine: `src/07-bots.js` (makeBot, spawnEntity, pickGoal, setPath, botSense, botHurt), `src/07b-tactics.js` (decideTactic,
updateBot; bot respawn at `b.respawnT -= dt ... spawnEntity(b)`), `src/07d-squad.js` (domination team plan), `src/07e-humain.js`.
There are 11 bot soldiers in `entities`; `allied(a, b)` decides hostility. RAID adds `MODES.raid`, makes `allied` use `e.squad`
(`'w'` for Wardens), keeps bots respawning after `EFC.cfg.wardenRespawn`, emits `died(victim, attacker)` and the `damage` filter.
These may be missing in your worktree: guard for it and use stand-ins in your test page only.

1. In a raid every bot has `squad = 'w'` and a Warden name from a small original pool ("Warden Brask", "Warden Ilse"...). Wardens
   never fight each other and treat every human as hostile. Check each direct `.team` comparison and `MATCH.mode === 'ffa'` test
   in your files so raid behaves correctly (targets through allied(), sound reactions, team plans off).
2. Posts: at raid start assign bots to the guard posts of `efcCall('map:data').guards` (n per post, the rest round robin). A
   Warden spawns at its post (a free ground spot within the post radius, using the engine's spot-free and nav helpers), not at the
   engine's deathmatch spawns.
3. With no known enemy: guard (hold a spot inside the post radius, scan, change spot now and then) and patrol (now and then one or
   two of a group walk to a neighbouring post and back, at walking pace). Give raid its own goal source inside the engine's goal
   and path machinery rather than rewriting movement. When an enemy is seen or heard the engine's combat AI takes over unchanged;
   after losing the enemy for the engine's search time the Warden returns to its post. Group alert: when one Warden of a post is
   hurt or sees an enemy, its post mates are told (the engine's radio-call / intel mechanism) and converge; distant posts do not.
4. Reinforcements: when a Warden's respawn timer ends it respawns at its post only if no living human is within 45 m of the post
   and none has line of sight to the spot; otherwise it retries every 5 s, or takes another post that qualifies.
5. Elite posts (`elite: true`): `efcElite = true`, the `damage` filter multiplies non-headshot damage by 0.6 for them, and they use
   the engine's hardest bot settings if that can be set per bot without large changes.
6. Loot: on event `died` for a Warden simulated on this machine call `efcCall('world:body', { x, y, z },
   efcCall('loot:roll', victim.efcElite ? 'warden_elite' : 'warden') || [], victim.name)`.
7. Difficulty: dangerous but beatable solo; use the difficulty the player or host chose; a Warden that has not noticed the player
   must not snap-aim instantly at long range. Change only what raid needs, not the global balance.
8. Service `warden:info() -> { alive, posts: [{ x, z, n, alive }] }`.
9. Test `tools/dev/efc/test-warden.mjs` on simoun in raid mode: (a) after start every bot has squad `'w'`, is alive and within its
   post radius + 3 m; (b) player parked far away and invulnerable, 60 game seconds: no Warden killed another, at least 80 percent
   within 25 m of their post, at least one patrol leg happened; (c) player 15 m from a post in view: within 10 s at least one
   Warden of that post targets the player and Wardens of a post more than 80 m away do not; (d) kill a Warden through the engine
   damage path: `world:body` called once near it (fake provider); player near the post: still dead after the delay + 10 s; player
   far: alive again; (e) tdm still runs 20 s without errors. At most one screenshot.
