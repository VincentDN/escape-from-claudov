# Brief: P1, spawns and Warden numbers

Read `docs/briefs/COMMON.md` first (rules and report format), then section P1 of `docs/plans/2026-11-14-polish-pass.md`, which is
the specification. All seven original packages are merged, so the real code is in your worktree: no stand-ins needed.

For this step you own: `src/efc/60-efc-claudov*.js`, `src/efc/40-efc-wardens.js`, the `src/07*.js` engine files, the map-data part
of `src/efc/00-efc-core.js` (`efcMapFallback` and the `map:data` service), the insert choice in `src/efc/10-efc-raid.js` and
`src/09i-modes.js`, the raid map list in `src/efc/50-efc-ui-menu.js`, `EFC.cfg`, and the tests under `tools/dev/efc/`.
Touch nothing else; list what you need elsewhere in your report.

Owner's report, in his words: "Spawns on Claudov are weird, I spawned next to two wardens and got insta killed. Players should
spawn in a hidden location", and "there are way too much wardens overall, I tried a few more maps and there were like a dozen near
spawn already".

Requirements (the plan's P1 has the detail and the numbers)

1. **Warden numbers scale with the map.** About one per 3,500 m² of play area, clamped to 3..7 at the start, plus one per extra
   player squad in the raid. Put the rule in one function and the numbers in `EFC.cfg`. Bots beyond that number are out of play
   for the raid (not alive, hidden, never respawn). Reinforcements only replace losses up to the number. Online, the host decides
   and the guests' copies follow (check how host bots are activated in a raid in `src/09c-net.js` / `src/efc/35-efc-netlobby.js`;
   if that needs a change in those files, make the smallest one and say so). Posts shrink to match: one or two Wardens each; the
   three-Warden elite post only when the raid has 6 or more Wardens.
2. **Claudov inserts.** Six hidden inserts at the map edge: inside or behind a structure, at least 55 m from every guard post
   centre, no line of sight (eye height) to any point of a post area sampled on a grid, nor to another insert, none within 45 m
   of an extract. Add small cover structures from the kit where the edge is bare. Keep everything reachable on the nav grid.
3. **Placement order and bubble.** Players are placed first. No Warden starts within 50 m of an insert in use or in sight of it;
   patrol goals stay out of a 45 m bubble around used inserts for the first 90 s of the raid.
4. **Insertion grace.** For 8 s after insertion, or until the player fires or has moved 10 m, Wardens cannot detect that player
   (sight and hearing). The player is not invulnerable to other players.
5. **Squad spread.** Each squad gets the unused insert farthest from the squads already placed; the choice must be the same on
   every machine of a lobby without extra messages if possible (derive it from squad index and the raid's seed), otherwise the
   host decides and tells the guests.
6. **Derived data for other maps** (`efcMapFallback`): same insert rules as far as the map allows (relax the distances in steps
   for small maps, never below 30 m from a post and never in sight of one), posts and Warden numbers per requirement 1. Add
   service `map:raidable(id)` or equivalent: a map where no insert satisfies the relaxed rules is not offered in the Raid map
   list or the raid lobby. Simoun and Claudov must be offered.
7. **One-shot rule.** In a raid, a single non-headshot hit from a non-elite Warden cannot take a human from full health (100)
   to death: cap that hit so the victim is left with at least 5 health. Headshots and elite Wardens are unchanged. Use the
   `damage` filter.
8. **Tests.** Extend `test-map.mjs` with the static insert rules for Claudov. New `tools/dev/efc/test-spawns.mjs`: for Claudov,
   10 raid starts per insert (force the insert), and for every other raidable map 10 raid starts; the player stands idle for 30
   game seconds: zero damage taken, no Warden within 40 m at t = 0, and the count of living Wardens never exceeds the map's
   number during a 200 s raid that includes at least one Warden death and its reinforcement. Print one summary line per map
   (Warden number, raidable or not and why). Keep `test-e2e.mjs`, `test-warden.mjs`, `test-raid.mjs`, `test-net.mjs` and
   `test-e2e-net.mjs` passing; adjust their expectations where the new numbers change them and say what you changed.
   Add `test-spawns.mjs` to `tools/dev/efc/run-all.sh`.

Known trap: a single long `page.evaluate` can look like a hang; step in slices and print progress. Run tests with
`NODE_PATH=/opt/node22/lib/node_modules` if Playwright is not found.
