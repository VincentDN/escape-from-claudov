# Third track: tasks C1 to C9

Written 20 November 2026 for the agent that finished tracks T and A. Everything from `docs/HANDOFF.md` sections 1 to 4 and 7
still applies (branching, build, tests, rules that are not negotiable, how to report), with these updates:

- Name branches `codex/c<n>-<topic>`, branched from the current `main`. One task per branch; split a large task into several
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

---

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

## C3. Partisan weapons, batch 2 (large; after C2)

Same as C2 for **MK14, SPEAR, PPSh-41, Bren, Chauchat**, plus the attachments not yet in the game (for example the GP-25
under-barrel launcher, ZF4 scope, AK suppressor and rail, iron sight set).

- Bren and Chauchat are light machine guns: heavy, slow to aim, a bipod that can be deployed on a ledge or prone (if prone
  exists only after C9, make the bipod work on ledges and leave a hook for prone).
- PPSh-41 and Chauchat are period pieces in a modern port town: make them rare finds with a value to match, and say so in
  `docs/weapons.md`.
- The GP-25 launcher needs a grenade projectile: reuse the engine's grenade physics and explosion code.
- **Owner question to raise, not decide**: whether the historical weapons belong in the game at all, or only as valuables.

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

## C9. Omnimovement (very large; last; two branches)

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
