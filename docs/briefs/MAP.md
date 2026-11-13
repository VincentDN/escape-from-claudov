# Brief: MAP package

Build the raid map "Claudov": a sealed industrial port town in a cold grey season: quays and a dry dock on one side, a container
yard and warehouses in the middle, a rail spur, a small workers' housing block and a checkpoint on the landward side. Original
layout, built only from the engine's kit and CC0 surfaces (no new external assets). You own new `src/efc/60-efc-claudov*.js`
(names prefixed `EFC` / `efc` / `clv`, files under about 500 lines), small edits to `src/02-map.js` and `src/02z-load.js` if
registration needs them, and `assets/maps/claudov.webp`.

Engine: every map is built by code from prefabs. Read `docs/assets.md` and the header comments of `src/02-map.js`,
`src/02a-kit.js`, `src/02z-load.js`. Study one small map end to end (`src/02yn-french-dream.js` with kit `02ym`, or
`src/02v-floreal.js`) and the big one, Simoun (`src/02yk-simoun-kit.js`, `src/02yl-simoun.js`: 164 m square, round play zone
`ring`, relief). Port kit `src/02l-port.js`, rail `02j`, vehicles `02g`, architecture `02d`, props `02f`, winter `02i`, water
`02m`. A definition carries bounds, spawns, bot points of interest (`poi`), zones, atmosphere and a build function; the nav grid
comes from collisions (`src/03-nav.js`). The author's own checks are in `tools/dev/visual/` (maps.js, leveldesign.js, bots.js) and
`tools/dev/illustrations.js`.

1. `MAP_DEFS.claudov` is registered so the engine lists and loads it like any map (files in `src/efc` load after all engine files
   and before `src/99-start.js`; if a list is frozen earlier, make the smallest edit in your files). About 150 to 170 m square,
   integer bounds. Mixed sight lines: long lanes along the quay and rail, close quarters among containers and inside two or three
   enterable buildings, some height (a crane base platform, a warehouse mezzanine, container stacks with ramps or stairs). Correct
   collisions everywhere walkable, no holes, and a closed edge (water, fences, walls, or the engine's ring / bounds).
2. `MAP_DEFS.claudov.efc` per the contract: 4 inserts around the edge (at least 60 m apart, none within 45 m of an extract, no
   direct sight line between inserts), 3 extracts (two open from the start on different sides, one opening at 600 s; radius 4 to
   5 m; names such as "Pilot boat", "Checkpoint gate", "Rail tunnel"), 28 to 36 containers placed sensibly (lockers inside
   buildings, crates in yards and warehouses, bags in odd corners; tables crate, locker, bag, weapons, medical; the best deep in
   the map near the elite post), 6 guard posts (mostly n = 2, one elite with n = 3 at the richest loot). Set
   `EFC.cfg.raidMap = 'claudov'` at load.
3. Bots work: enough points of interest, valid spawn data for the classic modes (team deathmatch must start on it), connected nav.
   Test `tools/dev/efc/test-map.mjs`: every insert, extract, container and post is on walkable ground inside bounds and reachable
   on the nav grid from insert 0 (engine path function); no two containers closer than 1.5 m; then a bot-only team deathmatch for
   90 game seconds of logic stepping: bots move, nobody stuck more than 10 s, nobody out of the map, no page error. Also
   `MAP=claudov node tools/dev/efc/smoke.mjs`.
4. Performance: follow Simoun's large-map patterns (near / far chunking, `CHUNK_NEAR`). Report triangles and draw calls from
   `renderer.info` for a view down the quay at quality high and low, against the same measure on simoun; stay within about 1.3
   times Simoun.
5. Atmosphere: overcast cold light, light sea fog, wet concrete, a fitting existing `amb_*` ambience pack. Menu illustration
   `assets/maps/claudov.webp` from a headless screenshot, converted with Pillow, same size as the others.
6. Look at your map: up to six screenshots (overview from above, quay lane, container yard, inside a warehouse, housing block, an
   extract) under /tmp; view them, fix what is visibly broken (floating or sunken objects, z-fighting, blocked doors, empty
   stretches) and describe each. A screenshot can take a minute or more here.

In your final report include the performance numbers and the screenshot list.
