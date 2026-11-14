# Brief: P6, the free loadout and its SKS

Read `docs/briefs/COMMON.md` first, then section P6 of `docs/plans/2026-11-14-polish-pass.md` (the specification). The real code
is in your worktree.

You own: the weapon catalogue and models (`src/06i-armes.js`, `src/06j-modeles.js`, `src/06jb-formes.js`, `src/06k*.js` to
`src/06oa*.js`, `src/06c-models.js`, `src/06-weapons.js`), `src/efc/20-efc-items.js`, `src/efc/22-efc-stash.js`,
`src/efc/24-efc-loot-tables.js`, new `src/efc/53-efc-ui-freekit.js`, `i18n/en.txt`, `tools/dev/efc/test-items.mjs` and a new
`tools/dev/efc/test-sks.mjs`. Other workers are changing `shell.html`, `src/efc/50-efc-ui-menu.js`, the audio files, the Warden
and map files and `src/06d-reload.js`: do not touch them. Add the menu option from your own file by inserting it into the Raid
screen's DOM when that screen opens (the UI emits `ui:screen`; read `src/efc/50-efc-ui-menu.js` to find the right place), with
your CSS injected from JS.

Requirements
1. **The SKS, a nineteenth engine weapon**, built by code exactly as the other guns are (study the AK-47 and the Dragunov as the
   nearest shapes): wooden stock in one piece, fixed ten-round box magazine, gas tube, folded blade bayonet under the barrel,
   hooded front sight, tangent rear sight. First-person and world models, level-of-detail as the others, hand grips, sights
   aligned for aiming. Stats: semi-automatic, 10 rounds, rifle family ammunition, damage a little under the AK, slow follow-up
   (low rate of fire, heavy recoil that settles slowly), loose hip and aim spread, slow aim time, reloaded round by round
   through the engine's tube-reload path (it stands in for a stripper clip), no attachments. It must be the worst rifle in the
   game by time-to-kill at 25 m and still usable. Shot sound: reuse the nearest existing profile; say which.
2. **Item** `w_sks` (name "SKS", low value). It is in no loot table and Wardens never carry it.
3. **Free loadout**: service `raid:kit` takes an option (or a stored flag `stash.freeKit`) that returns the free kit instead of
   the loadout: the SKS with a full magazine and 30 rifle rounds in reserve or bag, nothing else, every item of it marked
   `free: true`. Free items are never banked by `raid:commit`; everything looted in the raid is. The stored loadout is left
   untouched in the stash when the free kit is used. The old silent fallback (a free M9 when no weapon is owned) becomes the
   free kit.
4. **The option on the Raid screen**: two choices, "Your loadout" and "Free loadout: SKS and 30 rounds, nothing to lose",
   keyboard operable, remembered, switched to the free loadout automatically (and saying so) when the stash and loadout hold no
   weapon. The kit preview on that screen follows the choice.
5. **Online**: the choice is local to each player and needs no network change; check that the remote copy shows the SKS model
   (weapon keys are published in the per-player state: make sure the new key is accepted).
6. **Tests**: `test-items.mjs` extended (free kit never banked, loot kept, loadout untouched, auto-switch when unarmed);
   `test-sks.mjs`: the model builds in first and third person without error, the weapon fires, reloads round by round and
   aims in a stepped raid, its time-to-kill at 25 m against a still target is the longest of all rifles, `makeArms` accepts it;
   one screenshot of the SKS in first person and one side view (the thumbnail service `thumb:get('w_sks')` may or may not be in
   your worktree: use it if present). Keep `test-e2e.mjs` and `test-raid.mjs` passing.
