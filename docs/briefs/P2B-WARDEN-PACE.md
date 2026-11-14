# Brief: P2b, Warden pace and posture

Read `docs/briefs/COMMON.md` first, then section P2b of `docs/plans/2026-11-14-polish-pass.md` (the specification). The real code,
including the P1 Warden-number and insert work, is in your worktree.

Owner's report: "wardens are also weirdly fast moving, they should move slower and much slower when idle / not aggro'd, in a
relaxed low ready pose".

You own: `src/efc/40-efc-wardens.js`, the `src/07*.js` engine files, `src/06b-soldier.js` and `src/06ac-loco.js` (soldier pose
and locomotion), new `src/efc/41-efc-warden-pose.js`, `EFC.cfg`, `tools/dev/efc/test-warden.mjs` and a new
`tools/dev/efc/test-warden-pace.mjs`. Another worker is adding leaning in the player and network files (`src/08-player.js`,
`src/09c-net.js`, `src/06f-hands.js`) and may add a lean to `src/06b-soldier.js`: keep your changes there small and local to
bot posture so the two merge cleanly.

Requirements
1. **Three states with their own pace**, numbers in `EFC.cfg`: idle (guarding, patrolling, walking back to post) about 1.3 m/s;
   alert (heard or was told something, searching) about 2.2 m/s; combat the engine's speeds times about 0.8, sprinting only to
   reach cover or to flank. Raid mode only; other modes keep the engine's speeds. Find where bot speed is decided (the controller
   and `updateBot`) and scale there, so path following, stopping distances and animation cadence stay consistent (feet must
   not slide: the step cycle follows the actual speed).
2. **Low-ready posture when idle**: weapon lowered and off the shoulder, muzzle down and forward, shoulders relaxed, head
   turning to scan independently of the body; a relaxed, slower walk cycle. Alert: weapon up at high ready. The change from idle
   to alert is a visible raise of about 0.4 s during which the Warden cannot fire; that is on top of the existing reaction time.
3. **Turning**: an idle Warden turns its head toward a stimulus first, then its body, at a calmer rate; combat turn rates are
   unchanged.
4. Guests see the same postures online (the state must reach the remote copy: check what the per-participant state publishes
   for bots and add the smallest field needed; if that requires a change in `src/09c-net.js`, make it minimal and say so).
5. **Tests**: `test-warden-pace.mjs` measures ground speed per state over scripted runs (idle patrol leg, alert search, combat
   advance) and asserts each within 15 percent of its number, that the step cadence scales with speed, that a Warden going from
   idle to alert does not fire during the raise, and that tdm speeds are unchanged. Update `test-warden.mjs` and
   `test-spawns.mjs` expectations where the slower pace changes timings (say what you changed) and keep them passing. One
   contact sheet under `/tmp` showing an idle Warden (low ready), an alert one and one in combat, side by side; look at it and
   fix what reads wrong.
