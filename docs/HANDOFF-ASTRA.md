# Second track: tasks A1 to A9

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

## A7. The full grid inventory system (large; after A6)

Build on A6's data model until the grid is the only inventory in the game, end to end. Keep the current screens working until A8
replaces them, by drawing the grids inside them.

- Every move goes through the grid: looting, equipping, dropping, splitting and merging stacks, moving between the stash and the
  loadout, the free SKS loadout, the raid kit, extraction and death (the body holds the grid as it was), and the loot tables
  (rolled items are placed into the container's grid; what does not fit is not rolled).
- Interaction: drag and drop with the mouse, rotate with R while dragging, double-click to equip or quick-move to the other
  side, Shift-click to move a whole stack, Ctrl-click to split, drag out of a container to drop, a placement preview that shows
  valid and invalid cells before the drop. Full keyboard operation stays possible (arrow keys between cells, Enter to pick up
  and place). Weight still limits movement.
- Online: the host decides every placement in a shared container; a guest's move is a request, and two players moving into the
  same cells resolve so that exactly one succeeds.
- Tests: logic tests for every interaction, the two-client rig for shared grids and races, the end-to-end raid test rewritten
  for the grid, and a hideout screenshot.

## A8. The new operator and inventory screen (large; after A7)

The owner's reference is a DayZ-style inventory (an image he shared in conversation; this is its description). Recreate the
layout, not the look: no art, icons, fonts or text from DayZ, Tarkov or any other game.

- **Left column, "Vicinity"**: what is within reach, the container or body being searched as its own grid, then loose items on
  the ground. Hovering an item shows a card with its picture, name, condition, weight and a short description (the thumbnail
  service already renders large pictures).
- **Centre**: the player's operator, full height, in a relaxed idle pose, wearing exactly what is equipped and holding the
  equipped weapon; it turns slowly when dragged with the mouse. Render it with the game's renderer into the panel, as the
  thumbnails are, using the engine's soldier model and outfit.
- **Right column, "Equipment"**: a row of equipment slots across the top (head, face, armour, rig, backpack, primary, secondary,
  sidearm), then each equipped container as a titled block with its fill count ("Field vest 19/30") and its grid; the equipped
  primary shows its attachment slots inline (ties in with A9).
- **Bottom**: a "Hands" panel with the item in hand, and a row of numbered quick slots (1 to 9) that the player assigns by
  dragging.
- The same screen serves the hideout (left column becomes the stash) and the raid (left column is the vicinity). It opens with
  Tab, keeps the match running, frees the cursor and blocks firing, as the current panel does.
- Tests: the screen opens in both places, every slot and grid accepts a drop, the operator shows the equipped items and the
  weapon in hand, keyboard operation works, no frame cost while closed. Screenshots of the hideout and of a body search.

## A9. Attachments and weapon modding through the workbench (large; after A2 and A8)

`showcase/workbench/` already has Partisan's StG 44 workbench: attachment models, mount and fit rules, finishes, sliders and
studio lighting, as a standalone viewer. Turn it into the game's gunsmith.

- **Attachments as items**: every attachment model in `showcase/assets/models/weapons/` (optics, muzzles and suppressors, grips,
  lights, lasers, magazines, bipods, rails) becomes an item with size, weight, value, a thumbnail and stat effects (recoil,
  spread, aim speed, magazine size, sound for suppressors). They go into the loot tables (rarer for better parts) and Wardens
  carry some.
- **Weapons carry their parts**: a weapon item stores its attachments and finish; the first-person and world models show them;
  stats change with them; a looted weapon keeps what was on it, so stripping a dead Warden's rifle is worth it.
- **The workbench**: from the hideout, open a weapon from the stash on the bench (the showcase's lighting and studio set-up, run
  with the game's renderer or as the showcase page talking to the game through a small message bridge, whichever is cleaner).
  Mount only parts the player owns in the stash; mount and fit rules from the showcase decide what fits where; removed parts go
  back to the stash. Save, and the modded weapon is what the player takes into the next raid.
- **In the field**: attach and detach small parts from the A8 screen by dragging onto the weapon's slots, without the bench.
- Start with the StG 44 from A2 and the AK-family rifles the showcase covers, then extend the mount rules to the other weapons.
- Tests: logic tests for fit rules and stat changes, a raid where a looted optic is mounted at the bench and the stats and model
  change, the two-client rig showing the mounted parts on the remote copy, and screenshots of the bench and of a modded rifle in
  first person.

## Not in this track

Omnimovement (P8), the raid-start weapon check (T7 left a proposal for the owner), the remaining Partisan weapons beyond what
A9 needs (after A2's guide), and squads in public-server lobbies (the server is not in this repository).
