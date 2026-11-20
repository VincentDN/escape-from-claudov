# Escape From Claudov: roadmap

Single status page for the whole project. Updated 20 November 2026. Detail lives in the files linked from each line; this page
says what is done, what is assigned to whom, and what only the owner can do.

## Done and merged on `main`

| Area | What | Where it was specified |
| --- | --- | --- |
| Vertical slice | Raid mode, items and stash, host-owned loot, squads lobby, Wardens, menus, Claudov map | `docs/PLAN.md`, `docs/briefs/` |
| Polish pass 1 | Hidden spawns and Warden numbers, Partisan handling foley, Warden pace and low ready, leaning, thumbnails, workbench main screen, music and harbour ambience, free SKS loadout, fork credit line | `docs/plans/2026-11-14-polish-pass.md` P1 to P7 |
| Handoff T1 to T7 | English page metadata, panel events, bench radio, changelog 0.2.0, full test suite in Actions, holster sound, weapon-check proposal | `docs/HANDOFF.md` |
| Handoff A1 to A9 | Performance route (`#bench`), StG 44 in raids, Scavengers, host migration, container collision, grid inventory data, grid interactions, operator inventory screen, attachments and the hideout workbench | `docs/HANDOFF-ASTRA.md` |
| Other | Raid-only game (team deathmatch retired), Partisan opening scene and StG 44 studio in `showcase/`, ElevenLabs and CC0 handling takes, Partisan radio tracks | git log |

## Open: third track, tasks C1 to C9

Detailed in [`docs/HANDOFF-CODEX.md`](HANDOFF-CODEX.md). Order matters; each task ends on its own mergeable branch.

| Task | What | Size | Depends on |
| --- | --- | --- | --- |
| C1 | Raid-start weapon check (P9), from the T7 proposal | medium | |
| C2 | Partisan weapons, batch 1: AK-15K, AK-74M Zenitco, RPK, M16, G3 | large | weapon-port guide |
| C3 | Partisan weapons, batch 2: MK14, SPEAR, PPSh-41, Bren, Chauchat, and the remaining attachments | large | C2 |
| C4 | Three new enemy types: Marksman, Breacher, Heavy | medium to large | |
| C5 | AI behaviour upgrade for every hostile: squad tactics, cover, grenades, investigation, retreat | large | C4 |
| C6 | Rival raiders: AI squads that insert, loot, fight and extract | large | C5 |
| C7 | Optimisation, part 1: what can be measured without a GPU | medium | |
| C8 | Raid balance from scripted raids | medium | C6 |
| C9 | Omnimovement (P8): dives, slides, prone in every direction, weapon canting | very large, two parts | C1 |

## Waiting on the owner

These cannot be done by an agent in a cloud sandbox:

1. **Play it.** Feel, pacing, difficulty, loot values and the music choice have only been checked by tests. A written list of
   what feels wrong is the most valuable input for C5, C7 and C8.
2. **Performance numbers from a real GPU.** Open the deployed game with `#bench` on the target laptop, run all qualities and
   send the JSON report (`docs/perf.md`). Optimisation part 2 starts from it.
3. **A real-internet raid.** All network tests run two pages in one browser. Two machines on different networks, one raid,
   loot, die, extract, and the host leaving mid-raid: note what breaks.
4. **Soldier animations.** Rebake from your own Mixamo account with `tools/dev/anim/cuire.mjs`; until then soldiers use the
   engine's procedural poses.
5. **Repository settings.** Make `main` the default branch and allow it in the Pages environment, so pushes to `main` deploy.
6. **Public-server squads.** The engine's public lobby server is not in this repository; squads work in private lobbies only.
   Decide whether a server is in scope at all.

## Out of scope until the owner says otherwise

Traders and a currency economy, quests, weapon durability, limb health, a dedicated authoritative server and anti-cheat,
phones and touch, more maps.
