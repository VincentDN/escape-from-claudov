# Handoff briefing for incoming agents

Written 17 November 2026 for agents joining after the first build. Read this file, then `AGENTS.md`. You are working on
**Escape From Claudov**, an extraction shooter that runs in the browser, built on the open-source engine of Riposte: Frontline.
Owner: Vincent De Nil. Live build: https://vincentdn.github.io/escape-from-claudov/

The tasks below were picked because each is small, has a clear finish line and a test that proves it. Do them in order unless the
owner says otherwise. Bigger work (section 6) is parked on purpose: do not start it.

**Current game mode:** extraction raids are the only playable mode. Old solo settings and lobby configurations requesting a classic mode resolve to Raid. Earlier package briefs describe the engine at the time they were written.

## 1. Before you start

- Branch from the current `beta` for task isolation. Name your branch
  `<agent>/<task-id>-<topic>`, for example `sol/t1-english-title`. One branch per task.
- Push verified work to `beta` for staging. Push or merge to `main` only with explicit owner permission. Open a pull request only if the owner asks.
- Commit style: `feat|fix|docs|chore|test(T<n>): subject`, and a body that says what you verified.

## 2. How the code is laid out

| Path | What it is |
| --- | --- |
| `src/*.js` | The inherited engine. **French** code and comments. Lines can be thousands of characters long: search with `grep`, read with `sed -n 'A,Bp' file \| cut -c1-400`, never dump a whole file. |
| `src/efc/*.js` | This game's own code, English. Joined after the engine. |
| `src/efc/00-efc-core.js` | The bus every module uses: events (`efcOn`, `efcEmit`), services (`efcProvide`, `efcCall`), network messages. Modules talk only through it. |
| `shell.html` | The page, menus and CSS. |
| `i18n/en.txt` | Translations. Every new visible French text needs an English line; every new **English** text in `shell.html` needs a line `Your text ⇒ =`. |
| `docs/contracts/CONTRACT.md` | Data shapes, services and events. |
| `docs/plans/2026-11-14-polish-pass.md` | The roadmap and what is done. |
| `docs/briefs/` | Briefs given to earlier workers; useful examples of the expected rigour. |
| `tools/dev/efc/` | Tests, harness and the full test runner. |

Everything is one global script: prefix every new top-level name with `efc` or `EFC`, and never declare a function name twice.

## 3. Build and test

Needs Python 3, Node 22, and Playwright with Chromium (`require('playwright')` must resolve; set `NODE_PATH` to your global
node_modules if it does not).

```bash
python3 build.py
```

```bash
python3 tools/dev/check_decl.py
```

```bash
python3 tools/dev/check_i18n.py
```

```bash
node tools/dev/efc/smoke.mjs
```

`build.py` must end with `style des textes : rien à signaler` and `check_i18n.py` with `0 erreur(s)`. The build writes
`dist/index.html`; open it in a desktop browser to see the game. `dist/` is not committed.

The full run is `bash tools/dev/efc/run-all.sh` (about 30 minutes). Each task below names the tests that matter for it; run
those, plus `test-ui.mjs` and `test-e2e.mjs`, before you push.

**Rendering is software-only in most cloud sandboxes, so real frames are very slow.** The tests step game logic without drawing
(`simRun` in `tools/dev/efc/harness.mjs`). Keep screenshots to a minimum and give each one a long timeout (two minutes).
One test, the Warden test's "parked player not seen" check, is known to be flaky.

## 4. Rules that are not negotiable

- **Never ship** the Riposte name or logo, its music, its Mixamo animations, or its original hit sound (`NOTICE.md`).
- **No asset of unclear origin.** Any new image, sound or font needs a source page that states its licence, recorded in the
  matching `credits.json`. If the terms are unclear, put the file in `outbound/rights-review/<source>/` with a
  `rights-review-sheet.csv` instead (see `AGENTS.md`). Never take files from search-engine results or from another game.
- **Original content only**: no names, maps, items or art copied from any existing extraction shooter.
- **Host authority**: loot, containers, extraction and bot state are decided by the host; never add client-only loot.
- **Desktop only**: keyboard and mouse. Do not break touch or gamepad, but do not build for them.
- Do not touch `CLAUDE.md`. `AGENTS.md` is the single source of instructions.

## 5. Tasks for this handoff

### T1. English page title and description (small)

The browser tab still reads "Escape From Claudov, FPS gratuit dans le navigateur" and the search and share descriptions are
French, about phones, inherited from Riposte.

- Files: `shell.html` (line 13 `<title>`, the `description` and `og:description` meta tags, the JSON-LD block near line 35),
  `i18n/en.txt` if the checker asks.
- Target: title `Escape From Claudov`; description along the lines of "Extraction shooter in the browser: insert, fight the
  Wardens and other squads, loot, and get out. Free, desktop." Keep the JSON-LD valid JSON (the build checks it).
- Done when: build and `check_i18n.py` pass, and the built `dist/index.html` has the new title.

### T2. The loot and inventory panels announce themselves (small)

The sounds module plays open and close foley when the UI emits `ui:panel`, and otherwise falls back to polling `ui:busy` every
tick. The UI never emits it.

- File: `src/efc/50-efc-ui-raid.js` only. Find where the inventory and loot panels open and close (`efcUirOpen`,
  `efcUirClose`) and emit `efcEmit('ui:panel', open, kind, containerId)` (open: true or false; kind: `'inv'` or `'loot'`;
  containerId: the container's id or null).
- Done when: `test-ui.mjs` and `test-sounds.mjs` pass, and a short check in a new `tools/dev/efc/test-panel-event.mjs` records
  one `true` and one `false` event for each panel kind.

### T3. The radio on the bench switches the menu music (small to medium)

The main menu is a 3D workbench with a radio (`src/efc/55-efc-bench*.js`). The music module already provides
`efcCall('music:nowPlaying')` (title, author, licence, on) and `efcCall('music:menu', on)` (switches the menu theme).

- Files: `src/efc/55-efc-bench-props.js` or `55-efc-bench.js` (where the radio is built), and its test `test-bench.mjs`.
- Behaviour: clicking the radio, or pressing Enter when it has keyboard focus, toggles the menu theme; the radio dial glows when
  music is on and is dark when off; hovering or focusing it shows a small label with the track title and author. It must be
  reachable by keyboard (a real focusable HTML element positioned over the radio is fine, as the menu already does for the
  phone screen). Respect `prefers-reduced-motion`.
- Done when: `test-bench.mjs` gains a check that a click on the radio flips `music:nowPlaying().on`, and passes; `test-music.mjs`
  passes.

### T4. Version 0.2.0 in the changelog (small)

`changelog.json` still has only 0.1.0. The game shows it in the menu footer and a "what's new" view.

- File: `changelog.json`. Add 0.2.0 dated the day you do it, above 0.1.0, with one change per line for what was added on
  14 and 15 November (read section "Status at the pause" at the top of `docs/plans/2026-11-14-polish-pass.md`: hidden spawns
  and fewer Wardens, weapon sounds, workbench main screen, thumbnails, Warden pace, leaning, music, free SKS loadout).
  Each entry needs French `x` and English `x_en`; the type `t` is `new`, `improved` or `fixed`.
- The build enforces a text style: no colon introducing an explanation (use a comma or a full stop), and a few other rules it
  prints when it fails. Make it print `style des textes : rien à signaler`.
- Done when: the build passes and the menu footer reads "Version 0.2.0".

### T5. A green full run (medium)

`tools/dev/efc/run-all.sh` has not been run end to end since the last four packages were merged.

- Run it. For each failure, decide whether the game or the test is wrong. Fix tests whose expectation is out of date (for
  example a count that changed on purpose) and explain each change in the commit body. If the game is wrong and the fix is
  under about 30 lines, fix it; otherwise stop and write up the failure in `docs/known-issues.md` (create it) with the test
  name, the output and your reading of the cause.
- Make the flaky Warden check deterministic (seed it, or park the player where no post can see it), without weakening what it
  proves.
- Done when: two consecutive full runs end with `ALL CHECKS PASSED`, or every remaining failure is written up.

### T6. Holster sound outside raids (small)

The weapon-switch holster sound only plays in raids, because it hangs off the raid-only `tick` event.

- Files: `src/07c-controller.js` (engine, French) at the point where a weapon switch begins, and `src/efc/45-efc-sounds.js`.
  Expose a function in the sounds module and call it from the engine with a guard (`typeof fn === 'function'`), so the engine
  still runs without the module.
- Done when: `test-sounds.mjs` gains a check that a weapon switch in a raid plays the holster event, and passes.

### T7. Raid-start weapon check (medium, stretch)

Specified as P9 in `docs/plans/2026-11-14-polish-pass.md`: for the first steps of a raid the player inspects the weapon (magazine
out and back, chamber check), cancelled at once by any input, ammunition unchanged. Only start this after T1 to T6 are pushed,
and read the plan section and the inspect choreography in `src/06d-reload.js` first. If it turns out to need changes to the
first-person hand system (`src/06f-hands.js`) beyond adding table entries, stop and write a short proposal in
`docs/briefs/P9-WEAPON-CHECK.md` instead of coding.

## 6. Parked: do not start

These need the owner's direction or a stronger setup: the grid inventory with the operator view, omnimovement, the weapon modder
and Partisan Project weapons, new enemy types and AI, the optimisation pass (needs measurements on a real GPU), squads in the
public-server lobbies (the server is not in this repository), and collision boxes for containers (the engine cannot remove a
collision box once added).

## 7. When you finish a task

Push the branch and leave a short note at the top of your last commit body: what changed, which tests you ran and their exact
result, what you did not verify, and anything you noticed that needs the owner. Keep the note factual; say plainly if something
failed.
