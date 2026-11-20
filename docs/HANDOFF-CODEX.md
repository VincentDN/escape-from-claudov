# Third track: tasks C0 to C15

Written 20 November 2026 for the agent that finished tracks T and A. Everything from `docs/HANDOFF.md` sections 1 to 4 and 7
still applies (branching, build, tests, rules that are not negotiable, how to report), with these updates:

- Name branches `codex/c<n>-<topic>`, branched from the current `beta`. One task per branch; split a large task into several
  branches where the task says so.
- The game is raid only. Tests run in raid mode; the full suite runs in GitHub Actions on every pull request.
- `docs/ROADMAP.md` is the status page. When you finish a task, update its line there in the same branch.
- Read `docs/contracts/CONTRACT.md` before touching items, inventory, world or network code: the grid inventory (A6 to A8) and
  weapon mods (A9) changed the shapes.

**Stop rule.** If a task turns out much larger than described, or needs a decision only the owner can make, stop at a clean point,
push, and write what is left and the question in your last commit body. Do not guess on design questions marked "owner".

**Proof rule.** Every task ends with automated checks that prove the behaviour, and where something is visual, a contact sheet or
screenshot committed under `docs/` (not only `/tmp`). Say plainly what the tests cannot prove (feel, audio quality, real GPU frame
rates).

## Order (owner, 20 November 2026)

Work in this order. Each line is one or more mergeable branches.

0. **C0** finish the grid inventory: drag, rotate, foley (owner, before C1)
1. **C1** raid-start weapon check
2. **C9** omnimovement (moved up by the owner: right after C1)
3. **C2** Partisan modern weapons, batch 1
4. **C15** minimal HUD and the magazine check
5. **C11** full-screen map and extraction flares
6. **C12** dirty lens and light effects
7. **C13** real weapon foley for every action
8. **C3** remaining modern Partisan weapons and attachments
9. **C4**, **C5**, **C6** enemy types, AI upgrade, rival raiders
10. **C7** optimisation part 1, **C8** raid balance
11. **C14** Second World War weapons (owner: in, but after the modern ones)

**C10** (menu fonts) is small and touches only the menus: do it whenever a short slot is free, ideally before C9's long run.

---

## Before C0: three small items found while building L0 (Claude, 20 November 2026)

L0, the art style lab (`#artlab`, `src/efc/47-efc-artlab*.js`, `docs/artlab/README.md`), is merged into `beta` and live at
`/beta/#artlab`. It owns its two files; do not restyle the game from it until the owner sends the chosen settings.

- **X1, inventory test failures (fix first, as part of C0).** `node tools/dev/efc/test-ui.mjs` fails 2 checks on `beta`:
  "efcGridSize is not a function or its return value is not iterable" in `efcGridLoadout`. They fail with or without L0.
- **X2, anti-aliasing on alternate frames (own branch, `codex/x2-msaa-swap`).** In `src/01-core.js` only `finalPass` swaps
  buffers, so the composer alternates between `renderTarget1` (MSAA) and `renderTarget2` (no MSAA when AO is off): measured
  `{"rt1":4,"rt2":0,"swaps":["ShaderPass"]}` at medium quality. Likely fix: `finalPass.needsSwap = false`. Prove it with a
  test that every frame renders into the MSAA target, and before/after stills; check the L0 lab pass still runs last.
- **X3, menu button for the lab (with C10).** Add an "Art lab" entry to the main menu (UI package) that opens `#artlab`.

## C0. Finish the grid inventory (medium; first, before C1)

The owner played the grid inventory (A6 to A8) and wants it finished before anything else. Three things:

Beta has a cursor-following item preview in the shared operator panels and Ctrl-click half-stack transfers in the hideout.
The container arranger still owns exact in-container placement and rotation. Exact transfers between panels, saved placement
in the stash and carried grids, and full action foley are open.

1. **Visual drag and drop everywhere.** The player picks an item up with the mouse and sees it follow the cursor at its real
   grid size, drawn with its thumbnail; the cells under it light up green where it fits and red where it does not; releasing
   places it, releasing on an invalid spot returns it. This must work between every pair of places: stash, loadout slots,
   every container grid (vest or rig, backpack, pockets), the vicinity (open crate or body, loose items on the ground), the
   hands panel and quick slots, and the weapon's attachment slots. Dropping outside every panel drops the item on the ground
   in a raid. Some pointer handling exists already (`src/efc/50-efc-ui-container.js`, `src/efc/55-efc-operator.js`): read it,
   keep what works, and make one drag system that all panels use rather than one per panel.
2. **R rotates.** While an item is being dragged, R rotates it 90 degrees (the data already supports `rotated`: `efcGridSize`,
   `efcGridFits` in `src/efc/25-efc-grid.js`); the ghost and the fit highlight update at once. R must not reload while the
   inventory is open. Square items ignore it.
3. **Foley on every action.** Opening and closing the inventory, picking an item up, putting it down, rotating it, a refused
   drop, equipping into a slot, mounting an attachment, splitting a stack, and searching a container each play a handling
   sound from the existing pools in `src/efc/45-efc-sounds.js` (heavier items pitched lower; a weapon picked up sounds like
   a weapon, a bandage does not). Throttle so fast dragging never stacks sounds.

- Online: the host still decides placements in shared containers; the drag shows the result only when the host confirms, and
  a refused move snaps back with the refusal sound.
- Keyboard operation stays possible (pick up with Enter, move with the arrow keys, R rotates, Enter places).
- Tests: scripted drags between every pair of panels, rotation that makes a long item fit where it did not, a refused drop,
  the ghost following the cursor, R not reloading while open, and every action firing its sound (record the calls); the
  two-client rig for a drag into a shared crate. Screenshots of a drag in progress (green and red highlight) in
  `docs/inventory/`.

## C1. Raid-start weapon check (medium)

The owner asked for this flourish (P9 in `docs/plans/2026-11-14-polish-pass.md`); T7 produced a design,
`docs/briefs/P9-WEAPON-CHECK.md`. Implement that design.

- **Behaviour**: for the first steps after insertion the player looks the weapon over: tilt, magazine out and back (detachable
  magazines), bolt cracked (bolt actions), a shell checked (pump shotguns), the SKS opened at the bolt, then up to ready.
  Any gameplay input (move beyond a few steps, aim, fire, sprint, switch, reload, lean) cancels it at once and is handled in
  the same frame. Ammunition is never changed. A setting turns it off.
- **Third person**: other players see it, through the existing animation event path.
- **Scope**: the proposal's four steps. Reuse the authored handling foley.
- **Tests**: as the proposal's acceptance list, plus one contact sheet per weapon family (first and third person) in
  `docs/weapon-check/`.

## C2. Partisan weapons, batch 1 (large; one branch per weapon is fine)

Follow `docs/weapon-port.md` (the StG 44 pilot) for each of these Partisan rifles: **AK-15K, AK-74M Zenitco, RPK, M16, G3**.
Models are in the Partisan Project repository (`assets/models/weapons/`); the owner cleared all of them for this repository.
Copy only what you use into `showcase/assets/models/weapons/` or a game asset folder, and list each in `NOTICE.md`.

For each weapon:

- Offline model preparation (decimate, strip spare parts, keep the attachment mount points that A9 uses), within the triangle
  budget of the existing rifles; record the script and numbers.
- Engine weapon entry with stats that give it a niche (calibre, fire rate, recoil, weight, magazine): write the reasoning in a
  short table in `docs/weapons.md` so the roster stays coherent.
- First-person grips and aligned sights, world model, reload choreography, sounds, thumbnail with calibre, item, loot tables
  and which hostiles carry it.
- Attachments: it must accept the A9 parts that physically fit (rails, muzzles, optics, grips, magazines such as the AK drum and
  G3 drum), with the mount rules from the showcase workbench.
- Tests: one `test-<weapon>.mjs` per weapon (or one shared parametrised test): builds in both views, fires, reloads, aims,
  time to kill at 25 m, mounts at least one attachment; thumbnails and end-to-end raid tests pass.

## C3. Remaining modern Partisan weapons and attachments (large; after C13)

Same as C2 for **MK14 and SPEAR**, plus every attachment not yet in the game (for example the GP-25 under-barrel launcher,
ZF4 scope, AK suppressor and rail, iron sight set, G3 drum and bipod).

- The GP-25 launcher needs a grenade projectile: reuse the engine's grenade physics and explosion code.
- Attachments go into the loot tables with rarity by quality, and into A9's mount rules for every weapon they physically fit.
- The Second World War weapons are not in this task: they are C14.

## C4. Three new enemy types (medium to large)

Pass 2, Q3. Follow the Scavenger pattern (`src/efc/43-efc-scavengers.js`): a `squad` value, a name pool, a place in the map's bot
budget, host-simulated, a distinct look from the engine's outfit system.

| Type | Role | Rules |
| --- | --- | --- |
| Marksman | holds high ground with a long rifle | one per raid on Claudov at most; a marked set of perches on the map (crane platform, warehouse mezzanine, container stacks); a visible glint when aiming at a player in daylight; relocates after firing twice |
| Breacher | indoor rusher with a shotgun | guards building interiors; pushes when it hears footsteps inside its building; flashbang before entering a room |
| Heavy | armoured, light machine gun | slow, high armour, suppresses a position; posted on the elite loot; drops the best gear |

- Counts come out of the existing Warden number (`efcWardenNumber`), not on top of it, so performance and difficulty stay
  controlled. Claudov gets all three; small maps at most one special.
- Each type has its own loot table and drops.
- Tests: scripted scenarios per type proving its rule (the marksman relocates after two shots; the breacher pushes on footsteps
  and not on gunfire outside; the heavy suppresses a cover point), counts within budget across 20 raid starts per map, and a
  contact sheet of the three looks.

## C5. AI behaviour upgrade (large; after C4)

Make every hostile (Wardens, Scavengers, the C4 types) fight like a squad, not a crowd. Work inside the engine's bot code
(`src/07*.js`, French) and `src/efc/40-efc-wardens.js`, keeping each change behind raid mode.

1. **Squad tactics**: when two or more of a post engage, one suppresses while the other flanks (the engine has flank and
   suppression primitives in `src/07b-tactics.js`).
2. **Cover discipline**: reload and heal only from cover; break cover only with a teammate covering.
3. **Grenades**: throw to flush a player who has stayed in one cover for a while; never into a teammate.
4. **Investigation**: go to where a shot came from, or to a container or body that changed, with caution; give up after a
   search.
5. **Retreat**: fall back to the post when outnumbered or badly hurt; call for help.
6. **Awareness of loot**: notice an opened container or a missing body near their post on the next patrol pass.

- Numbers, not impressions: build `tools/dev/efc/test-ai-scenarios.mjs` with one scripted scenario per behaviour, and a table
  in `docs/ai.md` of time to kill and survival per enemy type and difficulty, before and after.
- Keep the one-shot rule, the insertion grace and the spawn distances from P1 intact (their tests must still pass).

## C6. Rival raiders (large; after C5)

AI squads of two or three that play the raid like players: insert at a free insert after the human squads, loot containers and
bodies through the host-owned world, fight Wardens and players, and head for an extract before the timer.

- Their own `squad` value per squad (hostile to everyone, including Wardens); visible kit that matches what they loot.
- A simple plan per squad: a route of loot points ending at an extract, re-planned when threatened or when bags are full.
- On death they leave bodies with everything they carried; on extraction they vanish, as players do.
- One rival squad on Claudov by default; a setting from 0 to 2; online the host simulates them.
- Tests: in bot-only raids, rivals loot (container contents drop), extract in at least half of the runs without humans, never
  get stuck, and do not break the Warden numbers; the two-client rig shows them on both machines.

## C7. Optimisation, part 1 (medium)

Pass 2, Q4. Real GPU frame times come from the owner (`docs/perf.md`); do what can be measured here first, with the A1 route
(`#bench`) and `renderer.info`.

- **Host tick cost**: put hostiles far from every player to sleep (reduced update rate, no pathfinding), wake them on noise or
  proximity; measure CPU time per tick with every bot awake against the new rule.
- **Draw calls and triangles**: merge static map geometry per material per chunk where the kit does not already; level of
  detail for containers, props and bodies; check that thumbnails and the operator view cost nothing while closed.
- **Memory**: a 20-minute bot-only raid without growth in JS heap, geometries or textures (`renderer.info.memory`).
- **Report**: `docs/perf.md` gets a before and after table of what was measurable here, and a clear list of what still needs the
  owner's GPU report.
- Do not change visuals noticeably; where a change is visible, put it behind the quality setting.

## C8. Raid balance (medium; after C6)

Use rival raiders (C6) as stand-in players to run many scripted raids and tune the numbers.

- Targets from the original plan: a median solo raid of 8 to 15 minutes; survival 30 to 50 percent at the default difficulty;
  a full kit replaced by about three successful raids.
- Knobs: Warden lethality and reaction, loot table weights and item values, raid length, extract opening times, starter kit.
- Deliverable: `tools/dev/efc/balance.mjs` that runs N raids and prints the metrics, and `docs/balance.md` with before and after
  numbers and every change made. Changes go in data (`EFC.cfg`, loot tables), not in code paths.
- Raise anything that needs the owner's taste (for example how punishing death should feel) as a question instead of tuning it.

## C9. Omnimovement (very large; second, right after C1; two branches)

P8 in `docs/plans/2026-11-14-polish-pass.md`: movement in the manner of recent Call of Duty and Battlefield titles, built from the
engine's own code. Nothing copied from those games.

**C9a, movement and stances** (`src/08-player.js`, a new `src/efc/44-efc-omni.js`, and wherever the soldier's hit volumes are
derived; find it before you start):

- Sprint, slide and dive in any direction with momentum carried between them; mantle and vault over waist-high geometry;
  a short tactical sprint.
- Prone: go prone from any stance, turn 360 degrees while prone without the body spinning under the camera, roll onto the back
  and either side, crawl, and get up in any direction.
- A state machine with every transition listed in `docs/omnimovement.md`; collision so no stance clips through walls or the floor;
  hit volumes follow each stance; leaning (P2c) keeps working where it makes sense.

**C9b, the weapon follows the body** (`src/06f-hands.js`, `src/06b-soldier.js`, `src/09c-net.js`):

- On the back the weapon is held across the chest and canted; on a side it rolls toward the ground arm; transitions are smooth;
  aim limits follow the body (no aiming through your own legs).
- Third person matches and is replicated online.
- Wardens keep their current movement set; their hit tests must handle a prone or supine player.

Tests: a state-machine test of every transition in every direction, collision checks per stance, the two-client rig showing the
same stance remotely, and contact sheets of every stance in first and third person in `docs/omnimovement/`.

## C10. Clean, modern menu fonts (small)

The owner wants the stencil look gone. The menus use **Saira Stencil One** through the CSS variable `--stencil` (about 25 uses
in `shell.html`), with **Barlow Condensed** for the HUD (`--hud`), both loaded from Google Fonts in `shell.html`.

- Replace the stencil face with a clean, modern sans serif with an open licence (SIL Open Font License), for example Inter,
  Barlow (not condensed) or IBM Plex Sans. Pick one family, two or three weights, and use it for headings and menu text; keep a
  condensed face for dense HUD numbers only if it reads better there. Rename the variable to something neutral (`--display`) and
  update every use, including any in `src/efc/*.js`.
- Self-host the font files under `assets/fonts/` with their licence files instead of loading from Google Fonts, so the game works
  offline and the page sets no third-party requests; update `build.py` and the page's Content Security Policy if needed.
  Record the fonts in `NOTICE.md`.
- Check every screen: main menu over the bench, raid screen, hideout and operator inventory, lobby, settings, summary, credits,
  HUD. Nothing may overflow or truncate after the swap (Inter is wider than a condensed face).
- Tests: `test-ui.mjs`, `test-bench.mjs`; screenshots of the main menu, hideout and HUD committed in `docs/fonts/`.

## C11. Full-screen map and extraction flares (medium; after C15)

**Map.** `M` opens a full-screen map in a raid; `M` or `Escape` closes it; the match keeps running and the player cannot fire
while it is open (as the inventory does).

- A top-down render of the current map, made once per map load with the game's renderer (the engine already draws a tactical
  map for killstreaks, `drawTacMap` and `#tacmap` in `src/08b-killstreaks.js`, and a minimap in `src/09ga-minicarte.js`: reuse
  what fits).
- On it: the player's position and facing, squadmates, the insert used, every extract with its name, distance and state (open,
  closed with the time until it opens), and named points of interest from the map's zones (warehouses, dry dock, housing,
  checkpoint and so on). Never enemies or loot.
- Zoom with the mouse wheel, pan by dragging, a legend, keyboard operable, readable at 1280 by 720.

**Extraction flares.** Open extracts must be easy to find in the world.

- A tall column of green smoke rising from each open extract, visible from most of the map, drifting with the wind, lit by the
  sky, fading at the top; plus a small hissing flare on the ground at its base with a green light that pulses. Respect the
  fog so it reads as distant.
- A closed extract shows nothing; the late extract's flare ignites when it opens, with a short sound cue.
- Performance: one soft particle system or a few camera-facing cards per extract, drawn after the fog, within the frame budget
  at every quality level; lowest quality falls back to a simple glowing column.
- Tests: the map opens and closes with `M`, shows the right extract states at the right times, and blocks firing; flares exist
  only for open extracts and appear when the late one opens; draw calls added per flare within budget. Screenshots of the map
  and of a flare seen from across Claudov in `docs/map/`.

## C12. Dirty lens and light effects (medium; after C11)

When the player looks toward a strong light source (the sun, lamps, the extraction flares), the camera should react like a
real lens.

**Reference (owner, 20 November 2026):** [`docs/lens/reference-dirty-lens-rainbow-flare.png`](lens/reference-dirty-lens-rainbow-flare.png),
a capture from another game used for the look only. Match two things in it: a **rainbow spectral streak** (a short, horizontal
band split into spectrum colours, as if light passed through a prism) that appears over the scene where a strong light grazes
the lens, and **lens dirt**: small specks and short rain-like streaks scattered over the whole frame, lit up only where
bright light reaches them. Keep it subtler than the reference by default; strength is a setting. The art style lab (L0,
`#artlab`) has a dirty-lens dial: start from its shader and settings rather than writing a second one.

- **Lens flare**: ghosts and a halo along the line from the light through the screen centre, sized and faded by how directly
  the light is in view and whether it is blocked (occlusion test against the depth buffer or a ray).
- **Dirty lens**: a subtle dust and smudge texture over the screen that only shows where bright light hits it. Generate the
  texture procedurally in code, or use a CC0 texture with its source recorded; never a texture from a search engine.
- **Bloom on bright sources**, and soft light shafts from the sun through gaps where cheap enough (the engine has a sun-ray
  pass; read `src/01-core.js` and the final shader before adding a new one).
- All of it in the existing post-processing chain, gated by the quality setting, off at the lowest quality, and with a setting
  to turn the lens dirt off. Aiming down an optic may reduce or change the effect.
- Tests: the effect strength rises when the camera faces the sun and falls to zero when the light is occluded or behind;
  frame cost measured on the A1 route at each quality; before and after screenshots in `docs/lens/`.

## C13. Real weapon foley for every action (medium to large; after C12)

The owner likes the handling sounds of the Partisan Project workbench and wants that quality for **every** weapon action in
Claudov, with more variety.

- Start from what exists: `docs/audio-events.md` (every handling and firing event per weapon family) and `docs/handling-foley.md`
  (the current 44 ElevenLabs takes and the unshipped Partisan references worth auditioning). Fill every gap: each family and each
  event (magazine out, magazine in, bolt or charging handle, bolt release, pump, shell insert, safety and fire selector, draw,
  holster, aim in, aim out, inspect, dry fire, attachment mount and unmount at the workbench, bipod deploy) gets at least four
  takes so repeats never sound identical.
- Generate alternatives and variants with **ElevenLabs Sound Effects** through the ElevenLabs MCP connector on the owner's
  account, using Partisan's workbench takes as the reference for character (describe them in the prompt; do not upload
  anything you are not allowed to). Ask the owner before spending credits beyond a budget he sets; report the credits used.
  Record each generated take in the credits file the same way `docs/handling-foley.md` does (generated with ElevenLabs on the
  owner's account). The owner has confirmed his ElevenLabs plan covers using the generated sounds in the game (20 November 2026).
  If the agent does not have the ElevenLabs connector, stop after the shot list and ask the owner to run the generation.
- Edit and level every take with the existing pipeline (`tools/sfx/`, `tools/build_sfx.py`): trimmed, transient-aligned, levels
  within 2 dB of the pack median, no clipping. Map them in `src/efc/45-efc-sounds.js` with heavier weapons pitched lower.
- Extend the audition page (`#sounds`) so the owner can hear every event, old against new, per weapon.
- Tests: `test-sounds.mjs` extended so every event of every weapon resolves to at least four takes, timing matches the reload
  choreography, and the added download stays under a budget you state.

## C14. Second World War weapons (large; last)

The owner decided the historical weapons go in, after the modern ones: **PPSh-41, Bren and Chauchat**, plus the plain StG 44 if
it differs from the raid version.

- Same port as C2 (`docs/weapon-port.md`).
- They are period pieces in a modern port town: rare finds, priced to match, carried only by the Heavy (Bren) or found in
  specific places (an armoury cage, a collector's locker); write the reasoning in `docs/weapons.md`.
- Bren and Chauchat are light machine guns: heavy, slow to aim, with a bipod that deploys on a ledge or prone (prone exists
  after C9).

## C15. Minimal HUD and the magazine check (medium; right after C2)

The owner wants a minimal HUD: **the ammunition count is no longer shown on screen.** To know how many rounds are left, the
player **holds R**: the character pulls the magazine out and looks at it, and the round count appears while it is held.

- **Tap R** reloads, as now. **Hold R** (longer than about 0.3 s; tune it) starts the check instead: the magazine comes out and
  is held up in view, a small readout shows the rounds in it, and releasing R puts it back. The check takes time and cannot be
  done while firing, aiming down sights or sprinting; any of those cancels it. The chamber round counts separately where the
  weapon has one ("29 + 1").
- **Show the count roughly, not exactly**, unless the owner prefers exact: for example "full", "nearly full", "about half",
  "low", "nearly empty" by feel, and the exact number only for small magazines (shotguns, the SKS, pistols) where you can see
  the rounds. Make the style a setting with the rough style as default, and say in the report what you chose.
- **Per weapon family**: detachable magazines (rifles, SMGs, pistols) as above; fixed magazines and tubes (SKS, pump shotguns)
  open the action or tilt the weapon to look instead; belt or drum weapons show the drum. Reuse the inspect and reload
  choreography (`src/06d-reload.js`) and the handling foley.
- **The rest of the HUD goes minimal too**: no ammo counter, no reserve count, no weapon name banner; keep the crosshair,
  hit markers, the compass or extract list only while the extraction is being held or the map is open, and the damage
  direction indicator. Remove nothing the player needs for safety (low health still shows through the screen effects).
  Write the final list of what the HUD shows in `docs/hud.md`; anything you are unsure about is a question for the owner.
- **Reserve ammunition** is known from the inventory screen only (A8), as rounds in the bag.
- **Other players** see the magazine come out in third person, replicated through the existing animation path.
- **Tests**: tap reloads and hold checks, with the timing threshold; the count shown matches the magazine; the check cancels on
  fire, aim and sprint; no ammo text exists in the HUD during a raid; the third-person check reaches the other client in the
  two-client rig. Screenshots of the check in first person for a rifle, a pistol and a pump shotgun in `docs/hud/`.
