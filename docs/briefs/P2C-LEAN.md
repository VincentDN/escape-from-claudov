# Brief: P2c, leaning

Read `docs/briefs/COMMON.md` first, then section P2c of `docs/plans/2026-11-14-polish-pass.md` (the specification). The real code
is in your worktree.

You own: `src/08-player.js`, `src/08a-binds.js`, `src/06f-hands.js` (first-person weapon), the lean part of
`src/06b-soldier.js` (third-person pose), `src/09c-net.js` (one published field), `src/09e-menus.js` controls list, new
`src/efc/42-efc-lean.js`, `i18n/en.txt`, and `tools/dev/efc/test-lean.mjs`. Another worker is changing Warden pace and posture
in `src/07*.js`, `src/efc/40-*`, `src/06ac-loco.js` and the bot part of `src/06b-soldier.js`: keep your soldier-pose change
small and local so the two merge cleanly.

Requirements
1. **Keys**: lean left on Q, lean right on E, held by default with a "toggle" option in the controls settings; rebindable like
   the other actions. E is used today for swapping with a ground weapon and by the engine's interact; in raid mode ground
   weapons are off and looting is on F, so find every use of Q and E, move what collides to a sensible free key or to F, and
   list the final bindings in your report. Gamepad and touch are out of scope but must not break.
2. **First person**: camera and weapon roll about 15 degrees and the eye shifts about 0.35 m sideways (less when crouched),
   eased over about 0.15 s. The shift is collision-checked each frame so the eye never passes through a wall: the lean
   shortens against geometry. Works standing, crouched and while aiming; sprinting, sliding and jumping cancel it.
3. **Third person and hit boxes**: the soldier's torso and head lean the same way so others see it, and hit detection follows
   the leaned pose (find how head and body hit volumes are derived from the soldier and keep them in step).
4. **Online**: publish the lean in the per-participant state (one small number) and apply it to the remote copy, smoothed.
5. **Wardens** see and shoot the exposed head and shoulder of a leaning player, not a body that is behind cover: check what
   point their line-of-sight test uses and that it follows the lean.
6. **Tests** `tools/dev/efc/test-lean.mjs`: the eye point moves by the expected amount in the open and is stopped by a wall;
   a ray aimed at the pre-lean head position misses a leaning soldier and one aimed at the leaned head hits; the lean cancels on
   sprint; toggle mode works; with the two-client rig (`tools/dev/efc/net2.mjs`) the host's copy of the guest leans within
   0.3 s of game time. One screenshot pair under `/tmp` (first person leaning round a corner; third person leaning); look at
   them and fix what reads wrong. Keep `test-e2e.mjs`, `test-ui.mjs` and `test-net.mjs` passing.
