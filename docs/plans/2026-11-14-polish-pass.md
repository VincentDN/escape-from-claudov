# Polish pass 1: plan

Status at the pause of 15 November 2026 (owner asked for a wrap-up; workers paused, the five-hourly wake is disabled).

**Merged and deployed**: P1 spawns and Warden numbers, P2 weapon sounds, P2b Warden pace and posture, P2c leaning, P3 and P3b
thumbnails, P4 workbench main screen, P5 music and harbour ambience, P6 free SKS loadout, P7 fork line.
**Not started**: P6b grid inventory, P8 omnimovement, P9 raid-start weapon check, and all of Pass 2.
**Known gaps in what is merged**: the workers of P2b, P2c, P5 and P6 were stopped by the usage limit before writing their
final reports, so the lead merged their committed work and ran their tests instead of reviewing a report; nobody has played
any of it; music was chosen by description, not by ear.

Priority order is the owner's.

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

### Follow-up. Recorded handling foley

- Audit the live handling bank and mark which cues use recordings, generated audio or synthesis. Prioritize the cues still
  using synthesis or repeated generic clips.
- Audition existing owner-cleared takes and licensed recorded sound libraries. Build several clean variants for each common
  handling cue, with coverage for reloads, magazine movement, action sounds, draw, holster and inspect.
- Match the sound transients to the in-game animations, level-match old and new clips for an A/B review, and verify that each
  selected recording plays in a raid. Record the source and redistribution terms for every new clip.

## P2b. Warden pace and posture (owner, 14 November)

Owner's report: Wardens move weirdly fast; they should move slower, and much slower when idle, in a relaxed low-ready pose.

1. Three paces, set in `EFC.cfg`: **idle** (guarding, patrolling, returning to post) a slow walk of about 1.3 m/s with the
   weapon at low ready (muzzle down, off the shoulder, head scanning); **alert** (heard something, searching) a careful walk of
   about 2.2 m/s, weapon up; **combat** the engine's speeds reduced by about 20 percent, sprinting only to cover or to flank.
2. A low-ready pose and a relaxed walk cycle in the soldier animation (`src/06b-soldier.js`, `src/06ac-loco.js`); a visible
   raise of the weapon when a Warden goes from idle to alert, which also gives the player a moment to react.
3. Turn speed and reaction follow the state: an idle Warden turns its head first, then its body.

**Proof**: measured speed per state in a scripted run; screenshots of an idle and an alert Warden side by side; the Warden test
still passes (patrol distances and timings adjusted to the new pace).

## P2c. Leaning (owner, 14 November)

1. Lean left and right on Q and E (rebinding E's current weapon-swap use to F-hold or the interact key, to be settled in the
   brief): the camera and weapon roll about 15 degrees and shift about 0.35 m sideways, held or toggled per a setting, blocked
   by walls so the head cannot pass through them.
2. The third-person soldier leans too, so others see it, and it is replicated online in the published state.
3. Hit boxes follow the lean; Wardens can see and shoot a leaning head but not the hidden body.
4. Works while standing, crouched and aiming; cancelled by sprinting.

**Proof**: a test that the eye point moves and collides correctly, that the remote copy leans in the two-client rig, and that a
shot at the pre-lean head position misses.

## P3. Item thumbnails

1. **Guns**: a clean side render of each of the 18 weapons, made from the engine's own gun models (`buildWorldGun`) in an
   offscreen pass: orthographic, studio light, transparent background, rendered once at first use and cached. No image files, and
   the picture always matches the model.
2. **Other items (26)**: the same renderer on small code-built props, so everything shares one look. Armour and packs reuse the
   engine's gear geometry; ammunition boxes, bandage, medkit and the 13 valuables get simple low-poly props.
3. Shown in the hideout, the in-raid inventory, the loot panel and the summary.

**Proof**: a test that every item definition yields a non-empty thumbnail, and one contact sheet of all 44 for the owner.

## P3b. Larger thumbnails (owner, 14 November; around P2)

The row thumbnails are 72 by 27 pixels and the slot ones 112 by 42. Make weapons and items read at a glance:

1. Rows: about 128 by 48 for weapons and 64 by 64 for other items, with the row height raised to fit; slots about 220 by 84.
2. A large preview (about 420 by 160, re-rendered at that size, not scaled up) for the selected or hovered item, with its name,
   weight, value and, for weapons, calibre, magazine and loaded rounds.
3. Guns lit brighter with a light rim so dark guns stand out on the dark panels.

**Proof**: the thumbnail test at the new sizes; screenshots of the hideout and the loot panel.

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
| 2b | P2b Warden pace and posture, P2c leaning | 2 Opus, after P1 is merged | P2b touches the Warden files P1 is changing; P2c touches player and net files |
| 3 | P4 bench menu | 1 Opus | Touches the same UI files as P3, so after it |
| 4 | P5 music | 1 Opus, can overlap P4 | Audio files only |
| 4b | P6b grid inventory with operator view | 2 Opus (data and rules; screen and operator render) | After P6, P3b and P4; the largest UI item |
| 5 | P9 raid-start weapon check | 1 Opus | After P2 (foley), P6 (SKS) and P7 |
| 6 | P8 omnimovement | 2 Opus (movement and stances; weapon and body poses) | After P7 and after leaning, which it builds on |

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

## P6b. Inventory rework: grid, with the operator in the middle (owner, 14 November; after P6)

Reference from the owner: a DayZ-style screen with the surroundings on the left, the character standing in the middle, and
equipment with its containers on the right. This replaces the slot-and-list inventory chosen for the first slice.

1. **Grid**: every item has a size in cells (a pistol 2 by 1, a rifle 5 by 2, a bandage 1 by 1) and can be rotated. Each carried
   container (vest or rig, backpack, pockets) is its own grid whose size comes from the item. Weight still limits movement.
2. **Layout**: left, what is nearby (the open container or body, and items on the ground within reach); centre, your operator
   in full gear in a relaxed idle pose, slowly turnable with the mouse, wearing and holding exactly what is equipped; right,
   equipment slots (head, armour, rig, pack, primary, secondary, sidearm) and each container's grid beneath its name and fill
   count. A hands bar and quick slots along the bottom.
3. **Handling**: drag and drop with the mouse, rotate with R, double-click to equip or move, shift-click to move a stack,
   split a stack, drop by dragging out. Keyboard navigation stays possible. Invalid placements are shown before the drop.
4. **Data**: `Inventory` gains containers with cells and item positions; the stash becomes a large grid; a one-time migration
   places existing stash and loadout items automatically. Host-owned containers in the world get grids too, so two players
   see the same layout in a body or crate, and a take still succeeds exactly once.
5. **The operator view** uses the engine's soldier model and outfit, rendered into the panel by the game's renderer (as the
   thumbnails are), with the equipped weapon in hand and the mods from the weapon modder when that lands.
6. Original presentation: the layout follows the genre; no artwork, icons or text are copied from DayZ, Tarkov or any other game.

**Proof**: logic tests for placement, rotation, overflow, stack rules and migration; the two-client rig for a shared grid;
screenshots of the hideout and the in-raid screen; the end-to-end raid test rewritten for the grid.

## P8. Omnimovement (owner, 14 November; after P7)

Full omnidirectional movement in the manner of recent Call of Duty and Battlefield 6.

1. **Movement**: sprint, slide and dive in any direction (forward, sideways, backward) with momentum carried between them;
   mantle and vault; tactical sprint as a short burst.
2. **Prone in every direction**: go prone and roll onto the back or either side; turn through 360 degrees while prone without
   the body spinning under the camera; crawl, and shoot while lying on the back.
3. **The weapon follows the body**: the first-person weapon cants as the body's orientation demands (on the back the rifle is
   held across the chest and canted, on a side it is rolled toward the ground arm), with believable transitions, and the aim
   limits follow (no aiming through your own legs). The third-person soldier matches, and it is replicated online.
4. **Wardens and hit boxes** follow the new stances; Wardens themselves stay on their current movement set in this step.
5. The engine already has slide and crouch (`src/08-player.js`, `src/07e-humain.js`); prone, dive, roll and the canted
   first-person poses are new, and are the bulk of the work (`src/06f-hands.js`, `src/06b-soldier.js`).

**Proof**: a state-machine test for every transition and direction; collision checks so no stance clips through walls or the
floor; contact sheets of each stance in first and third person for the owner; the two-client rig shows the same stance remotely.

## P9. Raid-start weapon check (owner, 14 November; a flourish, after P7)

For the first few steps of every raid the player checks their weapon: tilts it, pulls the magazine to look at it, seats it
again, a press check of the chamber, then brings it up.

1. Built on the engine's inspect choreography (`src/06d-reload.js` has reload and inspect sequences per weapon family), so each
   family gets its own version: magazine out and back for rifles, SMGs and pistols; bolt cracked open for bolt actions; a shell
   check for pump shotguns; the SKS shows its fixed magazine by opening the bolt.
2. It plays while the player walks during the insertion grace (P1), with the handling foley from P2.
3. It never costs control: firing, aiming, sprinting or switching weapon cancels it at once, and the weapon is always loaded
   and ready (the magazine count does not change).
4. Other players see the third-person version; a setting turns it off.

**Proof**: a test that it starts at insertion, cancels on each input within one frame, and leaves ammunition unchanged; one
contact sheet per weapon family.

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

**Owner's answer, 14 November 2026: all Partisan weapons are rights cleared; port them all over.** Option A applies to every
weapon and weapon-mod model. Each file brought over is listed in `NOTICE.md` as "from Partisan Project, rights cleared by the
owner", with the register's licence text where it has one (the two CC BY 4.0 models keep their author credit).

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
