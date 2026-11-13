# Escape From Claudov

An extraction shooter played in the browser, on desktop. Pick a loadout from your stash, insert into the sealed port town of
Claudov alone or as a squad of up to three, fight the Wardens and other squads, loot bodies and containers, and reach an extraction
point before the raid timer runs out. What you carry out is yours. If you die, it stays on your body for someone else.

Status: vertical slice in progress. See [docs/PLAN.md](docs/PLAN.md).

## Build and play

Python 3 is enough (Node is used only for a syntax check and the tests):

```bash
python3 build.py
```

Open `dist/index.html` in a recent desktop browser (Chrome, Edge, Firefox). `dist/` is build output and is not committed; pushing to
`main` deploys it to GitHub Pages (`.github/workflows/pages.yml`).

## Tests

```bash
node tools/dev/efc/smoke.mjs
```

Other checks are `tools/dev/efc/test-*.mjs`. They open the built game in headless Chromium (Playwright) and step the game logic.

## Code

- `src/*.js`: the inherited engine (French code and comments), joined in alphabetical order.
- `src/efc/*.js`: Escape From Claudov's own code (English), joined after the engine. Packages talk to each other only through
  `src/efc/00-efc-core.js`; the contract is [docs/contracts/CONTRACT.md](docs/contracts/CONTRACT.md).
- Agents: read [AGENTS.md](AGENTS.md).

## Credits and license

Built on the source code of [Riposte: Frontline 5.6.0](https://github.com/BenDBSS/Riposte-Frontline-Source), published by its author
under the MIT License (`LICENSE`). This is a separate game and is not the official Riposte: Frontline. What is not under the MIT
License, and what was removed for that reason, is listed in [NOTICE.md](NOTICE.md).
