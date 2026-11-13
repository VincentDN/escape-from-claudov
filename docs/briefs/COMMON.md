# Rules for every work-package worker

You are a worker on Escape From Claudov, an extraction shooter built on the Riposte: Frontline browser FPS engine (three.js r147,
plain global-scope JavaScript concatenated by `build.py` into one page from `shell.html`). Your repository is your current working
directory, a git worktree. Work only there.

Read first: `AGENTS.md`, `docs/contracts/CONTRACT.md` (data shapes, services, events, the files you own), `docs/PLAN.md` sections 4
and 5, `src/efc/00-efc-core.js`, `tools/dev/efc/harness.mjs`, `tools/dev/efc/smoke.mjs`, then your own brief.

- The engine code and comments are French. Lines can be thousands of characters long: use Grep and
  `sed -n 'A,Bp' file | cut -c1-400`, never dump whole engine files.
- Other packages are written in parallel and are missing from your worktree. Reach them only through `efcCall` and events, cope
  with `undefined`, and register fake providers inside your test page only, never in `src`.
- Do not edit files you do not own. List any change you need elsewhere in your final report.
- New code is English, in `src/efc/`, top-level names prefixed `EFC` / `efc`, files under about 400 lines.
- Each function is declared once in the whole game: run `python3 tools/dev/check_decl.py`, and check whether it sees `src/efc`;
  if it does not, grep your new names yourself.
- Real rendered frames are extremely slow in this container (software rendering). Step game logic with `simRun` or `matchTick`
  and keep screenshots to the number your brief allows.
- Desktop only: keyboard and mouse. Do not break touch or gamepad elsewhere, but do not build for them.
- **Commit early and often** on the current branch of your worktree (work-in-progress commits are fine): a usage limit can stop you
  at any moment and uncommitted work may be lost. Message style `feat(<PACKAGE>): subject`; the last commit's body says what you
  verified. Do not push. Do not open a pull request.
- Before finishing: `python3 build.py`, `node tools/dev/efc/smoke.mjs`, your own test.

Final report, plain text: worktree path and branch name, last commit hash, the status of each requirement (done and tested / done
untested / not done), exact test results, and any change you need in files you do not own.
