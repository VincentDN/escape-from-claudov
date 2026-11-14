# Brief: P4, the workbench main screen

Read `docs/briefs/COMMON.md` first, then section P4 of `docs/plans/2026-11-14-polish-pass.md` and the owner's answers below it.
All packages are merged: the real code is in your worktree.

**What the owner wants**: the main screen of this game should be the same scene that opens Partisan Project
(https://vincentdn.github.io/partisan-project/): an over-the-shoulder view of an AK lying on a workbench. Source, read-only, in
`/home/user/partisan-project` (same owner; do not edit it; do not read its `vendor/`, `node_modules/`, `docs/archive/`, and treat
`assets/` as binary): start from `index.html` and `shell.js` to see what loads first, then `intro/` (`index.html`,
`workbench.js`, `bench-hands.js`, `bench-motion.js`, `bench-actions.js`, `bench-session.js`, `bench-audio-cues.js`,
`bench-panel.css`) and `shared/bench-scene.js`. `docs/CODEMAP.md` there has one line per file. Work out exactly which scene is
the first thing a visitor sees and reproduce that one.

You own: `shell.html`, `src/efc/50-efc-ui-menu.js` (but not its raid map list, which another worker is changing: leave that
function alone), `src/09w-fond.js` (the engine's animated menu background), new `src/efc/55-efc-bench*.js`, and
`tools/dev/efc/test-bench.mjs`. Other workers are editing the audio, thumbnail, Warden and map files: do not touch
`src/05*.js`, `src/efc/45-*`, `src/efc/52-*`, `src/efc/50-efc-ui-hideout.js`, `50-efc-ui-raid.js`, `50-efc-ui-summary.js`.

Requirements
1. **Port the scene** to this engine: Partisan uses three.js r169 as ES modules, this game runs r147 in one global script
   (`THREE`), so port the code, do not copy the module structure. Render it with the game's existing renderer while the main
   menu is shown (see how `src/09w-fond.js` and the `frame()` loop in `src/09-game.js` draw the menu today); no second WebGL
   context. Room, table, lamp, props and camera framing as in Partisan, including its idle motion; respect
   `prefers-reduced-motion`.
2. **The rifle on the bench is this engine's own AK-47**, built by code (`buildWorldGun('ak47')` and the viewmodel builders in
   `src/06*.js`), not a model file from Partisan: no model, texture or HDRI file may be copied from Partisan unless its register
   (`/home/user/partisan-project/assets/register.json`) states CC0, and then record it in `NOTICE.md`. If Partisan's opener shows
   hands or arms, use this engine's first-person arms (`src/06f-hands.js`) or leave them out; say which.
3. **The flag** draped on the bench is a Claude flag drawn by code on a canvas texture: the word CLAUDE in the game's amber on a
   dark field with a simple emblem of your own design. Do not reproduce Anthropic's logo or any other real emblem.
4. **The menu on top**: the logo, the "a fork of Riposte" link under it, and the entries Raid, Squad raid, Hideout, Settings,
   Fullscreen, Credits and the version stay real HTML, fully keyboard and mouse operable with visible focus, laid out so the
   bench and the rifle stay visible (follow how Partisan's opener presents its own entry points; if it has none, keep the
   current left column over the scene with a soft scrim). Sub-screens (lobby, settings, hideout, raid setup) open over the
   dimmed, paused bench in their current style.
5. **Cost**: the menu must reach its first frame no later than about 0.5 s after today's menu on this machine, and hold the
   engine's menu frame budget; report triangles, draw calls and the two timings. Fall back to the current key-art background
   when WebGL is unavailable or the quality setting is the lowest.
6. **Test** `tools/dev/efc/test-bench.mjs`: the page boots to the main menu with the bench scene active and the AK on the
   table (object present, inside the camera frustum); every menu entry is reachable by keyboard and opens its screen; returning
   to the menu resumes the bench; starting a raid and coming back leaves no bench objects in the match scene and no leaked
   render state; `test-ui.mjs` still passes (update its expectations where the menu markup changed and say what you changed).
   Take up to four screenshots (the menu at 1280x720 and 1920x1080, a sub-screen over the bench, the reduced-motion menu) under
   `/tmp`, look at them next to a description of Partisan's opener from its code, fix what differs, and describe each. A menu
   screenshot is slow here (software rendering): allow two minutes each.
