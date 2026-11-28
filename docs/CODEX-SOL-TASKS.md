# Task cards for Codex Sol

Written 25 November 2026 (Claude) after an audit of `beta` at `d02c3fb`. This file turns the open part of
[`HANDOFF-CODEX.md`](HANDOFF-CODEX.md) into small task cards that a less experienced agent can finish one at a time.
`HANDOFF-CODEX.md` stays the specification (the *what* and *why*); this file is the *how*. Where the two disagree, the
specification wins and you stop and report.

## 0. Working inside a five-hour token window (read first)

Codex Sol sessions run on a capped plan: the window can run out in the middle of a card, and a cloud container is thrown away
when the session ends. Anything not pushed is lost. Work so that a fresh session can pick up at the exact step where the last
one stopped.

**The checkpoint file.** [`docs/SOL-PROGRESS.md`](SOL-PROGRESS.md) is the single source of where work stands. It holds the
current card, its branch, the last step done, the next step, test results so far and open questions. Read it before anything
else. Update it and push after every step (see the loop below).

**The loop, for every step of a card:**

1. Do one step of the card (one item of its **Steps** list, or one failing check).
2. Run the fastest check that proves it (base checks, or the one test the step touches; not the whole suite).
3. Update `docs/SOL-PROGRESS.md`: step done, next step, the last line of each check you ran.
4. Commit (`wip(<CARD-ID>): step N, <what>` is fine for an unfinished card) and `git push -u origin <branch>`.

Never hold more than about 20 minutes of work uncommitted. Push even when a test still fails; say so in the progress file.

**Budget rules.**

- Start of a session: note the time. A window is five hours; plan for four.
- Before a step that takes long (a browser test is 5 to 15 minutes here, the full `run-all.sh` over an hour), check the time
  left. With under 45 minutes left, do not start it: write the progress file and push instead.
- At about 80 % of the window (four hours in, or when the tool says usage is high): finish the current step, push, write the
  handoff block in the progress file (**Next step**, **How to verify**, **Watch out for**), push again, and stop.
- Run long tests in the background with output to a file under `/tmp`, and copy their result lines into the progress file
  as soon as they finish: logs in `/tmp` die with the container.
- Do not run the whole suite to check a one-file change. Run the test for that file; leave the full suite to CI
  (`checks.yml` runs it on pull requests to `beta`, when the owner opens or merges one).

**Spending fewer tokens.**

- Read only what the card lists. Use `grep -n`, `sed -n 'A,Bp' file | cut -c1-300` and `git diff --stat`; never print a whole
  engine file, a whole log or a whole test output. Filter logs: `grep -E "^ok|FAIL|Error|passed" log | head`.
- Do not re-read a file you just edited. Do not re-run a check that passed if nothing changed since.
- Prefer one contact sheet to many screenshots. Look at a screenshot only when the card asks for a visual check.
- Keep replies and commit bodies short: what changed, commands run, last line of each.

**Resuming in a new session.**

1. `git fetch origin && git checkout <branch from SOL-PROGRESS.md>` (or `-B <branch> origin/<branch>`).
2. Read `docs/SOL-PROGRESS.md`, then only the card it names.
3. Re-run the last check listed there to confirm the state, then continue with **Next step**.
4. If the progress file and the branch disagree, trust the branch (`git log --oneline -5`) and fix the progress file first.

**Finishing a card.** Set its status in section 4 to `done`, clear the card block in `SOL-PROGRESS.md` (keep the one-line entry
in its log), commit, push. The owner merges branches into `beta`; do not merge or open a pull request unless asked.

**Known traps (cost hours before):**

- Browser tests take minutes each in a sandbox. Raid tests that run longer than the default raid time need `minutes: 60` in
  the `openGame` settings, or the raid ends and the panels close.
- The live game loop keeps running between `simRun` calls. To keep the player alive and in place, pin them with a
  `setInterval` in the page, not only in the `simRun` callback.
- The raid inventory's carried grids and slots share one scroll box (`max-height: 48vh`): scroll the target in before
  measuring it, or after the drag has started.
- Crates have random contents: find items by their grid (`#efcOpLootEquipment`) rather than by id alone.
- Playwright locators default to a 30 s wait; CI is slower than a local run. Use `page.setDefaultTimeout(90000)` in long tests.
- Known flaky checks (do not "fix" them by loosening): `test-lean` (K6), `test-sks` stepped TTK (K9).

## 1. How to work a card

0. Read section 0 and [`SOL-PROGRESS.md`](SOL-PROGRESS.md). If a card is in progress there, resume it.
1. Take the **first card in section 4 whose status is `open` and whose "Needs" cards are all `done`**. Do one card per branch.
2. Branch from the current `beta`: `git fetch origin beta && git checkout -B codex/<card-id>-<topic> origin/beta`
   (for example `codex/c0-1-r-no-reload`). Card ids are lower case in branch names.
3. Read only the files the card lists under **Read**. The engine files (`src/*.js`, French) have very long lines: use
   `grep -n` and `sed -n 'A,Bp' file | cut -c1-400`, never `cat` a whole engine file.
4. Edit only the files under **Edit**. If you need to change another file, stop and say so in your report. If
   `docs/contracts/CONTRACT.md` gives a listed file to another package, that is also a stop: report it, do not edit.
5. Do the **Steps** in order. Do not add features the card does not ask for.
6. Run every command under **Verify**. All must pass. Then run the base checks (section 2).
7. Commit with `feat|fix|docs|test|chore(<CARD-ID>): subject` and a body that lists the commands you ran and their last line.
8. Set the card's status in this file to `done` and, if the card says so, update its line in [`ROADMAP.md`](ROADMAP.md) in the
   same branch. Push the branch. Do not open a pull request unless the owner asks.

**Stop rule.** Stop, push what you have and write the question in the commit body when: a step does not match the code you
find (a function is missing or named differently), a test fails for a reason the card does not describe, the work grows past
about twice the card's size, or a choice is marked **owner**. Never guess at a design choice. Never disable, skip or loosen an
existing test to get green.

**Report.** In the last commit body: what changed, the commands and results, what the tests cannot prove (feel, sound
quality, real GPU frame rates), and any question.

## 2. Base checks (before every commit)

```bash
python3 build.py                      # last lines: "style des textes : rien à signaler" and the asset list
python3 tools/dev/check_decl.py       # prints nothing and exits 0
python3 tools/dev/check_i18n.py       # must end with "0 erreur(s)"
node tools/dev/efc/smoke.mjs          # "smoke ok"
```

Needs Python 3, Node 22 and Playwright with Chromium. If `require('playwright')` fails, set `NODE_PATH` to the global
`node_modules` (for example `export NODE_PATH=/opt/node22/lib/node_modules`). Rendering is software only in sandboxes: tests
step the game without drawing (`simRun` in `tools/dev/efc/harness.mjs`). Give any screenshot a two-minute timeout.

Rules that are easy to break (all from `AGENTS.md` and `HANDOFF.md`):

- Every new top-level name starts with `efc` or `EFC`; never declare a function twice (`check_decl.py`).
- New code is English and goes in `src/efc/NN-efc-<topic>.js`. Do not translate the engine.
- Every new English text in `shell.html` needs a line `Your text ⇒ =` in `i18n/en.txt`.
- Packages talk through `src/efc/00-efc-core.js` (`efcOn`, `efcEmit`, `efcProvide`, `efcCall`) only.
- Host decides loot, containers, extraction and bots. Never add client-only loot.
- No asset of unclear origin. Fonts, sounds, textures need a source page with a licence, recorded in the matching credits file
  and `NOTICE.md`. Never take files from search-engine results or other games.

## 3. Verified state on 25 November 2026

What the audit checked by running it, not by reading the docs.

**Already done (do not redo):**

| Item | Proof |
| --- | --- |
| X1, inventory UI test failures | Fixed in `42541ff`. `test-ui.mjs` result: see the test table below. |
| X2, anti-aliasing only every other frame | Fixed in `74e6eff`: `composer.render` in `src/01-core.js` (line 1196) resets `readBuffer` to the MSAA target at the start of every frame. `test-artlab.mjs` checks every frame. |
| X3, Art Lab menu button | Done in `812ac05`, but it left one missing translation (card K1). |
| C0, most of it | Exact-cell drag with ghost and green/red cells (`src/efc/55-efc-operator.js`), R rotates, Ctrl-drag splits, drop outside sends to ground, keyboard placement, host revision checks, two-client test. Open: cards C0-1 to C0-3. |
| C1, most of it | Four-family check, cancel on aim, ammo preserved, remote start and cancel (`src/efc/10-efc-weapon-check.js`). Open: cards C1-1, C1-2. |
| C9a, first part | Eight-direction sprint and slide, tactical sprint (`src/efc/44-efc-omni.js`). Open: dive, mantle, vault, prone, hit volumes, C9b. |
| C2/C3/C14 models | All 14 Partisan rifle configurations are already in raids with placeholder stats (`src/efc/18-efc-partisan-rifles.js`, `EFC_PARTISAN_PROFILES`). Open: real stats, per-weapon tests, the Partisan modding rules. |

**Test results on `beta` `d02c3fb`** (full `run-all.sh` plus the tests it does not run):

Run in a cloud sandbox with software rendering. "file" means the default `file://` page; "HTTP" means `dist/` served
over HTTP with `EFC_TEST_URL` set, as CI does.

| Test | Result | Notes |
| --- | --- | --- |
| `build.py`, `check_decl.py`, both `smoke.mjs` runs | pass | |
| `check_i18n.py` | **fail** | `'Art Lab'` has no English line (card K1) |
| `test-items`, `test-world`, `test-raid`, `test-warden`, `test-ui` | pass | X1 is fixed: `test-ui ok` |
| `test-grid-placement`, `test-weapon-check`, `test-omni-sprint`, `test-panel-event` | pass | |
| `test-sounds` (65 checks), `test-artlab`, `test-warden-pace`, `test-music`, `test-map`, `test-spawns` | pass | X2 is fixed: `test-artlab` passes |
| `test-e2e` (Sable and Claudov), `test-net`, `test-e2e-net`, `test-weapon-check-net` | pass | |
| `test-inventory-layout`, `test-bench` | fail (file), **pass (HTTP)** | both need HTTP; `run-all.sh` does not serve it (card K2) |
| `test-thumbs` | **fail** (6 checks, file and HTTP) | stale after the grid inventory and Partisan parts (card K4) |
| `test-sks` | **fail** (1 check) | expects 19 weapons, there are 34 (card K5) |
| `test-lean` | **fail** (1 check, file and HTTP) | host sees the guest's lean after 0.33 s, limit 0.3 s (card K6) |
| `test-operator`, `test-weaponmods`, `test-partisan-rifles`, `test-stg44`, `test-scavengers`, `test-migration`, `test-container-collision`, `test-iron-sight-kick` | pass (HTTP) | not in `run-all.sh` (card K2) |
| `test-bench-route` | **fail** (HTTP) | expects 7 Wardens on the bench route, finds 5 (card K7) |
| `test-menu-render` | not runnable here | loads the live Partisan site; needs internet. Keep it out of `run-all.sh` |

**Problems found:**

1. The coordinator's brief still listed X1 and X2 as open; both were fixed on 20 November (`42541ff`, `74e6eff`) and their
   tests pass. Nothing to do for them.
2. `beta` is not green: six checks fail in `run-all.sh` (table above). Cards K1, K2, K4 to K7 make it green before feature work.
3. `.github/workflows/checks.yml` runs only on pull requests to `main`, so none of these failures showed up in CI (card K3).
4. Ten test files are not in `run-all.sh` at all (card K2).
5. C12 points to `docs/lens/reference-dirty-lens-rainbow-flare.png`, but commit `2cdbe1c` only changed the handoff text: the
   image was never committed. **Owner:** add the image, or C12 works from the text description only.
6. `docs/HANDOFF-CODEX.md` C2 asks for `docs/weapons.md`; it does not exist yet (card C2-2).
7. The contact sheets the specs ask for (`docs/weapon-check/`, `docs/omnimovement/`, `docs/hud/`, `docs/map/`, `docs/fonts/`)
   do not exist yet; only `docs/inventory/` has screenshots.

## 4. Cards in order

Status values: `open`, `done`, `blocked (reason)`. Sizes: XS (under an hour), S (a few hours), M (a day), L (split further
before starting).

| Card | What | Size | Needs | Status |
| --- | --- | --- | --- | --- |
| K1 | Translate the "Art Lab" button so `check_i18n.py` passes | XS | none | done |
| K2 | Serve HTTP in `run-all.sh` and add the tests it skips | S | K1, K4 to K7 | done |
| K3 | Run the CI suite on pull requests to `beta` too | XS | none | done |
| K4 | Bring `test-thumbs.mjs` up to date with the grid inventory | S | K1 | done (5 of 6 checks; the sixth is a real bug, K8) |
| K8 | Stash list names are 24 px wide at 1280 by 720 | S | K4 | blocked (owner: one line or two) |
| K9 | `test-sks.mjs` "stepped TTK: the SKS is the longest" fails on some runs | S | K5 | done |
| K10 | Raid panels cover the whole screen, so "drop outside the panel" never reaches the ground | S | C0-2 | done (a "Drop here" zone under the operator; owner may still pick another option) |
| K5 | Fix the weapon count in `test-sks.mjs` | XS | K1 | done |
| K6 | Find why the online lean takes 0.33 s | S | K1 | done |
| K7 | Find why the bench route has 5 Wardens, not 7 | S | K1 | done (A3 Scavengers take 2 of the 7 hostile slots by design; test updated) |
| C0-1 | Test: R does not reload while a raid panel is open | XS | K1 | done |
| C0-2 | Test: drags between every raid panel pair | S | C0-1 | done (8 checks, after K10) |
| C0-3 | Foley: unmount sound and one shared throttle | S | C0-2 | done |
| C0-4 | Close C0 in the roadmap | XS | C0-3 | done |
| C1-1 | Test: every gameplay input cancels the weapon check | S | K1 | done |
| C1-2 | Contact sheets of the weapon check per family | S | C1-1 | done |
| C10-1 | Self-hosted open-licence font files | S | K1 | done |
| C10-2 | Swap the stencil face for the new font | S | C10-1 | done |
| C10-3 | Font screenshots and overflow check | S | C10-2 | done |
| C9-1 | Movement state machine skeleton and transition table | S | C1-2 | done |
| C9-2 | Dive | M | C9-1 | done |
| C9-3 | Mantle and vault | M | C9-1 | done |
| C9-4 | Prone: enter, crawl, get up | M | C9-1 | done |
| C9-5 | Prone: free turn, roll to back and sides | M | C9-4 | done |
| C9-6 | Hit volumes follow the stance | M | C9-4 | done |
| C9-7 | Replicate stances online | S | C9-6 | done |
| C9-8 | C9b: the weapon follows the body | L | C9-7 | done |
| C16-1 | Bark events, catalogue and rules (no sound, no UI) | S | C9-8 | done |
| C16-2 | Captions over the hostile and in a feed | S | C16-1 | done |
| C16-3 | Hook barks into the existing AI, with lead time | M | C16-1 | done |
| C15-1 | Minimal raid HUD option | S | C1-2 | done |
| C15-2 | Separate tap reload from hold magazine check | S | C15-1 | done |
| C15-3 | Magazine check pose and ammo readout | M | C15-2 | done |
| C15-4 | Replicate magazine checks and document the HUD | M | C15-3 | done |
| C13-1 | Audit weapon foley and write the [generation shot list](weapon-foley-shot-list.md) | S | none | done |
| C13-2 | Generate missing takes with ElevenLabs | M | C13-1 | in progress (three Batch A pilots verified in-game) |
| C13-3 | Edit, level and credit the generated foley | M | C13-2 | open |
| C13-4 | Map the takes and extend the audition page | M | C13-3 | open |
| C13-5 | Verify family coverage, timing and download budget | S | C13-4 | open |
| C16-4 | Invented language and the voice script | S | C16-1 | done |
| C16-5 | Record the lines with ElevenLabs | M | C16-4 | blocked (owner approval of the five sample lines and ElevenLabs connector) |
| C16-6 | Radio processing and packaging | S | C16-5 | open |
| C16-7 | Voice playback in the game | S | C16-6, C16-2 | open |
| C16-8 | Online barks and closing test | S | C16-7, C16-3 | open |
| C16-9 | Downed state for players in raids | M | C16-8, C9-4 | open (owner: defaults in the card) |
| C16-10 | Teammate revive online | S | C16-9 | open |
| C16-11 | Execution: walk up, taunt, draw pistol, last line, finishing shot | M | C16-9 | open |
| C16-12 | The downed player's view of it | S | C16-11 | open |
| C16-13 | Execution online and closing test | S | C16-11, C16-10 | open |
| C2-1 | Port Partisan's rail and compatibility rules | M | C16-13 | open |
| C2-2 | Roster stats table and niche stats for batch 1 | S | C2-1 | open |
| C2-3 | One parametrised weapon test | S | C2-2 | open |
| C2-4 to C2-8 | One card per weapon: AK-15K, AK-74M Zenitco, RPK, M16, G3 | S each | C2-3 | open |
| C11-1 to C11-3 | Full-screen map and extraction flares | M total | C15-4 | open |
| C12 | Dirty lens | M | C11-3 | blocked (reference image missing, see findings) |
| C3-1 to C3-7 | Remaining modern weapons and parts (section 7) | M total each | C13-5 | open |
| C4-1 to C4-8 | Marksman, Breacher, Heavy (section 7) | S to M | C3-7 | open |
| C5-1 to C5-8 | AI behaviour upgrade (section 7) | S to M | C4-8 | open |
| C6-1 to C6-6 | Rival raider squads (section 7) | S to M | C5-8 | open |
| C7-1 to C7-7 | Optimisation, part 1 (section 7) | XS to M | C6-6 | open |
| C8-1 to C8-6 | Raid balance (section 7) | XS to M | C7-7 | open |
| C14-1 to C14-5 | Second World War weapons (section 7) | S to M | C8-6, C9-4 | open |
| C17-1 | First-person lower-body mesh (cards in `docs/plans/2026-11-27-omnimovement-2.md`) | M | C15-4 | done |
| C17-2 | Place the lower body under the camera | S | C17-1 | open |
| C17-3 | Verify legs across stances | M | C17-2 | open |
| C17-4 | Shadows, setting, budget and closing sheet | S | C17-3 | open |
| C18-1 to C18-16 | Omnimovement 2, aimed at the feel of Black Ops 6 (cards in `docs/plans/2026-11-27-omnimovement-2.md`, section 6 gives the order) | S to M each | C17-1 (C18-1) | open (owner: O1 to O5 in the plan) |

---

## 5. Cards

### K1. Translate the "Art Lab" button (XS)

`check_i18n.py` fails on `beta`: `erreur : sans traduction anglaise : 'Art Lab'  (shell.html)`. X3 added the button
(`shell.html` line 2742, `id="efcArtLabBtn"`) without its line in `i18n/en.txt`.

- **Read:** `i18n/en.txt` (lines 30 to 40 show the format), `HANDOFF.md` section 2 (the `i18n` row).
- **Edit:** `i18n/en.txt`.
- **Steps:**
  1. Add one line `Art Lab ⇒ =` next to the other menu entries (for example after `Notifications ⇒ =`). The arrow is the
     character `⇒` (U+21D2), with one space on each side, then `=`. Copy it from an existing line rather than typing it.
- **Verify:** `python3 tools/dev/check_i18n.py` ends with `0 erreur(s)`; then the base checks.
- **Acceptance:** zero i18n errors; no other file changed.
- **Pitfall:** do not translate the text into French or change the button. `=` means "English stays as written".

### K2. Serve HTTP in `run-all.sh` and add the tests it skips (S)

Locally `run-all.sh` loads the game from `file://`, so `test-bench.mjs` (which refuses to run without `EFC_TEST_URL`) and
`test-inventory-layout.mjs` (the workbench uses an `iframe` only over HTTP, `src/efc/50-efc-ui-workbench.js` line 138) fail,
while CI serves HTTP and they pass. Ten tests are not in the runner at all.

- **Read:** `tools/dev/efc/run-all.sh`, `.github/workflows/checks.yml` (the "Run the full suite twice" step), the test table in section 3.
- **Edit:** `tools/dev/efc/run-all.sh`.
- **Steps:**
  1. After the `build.py` line, if `EFC_TEST_URL` is empty, start `python3 -m http.server 8231 --bind 127.0.0.1 --directory dist`
     in the background, `export EFC_TEST_URL=http://127.0.0.1:8231/`, and add `trap 'kill $server_pid' EXIT`. If it is already
     set (CI), start nothing.
  2. Add these lines before `run env MAP=sable node tools/dev/efc/test-e2e.mjs`: `test-operator.mjs`, `test-weaponmods.mjs`,
     `test-partisan-rifles.mjs`, `test-stg44.mjs`, `test-scavengers.mjs`, `test-migration.mjs`, `test-container-collision.mjs`,
     `test-iron-sight-kick.mjs`, and `test-bench-route.mjs` once K7 is done. Do **not** add `test-menu-render.mjs` (needs the internet).
- **Verify:** `bash tools/dev/efc/run-all.sh` (about 40 minutes) ends with `ALL CHECKS PASSED`.
- **Acceptance:** the full run passes locally with no environment variables set.
- **Pitfall:** port 8231 may be busy if a previous run crashed: `pkill -f "http.server 8231"` first.

### K4. Bring `test-thumbs.mjs` up to date with the grid inventory (S)

Six checks fail. They were written on 14 November for the old row lists. Since A8, A9 and C0 the hideout and loot panels are
grids and Partisan attachment parts became items. Failures, from the log:

- `4 to 85 % opaque pixels`: parts `part_p35123218a` and `part_pca7a0599d` cover only 2 % of their thumbnail (very thin parts).
- `props are 50 to 300 triangles`: 36 Partisan parts have 304 to 4,974 triangles (real models, not procedural props).
- `every hideout row has a thumbnail`, `row boxes 128x48 ...`, `item rows keep name ... on one line`, `loot panel rows have
  thumbnails`: the counts and sizes are for rows that the grid inventory replaced (42 images for 21 rows, boxes now 53 by 46).

- **Read:** `tools/dev/efc/test-thumbs.mjs` (all), `src/efc/52-efc-thumbs.js`, `src/efc/52-efc-thumb-props.js` (header
  comment), `src/efc/55-efc-operator.js` lines 105 to 121 (grid item markup).
- **Edit:** `tools/dev/efc/test-thumbs.mjs`; `src/efc/52-efc-thumbs.js` only for step 2.
- **Steps:**
  1. Triangle check: keep 50 to 300 for procedural props; for items whose id starts with `part_p` (Partisan parts) check
     at most 5,000 triangles instead. **Owner** may set another part budget; say which number you used.
  2. Opacity check: for the two thin parts, frame the part tighter in the thumbnail (the camera fit in `52-efc-thumbs.js`) until
     cover is at least 4 %. If you cannot without clipping, keep 4 % for everything else and list those two ids as known
     exceptions in the test with a comment.
  3. Hideout and loot checks: rewrite them for the grid. Every `.efc-op-item` button in `#scr-hideout` and `#efcLoot` has
     exactly one thumbnail image; every thumbnail fits inside its button; the item name `<span>` is not clipped
     (`scrollWidth <= clientWidth + 1`) or the button has an `aria-label` with the full name. Keep the preview-on-hover checks.
- **Verify:** `node tools/dev/efc/test-thumbs.mjs` ends with no failed checks; `test-ui.mjs`, `test-operator.mjs` pass.
- **Acceptance:** no check removed without a replacement that tests the same promise on the new layout.

### K8. Stash list names are 24 px wide at 1280 by 720 (S)

Found while doing K4. Under the stash grid, the hideout list (`#efcHoStash`) gives each row 252 px at 1280 by 720. The A8 layout
(`shell.html` around line 2624: `.efc-op-layout .efc-it.efc-thr.noslot`, columns `53px minmax(0,1fr) 2.1em 3.3em 3.6em`) leaves the
name 24 px, so "AK-47 (30 + 60)" is cut to two letters. The count column (`.n`) takes 34 px even when it is empty.
`test-thumbs.mjs` keeps failing "item rows keep name, weight and value on one line, names readable" until this is fixed.

**Owner:** the P3b rule says name, weight and value stay on one line; at this width that leaves no room for the name. Choose one:
(a) in the operator layout, put weight and value on a second line under the name (the "one line" part of the check then applies
only outside `.efc-op-layout`), or (b) keep one line, let the count, weight and value columns size to content (`auto`) and hide the
value column below 300 px row width. Until the owner chooses, do not start this card.

- **Edit:** `shell.html` (CSS only), `tools/dev/efc/test-thumbs.mjs` (only for option (a), and only the "one line" part).
- **Verify:** `node tools/dev/efc/test-thumbs.mjs` passes; `node tools/dev/efc/test-inventory-layout.mjs` (HTTP) passes; a
  screenshot of the hideout at 1280 by 720 committed to `docs/inventory/hideout-list-1280.png`.

### K9. Make the SKS stepped time-to-kill check deterministic (S)

Seen in the local full run on 25 November: `FAIL stepped TTK: the SKS is the longest of all rifles`, with a different starting
aim (`aim0`) than the passing runs, and the L96 at 2.53 s (2 hits in 3 shots) beating the SKS. The other runs that day passed.
The stepped duel depends on where the target stands and on hit spread, so the ordering is not guaranteed.

- **Read:** `tools/dev/efc/test-sks.mjs` (the "stepped TTK" block), `grep -n "Math.random" src/06-weapons.js src/08-player.js` for spread.
- **Steps:** find what sets `aim0` and the spread per shot. Make the duel use a fixed target position and a seeded random
  source for the test only (for example replace `Math.random` inside the evaluate with a seeded generator, then restore it).
  Do not change game code and do not widen the threshold.
- **Verify:** run `node tools/dev/efc/test-sks.mjs` five times; all pass.
- **Tried on 26 November (did not fix it):** seeding `Math.random` before `startSolo` makes the 25 m line the same on every
  run (`aim0` stayed `[0.382,-0.014,-0.924]`), and reseeding it per weapon inside the duel evaluate; still 4 of 5 runs failed.
  The spread is not the only source: the L96 sometimes needs a second hit (1.267 s or 2.533 s) and the SKS sometimes kills in
  3 hits (0.867 s), so where the bullets land also depends on something time-based (look for `performance.now`, sway or the
  target's pose clock). Note the margin: with one L96 hit the L96 is 1.267 s against the SKS's 1.3 s, a near tie. If no
  deterministic fix is found, ask the owner whether the check should compare against the semi-automatic rifles only.

### K10. Make "drop outside the panel" reachable in a raid (S)

Found by C0-2 (check 8 of `test-inventory-drag.mjs`). `efcOperatorDragEnd` drops an item on the ground when it is released
with no target and `pick.outside` is true, which means the pointer is not inside `.efc-box`. But `.efc-box.efc-op-box` is
`width: 100%; height: 100%` (`shell.html` line 2676), so in the raid and loot panels no point on the screen is outside the box
and the drop never happens. The test checks the overlay's corners and edge midpoints at 1366 by 900; all are inside the box.

- **Owner decision first:** where the player drops to the ground: (a) a margin around the panel box, (b) a visible
  "Drop to ground" zone in the panel (for example under the operator figure), or (c) releasing over the operator figure column.
- **Read:** `src/efc/55-efc-operator.js` lines 407 to 415 (`pick.outside`) and 466 to 485 (drag end); `shell.html` lines 2586 and 2676.
- **Steps (for b):** add one element with `data-op-target="ground"` to the raid and loot layouts; in `efcOperatorDragMove`
  treat it as `pick.outside = true` with a valid highlight; leave the hideout unchanged. Update check 8 to release over it.
- **Verify:** `node tools/dev/efc/test-inventory-drag.mjs` prints eight `ok` lines; base checks.

### K5. Fix the weapon count in `test-sks.mjs` (XS)

`check('nineteen engine weapons', r.n === 19, r.n)` (line 26) counts every key of `WEAPONS`, which is 34 now: 20 engine
weapons (the build prints "20 armes") plus the 14 Partisan profiles.

- **Edit:** `tools/dev/efc/test-sks.mjs`.
- **Steps:** in the `ev(...)` block return `n: Object.keys(WEAPONS).filter(k => !EFC_PARTISAN_WEAPON_MODELS.has(k)).length` and
  `partisan: EFC_PARTISAN_WEAPON_MODELS.size`; change the check to `'twenty engine weapons and 14 Partisan'`, `r.n === 20 && r.partisan === 14`.
- **Verify:** `node tools/dev/efc/test-sks.mjs` ends without `FAILED`.
- **Pitfall:** do not change the other SKS checks; they pass.

### K6. Find why the online lean takes 0.33 s (S)

`test-lean.mjs` check (7) fails the same way on every run: the host's copy of a leaning guest matches after 0.33 s of game time;
the limit is 0.3 s. The test steps in 2-tick slices (0.067 s), so the lean now needs one slice more than before. This is either a
regression (something slowed the lean or its replication) or a test that was on the edge.

- **Read:** `tools/dev/efc/test-lean.mjs` lines 206 to 236, `src/efc/42-efc-lean.js`, `grep -n "leanX" src/09c-net.js`.
- **Edit:** nothing until step 2 says which file.
- **Steps:**
  1. Find the first bad commit: `git bisect start origin/beta 26e0295`, then at each step
     `python3 build.py >/dev/null && node tools/dev/efc/test-lean.mjs; git bisect good|bad` (good when it ends `0 FAILED`).
     If `26e0295` already fails, try `03ea09b`. Record the result, then `git bisect reset`.
  2. If one commit changed the lean speed (`42-efc-lean.js`), the send rate or interpolation of remote players (`09c-net.js`),
     fix that commit's side effect in the same file, and only that.
  3. If no commit is to blame (it never passed reliably), **stop** and report the numbers; the owner decides whether 0.33 s is
     acceptable. Do not raise the limit yourself.
- **Verify:** `node tools/dev/efc/test-lean.mjs` twice, `node tools/dev/efc/test-net.mjs`.
- **Acceptance:** check (7) passes twice, or a report with the bisect result.

### K7. Find why the bench route has 5 Wardens, not 7 (S)

`test-bench-route.mjs` (HTTP only) expects the A1 benchmark route on Claudov to have 7 Wardens; it now has 5
(`EFC_BENCH_CAPTURE.wardens.length`). The route is used to compare GPU numbers over time, so its load must stay fixed.

- **Read:** `src/efc/48-efc-bench-route.js`, `tools/dev/efc/test-bench-route.mjs`, `efcWardenNumber` in `src/efc/00-efc-core.js` line 98.
- **Steps:**
  1. Serve `dist/` over HTTP (`python3 -m http.server 8231 --bind 127.0.0.1 --directory dist &`), `export EFC_TEST_URL=http://127.0.0.1:8231/`.
  2. Bisect as in K6 between `origin/beta` and `ca8efcc` (A9) with `node tools/dev/efc/test-bench-route.mjs`.
  3. If the route spawns its Wardens through the normal raid budget and a later change (Scavengers, spawn rules) took two of
     them, make the route set its own fixed count in `48-efc-bench-route.js` so it no longer depends on the raid budget.
- **Verify:** `node tools/dev/efc/test-bench-route.mjs` passes; `test-spawns.mjs`, `test-scavengers.mjs` pass.
- **Acceptance:** 7 Wardens on the route, raid spawns unchanged.

### K3. Run the CI suite on pull requests to `beta` (XS)

`.github/workflows/checks.yml` only triggers on pull requests to `main`, but all work now lands on `beta` first.

- **Read:** `.github/workflows/checks.yml` (first 6 lines).
- **Edit:** `.github/workflows/checks.yml`.
- **Steps:** change `branches: [main]` under `pull_request:` to `branches: [main, beta]`. Change nothing else.
- **Verify:** `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/checks.yml'))"` exits 0 (install `pyyaml`
  if missing, or skip this line and say so).
- **Acceptance:** one-line diff.

### C0-1. Test: R does not reload while a raid panel is open (XS)

The behaviour already exists: with a panel open, `efcUirKey` in `src/efc/50-efc-ui-raid.js` (lines 173 to 198) swallows
every key except movement, so the engine's `startReload()` (`src/08-player.js` line 56) never sees R. There is no test.

- **Read:** `src/efc/50-efc-ui-raid.js` lines 172 to 200, `tools/dev/efc/test-ui.mjs` lines 100 to 170 (how a raid panel is
  opened with mock services), `tools/dev/efc/harness.mjs` (`openGame`, `startSolo`, `simRun`).
- **Edit:** new file `tools/dev/efc/test-inventory-keys.mjs`; `tools/dev/efc/run-all.sh` (one line after `test-grid-placement.mjs`).
- **Steps:**
  1. Start a solo raid: `openGame({ settings: { map: 'claudov' } })`, then `startSolo(page)`, then `simRun(page, 2)`.
  2. Give the player a primary weapon with a part-empty magazine: in `page.evaluate`, set `curW().mag = 5` and record
     `curW().reserve`.
  3. Open the inventory with `efcUirOpen('inv')`. Assert `efcCall('ui:busy') === true`.
  4. `page.keyboard.press('KeyR')`, then `simRun(page, 3)`. Assert `PL.reload` is falsy and `curW().mag === 5` and the reserve
     did not change.
  5. Close the panel with `efcUirClose()`, press R, `simRun(page, 4)`. Assert the magazine is now larger than 5 (the reload
     happened), which proves the test can see a reload at all.
  6. Assert the page logged no errors (`assert.deepEqual(errors, [])`) and print one line `inventory keys ok`.
- **Verify:** `node tools/dev/efc/test-inventory-keys.mjs` passes; base checks.
- **Acceptance:** the test fails if you temporarily delete the final `e.stopImmediatePropagation(); return;` line in
  `efcUirKey` (try it, then restore the line, and say so in the report).
- **Pitfall:** the engine ignores keys when the pointer is not locked (`pointerActive()`); the harness sets
  `LOCK.fallback = true` in `startSolo`. If step 5 does not reload, check `pointerActive()` first, do not change the game.

### C0-2. Test: drags between every raid panel pair (S)

`test-grid-placement.mjs` and `test-operator.mjs` cover the hideout. The raid panels have no scripted drag test.

- **Read:** `src/efc/55-efc-operator.js` lines 218 to 290 (`efcOperatorGetSource`, `efcOperatorCanMove`, `efcOperatorMove`)
  and 351 to 485 (`efcOperatorExact`, drag move and end), `shell.html` lines 3050 to 3070 (panel ids),
  `tools/dev/efc/test-grid-placement.mjs` (the pointer pattern to copy), `tools/dev/efc/test-ui.mjs` lines 100 to 120 (mock
  container services).
- **Edit:** new file `tools/dev/efc/test-inventory-drag.mjs`; `tools/dev/efc/run-all.sh` (one line).
- **Targets in the DOM** (use these selectors): equipment slots `[data-op-target="slot"][data-op-key="primary|sidearm|armor|pack"]`;
  carried grids `.efc-op-grid[data-op-area="pockets|rig|pack"]`; open container grid `#efcOpLootGrid .efc-op-grid`; quick slots
  `[data-op-target="quick"][data-op-key="0"]`; attachment slots `[data-op-target="attachment"][data-op-key="optic"]`; ground
  rows `[data-op-source="ground"]`. Items are `[data-op-source][data-efc-id="<item id>"]`.
- **Steps:** write one helper `drag(fromLocator, toLocator, cell = null)` that does `mouse.move` to the source centre,
  `mouse.down`, `mouse.move` in 5 steps to the target (or to cell `x, y` of a grid with the formula from
  `test-grid-placement.mjs`), checks the ghost `.efc-op-ghost` exists and its centre is within 40 px of the pointer, then
  `mouse.up`. Use real game services (no mocks) in a solo raid on Claudov, and put a crate next to the player through the
  host world (`efcCall('world:list')` shows what exists; pick the nearest container and teleport the player to it). Cover:
  1. pockets to pack grid (exact cell; check `efcCall('grid:loadout', EFC.inv)` shows it at that cell);
  2. pack grid to primary slot with a weapon (slot filled);
  3. open crate grid to pockets, and pockets to crate (item moved, crate `rev` increased);
  4. a long item onto a cell where it does not fit: `data-op-drop="invalid"` while hovering, press R, `valid`, release, placed rotated;
  5. a refused drop (onto an occupied cell): item back at its origin;
  6. bag item to quick slot 0 (quick list holds it);
  7. a red dot from pockets onto the optic attachment slot (mounted: `efcCall('weaponmods:slots', EFC.inv.slots.primary)`);
  8. pockets item released outside every `.efc-box`: a new ground container near the player holds it.
- **Verify:** the new test passes twice in a row; base checks; `test-ui.mjs` still passes.
- **Acceptance:** eight named checks print `ok`; no page errors.
- **Pitfall:** grids re-render after every change, so locate elements again after each drag, never reuse an old element
  handle. Wait for `world:changed` to land with `simRun(page, 0.5)` after container moves (the host applies them on its tick).

### C0-3. Foley: unmount sound and one shared throttle (S)

Spec C0 item 3. Today `efcInvSound` (`src/efc/45-efc-sounds.js` line 100) throttles each sound key separately (50 ms), so a
fast drag can stack a pick, a rotate and a place in the same instant. Detaching an attachment by drag emits `place`, not an
unmount cue.

- **Read:** `src/efc/45-efc-sounds.js` lines 36 to 60 and 95 to 160; `src/efc/55-efc-operator.js` lines 371 to 375
  (attachment branch of `efcOperatorExact`) and 465 to 485 (`efcOperatorDragEnd`); `tools/dev/efc/test-sounds.mjs` lines 130 to 160.
- **Edit:** `src/efc/45-efc-sounds.js`, `src/efc/55-efc-operator.js`, `tools/dev/efc/test-sounds.mjs`.
- **Steps:**
  1. In `EFC_HANDLING` add `inv_unmount: [['hf_click', 0, 0.55, 0.98], ['hf_slide', 0.04, 0.4, 0.95]],` after `inv_mount`.
  2. In the `ui:inventory-gesture` handler add `unmount: 'inv_unmount'` to the map.
  3. In `efcOperatorDragEnd`, when `pick.source.kind === 'attachment'` and the drop succeeded, emit `'unmount'` instead of
     `'place'`. Also emit `'unmount'` from the Detach button handler (`data-op-detach` in `efcOperatorInteractions`) when
     `weaponmods:detachCarried` returns true.
  4. Add a shared gap: in `EFC_SND` add `invLast: -1`; in `efcInvSound`, return false if `t - EFC_SND.invLast < 0.07`, except
     when `key === 'inv_refuse'` (a refusal must always be heard); set `EFC_SND.invLast = t` when a sound plays.
- **Verify:** extend `test-sounds.mjs` so it (a) emits `unmount` and finds `inv_unmount` in `EFC_SND.log`, and (b) emits
  `pick`, `rotate`, `place` in one synchronous loop and finds exactly one of them in the log, then `refuse` and finds it.
  Run `node tools/dev/efc/test-sounds.mjs`, `node tools/dev/efc/test-inventory-drag.mjs`, base checks.
- **Acceptance:** both new checks pass; existing sound checks still pass.
- **Pitfall:** `AU.ctx.currentTime` does not advance inside one `page.evaluate`, which is what makes check (b) work. Do not
  use `performance.now()`.

### C0-4. Close C0 in the roadmap (XS)

- **Edit:** `docs/ROADMAP.md`, `docs/HANDOFF-CODEX.md`.
- **Steps:** set the C0 row in `ROADMAP.md` to `done` with the merge commits; in `HANDOFF-CODEX.md` add one line under the C0
  heading: "Done on `beta` (cards C0-1 to C0-3 in `CODEX-SOL-TASKS.md`)". Commit a fresh screenshot of a raid drag with a red
  and a green highlight to `docs/inventory/raid-drag.png` (capture it in `test-inventory-drag.mjs` when `EFC_GRID_SHOTS` is set).
- **Acceptance:** docs say C0 is done; screenshot committed.

### C1-1. Test: every gameplay input cancels the weapon check (S)

The brief (`docs/briefs/P9-WEAPON-CHECK.md`, Acceptance) asks for separate scenarios for move, aim, fire, sprint and switch,
each handled in the same frame. `test-weapon-check.mjs` only tests aim.

- **Read:** `src/efc/10-efc-weapon-check.js` (all, 82 lines), `tools/dev/efc/test-weapon-check.mjs`, `docs/briefs/P9-WEAPON-CHECK.md`.
- **Edit:** `tools/dev/efc/test-weapon-check.mjs` only.
- **Steps:** after the existing loop, for each of these inputs start a fresh check exactly as the test does
  (`efcWeaponCheckPending = true; efcWeaponCheckTick({}, false)`, run 20 `updateViewmodel` steps) and then cancel with:
  `{ fire: true }`, `{ sprint: true }`, `{ jump: true }`, `{ crouch: true }`, `PL.reload = true`, `PL.switching = 0.2`, and a
  move of 2 m (`PL.ent.pos.x += 2`). For each assert in the same tick: `VM.action === null`, `PL.ent.efcWeaponCheck === null`,
  the magazine and reserve unchanged, the magazine and bolt back at home (`returnToReady()`). Reset the changed state after each.
- **Verify:** `node tools/dev/efc/test-weapon-check.mjs`; `node tools/dev/efc/test-weapon-check-net.mjs`; base checks.
- **Acceptance:** seven new scenarios pass. If one does not cancel, **stop**: that is a bug report, not a test to loosen.
- **Pitfall:** `PL.reload = true` without a real reload leaves the player stuck; set it back to `false` before the next case.

### C1-2. Contact sheets of the weapon check per family (S)

- **Read:** `tools/dev/efc/artlab-contact-sheet.mjs` (the pattern for a contact sheet), `src/efc/10-efc-weapon-check.js`
  (`EFC_WEAPON_CHECK_TIMELINES`), `src/06b-soldier.js` (grep `efcWeaponCheckPose` for the third-person pose).
- **Edit:** new `tools/dev/efc/weapon-check-sheet.mjs`; new images in `docs/weapon-check/`.
- **Steps:** for `ak47` (mag), `l96` (bolt), `sks`, `rem870` (pump): render first person at 0 %, 35 %, 60 % and 100 % of the
  check; render a third-person soldier (a remote entity with `efcWeaponCheckRemote(entity, { on: true, kind })`) at the same
  times. Tile them into one PNG per family, 4 columns by 2 rows, labelled, `docs/weapon-check/<family>.png`.
- **Verify:** the script exits 0 and writes four PNGs; open each with an image viewer and confirm the weapon is visible in every
  tile. State in the report that hand contact quality needs the owner's eye.
- **Acceptance:** four PNGs committed, each under 600 KB (use 960 by 540 tiles at most).

### C10-1. Self-hosted open-licence font files (S)

Spec C10. **Owner choice:** the family. Default if the owner has not answered: **Inter** (SIL Open Font License 1.1), weights
400, 600 and 700; keep Barlow Condensed for HUD numbers.

- **Read:** `shell.html` lines 50 to 66; `build.py` lines 275 to 290 (the Content Security Policy); `NOTICE.md`.
- **Edit:** new `assets/fonts/` (font files plus `OFL.txt`), `NOTICE.md`, `build.py` (only if the build must copy or inline the files).
- **Steps:**
  1. Download Inter from its official release page on GitHub (`rsms/inter`, a tagged release zip), not from a font mirror.
     Take the `woff2` files for 400, 600, 700 and the licence text. Do the same for Barlow Condensed 400 to 700 from the
     `google/fonts` GitHub repository (`ofl/barlowcondensed`). If the sandbox cannot download, **stop** and ask the owner to
     place the files in `assets/fonts/`.
  2. Record each family in `NOTICE.md`: name, version, source URL, licence (SIL OFL 1.1).
  3. Find how `build.py` ships other assets (grep `assets/` in `build.py`) and make sure `assets/fonts/` reaches `dist/`.
- **Verify:** `python3 build.py` then `ls dist/assets/fonts` (or wherever the build puts assets) shows the files.
- **Acceptance:** files and licence committed, total under 400 KB.

### C10-2. Swap the stencil face for the new font (S)

- **Read:** `shell.html` lines 50 to 120 and every `var(--stencil)` (31 uses: `grep -n "var(--stencil)" shell.html`);
  `grep -rn "stencil" src/efc/` ; `build.py` lines 280 to 284.
- **Edit:** `shell.html`, `build.py`, any `src/efc/*.js` that names the variable.
- **Steps:**
  1. Delete the three Google Fonts lines (`shell.html` 51 to 53). Add `@font-face` rules for each file from C10-1, with
     relative URLs (`assets/fonts/...`) and `font-display: swap`.
  2. Rename `--stencil` to `--display` and set it to `"Inter", system-ui, "Segoe UI", sans-serif`. Replace every
     `var(--stencil)` with `var(--display)`. Stencil headings were weight 400; set them to 700 where they are titles (`.title`,
     `.shead h2`, `.mbtn b`, `.deploy`) and 600 elsewhere.
  3. In `build.py` change the CSP: remove `https://fonts.googleapis.com` from `style-src` and set `font-src 'self'`.
- **Verify:** `grep -c "stencil\|Saira\|googleapis\|gstatic" shell.html build.py` prints 0 for each; base checks;
  `node tools/dev/efc/test-ui.mjs`; `node tools/dev/efc/test-bench.mjs`.
- **Acceptance:** no third-party requests (run the smoke test with the browser's network log: no request leaves the origin).
- **Pitfall:** Inter is wider than Saira Stencil. Do not shrink sizes here; C10-3 handles overflow.

### C10-3. Font screenshots and overflow check (S)

- **Edit:** new `tools/dev/efc/test-fonts.mjs`, `docs/fonts/*.png`, `tools/dev/efc/run-all.sh`, `shell.html` (sizes only).
- **Steps:** at 1280 by 720 and 1920 by 1080, open each screen (main menu, hideout, operator inventory, lobby, settings, summary,
  credits, raid HUD) and for every element with `font-family` containing Inter assert `scrollWidth <= clientWidth + 1` (no
  overflow). Fix overflow with `letter-spacing`, `font-size: clamp(...)` or `white-space` only. Save screenshots of the main
  menu, hideout and HUD in `docs/fonts/`.
- **Verify:** the new test passes; `test-ui.mjs`, `test-inventory-layout.mjs` pass.
- **Acceptance:** zero overflow at both sizes; three screenshots committed; ROADMAP C10 row set to done.

### C9-1. Movement state machine skeleton and transition table (S)

C9 is very large. Build it in small steps on one long-lived branch `codex/c9-omni`, one card per commit, each passing.

- **Read:** `src/efc/44-efc-omni.js` (30 lines), `src/07c-controller.js` lines 20 to 140 (`slideT`, `crouch`, `onGround`),
  `src/08-player.js` lines 300 to 360, `docs/omnimovement.md`, `tools/dev/efc/test-omni-sprint.mjs`.
- **Edit:** `src/efc/44-efc-omni.js`, `docs/omnimovement.md`, new `tools/dev/efc/test-omni-states.mjs`.
- **Steps:**
  1. Add `efcOmniState(entity)` that returns one of `stand`, `crouch`, `sprint`, `tactical`, `slide`, `air`, from the existing
     fields (`onGround`, `crouch`, `slideT`, `sprinting`, `efcTactical`). No new behaviour.
  2. Extend the table in `docs/omnimovement.md` with the planned rows for `dive`, `mantle`, `vault`, `prone`, `supine`,
     `side` and mark each `planned`. **Owner:** the keys. Default proposal: dive = Crouch while sprinting and airborne, or
     Crouch double-tap while sprinting; prone = hold Crouch 0.4 s; roll to back = prone + Lean key held; mantle and vault =
     Jump facing waist-high geometry. Write the proposal as a question in the commit body.
  3. The test drives the existing transitions with `simRun` and asserts `efcOmniState` at each step.
- **Acceptance:** the test passes; nothing in gameplay changed (`test-omni-sprint.mjs`, `test-warden.mjs` pass).

### C9-2 to C9-8. Remaining omnimovement (M each, L for C9-8)

Use the same card shape. For each: read `44-efc-omni.js` and `07c-controller.js`, put new rules in `44-efc-omni.js` (or a new
`44a-efc-omni-prone.js` if the file passes 300 lines), call them from the controller with the smallest possible hook, gate
everything on `entity.isPlayer && efcRaidMode()`, and add a test that drives the transition in all eight directions.

- **C9-2 Dive:** forward impulse plus short airborne arc, lands into prone (after C9-4) or crouch (before it). Test: distance
  covered, lands without clipping, cooldown.
- **C9-3 Mantle and vault:** a forward ray at knee and waist height finds a ledge 0.5 to 1.2 m high; mantle onto it, vault
  over if the far side is free within 1 m. Test on a box placed in the test (do not edit the map). Collision: never end inside geometry.
- **C9-4 Prone:** eye height about 0.35 m, crawl speed about 0.9 m/s, collision capsule lowered, get up blocked under low ceilings.
- **C9-5 Prone turning:** turn 360 degrees with the camera while the body follows with a limit; roll to back and sides.
- **C9-6 Hit volumes:** `entEye`, chest and head helpers in `src/06b-soldier.js` (lines 520 to 560) use `crouchAmt` only;
  add the prone and supine shapes. Test with `rayEntities` from fixed angles. Wardens' hit tests must hit a prone player.
- **C9-7 Online:** add the stance to the player snapshot in `src/09c-net.js` (grep `crouchAmt` at lines 873 and 1084) and check
  the two-client rig (`net2.mjs`) shows the same stance.
- **C9-8 (C9b):** weapon held across the chest on the back, rolled on a side, aim limits, third person matches. Split into cards
  before starting: write the split in this file and get it reviewed.

#### Approved sequence for C9-8

C9-8a requires C9-7. Every later step requires the preceding step. C9-8 stays open until C9-8f passes.

1. **C9-8a. First-person prone.** Blend the equipped viewmodel into a low, body-relative hold on entry and back out on rise.
   Verify prone entry, crawl and rise with the same equipped weapon.
2. **C9-8b. First-person supine.** Hold the weapon across the chest while on the back. Verify automatic back rolls and return
   to prone in both turn directions.
3. **C9-8c. First-person side.** Pose the weapon for the existing left and right Lean controls. Verify hand placement and return
   to the underlying prone or supine pose on release.
4. **C9-8d. Aim limits and Alt free-look.** Use body-relative yaw and pitch limits while preserving free camera look.
   Hold either Alt key to turn the camera without changing the weapon direction. Verify the aim limits, yaw wrap,
   trigger handling and return to normal aim.
5. **C9-8e. Third-person poses.** Use the replicated stance and body yaw to mirror prone, supine, and both side poses.
   Verify that both clients see each pose and the return to standing.
6. **C9-8f. Verification.** Exercise a magazine rifle, a manually cycled rifle, and a pump through pose entry, limits, weapon
   changes and reset. Review first- and third-person captures for weapon visibility and hand contact, then close C9-8.

The owner approved the split and requested hold-Alt free-look.

### C2-1. Port Partisan's rail and compatibility rules (M)

The owner wants Partisan's modding rules to govern the Claudov workbench (`HANDOFF-ASTRA.md` A9, updated in `d02c3fb`). The
pure rule modules in Partisan need no three.js or DOM, so they can be ported as data and functions.

- **Read:** in the Partisan Project repository: `workbench/rails.js` (84 lines), `workbench/universal.js` (79),
  `workbench/stats.js` (116), and their unit tests in `tests/rails.test.mjs` and `tests/workbench.test.mjs`. In Claudov: `src/efc/19-efc-weaponmods.js`
  (`EFC_MOD_PARTS`, fit rules), `src/efc/18a-efc-partisan-parts.js`, `tools/dev/efc/test-weaponmods.mjs`.
- **Edit:** new `src/efc/19a-efc-partisan-rules.js`, new `tools/dev/efc/test-partisan-rules.mjs`, `NOTICE.md` (one line: code
  ported from Partisan Project, same owner), `run-all.sh`.
- **Steps:**
  1. Copy the logic of `rails.js` (`span`, `clash`, `clashing`, `candidates`, `resolve`, `fits`) into the new file as global
     functions named `efcRail<Name>` and the constant `EFC_RAIL_GAP`. Remove `import`/`export`. Keep the comments.
  2. Port `RULES` and `blockedBy` from `stats.js` as `EFC_PARTISAN_RULES` and `efcPartisanBlockedBy`.
  3. Port the matching unit tests from Partisan's `tests/rails.test.mjs` and `tests/workbench.test.mjs` into the new test, run inside the game page with
     `openGame({ noMap: true })`.
  4. Do **not** wire it into the workbench yet. That is a follow-up card; write its plan in your commit body (which calls in
     `19-efc-weaponmods.js` would use the new rules).
- **Verify:** new test passes; `test-weaponmods.mjs` still passes; base checks.
- **Pitfall:** Partisan uses +X as the muzzle axis; Claudov models use −Z (see `docs/weapon-port.md`). The rail functions work
  on one axis in metres, so they do not care, but say so in a comment.

### C2-2. Roster stats table and niche stats for batch 1 (S)

`EFC_PARTISAN_PROFILES` in `src/efc/18-efc-partisan-rifles.js` (lines 2 to 17) gives every Partisan rifle the stats of an
engine template scaled by one `impact` number. The spec wants each weapon to have a niche.

- **Read:** `src/efc/18-efc-partisan-rifles.js`, `src/06-weapons.js` (grep `ak47:`, `m4:`, `scarh:`, `svd:` for the template
  stats and their field names), `src/efc/20-efc-items.js` lines 45 to 70 (how weapons become items and values).
- **Edit:** new `docs/weapons.md`; `src/efc/18-efc-partisan-rifles.js`.
- **Steps:**
  1. Write `docs/weapons.md`: one table of every raid weapon (engine and Partisan) with calibre, magazine, fire rate, damage,
     recoil, weight, value and a one-line role. Use only the values the code has now.
  2. For AK-15K, AK-74M Zenitco, RPK, M16 and G3 propose changed values so each has a role no other weapon fills (for example
     RPK: heavy, 45-round magazine, slow to aim, low recoil when crouched). Add a "Proposed" column. **Owner:** final numbers.
  3. Change the profile tuple only for values already in it (magazine, fire rate, impact). Add a `recoil` or `ads` multiplier
     only if the engine weapon definition already has that field; do not invent new engine fields.
- **Verify:** `node tools/dev/efc/test-partisan-rifles.mjs`, `node tools/dev/efc/test-items.mjs`, base checks.
- **Acceptance:** table committed; changed values match the table.

### C2-3. One parametrised weapon test (S)

- **Edit:** new `tools/dev/efc/test-weapon.mjs`.
- **Steps:** with `WEAPON=<id>` (default `ak15k`): build the first-person and world models (`buildGunModel`, `buildWorldGun` as
  in `test-partisan-rifles.mjs`), equip it in a solo raid, fire a burst (magazine decreases), reload (magazine full, reserve
  lower), aim (ADS reached within the weapon's aim time), measure time to kill a standing Warden at 25 m with perfect aim
  (record it), mount one compatible part through `weaponmods` and assert the stats changed.
- **Verify:** `WEAPON=ak15k node tools/dev/efc/test-weapon.mjs` passes, and for `ak47` too.
- **Acceptance:** prints one JSON line with the measured numbers; add those numbers to `docs/weapons.md`.

### C2-4 to C2-8. One card per weapon (S each)

For each of `ak15k`, `ak74m`, `rpk`, `m16`, `g3`: run `test-weapon.mjs` with it; take one first-person screenshot aimed down
sights and one at hip into `docs/weapons/<id>-ads.png` and `-hip.png`; check that the sight line is centred (the front and rear
sight or optic sit on the screen centre within 4 px) and fix `info.mount` / `adsZ` in `efcPartisanBuild` for that weapon only if
not; confirm the thumbnail exists (`test-thumbs.mjs`); confirm it appears in a loot table and which hostiles carry it
(`src/efc/24-efc-loot-tables.js`). Update `docs/weapons.md`. Set the ROADMAP C2 row to done after the fifth.

---

## 6. Later tracks (split into cards before starting)

Each item below must be split into cards of the shape above (XS to M, exact files, steps, verify, acceptance) before a Codex
Sol agent starts it. A planning agent writes the split into this file first.

### C15-1. Minimal raid HUD option (S)

- **Read:** `docs/HANDOFF-CODEX.md` (C15), `shell.html` (ammo and HUD selectors), `src/09e-menus.js` (Interface options),
  `src/efc/50-efc-ui-raid.js` (UI init and raid events), `src/efc/10-efc-raidhud.js` (read-only DOM contract), and `i18n/en.txt` (Interface).
- **Edit:** `shell.html`, `src/09e-menus.js`, `src/efc/50-efc-ui-raid.js`, `i18n/en.txt`,
  and new `tools/dev/efc/test-minimal-hud.mjs`.
- **Steps:** Add a persisted `efcHudMinimal` option, enabled by default, and apply it to the existing raid HUD. Hide weapon
  name, magazine pips, current rounds and reserve rounds. Keep grenades and combat, health and interaction cues. Show the
  extracts list while extracting or while the tactical map is open. Test default, toggle, persistence and scope across match types.
- **Verify:** `node tools/dev/efc/test-minimal-hud.mjs` and base checks.
- **Acceptance:** Ammo and weapon name are hidden in a default raid. The checkbox restores the full HUD immediately and persists.
  Non-raid HUDs keep their current presentation.

### C15-2. Separate tap reload from hold magazine check (S)

- **Read:** `src/08-player.js` (key handling and player tick), `src/efc/10-efc-weapon-check.js` (C1 lifecycle),
  `src/efc/50-efc-ui-raid.js` (read-only capture behavior), `src/07c-controller.js` (read-only reload API),
  and `tools/dev/efc/test-inventory-keys.mjs`.
- **Edit:** `src/08-player.js`, new `src/efc/10-efc-raid-magcheck.js`, and new `tools/dev/efc/test-magcheck.mjs`.
- **Steps:** Hold the bound Reload key for 0.30 s in a playable raid to enter a local magazine-check state. Tap release still
  invokes the normal reload. End the check on release or interruption. Clear pending input when gameplay loses focus, a raid
  panel takes keyboard input, or the current weapon changes. Keep the existing non-raid and non-keyboard reload behavior.
- **Verify:** `node tools/dev/efc/test-magcheck.mjs`, `node tools/dev/efc/test-inventory-keys.mjs`, and base checks.
- **Acceptance:** A tap reloads and a hold never reloads. Repeats, blocked input, firing, ADS, sprinting and switching clear or
  suppress the check as appropriate. The held check leaves loaded and reserve ammunition intact.

### C15-3. Magazine check pose and ammo readout (M)

- **Owner decision (27 November 2026):** default to rough counts, with exact counts selectable.
- **Read:** `src/efc/10-efc-weapon-check.js`, `src/efc/10-efc-raid-magcheck.js`, `src/06d-reload.js` (existing handling
  choreography), `src/09e-menus.js` (Interface options), `src/efc/50-efc-ui-raid.js` (HUD events), `shell.html` (HUD), and `i18n/en.txt`.
- **Edit:** `src/efc/10-efc-raid-magcheck.js`, `src/efc/10-efc-weapon-check.js`, `src/06d-reload.js`, `src/09e-menus.js`,
  `src/efc/50-efc-ui-raid.js`, `shell.html`, `i18n/en.txt`, and `tools/dev/efc/test-magcheck.mjs`. Keep the choreography in the existing viewmodel hook and the setting and markup in the UI.
- **Steps:** Reuse the C1 and reload poses to open, hold and return the weapon. Handle detachable, fixed, tube and drum
  magazines. Add the selectable count style and show a small readout while the check is held. Account for the chamber
  separately where modeled. Test the output and the pose through cancellation and release.
- **Verify:** `node tools/dev/efc/test-magcheck.mjs`, `node tools/dev/efc/test-weapon-check.mjs`, and base checks.
- **Acceptance:** The pose and readout describe the actual magazine. The visual clears when the check ends and leaves the
  weapon ready for normal handling.

### C15-4. Replicate magazine checks and document the HUD (M)

- **Read:** `src/efc/10-efc-raid-magcheck.js`, `src/efc/10-efc-weapon-check.js` (remote event and pose),
  `src/06b-soldier.js` (remote pose), `src/06-weapons.js` (world-gun meshes), `src/06d-reload.js` (first-person framing), `src/09c-net.js` (event encoding),
  and `tools/dev/efc/test-weapon-check-net.mjs`.
- **Edit:** the magazine-check and existing weapon-check modules, `src/06b-soldier.js`, `src/06-weapons.js` (the magazine
  is currently baked into the remote gun mesh), `src/06d-reload.js`, new `tools/dev/efc/test-magcheck-net.mjs`, `docs/hud.md`, and `docs/hud/` screenshots.
- **Steps:** Use the existing weapon-check event and pose path to replicate start and end, including interruption. Verify
  playback on both clients. Document field visibility, controls and the count setting. Capture first-person checks for a
  rifle, pistol and pump shotgun.
- **Verify:** `node tools/dev/efc/test-magcheck-net.mjs`, `node tools/dev/efc/test-weapon-check-net.mjs`, and base checks.
- **Acceptance:** A second client sees the check pose and its cleanup. The HUD documentation and three screenshots are committed.

- **C11 Map and flares** (after C15): reuse `drawTacMap` (`src/08b-killstreaks.js` line 406) and `drawMinimap`
  (`src/09-game.js` line 248). Cards: (1) `M` opens a full-screen canvas map with player and extracts; (2) zoom, pan, legend,
  keyboard; (3) flare columns per open extract.
- **C12 Dirty lens:** blocked until the owner adds the reference image (see findings). The lab shader to start from is
  `src/efc/47-efc-artlab-fx.js` (lens dirt at line 83).
### C13-1. Audit weapon foley and write the generation shot list (S)

- **Read:** `docs/HANDOFF-CODEX.md` (C13), `docs/audio-events.md`, `docs/handling-foley.md`, `src/efc/45-efc-sounds.js`
  (take banks and lookup), and the weapon-foley entries in `assets/sfx/credits.json`.
- **Edit:** `docs/weapon-foley-shot-list.md`.
- **Steps:** Audit each supported weapon family and applicable action, identify which credited takes can be reused, and
  list what is missing to meet four distinct takes per pairing. Specify generation batches, counts, names and prompts so
  the owner can run them if the connector is unavailable. Highlight shared pools and any new event hooks separately.
- **Verify:** Check family and action coverage against the source inventory and recalculate the generation total.
- **Acceptance:** The shot list is ready to record. Generation requires the ElevenLabs Sound Effects connector.

**C13-2 through C13-5:** The owner approved the ElevenLabs budget on 25 November 2026. Generate C13-1's missing takes, log
credits used per batch, edit and level with `tools/sfx/` and `tools/build_sfx.py`, map the banks and extend `#sounds`, then
verify with `test-sounds.mjs`. Add exact card files and checks before each stage starts. Without the connector, hand off
the shot list after C13-1.

- **Batch A pilot edit files:** `tools/sfx/weapon_foley.py`, `tools/build_sfx.py`, `assets/sfx/weapon_foley/`, `assets/sfx/credits.json`, and the shot list. Verify decoded attack, active RMS, peak, duration and credits before mapping.
- **Batch A pilot mapping files:** `src/05a-sfx.js`, `src/efc/45-efc-sounds.js`, `src/efc/45-efc-sounds-audition.js`, `tools/dev/efc/test-sounds.mjs` and the shot list. Verify that the three clips play in order on rifle reload, including the scheduled slap delay, and that incomplete or missing banks fall back during normal play.
- **C3, C4 to C8 and C14** are split into cards in section 7.

## 7. Later tracks as cards (planned 26 November 2026)

Specs: `HANDOFF-CODEX.md` C3 to C8 and C14. Every card below follows sections 0 and 1: one branch per card, push after each
step, `docs/SOL-PROGRESS.md` updated. **Before editing any engine file (`src/0*.js`) or another package's file, check
`docs/contracts/CONTRACT.md`; if the file is owned elsewhere, stop and report the change you need.** Gate every behaviour
change behind `efcRaidMode()` so other engine modes stay as they are. Browser tests here take 5 to 15 minutes each: run the
card's own test, not the whole suite. **Telegraphing rule (owner): every new enemy or AI action in C3 to C8 and C14 calls
`efcBark` (C16) before it acts, adds its kind and captions to `EFC_BARKS`, and its scenario test checks the 0.6 s lead.**

Facts found while planning (so you do not have to look again):

- All 14 Partisan rifles, including MK14, SPEAR, PPSh-41, Bren and Chauchat, are already in raids with placeholder numbers:
  `EFC_PARTISAN_PROFILES` in `src/efc/18-efc-partisan-rifles.js` (lines 2 to 17: id, model, engine template, magazine, rpm,
  impact).
- The 41 Partisan parts are data in `assets/raid-models/partisan-parts.json`, made by `tools/dev/efc/prepare-partisan-raid.mjs`
  and loaded by `src/efc/18a-efc-partisan-parts.js` (slots, effects at lines 26 to 37). The GP-25 (`pee7ec90cb`, slot foregrip)
  and the bipod (`p35123218a`) exist as parts but have no behaviour beyond the `ads` and `bipod` effect flags.
- Loot tables: `src/efc/24-efc-loot-tables.js` (`EFC_LOOT`, entries `[weight, id, min, max]`; `P:common`, `P:all` roll parts).
- Bot budget: `efcWardenNumber` (`src/efc/00-efc-core.js` line 98); Scavengers take their slots in `efcWardenAssign`
  (`src/efc/40-efc-wardens.js` lines 35 to 59) through `scav:count`, `scav:assign`, `scav:spawn`, `scav:spawned`
  (`src/efc/43-efc-scavengers.js`, hooks in `src/07-bots.js` line 111 and `src/09c-net.js` line 747). Copy this pattern.
- Engine AI: `src/07-bots.js` (grenades: `spawnNade` line 434, `botThrowNade` line 514), `src/07b-tactics.js` (`findCover` 42,
  `flankPoint` 79, `decideTactic` 146, `updateBot` 205, `suppressAlongRay` 564). Elite post: Warehouse A
  (`src/efc/60-efc-claudov-plan.js` line 134; mezzanine 139; crane platform 94).
- Online tests: `tools/dev/efc/net2.mjs` (two-client rig), `test-net.mjs`, `test-e2e-net.mjs`.

### C16. Enemy combat barks (after C9; telegraphing is a core rule)

Spec: `HANDOFF-CODEX.md` C16. New file `src/efc/45b-efc-barks.js` holds the logic; captions go in a new
`src/efc/50-efc-ui-barks.js`; check `docs/contracts/CONTRACT.md` before touching `07*.js`.

- **C16-1. Bark events, catalogue and rules (S).** A data catalogue `EFC_BARKS`: kind → `{ lead, cooldown, priority, range,
  captions: [English lines] }` for at least `spot`, `lost`, `flank_left`, `flank_right`, `frag`, `flash`, `smoke`, `suppress`,
  `reload`, `move_up`, `fall_back`, `help`, `man_down`, `search`, `all_clear`. A host function `efcBark(bot, kind, data)` that
  applies the per-bot cooldown (default 4 s), per-kind cooldown, range (default 45 m from any human) and priority (a grenade
  warning is never dropped), then emits `efcEmit('bark', { id, kind, line, voice, pos, at })`. Voice group from the bot
  (`w` Wardens, `s` Scavengers, later specials). Test `test-barks.mjs` part 1 (logic, no rendering): cooldowns, range,
  priority, deterministic line choice with a seeded rng.
- **C16-2. Captions (S).** On `bark`: a short caption anchored over the speaker's head when on screen (project with the camera),
  otherwise a line in a small caption feed with a direction arrow; 2.5 s each, at most three visible, oldest out first. A
  setting `efcBarkCaptions` (on by default) in the raid settings; reduced motion means no slide or fade. English lines need
  their `⇒ =` entries in `i18n/en.txt` if they are in `shell.html`. Test: a bark shows a caption; off-screen shows the arrow;
  setting off hides both; one screenshot to `docs/barks/captions.png`.
- **C16-3. Hook into the existing AI with lead time (M).** Call `efcBark` from raid-mode hooks, each **before** the action by
  the kind's `lead` (at least 0.6 s): `spot` from `efcWardenAlert` (`src/efc/40-efc-wardens.js` line 220); `flank_*` where
  `decideTactic` sets `tactic = 'flank'` (`src/07b-tactics.js` line 198: delay the path start by the lead); `frag`, `flash`,
  `smoke` in `botThrowNade` (`src/07-bots.js` line 514: bark, then throw after the lead); `reload`; `suppress` near
  `suppressAlongRay`; `man_down` on a teammate's death; `search` from `botSearchStart`. Scavengers use their own voice group.
  Test part 2: per kind, the bark time precedes the action time by at least 0.6 s in a scripted scenario.
- **C16-4. Invented language and script (S, docs).** `docs/barks.md`: the language rules (a small syllable set, stress,
  two or three recurring "words" per meaning so players learn them, e.g. one word always means grenade); 4 to 6 variants per
  kind per voice group; three voice groups (Wardens, Scavengers, specials); file naming `bark_<group>_<kind>_<n>`; total
  generations expected. Must be our own invented syllables, not copied from any game. **Owner:** approve the sound of a
  sample sheet (five lines) before C16-5 spends credits.
- **C16-5. Record with ElevenLabs (M).** Through the ElevenLabs connector: pick voices with `creative_list_voices` (one per
  group, say which), generate each line of the script (one take each, `generations_count` 1), download, keep the raw takes in
  `assets-incoming/barks/` (not committed). Log credits per batch in the commit body and in `docs/barks.md`. An agent without
  the connector stops here and hands the script to the owner.
- **C16-6. Radio processing and packaging (S).** Offline chain with the existing audio tools (`tools/build_sfx.py`,
  `tools/sfx/`): trim, level, band-pass about 300 Hz to 3.4 kHz, light saturation, a squelch click at start and end; package
  into the game's sfx format; add each file to `assets/sfx/credits.json` as our own ElevenLabs generation (keep the file's
  existing entries intact). Test: `build.py` lists them; sizes within the sfx budget.
- **C16-7. Playback (S).** On `bark`: play a random variant for the group and kind, positional (`src/05-audio.js` panner
  pattern, line 112) within range, one line per bot at a time, grenade warnings never ducked. Add the lines to the `#sounds`
  audition page. Test in `test-sounds.mjs`: a bark plays its sample; a second bark from the same bot inside the cooldown does
  not.
- **C16-8. Online and closing (S).** Host decides barks; replicate the `bark` event to guests through the net bus; guests show
  the caption and play the line. Test with `net2.mjs`: the guest receives the same bark kind and line. Close C16 in
  `ROADMAP.md` once C16-13 is done too.

**Execution of a downed player (C16-9 to C16-13).** Owner's request: a hostile walks up to a downed player, taunts ("Got you,
you bastard."), draws a pistol, says a last line ("You had a good run, meatbag.") and fires the finishing shot. Telegraphed
like every action: from the first line to the shot at least 4 s, which is the teammates' window. Add the kinds
`execute_taunt` and `execute_final` to `EFC_BARKS` (captions: the owner's two lines plus three variants each in the same
tone; the voice is the invented language) and their lines to the C16-4 script.

- **C16-9. Downed state (M).** Needs C9-4 (prone pose). New `src/efc/23a-efc-downed.js`, raid mode only, host decides. Damage
  that would kill a human player sets `efcDowned = { since, by }` instead, health stays at 1; headshots still kill at once
  (one-shot rule). Downed: prone pose, crawl at a fifth of walk speed, no firing, no inventory; bleed out after
  `EFC.cfg.downedBleed` (30 s) through the normal death path (`efcEmit('died', …)` in `src/09-game.js` line 131). Further
  damage while downed kills. **Owner** defaults to confirm: 30 s bleed-out, no shooting while downed, solo players go down too.
  Test `test-downed.mjs`: lethal body shot downs, headshot kills, bleed-out kills at 30 s, no shots fire while downed.
- **C16-10. Revive (S).** A squadmate within 1.5 m holds the interact key 5 s to revive (back to 25 health); moving or
  taking damage cancels. Host decides; replicated. Test with `net2.mjs`: the guest revives the host's downed player.
- **C16-11. Execution (M).** When a human is downed and a hostile sees them with no other human within 15 m of the downed one,
  the nearest such hostile becomes the executioner (one at a time per downed player; Wardens and Scavengers, later specials
  too). It: barks `execute_taunt` and walks (not runs) to 2 m; stops, switches to a pistol (`WEAPONS.m9` and
  `setSoldierGun`, as Scavengers do in `src/efc/43-efc-scavengers.js` line 19); barks `execute_final`; waits 1.5 s; fires one
  shot that kills (through the normal damage path, so a dead downed player counts as killed by that hostile). It gives up and
  goes back to fighting when it takes damage, when another human comes within 15 m, or when the player is revived. Test in
  `test-downed.mjs`: barks in order, at least 4 s from the first bark to the shot, the shot kills, each abort condition
  works.
- **C16-12. The downed player's view (S).** While downed: the camera low, a slow heartbeat and a darkened edge (no flashing;
  reduced motion keeps it static), the bleed-out time as a thin bar, and the executioner's captions shown large so the player
  reads them. One screenshot to `docs/barks/execution.png`.
- **C16-13. Online and closing (S).** Host runs the sequence; guests see the walk, the draw and the captions and hear the lines;
  a guest can interrupt it by shooting the executioner or reviving. `net2.mjs` test for both. Close C16 in `ROADMAP.md`.

### C3. Remaining modern weapons and parts (after C13)

- **C3-1. Parts gap list (XS, docs only).** Read `assets/raid-models/partisan-parts.json` (ids, slots, names) and the Partisan
  repository's weapon assets (`vincentdn/partisan-project`, `assets/models/weapons/` and `assets/register.json`). Write
  `docs/weapon-parts.md`: one table of parts in the game, one of parts in Partisan but not here (expected: ZF4 scope, AK side
  rail, iron sight set, G3 drum; confirm each). Acceptance: both tables, with the Partisan file path for each missing part.
- **C3-2. MK14 and SPEAR numbers (S).** Needs C2-2 and C2-3. Add their rows to the roster table in `docs/weapons.md` with the
  niche reasoning, change only their entries in `EFC_PARTISAN_PROFILES` (and their stats where C2-2 put them), add both to the
  C2-3 parametrised test. Verify: that test, `test-partisan-rifles.mjs`, `test-thumbs.mjs`.
- **C3-3. Import missing parts, batch of up to three per card (M).** For each part from C3-1: extend
  `tools/dev/efc/prepare-partisan-raid.mjs` to include it, regenerate `partisan-parts.json`, check its triangle count against the
  existing parts (the K4 rule in `test-thumbs.mjs`: at most 5,000 for `part_p…`), and set its `models` list to the rifles it
  physically fits. Verify: `test-weaponmods.mjs`, `test-thumbs.mjs`, the workbench mounts it on one rifle (screenshot).
- **C3-4. Parts in loot by quality (S).** Split the part pool into common, uncommon and rare in `24-efc-loot-tables.js`
  (for example `P:common`, `P:uncommon`, `P:rare`; scopes, suppressors, drums rare), use them in `crate` and `weapons`. Add a
  seeded check to `test-items.mjs` or a new `test-loot-parts.mjs`: over 2,000 seeded rolls each tier appears and rare is under
  5 %. **Owner:** the exact rare list if unsure.
- **C3-5. GP-25 fires (M).** With the GP-25 mounted, a key (propose `B`; check `src/08a-binds.js` for a free one) launches a
  grenade along the aim with `spawnNade(owner, p, v, fuse, 'frag')` and an impact fuse (a new flag on the nade, handled in the
  nade update in `src/07-bots.js` near line 545: explode on first contact). One round loaded, reload from a new item
  `ammo_vog` (`src/efc/20-efc-items.js`). Offline only in this card. Test: `test-gp25.mjs` mounts it, fires, the nade explodes
  on contact within 2 s, the round is spent, reload needs `ammo_vog`.
- **C3-6. GP-25 online and loot (S).** The host spawns the grenade (host authority); guests see it through the existing nade
  replication (find it with `grep -n "nade" src/09c-net.js`). `ammo_vog` goes in the `weapons` table (rare). Test: extend
  `test-gp25.mjs` with `net2.mjs`: the guest's launch explodes on both clients.
- **C3-7. Fit audit (S).** One test, `test-part-fit.mjs`: for every part and every rifle, `efcCall('weaponmods:fit', …)` agrees
  with the part's `models` list; print a matrix to `docs/weapon-parts.md`. Close C3 in `ROADMAP.md`.

### C4. Marksman, Breacher, Heavy (after C3)

- **C4-1. Special budget (S).** New `src/efc/43a-efc-specials.js`, copying the Scavenger hooks: `special:count`(budget, map) →
  `{ marksman, breacher, heavy }`, taken out of the Warden number (Claudov: one each when the budget allows; other maps at most
  one special); `special:assign`, `special:spawn`, `special:spawned`. In `efcWardenAssign` take the special slots after the
  Scavenger slots (one-line change; check ownership first). Squad values `m`, `b`, `h`. Test `test-specials.mjs` part 1: 20 raid
  starts per map, counts within budget, total bots unchanged.
- **C4-2. Looks and loadouts (S).** Per type: weapon (Marksman: `svd` or the Partisan `mk14`; Breacher: `rem870`; Heavy: `rpk`,
  Bren comes in C14), `skin` through `soldierLook` (find the skin list with `grep -n "skin" src/06ga-tenues.js | head`),
  armour (`dmgMul`, like Scavengers' 0.45, but Heavy around 1.6 health equivalent), name pools in English. Contact sheet of
  the three at `docs/enemies/looks.png` (`tests/e2e/contact-sheet` pattern or `test-thumbs` capture). **Owner:** looks sign-off.
- **C4-3. Loot per type (S).** `EFC_LOOT.marksman`, `.breacher`, `.heavy` (Heavy drops the best: armour t3 chance, rare parts);
  bodies use them through `world:body`. Seeded test as in C3-4.
- **C4-4. Marksman perches and relocation (M).** Barks: `relocate` before moving, `spot` with a long lead. A list of 4 to 6 perches on Claudov (crane platform, Warehouse A mezzanine,
  container stacks; positions from `60-efc-claudov-plan.js`, checked walkable with `navNode`) in the specials file. The
  Marksman holds a perch, fires, and after its second shot moves to another perch out of the target's sight. Test: scripted
  scenario, after two shots its perch index changes and the new perch has no line of sight to the shooter's last target.
- **C4-5. Marksman glint (S).** While it aims at a player in daylight, a small additive sprite at its scope is visible to that
  player only (client-side visual, no gameplay effect). Test: flag set while aiming at the player, off otherwise; one
  screenshot. Respect the Art Lab lens settings if they affect sprites.
- **C4-6. Breacher (M).** Barks: `breach` and `flash` before entering. Guards one building interior (Warehouse A or B box from the plan file). Pushes when it hears
  footsteps inside its building (use the engine's hearing input: `grep -n "hear\|bruit\|step" src/07-bots.js | head`), not for
  gunfire outside. Throws `flash` with `botThrowNade` before entering the player's room. Test: footsteps inside → push within
  3 s; gunfire outside → stays; a flash is thrown before it crosses the doorway.
- **C4-7. Heavy (M).** Barks: `suppress` before the burst. Slow (speed multiplier), armoured, posted on the elite loot in Warehouse A; on contact it fires bursts at
  the player's last cover point with `suppressAlongRay` for 3 to 5 s. Test: player behind cover → the Heavy keeps firing at the
  cover point (shots counted, no line of sight needed).
- **C4-8. Close C4 (S).** `docs/enemies.md` (rules, counts, loot), the 20-start count test across all maps passes, all P1
  tests still pass (one-shot rule, insertion grace, spawn distances: `test-warden.mjs`, `test-raid.mjs`, `test-spawns.mjs`).

### C5. AI behaviour upgrade (after C4)

Every card: behind `efcRaidMode()`, numbers before and after in `docs/ai.md`, P1 tests still pass.

- **C5-1. Scenario harness and baseline (M).** `tools/dev/efc/test-ai-scenarios.mjs` with a small scenario API (place player
  and bots, freeze or script the player, run N seconds with `simRun`, return metrics). Baseline table in `docs/ai.md`: time to
  kill the player and bot survival per enemy type at two difficulties, 10 seeded runs each.
- **C5-2. Suppress and flank pair (M).** Barks: one says `suppress`, the other `flank_*`, both before acting. When two bots of one post engage, one takes `tactic = 'flank'` (`flankPoint`) and the
  other suppresses (`suppressAlongRay`) until the flanker arrives. Scenario: two Wardens vs a player in cover: one flanks,
  one suppresses, in 8 of 10 runs.
- **C5-3. Cover discipline (M).** Reload and heal only in cover (`findCover`); leave cover only when a teammate is covering.
  Scenario: a bot with an empty magazine moves to cover before reloading in 9 of 10 runs.
- **C5-4. Grenade flush (S).** Bark `frag` first (never dropped). A player who stays in one cover for over 8 s gets a frag (`botThrowNade`), never when a teammate
  is within 6 m of the landing point. Scenario for both rules.
- **C5-5. Investigation (M).** On a shot heard or a container or body that changed (`world:changed`), go there with caution,
  search (`botSearchStart`), give up after 30 s. Scenario: a shot fired out of sight → a bot reaches within 5 m of its origin.
- **C5-6. Retreat and call for help (S).** Barks `fall_back`, `help`. Outnumbered or under 35 % health → fall back to the post and alert the post
  (`efcWardenAlert`). Scenario.
- **C5-7. Loot awareness (S).** On the next patrol pass, a bot that passes an opened container or a missing body near its post
  switches to investigation. Scenario.
- **C5-8. After table (S).** Re-run the C5-1 baseline; write the after columns and what changed; P1 tests pass. Close C5.

### C6. Rival raider squads (after C5)

- **C6-1. Slots and setting (M).** New `src/efc/43b-efc-rivals.js`. Setting `efcRivals` 0 to 2 (default 1 on Claudov,
  0 elsewhere) next to the other raid settings; rivals take bot slots like specials (out of the Warden number; **owner** if
  that should be on top instead). Squad values `r1`, `r2`, hostile to everyone. They insert at a free insert after the humans
  (`raid:inserts`). Test: counts and insert positions over 20 starts.
- **C6-2. Route plan (M).** Rivals get their own voice group and barks (`loot`, `extract`, `contact`). Per squad: a route of 3 to 5 loot points (containers from `world:list`) ending at an open extract;
  re-plan when threatened or when bags are full. Pure data function first, tested without rendering.
- **C6-3. Looting (M).** Rivals take items through the host world (`world:take` with the rival as actor) into a bot inventory
  (`inv:new`); visible kit updates when they pick up armour or a better weapon. Test: container contents drop, rival inventory
  grows.
- **C6-4. Extract and death (S).** On reaching an open extract before the timer they vanish (as players do); on death the body
  holds everything carried (`world:body`). Test both.
- **C6-5. Bot-only raids (M).** `test-rivals.mjs`: 10 seeded bot-only raids (minutes: 60 setting, fast stepping): rivals extract
  in at least half, none stuck for over 20 s (position sampling), Warden numbers unchanged.
- **C6-6. Online (S).** Host simulates rivals; `net2.mjs` shows them on both clients with matching kit. Close C6.

### C7. Optimisation, part 1 (after C6)

- **C7-1. Baseline (S).** With the A1 route (`#bench`, `src/efc/48-efc-bench-route.js`): draw calls, triangles,
  `renderer.info.memory`, and host tick CPU time with all bots awake. Table in `docs/perf.md` ("before", this sandbox; note it
  is software rendering).
- **C7-2. Far bots sleep (M).** Hostiles farther than a set distance from every human update at a lower rate and skip
  pathfinding; wake on noise, damage or proximity. Test: a sleeping bot wakes within 0.5 s of a shot heard; tick time drops.
- **C7-3. Static merge (M).** Merge static map geometry per material per chunk where the kit does not already
  (`src/efc/60-efc-claudov-kit.js`, `30-efc-worldmesh.js`). Draw calls before and after; screenshots before and after must look
  the same.
- **C7-4. Level of detail (M).** Containers, props and bodies get a low level beyond a distance, behind the quality setting.
- **C7-5. Closed panels cost nothing (S).** Thumbnails and the operator view do no rendering while their panel is closed
  (count renders with a spy). Test.
- **C7-6. Memory soak (S).** 20-minute bot-only raid (stepped): JS heap, geometries and textures flat within 5 %.
- **C7-7. Report (XS).** "After" columns in `docs/perf.md` and the list of what still needs the owner's GPU numbers.

### C8. Raid balance (after C7)

- **C8-1. Balance runner (M).** `tools/dev/efc/balance.mjs`: N seeded raids with rival squads standing in for players; prints
  median raid length, survival rate, value extracted per raid. Runs in the background; writes a JSON summary.
- **C8-2. Baseline (XS).** `docs/balance.md` with the targets (median 8 to 15 min, survival 30 to 50 %, a full kit replaced in
  about three successful raids) and the current numbers.
- **C8-3 to C8-6. One knob group per card (S each):** (3) Warden lethality and reaction, (4) loot weights and item values,
  (5) raid length and extract opening times, (6) starter kit. Data only (`EFC.cfg`, loot tables). Each card: before and after
  numbers in `docs/balance.md`. Anything that is taste (how punishing death feels) is an **owner** question, not a tweak.

### C14. Second World War weapons (after C8 and C9-4)

- **C14-1. Roster rows (S).** PPSh-41, Bren, Chauchat (and the plain StG 44 if it differs from `stg44classic`) in
  `docs/weapons.md` with the reasoning: period pieces, rare, priced to match. Update their `EFC_PARTISAN_PROFILES` entries.
- **C14-2. Where they are found (S).** A `collector` loot table for an armoury cage and a collector's locker (new container
  placements on Claudov, host-rolled) and the Heavy's Bren (C4-7). Seeded loot test.
- **C14-3. Light machine gun handling (S).** Bren and Chauchat: heavy, slow to aim (data in their weapon entries). Add them to
  the C2-3 parametrised test.
- **C14-4. Bipod (M).** Needs C9-4 (prone). With the bipod part (`p35123218a`) or a built-in bipod, the gun deploys on a ledge
  in front of the player or when prone: recoil much lower, turn limited. Test: deployed on a ledge and prone, recoil below a
  threshold; not deployed in the open.
- **C14-5. Close C14 (XS).** Thumbnails, roadmap, `docs/weapons.md` complete.
