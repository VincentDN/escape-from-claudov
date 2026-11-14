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

**Too many Wardens (owner, after playing other maps)**

- Every raid fields all 11 bot soldiers, whatever the map. The classic maps are about 70 by 100 m, a quarter of Claudov's area, so
  11 Wardens fill them.
- Only Claudov has hand-placed raid data. The other maps get inserts and posts derived from bot waypoints by
  `efcMapFallback` in the core, which keeps inserts away from extracts but not from guard posts.

**Changes**

0. Fewer Wardens, scaled to the map: about one per 3,500 m² of play area, between 3 and 7 at the start (Claudov and Simoun 7, the
   classic maps 3 or 4), plus one per extra player squad. Reinforcements only replace losses up to that number; the raid never
   holds more. Posts shrink to match: one or two Wardens each, the elite post keeps its three on the large maps only.
   The derived data for other maps obeys the same insert rules as Claudov (distance and sight from posts), and a map that
   cannot satisfy them is not offered for raids (D7).
1. Move the four inserts to hidden spots and add two (six in all): inside or behind a structure at the map edge, at least 55 m from
   every post centre, with no line of sight to any post area or to another insert. Where the edge has no cover, add a small
   structure (a shed, a container pair, a wall return).
2. At raid start, Wardens are placed after the players: no Warden within 50 m of an insert in use or in sight of it, and patrols
   stay out of a 45 m bubble around used inserts for the first 90 seconds.
3. Insertion grace: for 8 seconds, or until the player fires or moves 10 m, Wardens cannot detect them. Undetectable, not
   invulnerable, so another player can still shoot them.
4. Squads are spread: each squad gets the insert farthest from the squads already placed.
5. Lethality (owner decision D5): no single body shot from a regular Warden kills from full health; headshots and elites unchanged.

**Proof**: `test-map.mjs` asserts the distance and sight rules; a new check runs 60 raid starts (10 per insert) on Claudov, and 10
on every other map offered for raids, with the player idle for 30 seconds: zero damage, no Warden within 40 m at the start, and
the Warden count within the map's number for the whole raid.

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

## P6. Free loadout: the SKS (added by the owner after the first draft)

The engine has 18 weapons and no SKS, so this is a new, nineteenth weapon plus a menu option.

1. **The rifle**: an SKS built by code like the other guns: wooden stock, fixed ten-round magazine, folded bayonet, semi-automatic.
   Deliberately poor: slow follow-up shots, heavy recoil, loose iron sights, reloaded round by round (the engine's tube-reload
   path, standing in for a stripper clip). Its own shot sound from the P2 audit, and its own thumbnail from P3.
2. **The option**: on the Raid screen, "Free loadout" beside "Your loadout". It gives the SKS with 30 rounds and nothing else. The
   SKS is never banked on extraction; everything you loot is. It replaces today's silent fallback (a free M9 when the stash has no
   weapon), and is offered automatically when the stash is empty.
3. Wardens never carry the SKS and it is not in any loot table, so it stays the mark of a free run.

**Proof**: item and raid tests extended (free kit never banked, loot kept); the gun appears in the weapon contact sheet.

## P7. "A fork of Riposte" under the logo (added by the owner)

A small, quiet line under the logo on the main menu: "a fork of Riposte: Frontline", linking to
https://github.com/BenDBSS/Riposte-Frontline-Source in a new tab. Text in the page, not baked into the logo image, so it is a real
link. When the bench menu (P4) lands, the line moves with the logo. Ten minutes of work: done first, with P1.

## Order and workers

| Step | Work | Workers | Why this order |
| --- | --- | --- | --- |
| 1 | P7 fork line (lead) and P1 spawns | 1 Opus | Small, touches map and Warden files only; deploy as soon as it passes |
| 2 | P2 sounds, P3 thumbnails, P6 SKS | 3 Opus in parallel | Disjoint files (audio; UI and items; weapon model and stash) |
| 3 | P4 bench menu | 1 Opus | Touches the same UI files as P3, so after it |
| 4 | P5 music | 1 Opus, can overlap P4 | Audio files only |

The lead reviews and merges each step, runs `tools/dev/efc/run-all.sh`, and redeploys. Workers commit as they go; the account's
usage limit stopped the first build three times, so steps run in sequence rather than all at once.

## Owner's answers (14 November 2026)

- D1 foley: cleared for the public repo.
- D2 workbench opener: the first screen of https://vincentdn.github.io/partisan-project/, the over-the-shoulder view of an AK
  on the workbench (Partisan's `intro/`), not the phone index.
- D3 flag on the bench: a Claude flag.
- D4 music: archive tracks.
- D5 one-shot kills: approved (no single body shot from a regular Warden kills from full health).
- D6 deploys: approved; until `main` is the default branch and allowed in the Pages environment, deploys run from the `claude/` branch.
- D7 small maps: not answered; the lead's recommendation applies.

## Decisions for the owner

| ID | Question | Recommendation |
| --- | --- | --- |
| D1 | Does your clearance of the 42 foley takes cover publishing them in a public repo? | Confirm, or I use only the Freesound CC0 pack and synthesis |
| D2 | Is "workbench opener" Partisan's phone-on-the-bench index (`menu/`), not the older opening scene in `intro/`? | The phone-on-the-bench index |
| D3 | Keep the FIA flag on the bench, or replace it? | Replace with a plain Claudov harbour-authority flag drawn by code |
| D4 | Music: openly licensed archive tracks, or generated with your Magnific account? | Archive tracks first |
| D5 | Stop regular Wardens killing a full-health player with one body shot? | Yes |
| D7 | Offer raids on the small classic maps at all? | Yes where the insert rules can be met, with 3 or 4 Wardens; otherwise Claudov and Simoun only |
| D6 | Deploys: make `main` the default branch and allow it in the Pages environment? | Yes; until then I deploy from the `claude/` branch |

# Pass 2 (owner, 14 November 2026): starts when everything above is merged and deployed

The scheduled wakes continue into this pass. Order as the owner gave it.

## Q1. The weapon modder from Partisan Project

The full Workbench module (`workbench/` in Partisan: rifle instances, rails, attachment mounts, fitting and clearance, finishes,
stats panel, export) with the lighting and studio set-up of the new StG 44 bench (`workbench/stg44/`). In Claudov it becomes the
place where you modify a weapon from your stash; the modded weapon is what you take into a raid.

- Port from three.js r169 modules to this engine's r147 global script, or load the modder as its own module page inside the game
  and pass the result back as data (decide after reading the code; the second is cheaper and keeps Partisan's code intact).
- An item gains `mods` (attachment ids per mount) and `finish`; stats change with mods; thumbnails (P3) show the modded gun.
- In a raid the first-person and world models show the mods.

## Q2. All new weapons and weapon mods from Partisan, also as loot

- Every Partisan rifle and attachment becomes an item with stats, sounds, a thumbnail and a place in the loot tables (attachments
  as their own loot; Wardens carry some).
- Each new weapon needs first-person handling in this engine: grips, sights, reload choreography, recoil. That is the bulk of the
  work.

**Rights gate, to settle before any Partisan model file enters this public repo.** Partisan's `assets/register.json` lists 47
model entries with no licence recorded, two CC BY 4.0, and one "Purchased asset (commercial licence), terms to be confirmed by
the owner". Partisan is a hidden test project; this repo is public. Commercial model licences usually allow use in a shipped
game but not publishing the model files, and a public repo publishes them. Options:

| Option | What it means |
| --- | --- |
| A | The owner confirms, per model, a licence that allows public redistribution: those models ship |
| B | Models stay out of the repo: fetched at build time from a private store, or the repo goes private |
| C | Only models that are original or openly licensed ship; the rest are rebuilt by code in this engine's style |

Until the owner chooses, nothing whose register entry lacks a redistribution licence is copied. Each file brought over is listed
in `NOTICE.md` with its source and licence.

## Q3. More enemy variety, better AI

- Types beyond the Warden: a lone marksman on high ground, a shotgun rusher indoors, a heavy with armour and a machine gun,
  unarmed scavengers who flee and call Wardens, and rival AI raiders who loot and head for extracts like players.
- Behaviour: squads that flank and suppress, use of cover while reloading, grenades to flush a player out of cover, searching
  where a shot came from, retreating when outnumbered, reacting to open containers and bodies.
- Proof: scripted scenarios per behaviour, and survival and time-to-kill tables per enemy type and difficulty.

## Q4. Optimisation pass

- Measure first, on a real GPU: the build container only has software rendering, so frame times need the owner's machine or a
  capture from the deployed game (the engine has a performance recorder, `src/09zo-perfs.js`).
- Targets: Claudov at 60 frames a second on a mid-range laptop with 8 players and the raid's Wardens; first load under the
  engine's current time; host tick cost with every bot awake.
- Likely work: merge static map geometry, level-of-detail for containers and props, sleep Wardens far from every player, trim
  shadow passes, defer thumbnails and packs, check memory over a 20-minute raid.
