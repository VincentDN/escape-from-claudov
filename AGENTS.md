# Agent instructions - Escape From Claudov

Extraction shooter vertical slice built on the Riposte: Frontline 5.6.0 engine (three.js, browser, no bundler).
Owner: Vincent De Nil. The plan, work packages and ownership rules are in [docs/PLAN.md](docs/PLAN.md). Read it first.

## Hard rules

- **File ownership.** Each work package owns the files listed for it in the plan. Do not edit a file another package owns. Changes to
  engine files (`src/00-*` to `src/09-*`) go through the hook seams listed in the plan; if you need a new seam, ask the lead.
- **New code is English**, in `src/efc/` files named `NN-efc-<topic>.js`. The inherited engine stays French; do not translate it.
- **Global scope.** All `src/**/*.js` is concatenated into one script. Prefix every new top-level name with `EFC` or `efc`.
  `python3 tools/dev/check_decl.py` must pass (each function declared once).
- **Build and checks before every commit:** `python3 build.py`, then `node tools/dev/efc/smoke.mjs` once it exists.
- **Host authority.** Loot, containers, extraction and bot state are decided by the host and replicated. Never add client-local loot.
- **Not ours to ship** (see `NOTICE.md`): the Riposte name and logo, the Suno music, the Mixamo-baked soldier animations, the flashkit
  hit sample. Do not reintroduce a removed file. Keep `assets/sfx/credits.json` and `assets/tex/credits.json` intact.
- **Original content only.** Our own setting, map, factions, items and names. Do not copy maps, traders, item names, art or audio from
  any existing extraction shooter.
- Commit style: `feat|fix|docs|chore|test(WP-ID): subject`, with a body that says what was verified. No pull requests unless the owner asks.

## Agent instruction files (standing rule)

`AGENTS.md` is the single source of instructions for every agent. `CLAUDE.md` must always exist, stay blank of instructions, and only
defer to this file with the `@AGENTS.md` import. Never add rules to `CLAUDE.md`.
