# Partisan × Claudov: combat module roadmap

27 November 2026 · owner: Vincent De Nil. Living version with diagrams: https://claude.ai/artifact/FfXShfxA2hM2rQB1ckbB28.
The six open decisions are on Vincent's to-do list in Partisan (`docs/vincent-todo.md`). The same plan is in the Partisan repo at
`docs/partisan-claudov-roadmap.md`.

## Summary

Every Partisan fight becomes a first-person Claudov raid: the campaign map stays as it is, and the RimWorld-style top-down shooter in `convoy/` is retired. The two games meet at one seam that already exists on each side: Partisan's mission bridge (`shared/campaign/encounter.js`: deploy, one result, settle once) and Claudov's service layer (`efcProvide` / `efcCall`, where `raid:kit` and `raid:commit` decide what goes in and what comes home).

Claudov becomes a clean MIT platform repo with no Partisan content in it. Partisan gets a fork of Claudov that adds only its own layer of files (campaign bridge, Yantis maps, weapons, voices), merges Claudov `main` on a schedule, and ships its build into the Partisan site as a vendored page. Codex's omnimovement work (C9 on `beta`) is untouched; the fork only ever syncs from `main`.

The metagame: everything looted in a fight lands in the rebel stash. A small roster of named operators (four recommended) is kitted from that stash; you play one per fight, and what they carry is at risk. Later phases add allied rebels who fight and loot beside you, then Partisan's banter as captions with tooltips and a radio-filtered invented-language voice made with ElevenLabs.

## Where both repos stand today

Read on 27 November 2026 from Partisan `main` (`7d4eff2`) and Claudov `main` (`6d9d9ba`) and `beta` (`c67f430`).

| | Partisan (`partisan-project`) | Claudov (`escape-from-claudov`) |
| --- | --- | --- |
| What it is | Static GitHub Pages site: Bannerlord-style campaign map of Yantis, Rebel Band, Workbench, Operator Customiser | Browser extraction shooter on the Riposte: Frontline 5.6.0 engine |
| Code shape | ES modules, no bundler, three.js r169 vendored, `npm test` / lint / typecheck | `src/*.js` + `src/efc/*.js` concatenated into one global script by `python3 build.py`, three.js r147 |
| Combat today | `convoy/`: seeded top-down sim (`sim*.js`, `ai-*.js`) drawn by `sprite-render.js` in the 2.5-D RimWorld style; 10 mission types in `convoy/levels/` | First-person raids: one life, containers and bodies, Wardens and Scavengers, timed extracts, grid inventory |
| Campaign seam | `encounter.js`: `deploy` reserves kit, the mission writes one result, `settle` applies it once; `convoy/campaign-mode.js` plays it from `?campaign=&encounter=` | `raid:kit` takes the loadout out of the stash, `raid:commit(result, inv)` banks it on `extracted`; services are last-provider-wins |
| Save | `parp-campaign-v1`: world, band, fighters `{class, xp, wounded}`, stash as counts `{gear id: n}`, grid kits per fighter | `efc_stash_v1`: item list with grids, loadout, free kit |
| Squad | Deploy six to nine fit rebels (two to four for a Roadblock), control one, order the rest | Squads of one to three humans over PeerJS, host-simulated bots |
| Licence | All rights reserved | MIT code, with `NOTICE.md` listing what is not MIT |
| Active work | Campaign W packets, last handoff W34 (27 October) | Codex Sol cards on `beta`: C9 omnimovement next (C9-4), then C16 barks, C2 Partisan weapons |

Three things make the merge cheaper than it looks. Claudov already carries Partisan's rifles, attachments, StG 44 and handling foley (C2, C3 and C14 port the rest). C16 already plans captions plus an ElevenLabs radio voice in an invented language, which is exactly the banter phase. And Riposte's kit has Cyclades prefabs (`02yb` to `02ye`), a natural fit for a Mediterranean island.

Two things make it harder. Nobody has played Claudov or measured it on a real GPU yet (ROADMAP "Waiting on the owner"). And Claudov's `assets/` (40 MB) plus `showcase/` (18 MB) sit against Partisan's 90 MB site budget.

## Repo strategy

The rule that keeps the fork in sync: **the fork never edits a platform file.** Everything Partisan needs either lives in its own layer of files, or goes upstream to Claudov as a general extension point that any game could use. If the fork touches no upstream file, every merge from Claudov `main` is conflict-free by construction.

Flow: feature branches (`codex/*`, `claude/*`) → Claudov `beta` → Claudov `main` → weekly sync PR into the `partisan-claudov` fork → release tag `pt-combat-x.y.z` → vendored into `partisan-project` at `combat/`. Platform fixes found in Partisan go the other way: into a Claudov branch first, then back through the next sync.

### Three repos, three roles

| Repo | Role | Licence | Who works there |
| --- | --- | --- | --- |
| `escape-from-claudov` (renamed when the platform gets its name) | The open extraction shooter platform: engine, raid loop, items, world, AI, netcode, tools, CC0 or MIT content only | MIT, plus `NOTICE.md` for anything that is not | Codex and Claude on `codex/*` and `claude/*`, integrated on `beta`, released to `main` |
| `partisan-claudov` (new, a GitHub fork of the platform) | Partisan's combat build: the platform plus a `mods/partisan/` layer | Platform files stay MIT; the layer is Partisan's, all rights reserved | Partisan tracks only, inside `mods/partisan/` and `assets-partisan/` |
| `partisan-project` | The campaign site; serves the fork's build at `combat/` | All rights reserved | Campaign and Workbench work as today |

The fork can be private, since MIT only asks that the licence notice travels with copies. A public fork would publish the Partisan layer, so that is a choice for Vincent rather than a default.

### Upstream extension points (the only platform changes this plan asks for)

1. **A mod layer in `build.py`.** Join `mods/*/src/*.js` after `src/efc/` and before `src/99-start.js`, and copy `mods/*/assets/`. Last provider wins in `efcProvide`, so a mod overrides services without editing them. About 20 lines.
2. **A host game contract.** One documented service set an embedding game provides: `host:kit()` (what the operator carries in), `host:commit(summary)` (what comes home), `host:raid()` (map, enemies, extracts, timer, seed), `host:exit(url)` (where to go after the summary). Without a host the platform behaves exactly as now.
3. **Map and enemy definitions as data.** Claudov already reads `MapData` (inserts, extracts, containers, guards); add enemy group types and a road or vehicle spawn so a mission can field a convoy.
4. **Friendly AI squads** (needed in phase 5): bots with a player's `squad` number, following and taking simple orders. Useful to any extraction game, so it belongs upstream.

### Keeping the fork in sync

- **Sync from `main` only.** Codex's `beta` (C9 omnimovement and what follows) reaches the fork only after it is released to `main`.
- **A weekly GitHub Action in the fork** fetches Claudov `main`, merges it into a `sync/<date>` branch, runs `python3 build.py`, `check_decl.py`, `smoke.mjs` and the fork's own bridge tests, and opens a pull request. Green means merge; red means the layer adapts, never the platform file.
- **Name prefix `pt` / `PT`** for every top-level name in the layer, the same way Claudov uses `efc`, so the shared global scope never collides; `check_decl.py` already enforces one declaration per name.
- **Release by tag.** The fork tags each build (`pt-combat-0.1.0`). A script in `partisan-project` (`tools/combat/vendor.mjs`) downloads that tag's `dist/`, rewrites nothing absolute, and commits it under `combat/`. That keeps Partisan's rules: no CDN, relative URLs only, `npm run check` passes.
- **Fixes flow upstream.** A platform bug found in Partisan is fixed in Claudov first, then arrives in the fork with the next sync.

### What moves out of Claudov into the fork

The Partisan content now on Claudov `main`: `showcase/` (opening scene, StG 44 studio, `LICENSE.Partisan`), `assets/raid-models/partisan.json` and `partisan-parts.json`, `18-efc-partisan-rifles.js`, `18a-efc-partisan-parts.js`, `49-efc-stg44.js`, `55-efc-opening.js`, and the `hf_*` handling takes. The platform keeps Riposte's own 18 weapons, so it stays playable on its own. C2, C3 and C14 (Partisan weapons) then belong to the fork's backlog, not the platform's; the Codex task list needs that one edit once C9 is done (pending decision 1).

## Integration architecture

The two games share nothing at runtime except the campaign save. Partisan's shell already shows one page at a time in its frame, so the combat page is just another page: `combat/?campaign=<id>&encounter=<id>`, the same URL shape `convoy/` answers today. Different three.js versions and module styles never meet, because they never load in the same document.

### One fight, end to end

1. **Map.** The player meets a contact; `map/campaign-ui.js` builds the encounter as now, but the deploy panel picks one operator instead of six to nine fighters. `deploy()` reserves that operator's kit out of the stash and writes `c.deployment`, then saves before navigating.
2. **Enter.** The shell opens `combat/`. The fork's `mods/partisan/src/10-pt-bridge.js` reads `parp-campaign-v1` (same origin, same `localStorage`), checks `enter(campaign, encounter)`, and provides `host:raid`, `host:kit` and `host:commit` to the platform.
3. **Translate in.** `host:raid` turns the encounter (level, variant, seed, enemy strength, cargo, time of day) into a `MapData` and enemy list. `host:kit` turns the operator's Partisan grid kit into a Claudov `Inventory` through one mapping file, `mods/partisan/data/gear-map.json` (Partisan gear id to Claudov item id, with magazine and attachment fields).
4. **Fight.** A normal Claudov raid: one life, bodies and containers, telegraphed enemies, extract before the timer. The convoy's cargo spawns as containers on the vehicles.
5. **Translate out.** At the summary, `host:commit` maps the Claudov `Summary` back: `extracted` becomes `won` with everything carried as loot; `dead` becomes `lost` with the operator down and the kit left on the body; `mia` (timer) becomes `withdrawn`. It calls `writeResult()` and saves.
6. **Settle.** The player returns to the map, which calls `settle()` exactly once, as today: XP, wounds, loot into the stash, the contact removed, heat raised.

A reload mid-fight already settles as withdrawn on the Partisan side, so the platform needs no new rule for it. The bridge is a pure translation layer and is tested without rendering, in the fork with Claudov's `harness.mjs` and in Partisan with `node --test`, using shared JSON fixtures of a deployment and a summary.

### What each side owns

| Concern | Owner | Notes |
| --- | --- | --- |
| Strategic map, contacts, heat, territory, villages | Partisan site | Unchanged |
| Rebel stash, operator roster, wounds, XP | Partisan save (`parp-campaign-v1`) | Single source of truth; the platform's `efc_stash_v1` is not used in Partisan mode |
| Deploy, result, settle-once | `shared/campaign/encounter.js` | Unchanged contract; `cleanResult` learns item instances |
| Mission to map translation, gear mapping, Yantis maps | Fork layer `mods/partisan/` | Data files plus small `pt` modules |
| Shooting, movement, AI, loot, inventory UI, extraction | Platform | Never edited by the fork |
| Auto-resolve for small fights | Partisan site | Stays; uses the operator's kit and the band's strength |

### Maps

Partisan's ten mission types (`convoy/levels/`) become Claudov maps built from Riposte's prefab kit, which is how Claudov's own map is made. Start with the Oros Roadblock: four riflemen, search the bodies, leave by the marked southwest exit. That is already an extraction mission. Then convoy ambush and forest road (road, vehicles, cargo), then checkpoint, village and compound (Cyclades buildings), then cave and hilltop defence (hold, then extract). Partisan's `variants.js` conditions (night, rain, fog) map onto Claudov's light and weather settings.

## Metagame: the rebel stash and the operators

The loop the player feels: pick a fight on the map, choose an operator, kit them from the stash, raid, bring the loot home or lose the kit, recover and kit again.

### The rebel stash

- **Everything extracted goes in.** Every weapon, attachment, magazine, round, med and valuable an operator carries out lands in the stash, along with convoy cargo and mission rewards, as `settle()` does today.
- **Weapons keep their identity.** A looted AK with a drum and a collimator stays that rifle, with its parts and loaded rounds, instead of collapsing into a count. Today's stash is `{gear id: n}`, so this needs campaign save version 2: stackables (ammo, meds, goods) stay counts, and weapons and armour become a list of instances. It is the same split Claudov already uses (`Item { id, n, mag, res, mods }`), so one shape serves both games. Version 1 saves migrate by turning each counted weapon into that many bare instances.
- **Lost is lost.** An operator who goes down leaves their kit on the body. In a later phase, allies who extract can carry it home.
- **One stash screen** in Partisan's `inventory/` page, reused from the shared grid code (`shared/inventory/`), with the Workbench a click away to mod a stash weapon.

### The operator roster

- **Four named operators** to start (recommendation; the starting band has eight fighters). Each has a look from the Operator Customiser, a class, XP and a condition.
- **Kit per operator, persistent between fights.** Primary, sidearm, armour, rig, pack and pockets in Claudov's grid layout. The kit screen moves items between the stash and an operator. Gear on an operator at home is safe; gear deployed is at risk.
- **One operator per fight** while fights are solo. Who goes is a real choice: a wounded operator cannot deploy, and kit cannot be shared mid-fight.
- **Going down:** recommended default is Partisan's existing rule (carried off, wounded for 48 campaign hours, kit lost). Permadeath is a harder mode the same data supports.
- **Promotion:** XP from fights unlocks Partisan class perks that map to Claudov tunables (carry weight, reload speed, lean speed, med time), applied by the bridge through `host:kit`, never by editing platform code.

### The rest of the band

The Rebel Band's troop stacks and the other fighters do not disappear. They keep powering auto-resolve, garrisons and territory. In phase 5 they become the allied rebels who join a fight.

### Item conservation, tested

The acceptance test is the same one Partisan already uses: nothing appears or vanishes across a transition. Stash plus kits before deploy, minus what was lost, plus what was extracted, equals stash plus kits after settle, item by item and round by round.

## Phased roadmap

Seven phases, each ending on a gate that can be checked. No dates: the pace depends on Codex's C9 release and on Vincent's decisions in phase 0. Phases 1 to 3 are the critical path; phase 4 can start as soon as phase 2's bridge exists. Three phases wait on a Claudov release: the split waits for omnimovement (C9), allies for friendly AI squads, and voice for the C16 bark system.

| Phase | What | Where the work lands | Gate to leave it |
| --- | --- | --- | --- |
| 0. Decide | Answer the six decisions; pick the platform name | This doc, `vincent-todo.md` | Decisions recorded in both repos' roadmaps |
| 1. Split | Upstream extension points (mod layer, host contract, map and enemy data); move Partisan content out of Claudov into a new fork; weekly sync Action | Claudov `claude/*` branches to `beta` to `main`; new `partisan-claudov` | Claudov `main` builds and passes smoke with no Partisan files; the fork builds from it with zero platform edits; first sync PR is green |
| 2. Bridge | `pt-bridge` (enter, translate in, commit), `gear-map.json`, vendoring script, `combat/` page in the shell, the Oros Roadblock as the first Claudov map | Fork `mods/partisan/`; `partisan-project` `combat/`, `tools/combat/` | `tests/e2e/campaign-loop.mjs` passes with the roadblock fought in Claudov; conservation test passes; reload mid-fight settles as withdrawn |
| 3. Metagame | Save version 2 (weapon instances), operator roster, kit screen, one-operator deploy, wounds, perks to tunables | `shared/campaign/`, `map/`, `inventory/`, `band/` | Ten campaign fights in a row with no item drift; old saves migrate; auto-resolve still works |
| 4. Missions | Port the other nine mission types to Claudov maps on Yantis (Cyclades kit), convoy vehicles and cargo, variants; then retire `convoy/` from the shell and archive it under `docs/archive/` | Fork maps; Partisan `map/` routing | Every contact type in the campaign table routes to Claudov; `convoy/` no longer reachable from the campaign; site within 90 MB |
| 5. Allies | Friendly AI squads upstream; in the fork, band fighters join as allies, take simple orders, loot, and bring loot home if they extract | Claudov (AI), fork (who joins, orders UI) | A raid with three allies finishes with their loot settled to the stash; a downed ally comes home wounded |
| 6. Voice | Partisan banter and opening beats as captions with tooltips, voiced in an invented language with a radio filter, built on C16's bark system | Fork `mods/partisan/data/banter/`, `assets-partisan/voice/` | Every banter line has a caption, a tooltip and a baked voice file; no network call at runtime |

### Running Claudov and Partisan in parallel

- **Claudov keeps its own order.** C9 (Codex), C16, C15, C11, C12, C13, C4 to C8 stay on the platform and arrive in Partisan for free with each sync. Only C2, C3 and C14 move to the fork's backlog (decision 1).
- **Partisan keeps its campaign tracks.** W packets that do not touch combat (territory, villages, journal, music, endings) go on as now. Packets about the old shooter (S and V tracks: sprite renderer, tactical AI) are closed as superseded once phase 4 lands, and not before.
- **Who touches what.** Codex: Claudov `beta` and `codex/*`. Platform extension points in phase 1: a `claude/*` branch on Claudov, merged after C9 so the two never collide. Fork work: `mods/partisan/` only. Partisan site: as today.
- **The fork follows `main`, never `beta`.** A Claudov release is the moment Partisan picks up new combat features.

## Later phases in detail

### Phase 5: allied rebels join the fight and loot

- **Who joins.** The deploy panel lets the player bring up to three band fighters beside the operator (Claudov's squad size). They are AI, drawn from the band's fit fighters, each with the kit the stash can give them.
- **What they do.** Follow, hold, move to a marked point, search a marked container or body, and extract when the player does. Partisan's `ai-partisan.js` (orders, follow slots, holding fire until the ambush) is the behaviour reference; the code is written fresh on the platform as friendly squads, since Partisan's sim and Claudov's bots share no code.
- **Their loot.** Each ally has a carry limit and picks up what the player marks or what their kit lacks (ammo, meds). What they carry out goes to the stash; what a downed ally carried stays on their body, where the player can recover it.
- **Telegraphing applies to them too.** Allies call out what they are doing, using the same bark system as the enemies (owner rule of 26 November).
- **Host authority holds.** Allies are host-simulated like Wardens, so a co-op campaign later needs no new rule.

### Phase 6: the opening banter, with tooltips

Two Partisan sources become in-fight speech:

1. **Pre-contact banter** from `convoy/banter-lines.js`: two-speaker exchanges among the militia while it is quiet, and shouted lines once shooting starts.
2. **The opening beats** from `map/campaign-opening.js` and the opening scene, as a radio briefing in the first fight.

The reading taken here: "tooltips" means each line shows as a caption tagged with its speaker, and the comms log keeps every line so the player can hover or focus it to read the English and who said it. That matters because the voice is not in English. Captions respect `prefers-reduced-motion` and stay keyboard reachable, per Partisan's rules.

The lines move to data files in the fork (`mods/partisan/data/banter/*.json`: speaker, role, English text, trigger, voice file), so writers can edit them without touching code.

### Phase 6: ElevenLabs voice in an invented language, military radio style

- **Baked offline, shipped as files.** A fork tool (`tools/pt/voice-bake.mjs`) turns each line into gibberish text with the line's rhythm and length (a seeded syllable generator per faction, so rebels and soldiers sound different), sends it to ElevenLabs once, and saves the take. The game never calls ElevenLabs at runtime, which keeps Partisan's no-external-dependency rule.
- **A handful of designed voices.** One per operator plus a few band and enemy voices, created with ElevenLabs voice design and saved, so the same character always sounds the same.
- **Radio processing at bake time:** band-pass around 300 to 3,000 Hz, light saturation, a squelch click in and out, and a little static bed. A second, drier variant plays for a speaker standing next to the player.
- **Shared with C16.** Claudov's C16 already builds captions and an ElevenLabs radio voice in an invented language for enemy barks. The bake tool and caption system should be one platform feature that both games use; Partisan only adds its lines and voices.

## Decisions, risks and next steps

### Decisions for Vincent (open; on `vincent-todo.md`)

| # | Decision | Recommendation | Blocks |
| --- | --- | --- | --- |
| 1 | What leaves Claudov before it is promoted as an MIT platform | Move all Partisan-derived content (list in Repo strategy) to the fork, and keep C2, C3, C14 in the fork's backlog. Other non-MIT items already in `NOTICE.md` (CC BY sounds, the CC BY-SA Kotwica emblem, OFL fonts) can stay with their notices, or move if the platform should be plain MIT and CC0 | Phase 1 |
| 2 | The platform's name | Pick a name that does not echo an existing extraction shooter; PLAN.md decision D1 already calls the current one a working title | Phase 1 (repo rename, page titles) |
| 3 | Roster size and what going down means | Four operators; wounded 48 hours and kit lost; permadeath as a later difficulty | Phase 3 |
| 4 | Weapon instances in the stash | Yes: save version 2 with weapons and armour as instances, stackables as counts | Phase 3 |
| 5 | Solo or co-op campaign fights | Solo first; co-op later, since the campaign save is browser-local and single-writer | Phase 3 scope |
| 6 | Fork public or private | Private until the Partisan layer is meant to be seen | Phase 1 |

Per-asset licence checks are not part of this plan, as Partisan's `AGENTS.md` asks; the decisions above are only about which files sit in which repo.

### Risks

- **Nobody has played Claudov yet.** Feel, pacing and difficulty are test-checked only. A campaign that leans on it inherits that. Mitigation: Vincent plays the Oros Roadblock in phase 2 before phase 3 starts.
- **Performance on real hardware is unmeasured.** Partisan's first-render target is under 3 seconds; Claudov loads one large page. Mitigation: run `#bench` on the target laptop, and load maps on demand per mission.
- **Site size.** Claudov's assets (40 MB) plus Partisan's existing content sit against a 90 MB budget. Mitigation: ship only the maps and textures Partisan missions use; the vendoring script reports size and `npm run check` fails over budget.
- **Fork drift.** One quick edit to a platform file breaks conflict-free sync. Mitigation: the sync Action fails the build if any file outside `mods/` and `assets-partisan/` differs from upstream.
- **Two codebases, two styles.** French global-scope engine against English ES modules. Mitigation: they only meet through JSON in `localStorage`, with shared fixtures tested on both sides.
- **Codex collision.** Phase 1 touches `build.py` and adds services while Codex works on `beta`. Mitigation: start phase 1 platform changes after C9 is released to `main`, on a separate `claude/*` branch, and record ownership in `docs/contracts/CONTRACT.md`.
- **Lost tactical depth.** Partisan's six-to-nine-fighter squad tactics go away until phase 5. Mitigation: keep auto-resolve and band strength meaningful, and prioritise allies right after missions.

### Next steps

- [ ] Vincent answers decisions 1 to 6.
- [ ] Wait for C9 (omnimovement) to reach Claudov `main`; no work on `beta` from this plan.
- [ ] Phase 1, first branch: the mod layer in `build.py` plus the host contract in `CONTRACT.md`, with smoke tests showing the platform unchanged without a host.
- [ ] Create the fork and its sync Action; move the Partisan content across in one commit on each side.
- [ ] Phase 2: the bridge and the Oros Roadblock, then Vincent plays it.
