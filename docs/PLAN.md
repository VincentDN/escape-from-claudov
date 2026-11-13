# Escape From Claudov: vertical slice plan

Status: in progress, 13 November 2026. Lead: Claude Fable 5.2. Workers: Claude Opus 5.5 subagents.

**Owner decisions (13 November 2026):** the name is Escape From Claudov; soldier animations will be rebaked by the owner from his own
Mixamo account (until then the game runs on the engine's procedural poses); the repo and build are public; friends-only lobbies
with no hit validation are accepted for the slice; slot inventory; desktop only, phones are out of scope.

**Changes to this plan during the build:** work packages own whole engine files instead of sharing pre-cut seams (the table in
`docs/contracts/CONTRACT.md` is authoritative), waves 1 and 2 run as one wave of seven packages against that contract, and the
engine's unused features are hidden rather than deleted.

## 1. What the slice is

One complete raid, playable in a browser, solo or with friends:

1. In the hideout menu you pick a loadout from your stash and form a squad of one to three.
2. The squad inserts at one of several points on a single map, with no respawn.
3. The map holds AI enemies, other player squads, and loot in containers.
4. You kill, search bodies and containers, and carry what fits.
5. You reach an extraction point and hold it for a few seconds, before the raid timer runs out.
6. Extracted gear goes to your stash. If you die or miss the timer, what you carried is lost and stays lootable on your body.

**Acceptance for the slice**

- A solo raid against bots runs from hideout to post-raid summary with no page reload.
- Two squads on different machines play the same raid; each can loot the other's bodies, and both see the same container contents.
- Stash and loadout survive a page reload.
- 60 fps on a mid-range laptop and a playable frame rate on a recent phone, on the new map with 8 players and about 20 bots.
- The build contains none of the items Riposte's `NOTICE.md` reserves.

**Out of scope for the slice:** traders and currency economy, quests, grid (Tetris) inventory, weapon durability, limb health,
dedicated servers, anti-cheat, accounts, more than one map.

## 2. What Riposte gives us (checked in the 5.6.0 source)

| Area | What exists | Where |
| --- | --- | --- |
| Build | `python3 build.py` joins `src/*.js` in alphabetical order into one HTML page. Runs here in 4 seconds. | `build.py`, `shell.html` |
| Rendering | three.js r147, quality tiers, GPU fallbacks, far/near chunking | `src/01-*` |
| Maps | 9 maps built entirely by code from a kit of 221 prefabs and 39 props; box collisions, ramps, nav grid | `src/02-*`, `src/03-nav.js` |
| Large map | Simoun is 164 m square with a round play zone that kills players who stay outside | `src/02yl-simoun.js`, `RING` in `src/02-map.js` |
| Weapons | 18 weapons in 5 families, 18 attachments, camos, reload and inspect animations | `src/06-*` |
| Soldiers | Procedural soldier models, outfits, ragdolls | `src/06g-body.js`, `src/06h-ragdoll.js` |
| Bots | Difficulty tiers, perception, memory, chase and search, squad plans, human-like movement | `src/07-*` |
| Ground weapons | Dead soldiers drop their weapon; walk over for ammo, hold to swap | `src/08c-pickups.js` |
| Multiplayer | Host-centred lobbies over WebRTC (PeerJS) with a WebSocket relay fallback; lobby code and link | `src/09c-net.js`, `src/09d-netrelay.js` |
| Controls | Keyboard and mouse, gamepad, touch | `src/08a-binds.js`, `src/09q*` |
| Persistence | Weapon progression and custom classes in `localStorage` | `src/06r-arsenal.js` |
| Tooling | Playwright visual tests, render bench, duplicate-declaration check, minifier check | `tools/dev/` |

**Gaps the slice has to close**

| Gap | Detail |
| --- | --- |
| Two teams only | `MATCH.score` is a pair, outfits tag "ally or enemy", spawns are per side. Squads need N teams. `allied(a, b)` in `src/09i-modes.js` is the main seam. |
| Respawn everywhere | All three modes (team deathmatch, free-for-all, domination) respawn. A raid has one life. |
| Loot is local | Dropped weapons are not sent over the network; each player sees their own. Bodies vanish after 5.5 seconds. |
| No items | There is no inventory, armour, medical item, container or stash, only a two-weapon class. |
| Shooter decides hits | The shooter computes hits and the victim applies them. Fine among friends, open to cheating in public raids. |
| 8 players | `NET_MAX = 8`; the host simulates all bots. |
| No server | Accounts, saved progress and the public-lobby server are not in the repository. |
| French code | Code, comments and tool output are French; texts are translated through `i18n/en.txt`. |

## 3. Rights: what we may not carry over

From Riposte's `NOTICE.md`. The code is MIT; these are not.

| Item | Action in our repo |
| --- | --- |
| Name "Riposte: Frontline", logo, icons, deck art | Remove. New name, logo and icons. Keep the MIT `LICENSE` and credit Riposte as the base. |
| Music (Suno free plan, non-commercial) | Remove all four tracks. Ship without music, or with CC0 tracks. |
| Soldier animations baked from Mixamo | Cannot be redistributed. The engine starts without them and falls back to procedural motion. **Owner decision D3.** |
| Hit sound sample (flashkit.com) | Replace with a synthesised or CC0 sample. |
| Sounds and voices | Mostly CC0, some CC BY. Keep `assets/sfx/credits.json` and show credits in the game. |
| Textures, skies, HDRI | CC0. Keep. |

The title plays on the name of an existing extraction shooter. The game itself will be original: our own setting, map, factions,
items and names, nothing copied from that game. I recommend treating "Escape From Claudov" as a working title (**D1**).

## 4. Design of the slice

Kept deliberately small. Each line is one decision a worker can build against.

- **Setting.** Claudov, a sealed industrial port town. Original map built from Riposte's kit (port, rail, winter and village
  prefabs), about 160 m square, reusing Simoun's large-map settings.
- **Raid.** 20 minutes. Up to 8 players in squads of one to three. Three insertion points, three extraction points, one of them
  conditional (opens after minute 10).
- **Enemies.** "Wardens": AI groups of two to four guarding points of interest and patrolling between them, about 20 alive at once,
  simulated by the host. One tougher guard group on the best loot.
- **Life and death.** One life. A downed player's body stays for the whole raid as a lootable container.
- **Health.** Single health pool. Armour in three tiers reduces torso damage. Medkit and bandage items take time to use.
- **Inventory.** Slots, not a grid: two long weapons, sidearm, armour, rig, backpack. The backpack is a list with a weight limit.
- **Items.** About 40: the 18 weapons, ammunition by family, 3 armours, 3 backpacks, 2 medical items, and about 12 valuables.
- **Loot.** Containers (crates, lockers, bags) rolled by the host at raid start from per-zone tables. Searching takes 1 to 3 seconds.
- **Extraction.** Stand in the zone for 7 seconds. Squad members extract individually.
- **Stash.** Unlimited list in `localStorage` for the slice, with a starter kit and a free fallback loadout so nobody is locked out.
- **Score.** Post-raid summary: survived or not, kills, items extracted and their value. Value is the only currency-like number.

## 5. Technical approach

### 5.1 Repository

Copy Riposte 5.6.0 into this repo as the starting commit (MIT allows it; history stays in the fork), then diverge.

```
src/            inherited engine, French, edited only through seams
src/efc/        new game code, English, files NN-efc-<topic>.js, top-level names prefixed EFC / efc
assets/         inherited assets minus the reserved ones, plus ours
tools/dev/efc/  smoke test, two-client network test, logic unit tests
docs/           this plan, contracts/, decisions
```

`build.py` gets one change: also concatenate `src/efc/*.js` after `src/*.js`.

### 5.2 Seams into the engine

All inherited code shares one global scope. To let several workers build at once without colliding, the lead cuts a small set of
hooks into the engine first, and workers only add files that register on them.

| Seam | Engine site | Used for |
| --- | --- | --- |
| `MODES.raid` and `modeStart / modeUpdate / modeEnd` | `src/09i-modes.js` | raid state machine, no respawn, timer |
| `allied(a, b)`, `soundFoe`, team colour tag | `src/09i-modes.js`, `src/06e-gear.js` | N squads plus the Warden faction |
| `applyDamage` pre and post hooks | `src/09-game.js` | armour, death to lootable body |
| `chooseSpawn` | `src/09i-modes.js` | insertion points |
| `MAP_DEFS.<id>` extra fields: `inserts`, `extracts`, `containers`, `lootZones` | `src/02z-load.js` | map data for raid systems |
| Bot goal provider | `src/07b-tactics.js`, `src/07d-squad.js` | guard and patrol plans |
| Net message registry: `efcNetOn(type, fn)`, `efcNetSend(type, data)` | `src/09c-net.js` | all new replicated state |
| Interact prompt | `src/08c-pickups.js` | containers, bodies, ground items |
| Menu screen registry | `src/09e-menus.js` | hideout, stash, post-raid |

### 5.3 Network model

Keep Riposte's host-centred lobby and its "shooter decides" hits for the slice. Add one rule: **the host owns the world**. Container
contents, ground items, bodies, extraction and raid end are decided by the host and replicated; a client asks ("take item 3 from
container 12") and the host answers. This fixes the local-loot gap and is the shape a dedicated server would later take over.
Hit validation and anti-cheat are deferred (**D4**).

### 5.4 Contracts first

Before any parallel work, the lead writes four short contracts in `docs/contracts/` and commits stub implementations so every
package builds against the same names: item and inventory schema, net messages, raid events, map definition fields.

## 6. Team and work packages

The lead (Fable 5.2) owns the plan, the seams, the contracts, integration and review, and does not delegate those. Each work
package goes to one Opus 5.5 subagent in its own git worktree, with a brief that states goal, owned files, contracts to honour, and
the checks that define done. Workers do not edit each other's files. The lead merges each package into
`claude/trusting-franklin-zp9ch5` after reading the diff and running the checks.

### Wave 0: foundation (lead, serial)

| ID | Work | Done when |
| --- | --- | --- |
| F0 | Import engine; rename; remove reserved assets; remove accounts, community, public servers, rank-up, killstreaks, helicopter, drone, mecha, challenge outfits | Builds, boots to menu, a bot match still plays, no reserved file in the tree |
| F1 | Cut the seams of 5.2; `src/efc/` in the build; net message registry; protocol bump | Existing modes still pass the inherited visual tests |
| F2 | Contracts and stubs; `tools/dev/efc/smoke.mjs` (headless: boot, start a match, 30 seconds, no console error) | Smoke test green in this container |

### Wave 1: systems (5 workers in parallel)

| ID | Work | Owns | Depends on |
| --- | --- | --- | --- |
| RAID | Raid mode: insertion, one life, timer, extraction zones, end states, spectate squad after death | `src/efc/10-efc-raid.js` | F1 |
| SQUAD | N-team support: squad ids, friend or foe, colours, lobby squad picker, Warden faction | `src/efc/11-efc-squad.js` | F1 |
| ITEMS | Item catalogue, inventory and stash logic, loadout to engine class bridge, persistence. Pure logic with node unit tests | `src/efc/20-efc-items.js`, `21-efc-inventory.js`, `22-efc-stash.js` | F2 |
| WORLD | Host-owned world state and its replication: containers, ground items, bodies, late join and leave | `src/efc/30-efc-world.js`, `31-efc-worldnet.js` | F1, F2 |
| WARDEN | AI groups: guard, patrol, alert, reinforcement, loot they carry | `src/efc/40-efc-wardens.js` | F1 |

### Wave 2: play (5 workers in parallel)

| ID | Work | Owns | Depends on |
| --- | --- | --- | --- |
| LOOT | Interaction in the world: search containers and bodies, take, drop, swap; loot tables | `src/efc/32-efc-loot.js` | ITEMS, WORLD |
| VITALS | Armour tiers, medical items with use time, ammunition as items | `src/efc/23-efc-vitals.js` | ITEMS |
| UI | Hideout, stash and loadout screens, in-raid inventory and loot panel, raid HUD, post-raid summary; keyboard, gamepad and touch | `src/efc/50-efc-ui-*.js`, CSS block in `shell.html` | ITEMS, RAID |
| MAP | The Claudov map: layout, collisions, nav, insertion and extraction points, container sites, loot zones, lighting | `src/efc/60-efc-claudov*.js` | F2 (greybox on Simoun until it lands) |
| BRAND | Name, logo, icons, item icons drawn by code, replacement hit sound, ambience, credits screen | `assets/` additions, `src/efc/70-efc-brand.js` | F0 |

### Wave 3: proof (3 workers, then lead)

| ID | Work | Done when |
| --- | --- | --- |
| QA-NET | Two-browser Playwright test: host and guest raid, loot the same container, kill, loot body, extract | Test green, repeated 10 times |
| QA-PERF | Bench on the Claudov map with 8 players and 20 bots; fix the top costs | Meets the acceptance frame rates |
| BALANCE | Loot tables, Warden difficulty, raid length, starter kit, from scripted bot-only raids | Median solo raid lasts 8 to 15 minutes; survival rate 30 to 50 percent at default difficulty |
| SHIP (lead) | Deploy the static build, write the README, tag the slice | Acceptance list in section 1 all checked |

### Rules for every worker

- Read `AGENTS.md` and the contracts. Stay inside owned files. Need a new seam: stop and ask the lead.
- Each package ends with: build passes, declaration check passes, smoke test passes, its own test added, a short handoff note in the
  commit body saying what was verified and what was not.
- The lead reviews each diff before merging and runs a separate reviewer on WORLD and SQUAD, the two packages most likely to
  break multiplayer.

## 7. Milestones

| Milestone | Contains | You can do this |
| --- | --- | --- |
| M0 Boot | Wave 0 | Open the renamed game, play a bot match |
| M1 First raid | RAID, SQUAD, WARDEN on Simoun | Insert solo, fight Wardens, extract or die |
| M2 Loot loop | ITEMS, WORLD, LOOT, VITALS, UI | Bring a loadout, loot, extract, see it in the stash after reload |
| M3 Squads | QA-NET fixes | Two squads in one raid over the network |
| M4 Claudov | MAP, BRAND, QA-PERF, BALANCE, SHIP | The slice, on its own map, deployed |

Each milestone ends on a playable build that I report with what was and was not verified.

## 8. Risks

| Risk | Why | Mitigation |
| --- | --- | --- |
| Two-team assumptions run deep | Scores, colours, spawns, bot target choice all assume sides 0 and 1 | SQUAD is first in wave 1 with its own reviewer; fallback is free-for-all identity with a squad allow-list |
| Parallel edits to shared global scope | One script, no modules | Seams, file ownership, name prefix, declaration check on every commit |
| Host load | Host simulates 20 bots and owns the world for 8 players | Bench early (M1); cap Wardens by host device; sleep groups far from all players |
| Host leaves mid-raid | Riposte can hand a match to another player; world state must move too | WORLD snapshots are complete and small; test host migration in QA-NET |
| Cheating | Shooter decides hits; stash is in `localStorage` | Accepted for a friends-only slice; documented; D4 |
| Animations | Mixamo clips cannot ship in our repo | D3 |
| French codebase | Workers must read French comments | Opus reads French well; new code is English; no translation pass |
| Map scope | A hand-built 160 m map is the largest single item | Greybox on Simoun through M3 so nothing waits for the map |

## 9. Decisions for the owner

| ID | Question | My recommendation |
| --- | --- | --- |
| D1 | Is "Escape From Claudov" the public name or a working title? | Working title; pick a distinct public name before anything is published |
| D2 | Should the repo and the deployed build be public? | Private repo and an unlisted build for the slice |
| D3 | Soldier animations: rebake from your own Mixamo account, or ship on the procedural fallback? | Start on the fallback; you rebake when convenient. It needs your account, I cannot do it |
| D4 | Friends-only lobbies for the slice, with no hit validation? | Yes. A dedicated authoritative server is the first item after the slice |
| D5 | Slot inventory instead of a grid? | Yes for the slice |
| D6 | Phones in scope for the slice? | Playable, not tuned: touch works for raid and looting, performance tuned on desktop first |
