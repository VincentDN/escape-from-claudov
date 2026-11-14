# Brief: P2, weapon handling and firing sounds

Read `docs/briefs/COMMON.md` first, then section P2 of `docs/plans/2026-11-14-polish-pass.md` (the specification). All packages
are merged: the real code is in your worktree.

Source material, read-only, in `/home/user/partisan-project` (another repository of the same owner; do not edit it, and do not
read its `vendor/`, `node_modules/`, `docs/archive/`): `assets/audio/foley/` (42 recorded handling takes in seven categories, with
`manifest.json`; the owner has confirmed they are cleared for this public repo), `assets/audio/shooter/` (Freesound, CC0 only,
`manifest.json` lists authors and source pages: shots, reload, shells, impacts, ricochets, fly-bys, footsteps), and
`shared/mech.js` / `shared/foley.js` for how Partisan picks and pitches takes.

You own: `src/05*.js`, `src/06d-reload.js` (only to add sound events), `assets/sfx/`, `tools/build_sfx.py`, `tools/sfx/`, new
`src/efc/45-efc-sounds.js`, `NOTICE.md` and `assets/sfx/credits.json` (credits), new `tools/dev/efc/sounds.html` or an in-game
dev page, and `tools/dev/efc/test-sounds.mjs`. Other workers are editing the Warden, map, UI and menu files right now: do not
touch `shell.html`, `src/07*.js`, `src/efc/40-*`, `src/efc/50-*`, `src/efc/60-*`.

Requirements
1. **Audit, written to `docs/audio-events.md`**: every handling and firing event the engine plays for each weapon family
   (magazine out and in, bolt, charging handle, pump, shell insert, draw, holster, aim in and out, inspect, dry fire, fire near /
   far / first person, casing), what plays today (recorded pack or synthesis) and what will play after your change.
2. **Handling foley**: map each handling event to Partisan takes by category, several takes per event so repeats differ, with a
   small random pitch and gain spread and heavier weapons pitched lower. Bring the takes in through the engine's own pack
   pipeline (`tools/build_sfx.py`, `assets/sfx/<pack>/meta.json`, mp3 as the other packs; check that ffmpeg or the tools the
   builder needs exist here, and if not, find the lightest working route and say so) so lazy loading and the synthesised
   fallback keep working. Timing must match the reload choreography in `src/06d-reload.js`.
3. **Firing**: keep the engine's per-weapon near, far and first-person variants. Add recorded casings landing (by surface if the
   engine knows it) and Partisan's ricochets and fly-bys where the engine has none or only synthesis. Replace a family's shot
   only where the audit shows it is synthesised or clearly thinner than Partisan's; say which and why.
4. **Inventory and looting foley**, from your own file through events only (`world:changed`, `loot:give`, `inv:changed`, and
   the UI's panel open and close; if you need an event the UI does not emit, list it in your report): opening a container,
   taking, equipping, dropping, using a med item. Respect the game's effects volume and mute.
5. **Credits**: Freesound authors and source pages added to `assets/sfx/credits.json` in its existing format; `NOTICE.md` gets
   a line for the handling bank: supplied by the owner, checked and cleared by the owner.
6. **Audition page for the owner**: one page listing every event with buttons for the old sound and the new one, per weapon
   family, built into `dist/` by `build.py` only if that is a small change (otherwise a standalone HTML under `tools/dev/efc/`
   that loads the built packs); say how to open it.
7. **Test** `tools/dev/efc/test-sounds.mjs`: every event in the audit resolves to at least one loaded sample after the packs
   load; no sample clips (peak below 0 dBFS) and levels sit within 6 dB of the pack's median; a full reload of one weapon per
   family triggers its events in order at the choreography's times (record the calls, the test cannot hear); the game still
   runs with the new packs missing (fallback). Total added download under 3 MB; report the size.
