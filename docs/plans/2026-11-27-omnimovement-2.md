# Plan: C17 first-person lower body and C18 Omnimovement 2

Written 27 November 2026 (Claude) at the owner's request: "the players should always see their lower body when moving
around", then "a comprehensive Omnimovement update" that feels like Black Ops 6 omnimovement. **Plan only.** Sol or Astra
implement it, one card at a time, with the working rules of `docs/CODEX-SOL-TASKS.md` on `beta` (sections 0 to 2: one branch
per card, push after every step, `docs/SOL-PROGRESS.md` checkpoint, base checks before every commit). Card ids continue the
C-numbering: C17 and C18 were unused.

Base: `beta` at `9f72d67` (C9-1 to C9-8 done, C15 next, C16-4 to C16-13 open). The owner chose to keep this plan on `beta`
(27 November 2026); the C17 and C18 rows are also in the table in section 4 of `CODEX-SOL-TASKS.md`. Update the status in both
places when a card is done.

## 1. Rules for this track (read first)

- **Mechanics and feel, not assets.** We copy how the movement behaves and how it reads on screen: timing, phases, camera and
  weapon behaviour. Every animation is our own, authored as data in this repository. Do not trace, rotoscope or import frames,
  poses, models, sounds or UI from any Call of Duty game or video. No new Mixamo clips: the baked Mixamo set is not ours to ship
  (`NOTICE.md`), and authored clips must work without it.
- **One body, two views.** The authored clips drive the player's own body. First person shows its legs (C17); third person and
  remote players show the whole body. Never maintain a separate "legs only" animation set.
- **Poses are data.** Clips go in `assets/anim/efc-omni-clips.json`; no hard-coded bone angles in JS beyond what exists.
- Raid mode only: gate every behaviour on `entity.isPlayer && efcRaidMode()` (player) or the replicated stance (remote).
- Respect reduced motion: no camera roll, no FOV kicks, no shake; poses still play.
- Check `docs/contracts/CONTRACT.md` before editing an engine file (`src/0*.js`). C9 used small hooks in `07c-controller.js`,
  `08-player.js` and `06b-soldier.js`; keep to that size and list each hook in the commit body.
- Numbers below are **starting values**, not truth. They come from the reference frames (section 3) where those show something
  measurable, and otherwise from Black Ops 6's documented behaviour and our own judgement. All live in one tuning table
  (C18-1) so the owner's play sessions can change them without code.

## 2. What `beta` already has (do not rebuild)

| Piece | Where | State |
| --- | --- | --- |
| State helper `efcOmniState` (stand, crouch, sprint, tactical, slide, air, dive, mantle, vault, prone, supine, side) | `src/efc/44-efc-omni.js` line 4 | done (C9-1) |
| Sprint in any direction, tactical sprint (0.82 s boost, 1.55 s cooldown, x1.17) | `44-efc-omni.js` lines 2 to 35 | done (C9a) |
| Slide from sprint along velocity, steering, jump exit | engine slide in `src/07c-controller.js` (`slideT`) | done (C9a) |
| Dive: Crouch while **airborne** from a sprint; impulse x1.3 (7.5 to 10.3 m/s), lift 2.5 m/s, 0.65 s cooldown, lands prone | `44-efc-omni.js` lines 37 to 67 | done (C9-2) |
| Mantle and vault (knee and waist rays, 0.5 to 1.2 m ledges) | `44-efc-omni.js` lines 152 to 278 | done (C9-3) |
| Prone (hold Crouch 0.4 s), crawl 0.9 m/s, 360 turn with automatic roll to back, Lean to side | `44-efc-omni.js` lines 69 to 150 | done (C9-4, C9-5) |
| Stance hit volumes | `efcOmniHitVolumes`, `44-efc-omni.js` line 280 | done (C9-6) |
| Stance replication (`efcProne`, `[yaw, onBack, side]`), net protocol 15 | `src/09c-net.js` lines 17, 944 to 950 | done (C9-7) |
| First-person prone, supine and side holds (`EFC_PRONE_VIEW`, `EFC_SUPINE_VIEW`), body-relative aim limits, hold-Alt free-look | `44a-efc-omni-prone.js`, `44b-efc-free-look.js` | done (C9-8) |
| Third-person flat poses | `efcOmniSoldierUpper` / `efcOmniSoldierLegs`, `src/06b-soldier.js` lines 163 to 205 | done (C9-8e) |
| The player's own body: a full soldier, posed every frame, **never shown** (shadow-only material, `root.visible = false`) | created `src/09-game.js` line 970; posed `src/08-player.js` lines 467 to 472 | exists, hidden |
| Camera kicks: slide (line 357), landing (360), sprint start (378), FOV with slide (540), camera rotation (533) | `src/08-player.js` | exists |

Two facts that shape C17: the body is already posed each frame for the shadow, so legs cost a draw call and some skinning, not
new animation work; and the body's shadow was hidden on purpose because it "made a black silhouette in front of the player"
(comment at `08-player.js` line 471), so C17 must not simply set `visible = true`.

## 3. Reference study

Source: the owner's video `https://youtu.be/Aj4kWiWP1gs`, from 0:43 to 0:56 (the owner's two timestamps, 0:45 and 0:56,
and the run-up). Watched at 1080p30 in a browser and sampled frame by frame every 0.3 to 0.7 s (about 35 frames).

**Limit, said plainly:** this part of the video is a promotional montage, not one continuous capture. It cuts every 0.5 to
1.5 s between third-person shots, first-person shots and a prone comparison, and at 0:55.8 it cuts to a developer interview.
No single move is shown from start to finish in one view, so full phase durations cannot be measured from it. The frames
give poses, camera behaviour and weapon behaviour; the timings in section 4 are starting values to tune.

| Time | View | What the frames show | What we take for Claudov |
| --- | --- | --- | --- |
| 0:43.2 to 0:44.5 | Third person | An operator sprints across a pool deck and throws the body forward: at the apex the body is close to horizontal, both hands keep the rifle forward on the eye line, legs straight and together behind. | Dive flight pose: a straight "plank", pelvis pitched about 70 to 80 degrees from vertical, the weapon stays on the aim line. |
| 0:45.5 to 0:46.0 | Third person | A standing aim beside a vehicle; cut. | Nothing new. |
| 0:46.5 | First person | Camera low over a grated floor, weapon dropped to the lower right and canted: a slide entry. | Slide hold: weapon low and canted, camera low, horizon level. |
| 0:47.0 | First person | Close quarters, weapon up and a gloved support hand forward: aiming straight out of the move. | Any move can end in aim within about 0.2 s. |
| 0:47.5 to 0:52.1 | Third person, split "OFF / ON" | A prone body turns a full circle on the ground. OFF: the body pivots stiffly and the rifle leaves the target. ON: legs sweep round the hips, the torso rolls through the side onto the back, and the rifle stays pointed at the same spot the whole time; it ends on the back aiming over the chest. | The 360 roll uses the weapon as the anchor: the body turns around the gun, not the gun with the body. Legs drag in an arc. (C18-12) |
| 0:52.4 to 0:53.3 | First person | Sprinting along a train roof, weapon canted about 20 to 30 degrees to the right and lowered; strong motion blur. At 0:53.3 the camera dips and swings as the move starts. | Sprint hold canted and low; a short anticipation dip before a dive. |
| 0:53.8 to 0:54.4 | Third person | The same move from outside: the player throws themselves sideways and backwards off the roof, body horizontal and face up, firing a pistol one-handed in the air. | Backward and side dives exist, the body faces up, and firing in flight is allowed. |
| 0:54.6 to 0:55.6 | First person | After dropping through a roof hatch: the camera rolls about 10 degrees, lands on the back and pitches up at the hatch; the weapon comes up across the chest pointing at the opening. | A backward dive lands **supine**, view up, weapon usable at once (our C9-8b supine hold). Camera roll on a side or back fall. |
| 0:55.8 on | Interview | Developer interview; later footage is not movement. | Nothing. |

Documented Black Ops 6 behaviour that fills the gaps (from the game's public descriptions and settings, not measured here):
sprint, slide and dive work in any direction relative to the view; a dive can be started from a sprint with the slide key
(the game's "slide/dive behaviour" option chooses between tap and hold); you can aim and fire while diving and sliding; you
can look around freely in the air; prone and supine allow a full 360 turn; a dive lands prone, or on the back when diving
backwards; momentum from sprint and slide carries into jumps and dives.

## 4. Target behaviour

### 4.1 Inputs (owner decision O1)

Default proposal, close to the reference and compatible with what the owner already chose for C9-2:

| Input | Result |
| --- | --- |
| Sprint (any direction) + **tap** Crouch | Slide (unchanged) |
| Sprint (any direction) + **hold** Crouch for 0.18 s | Ground dive in the direction of movement (new) |
| Airborne after a sprint + Crouch | Air dive (unchanged, C9-2) |
| Slide + hold Crouch 0.18 s, or Slide + Jump then Crouch | Dive out of the slide, keeping slide speed (new) |
| After landing a dive: Sprint or Jump | Fast get-up (0.35 s) into a sprint (new) |

A raid setting "Slide and dive" with three options: *tap slides, hold dives* (default), *tap dives, hold slides*, *slide only*
(air dive still works).

### 4.2 Phases and starting timings

Each move is a chain of phases with its own body clip, camera curve and weapon hold. Times in seconds.

| Move | Phases (duration) | Notes |
| --- | --- | --- |
| Sprint | loop | Speed by direction: forward 1.0, diagonal forward 0.95, side 0.9, back 0.8 of sprint speed (O4). |
| Tactical sprint | loop, forward arc only (within 45 degrees of view) | As C9a; weapon raised high (our own pose). |
| Slide | enter 0.12, glide up to 0.9, exit 0.15 | Any direction; friction keeps about 70 % speed at 0.6 s. Can aim and fire. |
| Ground dive | anticipation 0.08, launch 0.06, flight about 0.5, impact 0.12, settle 0.25 | Flight apex about 0.45 m; travel 3.5 to 4.5 m from sprint, about 5 m from tactical sprint or slide. |
| Air dive | flight (rest of the jump), impact 0.12, settle 0.25 | As C9-2 plus the new landings. |
| Landing | by dive direction relative to the view: forward arc lands prone facing the view; side lands on that side then settles prone; backward arc (more than 120 degrees from the view) lands supine | Uses the existing `efcProneTurn` fields (`onBack`, `side`). |
| Get-up | prone 0.45, supine 0.55, fast get-up 0.35 | Blocked under low ceilings as C9-4. |

### 4.3 In the air

- The trajectory is set at launch; air control 10 % of ground acceleration.
- Mouse look is free in all directions. The body twists to follow the view up to 90 degrees from the travel direction, then
  the camera keeps turning alone (same idea as Alt free-look, without the key).
- Hip fire allowed with spread x1.5; aim-down-sights allowed, aiming in at half speed. Reload and inventory are not allowed.

### 4.4 First-person camera per phase

| Phase | Camera |
| --- | --- |
| Dive anticipation | Drop 0.06 m, pitch down 2 degrees |
| Dive launch | FOV +6 for 0.25 s; side dive rolls up to 12 degrees toward the dive side; backward dive pitches up 10 degrees |
| Flight | Roll and pitch held; follows free look |
| Impact | Drop 0.1 m with a spring (existing `VM.vland` / `PL.punchP` path), small shake; supine landing pitches up as in 0:55 |
| Slide | Eye at slide height, roll 4 degrees toward the slide's side component, FOV +4 (exists in part, line 540) |

With reduced motion: no roll, no FOV change, no shake; height changes are instant.

### 4.5 First-person weapon per phase

| Phase | Weapon hold (view offsets, same format as `EFC_PRONE_VIEW`) |
| --- | --- |
| Sprint | Low and canted 20 to 30 degrees right (0:52.4) |
| Tactical sprint | Raised, muzzle up |
| Slide | Low at the hip, canted, ready to aim |
| Dive flight | Up on the eye line, both hands; fires |
| Impact | Dips with the impact then returns in 0.2 s |
| Prone, supine, side | Existing C9-8 holds |

## 5. Owner decisions

- **O1** Dive input: tap slides and hold dives (default), with the raid setting. Keep the airborne Crouch dive.
- **O2** Firing in flight: yes, hip spread x1.5, aiming at half speed.
- **O3** Legs: always shown in first person, also while aiming, with a setting "Show my legs" on by default.
- **O4** Sprint speed by direction: 1.0 / 0.95 / 0.9 / 0.8 as above.
- **O5** Priority: C17 and C18 after C15 is merged into `beta`. They can run beside Codex's C16 cards because the files barely
  overlap; see the conflict notes below.

Until the owner answers, agents build the defaults and say so in the commit body.

**Conflict notes with work in flight.** C15 edits `src/08-player.js` (hold-R near line 56) and `src/06d-reload.js`: start any
C17 or C18 card that edits `08-player.js` only after C15-4 is on `beta`. C16-9 to C16-13 (downed state) reuse the prone pose and
`09c-net.js`; C18-13 changes the net protocol, so take the next free protocol number at that time and coordinate with
whichever of C16-8 or C16-13 lands first. C9's files (`44*-efc-omni*.js`) belong to this track now.

## 6. Cards in order

| Card | What | Size | Needs | Status |
| --- | --- | --- | --- | --- |
| C17-1 | Legs mesh: a visible lower body from the player's own soldier | M | C15-4 | open |
| C17-2 | Place the body under the camera so feet show when looking down | S | C17-1 | open |
| C17-3 | Legs follow every stance (stand, crouch, sprint, slide, mantle, vault, prone, supine, side) | M | C17-2 | open |
| C17-4 | Shadows, setting, budget and closing sheet | S | C17-3 | open |
| C18-1 | Phase model and one tuning table | S | C17-1 | open |
| C18-2 | Hold-to-dive from a ground sprint, in every direction | M | C18-1 | open |
| C18-3 | Dive landings by direction: prone, side, supine | M | C18-2 | open |
| C18-4 | In the air: free look, body twist, firing and aiming | M | C18-3 | open |
| C18-5 | Momentum chains: slide to dive, tactical to dive, fast get-up | M | C18-3 | open |
| C18-6 | Sprint speeds by direction and slide in any direction | S | C18-1 | open |
| C18-7 | First-person camera choreography per phase | M | C18-4 | open |
| C18-8 | First-person weapon choreography per phase | M | C18-7 | open |
| C18-9 | `#omnilab`: an in-game pose and clip editor | M | C18-1 | open |
| C18-10 | Authored clips, set 1: dive launch, flight (4 directions), landings | M | C18-9, C18-3 | open |
| C18-11 | Authored clips, set 2: slide, get-ups, side and back sprint, mantle and vault | M | C18-10 | open |
| C18-12 | Prone 360 roll with the weapon as the anchor | M | C18-10 | open |
| C18-13 | Online: phases, clips and dive direction on guests | S | C18-11 | open |
| C18-14 | Dive hit volumes in flight and landing | S | C18-3 | open |
| C18-15 | Sound hooks (existing sounds only) and the C13 shot list | XS | C18-8 | open |
| C18-16 | Feel pass, contact sheets and closing | S | all above | open |

## 7. Cards

### C17-1. Legs mesh: a visible lower body from the player's own soldier (M)

- **Read:** `src/06g-body.js` lines 493 to 510 (`makeSoldier`, `opts.shadowOnly`, `soldierGeometry`), `src/09-game.js` line
  970, `src/08-player.js` lines 466 to 473, `src/06-weapons.js` lines 236 to 242 (`setGunLod`, layer masks).
- **Edit:** new `src/efc/44c-efc-self-body.js`, one hook in `src/08-player.js` after `layoutSoldier(sm, true)` (line 471),
  new `tools/dev/efc/test-self-legs.mjs`.
- **Steps:**
  1. `efcSelfLegsBuild(model, skin)`: from `soldierGeometry(skin, 'lo')` keep only triangles whose three vertices are skinned
     mainly (weight > 0.5) to the pelvis or leg bones; drop torso, arms and head. Bind a new `SkinnedMesh` with the normal
     soldier material to the **same skeleton** as the hidden body, layer `MASK_SCREEN`, no shadow casting. Build it once when
     the player body is made (call from the hook on first use).
  2. `efcSelfLegsTick(e)`: visible only when `e.isPlayer && efcRaidMode() && e.alive` and first person; hidden in the killcam,
     death and menus (the same places that hide `VM.root`).
  3. Leave `sm.root.visible = false` as it is: the skeleton still updates because `poseSoldier` and `layoutSoldier` run.
     Check that the skinned legs follow it; if `root.visible = false` stops matrix updates, call `sm.root.updateMatrixWorld(true)`
     in the tick.
- **Verify:** `test-self-legs.mjs`: in a raid, legs mesh exists, is visible in first person, hidden after death; its bone
  matrices equal the hidden body's. Base checks.
- **Acceptance:** looking straight down in a raid shows legs and boots; no head, torso or arms in view; nothing changes in
  other modes.

### C17-2. Place the body under the camera so feet show when looking down (S)

- **Read:** `src/06b-soldier.js` lines 584 to 605 (player eye), `src/08-player.js` lines 516 to 540 (camera).
- **Edit:** `src/efc/44c-efc-self-body.js`, `test-self-legs.mjs`.
- **Steps:**
  1. Offset the legs mesh backwards along the body yaw by `EFC_SELF_LEGS.back` (start 0.14 m standing, 0.10 crouched) so the
     knees never fill the view at normal pitch; increase the offset with downward pitch (up to +0.08 m at -60 degrees) so the
     feet stay under the camera instead of behind it.
  2. Use the body yaw (not the camera yaw) so Alt free-look and prone turning do not swing the legs.
  3. Hide the legs only if the camera would be inside the mesh (pelvis less than 0.25 m from the camera), which can happen in
     mantle; log it in the test.
- **Verify:** screenshots at pitch 0, -30, -60 and -85 degrees standing and crouched, as one contact sheet
  `docs/omnimovement/legs-pitch.png`. Feet visible at -60 and -85, nothing below the crosshair at 0.
- **Acceptance:** the sheet; the test checks the offset values.

### C17-3. Legs follow every stance (M)

- **Read:** `efcOmniSoldierLegs` (`src/06b-soldier.js` line 190), `src/06ac-loco.js` (`locoSlidePose` line 169),
  `44-efc-omni.js` traversal (line 218).
- **Edit:** `44c-efc-self-body.js`, `test-self-legs.mjs`, `docs/omnimovement.md`.
- **Steps:**
  1. Walk, sprint (all directions), crouch walk: step timing of the legs matches the view bob (`PL.stepPh`); fix the phase if
     the hidden body and the bob differ by more than a quarter step.
  2. Slide: legs out in front, visible below the weapon (the most important view of this card).
  3. Mantle and vault: legs pass under the camera; hide only if they would clip the near plane.
  4. Prone: legs behind (usually out of view). Supine: legs in front and visible, knees bent, as in 0:55. Side: legs follow.
  5. Turning on the spot: feet shuffle, not slide.
- **Verify:** a contact sheet of every stance in first person, `docs/omnimovement/legs-stances.png`; the test steps each state
  with `simRun` and checks the legs mesh is visible and outside the camera near plane.
- **Acceptance:** the sheet shows legs in slide and supine; no clipping in any frame.

### C17-4. Shadows, setting, budget and closing (S)

- **Edit:** `44c-efc-self-body.js`, the raid settings UI (`src/efc/50-efc-ui-*.js` where raid settings live), `i18n/en.txt`,
  `docs/omnimovement.md`, `docs/ROADMAP.md`, `test-self-legs.mjs`.
- **Steps:**
  1. Shadows stay with the hidden shadow-only body; check there is one shadow, not two, and no dark silhouette in front of the
     player (the reason the body was hidden).
  2. Setting `efcSelfLegs` ("Show my legs", on by default, O3).
  3. Measure the extra triangles and draw calls with `#bench`; record them in `docs/perf.md`.
  4. Close C17 in `ROADMAP.md`.
- **Acceptance:** setting off hides the legs; one shadow; numbers recorded.

### C18-1. Phase model and one tuning table (S)

- **Read:** all of `src/efc/44-efc-omni.js`, `src/07c-controller.js` lines 45 to 150.
- **Edit:** new `src/efc/44d-efc-omni-phases.js`, `docs/omnimovement.md`, new `tools/dev/efc/test-omni-phases.mjs`.
- **Steps:**
  1. `EFC_OMNI_TUNING`: one object holding every number in section 4 (and the existing `EFC_TACTICAL_SPRINT`, `EFC_DIVE`,
     `EFC_PRONE` values by reference, not copies). Load overrides from `EFC.cfg.omni` so a tuning session can change values
     from the console.
  2. `efcOmniPhase(entity)` returns `{ move, phase, t, dir }` (dir: launch direction relative to the view, radians), kept on
     the entity and advanced in the controller hook. No behaviour change yet.
- **Verify:** the test drives sprint, slide, air dive and landing with `simRun` and asserts the phase sequence;
  `test-omni-states.mjs` and `test-omni-sprint.mjs` still pass.
- **Acceptance:** phases reported, gameplay unchanged.

### C18-2. Hold-to-dive from a ground sprint, in every direction (M)

- **Read:** `efcOmniDive`, `efcOmniCrouchHeld`, the slide start in `07c-controller.js`, `src/08-player.js` line 82.
- **Edit:** `44-efc-omni.js` (or `44d`), `test-omni-phases.mjs`, raid settings for the "Slide and dive" option.
- **Steps:**
  1. While sprinting on the ground, a Crouch press starts a 0.18 s hold timer. Released earlier: slide (existing). Held:
     ground dive, launch direction = movement input relative to the view.
  2. Anticipation phase (0.08 s) before the impulse; launch gives horizontal speed and lift from `EFC_OMNI_TUNING`.
  3. The setting switches tap and hold, or turns dives off on the ground.
- **Verify:** test in all eight input directions: distance 3.5 to 4.5 m, apex about 0.45 m, never ends inside geometry; tap
  still slides; cooldown holds.
- **Acceptance:** dives start from a ground sprint in any direction; the air dive still works.

### C18-3. Dive landings by direction (M)

- **Edit:** `44-efc-omni.js` (`efcOmniDiveLand`), `test-omni-phases.mjs`.
- **Steps:**
  1. On landing, compare the launch direction with the current view: forward arc to prone; side to `side` then prone after
     0.3 s; backward arc (over 120 degrees) to supine (`efcProneTurn.onBack = true`) with the body facing the view.
  2. Impact and settle phases; input to stand or sprint is read after the impact phase.
- **Verify:** test all eight directions and both view-turned cases (dive forward then look back in the air).
- **Acceptance:** backward dive ends supine, view up, weapon in the supine hold as in 0:55.

### C18-4. In the air: free look, body twist, firing and aiming (M)

- **Read:** `44b-efc-free-look.js`, the fire gate in `src/08-player.js` (grep `PL.sprinting` and `aimBlocked` near line 427).
- **Edit:** `44b-efc-free-look.js`, `44d-efc-omni-phases.js`, one hook in `08-player.js` for the spread and aim-speed scale,
  test.
- **Steps:**
  1. During flight the view turns freely; the body yaw follows up to 90 degrees from travel, then stops.
  2. Fire allowed with spread x1.5; aiming in at half speed; reload, heal and inventory blocked.
  3. 10 % air control.
- **Verify:** test fires in flight (shots leave, spread multiplier applied), aims in at half speed, reload refused; body twist
  clamps at 90 degrees.
- **Acceptance:** you can turn and shoot behind you mid-dive.

### C18-5. Momentum chains (M)

- **Edit:** `44-efc-omni.js`, `44d`, test.
- **Steps:**
  1. Slide then hold Crouch 0.18 s: dive keeping slide speed (about 5 m travel).
  2. Tactical sprint into a dive: about 5 m.
  3. Slide, Jump, Crouch: air dive with slide speed (exists; check distance).
  4. Fast get-up: Sprint or Jump after the impact phase stands up in 0.35 s straight into a sprint.
- **Verify:** distances per chain within 10 % of the table; no chain gives more than 6 m; the dive cooldown still applies.
- **Acceptance:** sprint, slide, dive and sprint again chain without dead time beyond the listed phases.

### C18-6. Sprint speeds by direction and slide in any direction (S)

- **Edit:** `44-efc-omni.js`, `test-omni-sprint.mjs`.
- **Steps:** scale sprint speed by direction (O4); tactical sprint only in the forward 45-degree arc; slide starts along the
  current velocity in any direction (check it already does) with the side component feeding the camera roll in C18-7.
- **Verify:** speeds per direction in the test. **Acceptance:** the table values.

### C18-7. First-person camera choreography per phase (M)

- **Read:** `src/08-player.js` lines 350 to 380 and 500 to 545.
- **Edit:** new `src/efc/44e-efc-omni-camera.js` (curves per phase, from `EFC_OMNI_TUNING`), one hook in `08-player.js`
  feeding the existing `PL.vpP`, `PL.vrollP`, `PL.fovK` and eye height, test.
- **Steps:** implement the table in 4.4 as curves sampled by phase time; reduced motion turns roll, FOV and shake off.
- **Verify:** the test samples camera roll, pitch offset, FOV and eye height through a side dive, a back dive and a slide;
  reduced motion gives zero roll and FOV change. One first-person contact sheet per move to `docs/omnimovement/`.
- **Acceptance:** side dives roll toward the side, back dives look up, landings bump; nothing moves with reduced motion.

### C18-8. First-person weapon choreography per phase (M)

- **Read:** `44a-efc-omni-prone.js` (`efcOmniViewPose`, six offsets), `src/06f-hands.js` only where the offsets are applied.
- **Edit:** `44a-efc-omni-prone.js` (rename the table to per-phase holds, keep the prone and supine values), test.
- **Steps:** add holds for sprint, tactical sprint, slide, dive flight and impact (table 4.5), blended by phase with the
  existing damping; aiming in overrides the hold.
- **Verify:** contact sheet of the weapon in every phase for a magazine rifle, a bolt rifle and the pump; hands stay on the
  weapon.
- **Acceptance:** the sheet, reviewed in the commit body.

### C18-9. `#omnilab`: an in-game pose and clip editor (M)

The authored animations need a tool, and it must produce data in the format the soldier already uses.

- **Read:** `src/06ab-anim.js` header (the 31 channels per frame: pelvis position and orientation, torso, head, ankles, foot
  pitch and yaw, knee poles), `src/efc/47-efc-artlab.js` (how `#artlab` loads the game with dials).
- **Edit:** new `src/efc/47b-efc-omnilab.js`, `shell.html` (a menu entry only if `#artlab` has one), `i18n/en.txt`,
  new `assets/anim/efc-omni-clips.json` (empty clip list), test.
- **Steps:**
  1. `#omnilab` loads an empty Claudov with one soldier and a first-person camera beside it (split view: third left, first
     right, so the legs of C17 are checked at the same time).
  2. A timeline per clip: keyframes of the 31 channels at chosen times, edited with sliders and numeric fields; play, loop,
     scrub; mirror left and right.
  3. Export and import JSON in the clip file format: `{ id, length, loop, keys: [{ t, ch: [31 numbers] }], events: [] }`.
- **Verify:** test opens `#omnilab`, makes a two-key clip, exports it, imports it back identically.
- **Acceptance:** a person or an agent can author a clip without touching code.

### C18-10. Authored clips, set 1: dives (M)

- **Edit:** `assets/anim/efc-omni-clips.json`, new `src/efc/44c-efc-omni-anim.js` (clip player), one hook in
  `src/06b-soldier.js` `poseSoldier` (after the loco pose, before `efcOmniSoldierUpper`), test.
- **Clips (our own):** `dive_anticipate`, `dive_launch`, `dive_air_fwd`, `dive_air_back`, `dive_air_left`, `dive_air_right`,
  `dive_land_prone`, `dive_land_side_left`, `dive_land_side_right`, `dive_land_supine`. Flight pose as in section 3: straight
  body, pelvis about 75 degrees from vertical, legs together, the weapon on the aim line; back dive face up.
- **Steps:** the clip player picks the clip from `efcOmniPhase` and blends 0.06 s between clips; channels a clip does not set
  come from the normal pose; the upper body keeps aiming (the existing aim solver runs after).
- **Verify:** third-person contact sheet of each clip at three times; first-person sheet showing the legs (C17) during landing.
- **Acceptance:** dives read as one continuous motion in both views.

### C18-11. Authored clips, set 2 (M)

- **Clips:** `slide_enter`, `slide_loop`, `slide_exit`, `getup_prone`, `getup_supine`, `getup_fast`, `sprint_left`,
  `sprint_right`, `sprint_back` (legs only; upper body from the aim solver), `tactical_sprint`, `mantle`, `vault`.
- **Steps, Verify, Acceptance:** as C18-10. The side and back sprint clips must keep the feet planted (no foot sliding over
  0.05 m per step in the test).

### C18-12. Prone 360 roll with the weapon as the anchor (M)

From the 0:47.5 to 0:52.1 comparison.

- **Read:** `efcOmniProneTurn` (`44-efc-omni.js` line 113), `efcOmniSoldierLegs`, `EFC_PRONE_TURN`.
- **Edit:** `44-efc-omni.js` or `44a`, `06b-soldier.js` hook if needed, test.
- **Steps:** during prone turning and the roll to the back, keep the weapon's muzzle direction fixed to the aim and rotate the
  pelvis and legs around it: legs sweep an arc on the ground, the torso rolls through the side pose into supine. Add the
  in-between roll as clip keys (`prone_roll_left`, `prone_roll_right`) authored in `#omnilab`.
- **Verify:** test turns 360 degrees both ways; the aim direction error stays under 3 degrees through the roll; third-person
  sheet of eight frames.
- **Acceptance:** the turn looks like the "ON" half of the reference: the gun stays on target while the body comes round.

### C18-13. Online (S)

- **Read:** `src/09c-net.js` lines 17 and 940 to 952 (stance in the snapshot).
- **Edit:** `09c-net.js`, `44c-efc-omni-anim.js`, `tools/dev/efc/test-omni-net.mjs` (new, on `net2.mjs`).
- **Steps:** add `[move, phase, t, dir]` to the player snapshot (small integers and one angle); guests play the same clip at
  the same phase time; bump `NET_PROTO` to the next free number (coordinate with C16, see section 5).
- **Verify:** two clients: a host dive in each of four directions shows the same clips and landing stance on the guest.
- **Acceptance:** the test; no change to loot or host authority.

### C18-14. Dive hit volumes (S)

- **Edit:** `efcOmniHitVolumes` in `44-efc-omni.js`, `test-omni-phases.mjs`.
- **Steps:** a horizontal body during flight (volumes along the travel line at flight height) and during the impact phase.
- **Verify:** rays from fixed angles hit a diving player's head, chest and legs; Wardens can hit a diving player.

### C18-15. Sound hooks (XS)

- **Edit:** `44d-efc-omni-phases.js`.
- **Steps:** emit `efcEmit('omni:phase', { move, phase })`; play only existing sounds (`sfxSlide`, `sfxLand`, cloth foley) on
  launch and impact. Write the new sounds wanted (dive whoosh, body hits per surface, roll cloth) into the C13 shot list in
  `docs/handling-foley.md`. No new audio files in this card.

### C18-16. Feel pass and closing (S)

- **Edit:** `docs/omnimovement.md`, `docs/ROADMAP.md`, `docs/omnimovement/` sheets.
- **Steps:**
  1. Contact sheets, first and third person side by side, for: sprint in four directions, slide, ground dive in four
     directions, air dive, each landing, fast get-up, prone 360.
  2. Update the transition table in `docs/omnimovement.md` with every new row.
  3. A one-page play checklist for the owner (what to try, what to report) and the tuning keys in `EFC.cfg.omni`.
  4. Close C18 in `ROADMAP.md`. Feel, pace and camera comfort can only be judged by playing: say so in the report.
