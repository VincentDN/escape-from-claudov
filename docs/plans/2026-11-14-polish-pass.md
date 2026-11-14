# Polish pass 1: plan

Status: proposal, 14 November 2026. Nothing below is built. Priority order is the owner's.

## P1. Spawns on Claudov (first, alone)

**What is wrong today** (read from `src/efc/60-efc-claudov.js` and the Warden code)

| Insert | Nearest guard post | Distance |
| --- | --- | --- |
| South-west quay (-56, -74) | Dry dock | 34 m, on the open quay lane |
| South (20, -76) | Warehouse A, the elite post | 42 m |
| East (76, 10) | Housing | 30 m |
| North (-20, 76) | Container yard | 46 m |

- Post radii are 10 to 14 m and Wardens patrol to neighbouring posts, so a Warden can be within 20 m of an insert at the start.
- The reinforcement rule (no respawn within 45 m or in sight of a player) does not apply to the first placement.
- The engine's spawn protection lasts 2 seconds. A Warden can kill a full-health player with one shot.

**Changes**

1. Move the four inserts to hidden spots and add two (six in all): inside or behind a structure at the map edge, at least 55 m from
   every post centre, with no line of sight to any post area or to another insert. Where the edge has no cover, add a small
   structure (a shed, a container pair, a wall return).
2. At raid start, Wardens are placed after the players: no Warden within 50 m of an insert in use or in sight of it, and patrols
   stay out of a 45 m bubble around used inserts for the first 90 seconds.
3. Insertion grace: for 8 seconds, or until the player fires or moves 10 m, Wardens cannot detect them. Undetectable, not
   invulnerable, so another player can still shoot them.
4. Squads are spread: each squad gets the insert farthest from the squads already placed.
5. Lethality (owner decision D5): no single body shot from a regular Warden kills from full health; headshots and elites unchanged.

**Proof**: `test-map.mjs` asserts the distance and sight rules; a new check runs 60 raid starts (10 per insert) with the player
idle for 30 seconds and requires zero damage and no Warden within 40 m at the start.

## P2. Weapon handling and firing sounds from Partisan Project

**What Partisan has**

- `assets/audio/foley/`: 42 recorded handling takes (click, clunk, ratchet, slide, hit, handle, long). The register says "supplied
  by the project owner; checked and cleared by the owner". No source is recorded.
- `assets/audio/shooter/`: Freesound, CC0 only, authors listed: rifle and sniper shots, reload, shells, impacts, ricochets, fly-bys.
- `shared/mech.js`: a synthesised handling voice used as the fallback.

**What Claudov has**: recorded shots per weapon with near, far and first-person variants, and its own handling pack
(`assets/sfx/foley`), which I have not auditioned.

**Changes**

1. Audit first: list every handling event the engine fires (magazine out, magazine in, bolt, charging handle, pump, shell insert,
   draw, holster, aim, inspect) and what plays for each today.
2. Map each event to Partisan takes by category, several takes per event so repeats differ, heavier weapons pitched lower as
   Partisan does. Convert through the engine's pack builder (`tools/build_sfx.py`) so loading and fallbacks stay as they are.
3. Shots: keep the engine's per-weapon distance variants; add Partisan's rifle and sniper shots only where the audit shows a
   family is weak. Add shell casings on the ground and Partisan's ricochets.
4. Inventory and looting use the same foley (open a container, take, equip, drop), as Partisan's inventory does.
5. Credits: Freesound authors go into `assets/sfx/credits.json`; the owner-cleared bank is recorded in `NOTICE.md` (see D1).

**Proof**: I cannot hear. I can check that every event has a sample, levels, clipping and timing against the animation. An
audition page (`dev/sounds.html`: every event, old and new, with play buttons) lets the owner judge by ear.

## P3. Item thumbnails

1. **Guns**: a clean side render of each of the 18 weapons, made from the engine's own gun models (`buildWorldGun`) in an
   offscreen pass: orthographic, studio light, transparent background, rendered once at first use and cached. No image files, and
   the picture always matches the model.
2. **Other items (26)**: the same renderer on small code-built props, so everything shares one look. Armour and packs reuse the
   engine's gear geometry; ammunition boxes, bandage, medkit and the 13 valuables get simple low-poly props.
3. Shown in the hideout, the in-raid inventory, the loot panel and the summary.

**Proof**: a test that every item definition yields a non-empty thumbnail, and one contact sheet of all 44 for the owner.

## P4. Main screen: Partisan's workbench opener

**Reading of the request** (D2): Partisan's index, `menu/`: a close-up of a phone lying on the workbench, its screen real HTML laid
over the 3D phone, in the bench room (table, work lamp, pegboard, radio, flag). About 450 lines across `shared/bench-scene.js`,
`shared/homography.js` and `menu/menu.js`.

**Changes**

1. Port the bench scene and the phone to Claudov's renderer. Partisan uses three.js r169 as ES modules; Claudov runs r147 in one
   global script, so this is a port, not a copy. It replaces the animated key-art background.
2. The main menu entries (Raid, Squad raid, Hideout, Settings, Credits) live on the phone screen, keyboard and mouse as now.
3. Other screens (lobby, settings, hideout) open over the dimmed bench in the current style.
4. The flag on the bench is Partisan's and owner-supplied (D3).
5. Stretch, only if cheap: the weapon of your current loadout lies on the bench.

**Proof**: menu test updated; screenshots of the bench menu at 1280 and 1920 wide; time to first menu frame compared with today.

## P5. Music and atmosphere

Tarkov's own soundtrack, or anything taken from it, cannot ship. What can: original or openly licensed music in that register
(dark ambient, low drones, sparse guitar or synth, industrial texture).

1. **Source** (D4). Recommended: CC0 or CC BY tracks from archives that state their terms (OpenGameArt, Freesound, Free Music
   Archive), each with its source page and licence in the credits. Alternative: generate original tracks with the owner's Magnific
   account, after checking that its terms allow use in a public game (the Suno tracks were removed from the engine for exactly
   that reason).
2. **Where it plays**: a menu theme on the bench radio; two or three quiet raid beds that rotate; short stings for extraction,
   death and the late extract opening.
3. **Atmosphere beyond music**: Claudov's ambience pack gets distant harbour sounds (horn, chains, gulls, wind in rigging) from
   CC0 sources, and Partisan's CC0 "distant battle" bed at low level.
4. Stretch: a tension layer that fades in while a Warden is alerted to you.

**Proof**: tracks load, loop without a click, obey the music volume setting; a rights table in the credits. Anything whose terms
are unclear goes to a review sheet and does not ship.

## Order and workers

| Step | Work | Workers | Why this order |
| --- | --- | --- | --- |
| 1 | P1 spawns | 1 Opus | Small, touches map and Warden files only; deploy as soon as it passes |
| 2 | P2 sounds and P3 thumbnails | 2 Opus in parallel | Disjoint files (audio against UI and items) |
| 3 | P4 bench menu | 1 Opus | Touches the same UI files as P3, so after it |
| 4 | P5 music | 1 Opus, can overlap P4 | Audio files only |

The lead reviews and merges each step, runs `tools/dev/efc/run-all.sh`, and redeploys. Workers commit as they go; the account's
usage limit stopped the first build three times, so steps run in sequence rather than all at once.

## Decisions for the owner

| ID | Question | Recommendation |
| --- | --- | --- |
| D1 | Does your clearance of the 42 foley takes cover publishing them in a public repo? | Confirm, or I use only the Freesound CC0 pack and synthesis |
| D2 | Is "workbench opener" Partisan's phone-on-the-bench index (`menu/`), not the older opening scene in `intro/`? | The phone-on-the-bench index |
| D3 | Keep the FIA flag on the bench, or replace it? | Replace with a plain Claudov harbour-authority flag drawn by code |
| D4 | Music: openly licensed archive tracks, or generated with your Magnific account? | Archive tracks first |
| D5 | Stop regular Wardens killing a full-health player with one body shot? | Yes |
| D6 | Deploys: make `main` the default branch and allow it in the Pages environment? | Yes; until then I deploy from the `claude/` branch |
