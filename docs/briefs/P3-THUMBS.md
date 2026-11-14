# Brief: P3, item thumbnails

Read `docs/briefs/COMMON.md` first, then section P3 of `docs/plans/2026-11-14-polish-pass.md` (the specification). All packages
are merged: the real code is in your worktree.

You own: new `src/efc/52-efc-thumbs.js` and `52-efc-thumb-props.js`, the rendering of item rows in
`src/efc/50-efc-ui-hideout.js`, `50-efc-ui-raid.js` and `50-efc-ui-summary.js`, and `tools/dev/efc/test-thumbs.mjs`. Other
workers are editing `shell.html`, `src/efc/50-efc-ui-menu.js`, the audio, Warden and map files right now: do not touch them.
Put your CSS in a `<style>` element injected from your JS.

Requirements
1. **Gun thumbnails**: a clean side render of every weapon item (left side of the gun, muzzle to the right, level, whole gun in
   frame with a small margin, same scale rule for all so a pistol reads smaller than a rifle but stays legible), made from the
   engine's own models (`buildWorldGun` in `src/06*.js`; see how the armoury showcase `src/09o-vitrine.js` lights and frames a
   gun). Orthographic camera, neutral studio light, transparent background, no ground or shadow. Rendered once per item on first
   need with the game's renderer into an offscreen target (do not create a second WebGL context), read back to a small image
   (about 256 by 96), cached in memory. Rendering must not disturb the frame in progress (restore renderer state) and must not
   stall the menu: spread the first batch over frames.
2. **Other items (26)**: the same renderer on small props built by code so everything shares one look: armour vests by tier
   (reuse the engine's vest geometry if it can be built standalone), three packs, ammunition boxes per family (distinct colour
   band and a couple of loose rounds), bandage roll, medkit, and the 13 valuables (read the catalogue in
   `src/efc/20-efc-items.js`; each prop should be recognisable as its item, 50 to 300 triangles). Three-quarter view for props.
3. **Service** `thumb:get(itemId) -> url or null` (null until ready) and event `thumb:ready(itemId)`; rows re-render or swap the
   image when it arrives. A neutral placeholder silhouette by kind until then.
4. **Shown** in the hideout stash and loadout, the in-raid inventory, the loot panel and the summary: thumbnail at the left of
   each row, slots show a larger one. Layout must not jump when images arrive (fixed boxes).
5. **Test** `tools/dev/efc/test-thumbs.mjs`: every item in `item:all` yields a thumbnail whose image has between 4 and 85
   percent non-transparent pixels and is not a single flat colour; guns are wider than tall; no page error; the frame after
   rendering looks the same as before (renderer state restored: compare a few renderer properties). Produce one contact sheet
   PNG of all items (name under each) under `/tmp`, look at it, fix what reads badly (wrong side, clipped, too dark), and
   describe it in your report. Also take one screenshot of the hideout with thumbnails.
