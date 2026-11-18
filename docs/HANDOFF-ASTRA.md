# Second track: tasks A1 to A6

Written 18 November 2026, after the first handoff (`docs/HANDOFF.md`, tasks T1 to T7) was finished and merged. This track is for
an agent that can take on larger, multi-file work. Read `docs/HANDOFF.md` sections 1 to 4 and 7 first: how to branch, build,
test and report, and the rules that are not negotiable. They all apply here, with these changes:

- Name branches `astra/a<n>-<topic>`, branched from the current `main`.
- The game is now **raid only**: team deathmatch was retired (`e2eb1cc`). Tests and smoke runs use raid mode.
- `showcase/` holds standalone pages ported from Partisan Project: the opening scene and the StG 44 workbench, with Partisan's
  weapon and attachment models (`showcase/assets/models/weapons/*.glb`). The owner authorised that port and cleared every
  Partisan weapon and attachment model for this repository (`showcase/LICENSE.Partisan`, `showcase/asset-credits.json`).
  The showcase pages run their own three.js; the game itself runs the engine's three.js r147 in one global script.
- Full checks run in GitHub Actions on pull requests (T5). Run the tests your task names locally too.

Do the tasks in order. Each one ends on a branch the owner can merge on its own. If a task turns out much larger than described,
stop at a clean point, push, and write what is left in your last commit body instead of pushing on.

## A1. Performance capture the owner can run (small to medium; do first)

Optimisation (Pass 2, Q4 in `docs/plans/2026-11-14-polish-pass.md`) needs numbers from a real GPU, which no agent has. The engine
already has a performance recorder (`src/09zo-perfs.js`, French; turned on by the "show performance" video setting) that writes a
report per match.

- Add a benchmark the owner starts from the game: `dist/index.html#bench` loads Claudov at the chosen quality, puts the camera
  on a fixed 90-second route through the quay, yard, warehouses and housing with every Warden awake and fighting, records with
  the existing recorder, and offers the report as a JSON download plus a one-screen summary (median and 1 % low frame time, CPU
  and GPU time per stage, draw calls, triangles, JS heap at start and end).
- Run it once per quality level in a row, so one click gives a full table.
- Write `docs/perf.md`: how to run it, what to send back, and the targets from the plan (60 frames per second on a mid-range
  laptop on Claudov).
- Files: new `src/efc/48-efc-bench-route.js`, small hooks in `src/09zo-perfs.js` if needed, `docs/perf.md`, a test that the route
  completes headless and the report has every field.

## A2. First Partisan weapon in the raid game: the StG 44 (medium to large)

This is the pilot for porting all Partisan weapons (Pass 2, Q2). Prove the whole path once, cleanly, so the rest can follow it.

- The engine has no glTF loader. Add the r147-compatible `GLTFLoader` (from the three 0.147 examples, MIT) to the vendored
  bundle through `tools/vendor.py`, or a minimal loader in `src/efc/` if that is smaller. Never load from a CDN at run time.
- Build the StG 44 from `showcase/assets/models/weapons/` (pick the variant that reads best at game distance; say which and why)
  into the engine's weapon system: a new `WEAPONS` entry with stats in its own niche (intermediate cartridge, slower fire than
  the AK, heavier, no rails), first-person model with hand grips and aligned iron sights, world model for third person and
  ground drops, level of detail, reload choreography (`src/06d-reload.js`), shot and handling sounds through the existing sound
  module, a thumbnail through `thumb:get` (calibre 7.92×33 mm Kurz), an item `w_stg44`, ammunition family as the engine decides,
  and a place in the `weapons` and `warden_elite` loot tables.
- Keep the triangle count within the other rifles' budget; decimate the model offline if needed and record how.
- Record the model in `NOTICE.md` (from Partisan Project, rights cleared by the owner).
- Write `docs/weapon-port.md`: the steps you took, so the next weapon is mechanical.
- Tests: a `test-stg44.mjs` like `test-sks.mjs` (builds in first and third person, fires, reloads, aims, time to kill at 25 m),
  thumbnails test, the end-to-end raid test.

## A3. A second enemy type: the Scavenger (medium)

Pass 2, Q3 asks for more enemy variety. Start with the one that changes play the most for the least code.

- Scavengers wander between loot spots in twos or threes, lightly armed (pistol or nothing), and loot containers themselves
  (through the host-owned world, so the loot really disappears). On seeing a player they flee toward the nearest Warden post and
  raise an alert there; cornered, they fight weakly.
- Distinct look (outfit or colour from the engine's outfit system), their own name pool, `squad` value `'s'`, hostile to
  players, ignored by Wardens.
- Numbers: one or two groups per raid on Claudov, none on the small maps unless the Warden number allows it; count them
  inside the map's bot budget so performance does not move.
- Files: new `src/efc/43-efc-scavengers.js`, hooks in `src/efc/40-efc-wardens.js` and the `src/07*.js` engine files as needed.
- Tests: scripted runs proving they loot (container contents drop), flee on sight, trigger the post alert, and never shoot a
  Warden; `test-warden.mjs` and `test-spawns.mjs` still pass.

## A4. Host leaves mid-raid (medium)

Online, the engine hands a match to another player when the host leaves. Nobody has tested that during a raid: the host owns
the containers, the Wardens and the raid timer.

- With the two-client rig (`tools/dev/efc/net2.mjs`), and three clients if the rig can be extended cheaply: host and guest raid,
  loot a container, the host closes its page; the guest must become host and the raid must continue with the same containers
  and contents, Wardens alive and acting, the same time left, and extraction working.
- Fix what breaks if each fix is contained; write up anything larger in `docs/known-issues.md`.
- Files: `tools/dev/efc/test-migration.mjs`, and fixes in `src/efc/30-efc-world.js`, `src/efc/10-efc-raid.js`,
  `src/efc/40-efc-wardens.js`, `src/09c-net.js` as needed.

## A5. Containers you cannot walk through (medium, engine work)

Crates and lockers have no collision because the engine's collision grid (`COL`, `HASH`, `queryBoxes` in `src/02-map.js`) has no
way to remove a box once added, and containers come and go with each raid.

- Add removable collision boxes to the engine grid (a small registry with add and remove that keeps `queryBoxes` and ray
  queries correct), then give crates and lockers boxes that block movement and bullets, added at raid start and removed at raid
  end. Bags, bodies and drops stay without collision. Keep the nav grid valid: bots must path around them.
- Tests: walking into a crate stops the player; a shot at a crate hits it; after `match:left` no box remains; a raid's bots do
  not get stuck on containers (reuse the stuck metric in `test-map.mjs`).

## A6. Grid inventory, data and rules only (large; only if A1 to A5 are done)

The owner wants a full grid inventory with the operator in the middle of the screen (P6b in the plan, with a reference
description). This task is the data half only, with no screen: it must not change what the player sees yet.

- Item sizes in cells and rotation; containers (vest or rig, backpack, pockets, stash) as grids sized by the item; placement,
  rotation, auto-placement, stacking and split rules; weight still limits movement; a one-time migration of existing stashes and
  loadouts; world containers get grids replicated by the host so two players see the same layout.
- Behind the existing services where possible, so the current list screens keep working on top of the new data.
- Files: `src/efc/20-efc-items.js` to `24-efc-loot-tables.js`, `src/efc/30-efc-world.js`, a new `src/efc/25-efc-grid.js`,
  `docs/contracts/CONTRACT.md` (update the shapes).
- Tests: logic tests for every rule and the migration (vm tests like `test-items.mjs`), the two-client rig for a shared grid,
  the end-to-end raid test unchanged.

## Not in this track

The grid inventory screen and operator view (waits for A6), omnimovement (P8), the raid-start weapon check (T7 left a proposal
for the owner), bringing the showcase workbench's saved configurations into the stash (after A2 sets the pattern), the
remaining Partisan weapons (after A2), and squads in public-server lobbies (the server is not in this repository).
