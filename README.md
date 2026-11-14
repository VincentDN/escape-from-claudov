# Escape From Claudov

An extraction shooter played in the browser, on desktop. Pick a loadout from your stash, insert into the sealed port town of
Claudov alone or as a squad of up to three, fight the Wardens and other squads, loot bodies and containers, and reach an extraction
point before the raid timer runs out. What you carry out is yours. If you die, it stays on your body for someone else.

Status: vertical slice built and covered by automated tests, not yet play-tested by a person. See section 0 of
[docs/PLAN.md](docs/PLAN.md) for what works and what is not verified.

## Build and play

Python 3 is enough (Node is used only for a syntax check and the tests):

```bash
python3 build.py
```

Open `dist/index.html` in a recent desktop browser (Chrome, Edge, Firefox). `dist/` is build output and is not committed; pushing to
`main` deploys it to GitHub Pages (`.github/workflows/pages.yml`).

## Tests

```bash
bash tools/dev/efc/run-all.sh
```

It builds the game and runs every check (`tools/dev/efc/test-*.mjs`): each opens the built game in headless Chromium (Playwright)
and steps the game logic. `test-e2e.mjs` plays a whole solo raid; `test-e2e-net.mjs` plays one with two clients.

## Code

- `src/*.js`: the inherited engine (French code and comments), joined in alphabetical order.
- `src/efc/*.js`: Escape From Claudov's own code (English), joined after the engine. Packages talk to each other only through
  `src/efc/00-efc-core.js`; the contract is [docs/contracts/CONTRACT.md](docs/contracts/CONTRACT.md).
- Agents: read [AGENTS.md](AGENTS.md).

## Credits and license

Built on the source code of [Riposte: Frontline 5.6.0](https://github.com/BenDBSS/Riposte-Frontline-Source), published by its author
under the MIT License (`LICENSE`). This is a separate game and is not the official Riposte: Frontline. What is not under the MIT
License, and what was removed for that reason, is listed in [NOTICE.md](NOTICE.md).
