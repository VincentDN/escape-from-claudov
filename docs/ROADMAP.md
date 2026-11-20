# Escape From Claudov: roadmap

Single status page for the whole project. Updated 20 November 2026, with the owner's decisions of that day. Detail lives in the files linked from each line; this page
says what is done, what is assigned to whom, and what only the owner can do.

## Done and merged on `main`

| Area | What | Where it was specified |
| --- | --- | --- |
| Vertical slice | Raid mode, items and stash, host-owned loot, squads lobby, Wardens, menus, Claudov map | `docs/PLAN.md`, `docs/briefs/` |
| Polish pass 1 | Hidden spawns and Warden numbers, Partisan handling foley, Warden pace and low ready, leaning, thumbnails, workbench main screen, music and harbour ambience, free SKS loadout, fork credit line | `docs/plans/2026-11-14-polish-pass.md` P1 to P7 |
| Handoff T1 to T7 | English page metadata, panel events, bench radio, changelog 0.2.0, full test suite in Actions, holster sound, weapon-check proposal | `docs/HANDOFF.md` |
| Handoff A1 to A9 | Performance route (`#bench`), StG 44 in raids, Scavengers, host migration, container collision, grid inventory data, grid interactions, operator inventory screen, attachments and the hideout workbench | `docs/HANDOFF-ASTRA.md` |
| Other | Raid-only game (team deathmatch retired), Partisan opening scene and StG 44 studio in `showcase/`, ElevenLabs and CC0 handling takes, Partisan radio tracks | git log |

## Open: third track, tasks C0 to C15

Detailed in [`docs/HANDOFF-CODEX.md`](HANDOFF-CODEX.md), in this order (owner, 20 November 2026). Each task ends on its own
mergeable branch.

| Order | Task | What | Size |
| --- | --- | --- | --- |
| first | L0 | Art style lab: `#artlab` loads Claudov empty with live dials (retro/PS1 dither, lens, colour), presets, A/B split, copy and paste of settings (`docs/artlab/README.md`); on `claude/l0-art-style-lab`, waiting for review | medium |
| 0 | C0 | Finish the grid inventory: visual drag and drop between every panel, R to rotate, foley on every action | medium |
| 1 | C1 | Raid-start weapon check (P9), from the T7 proposal | medium |
| 2 | C9 | Omnimovement: dives, slides, prone in every direction, weapon canting with the body | very large, two parts |
| 3 | C2 | Partisan modern weapons, batch 1: AK-15K, AK-74M Zenitco, RPK, M16, G3 | large |
| 4 | C15 | Minimal HUD: no ammo counter; hold R to pull the magazine and see the rounds | medium |
| 5 | C11 | `M` opens a full-screen map with extracts and points of interest; green smoke flares over open extracts | medium |
| 6 | C12 | Dirty lens, lens flare and bloom when looking at light sources | medium |
| 7 | C13 | Real weapon foley for every action, with ElevenLabs alternatives and variants (plan use approved) | medium to large |
| 8 | C3 | Remaining modern weapons (MK14, SPEAR) and every remaining attachment | large |
| 9 | C4 | Marksman, Breacher and Heavy enemy types | medium to large |
| 10 | C5 | AI behaviour upgrade for every hostile | large |
| 11 | C6 | Rival raider squads | large |
| 12 | C7 | Optimisation, part 1 (what can be measured without a GPU) | medium |
| 13 | C8 | Raid balance from scripted raids | medium |
| 14 | C14 | Second World War weapons: PPSh-41, Bren, Chauchat (in, but after the modern ones) | large |
| any | C10 | Clean, modern menu fonts instead of the stencil face | small |

## Waiting on the owner

These cannot be done by an agent in a cloud sandbox:

1. **Play it.** Feel, pacing, difficulty, loot values and the music choice have only been checked by tests. A written list of
   what feels wrong is the most valuable input for C5, C7 and C8.
2. **Performance numbers from a real GPU.** Open the deployed game with `#bench` on the target laptop, run all qualities and
   send the JSON report (`docs/perf.md`). Optimisation part 2 starts from it.
3. **A real-internet raid.** All network tests run two pages in one browser. Two machines on different networks, one raid,
   loot, die, extract, and the host leaving mid-raid: note what breaks.
4. **Soldier animations.** Download the Mixamo animations from your own account; step by step in
   [`outbound/TODO_VINCENT_MIXAMO.md`](../outbound/TODO_VINCENT_MIXAMO.md). Until then soldiers use the engine's procedural poses.
5. **Repository settings.** Make `main` the default branch and allow it in the Pages environment, so pushes to `main` deploy.
6. **Public-server squads.** The engine's public lobby server is not in this repository; squads work in private lobbies only.
   Decide whether a server is in scope at all.

## Out of scope until the owner says otherwise

Traders and a currency economy, quests, weapon durability, limb health, a dedicated authoritative server and anti-cheat,
phones and touch, more maps.
