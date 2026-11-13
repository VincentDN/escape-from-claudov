# Brief: UI package

All player-facing screens of the extraction loop. You own `shell.html`, `src/09e-menus.js`, `src/09ea-liste.js`,
`src/08a-binds.js`, `i18n/en.txt`, new `src/efc/50-efc-ui-menu.js`, `50-efc-ui-hideout.js`, `50-efc-ui-raid.js`,
`50-efc-ui-summary.js`.

Engine: menus in `src/09e-menus.js` and `src/09ea-liste.js` (screens, `uiOpen`, `UI.screen`, main menu entries, the solo flow: map
choice, loading, "deploy", then `startMatch`), markup and CSS in `shell.html` (3000 lines), texts through `_t('French text')` with
English in `i18n/en.txt`. Pointer lock and pause: `LOCK`, `requestLock`, `pointerActive()` in `src/09-game.js`; see how the chat
(`src/09i-chat.js`) or the killstreak map opens an overlay during play without pausing. `hudMsg(text, kind, seconds)` shows a HUD
line. New texts are plain English strings, not `_t`; `build.py` runs text-style checks at the end (it must print
"style des textes : rien à signaler"); if they object, find the lightest compliant way and report it.

1. Main menu entries: "Raid" (solo raid against Wardens: choose a map, default `EFC.cfg.raidMap || 'simoun'`, then the engine's
   loading and deploy flow with `Settings.mode = 'raid'`), "Squad raid" (the engine's online lobby screen), "Hideout", "Settings",
   and a small "Credits" link. Hide, do not delete, what does not belong: classic mode pickers, arsenal classes and weapon
   progression, outfits and challenges, account, friends, community, news and what's-new popups, rank-up, Steam Deck and install
   prompts, the phone energy question. The page boots with no console error. Default language English.
2. Hideout: two columns. Left: the stash (name, count, weight, value; grouped by kind). Right: the loadout: four slots (primary,
   sidearm, armour, pack), the bag, carried weight against the limit, total value. Click or Enter on a stash row moves it to the
   loadout (`stash:toLoadout`); click on a slot or bag row moves it back (`stash:toStash`); equip from bag to slot where it
   applies. "Start raid" goes to the Raid flow. All state from the services; re-render on every change.
3. In raid: Tab toggles the inventory panel (slots, bag with weight, row actions: equip, use (`med:use`), drop (`world:put` with a
   null container)). Near a container (`efcCall('world:near', PL.ent.pos, EFC.cfg.interactR)`) show "F  Search <name>"; holding F
   for `EFC.cfg.searchTime[kind]` seconds (progress bar; released or moved away: cancelled) opens the loot panel: container items
   left, your bag right; click, Enter or F takes the selected item (`world:take`), "Take all" takes one by one, clicking a bag row
   puts it in (`world:put`). Live updates on `world:changed` and `inv:changed`; closes when the player moves more than
   interactR + 1 m away, dies, or presses Tab or Escape. While a panel is open the player cannot fire or turn (service `ui:busy`;
   make engine input respect it in your files, or report the exact change needed), the match is not paused, the cursor is free;
   closing returns to pointer lock. Show heal progress when `efcCall('med:state')` is active.
4. Summary on event `raid:over(Summary)`: result line ("Extracted" / "Killed in action" / "Missing in action"), raid time, kills,
   extract name, the items brought out with value and total (or "Everything you carried is lost"), buttons "Hideout" and "Raid
   again". Dismissing calls `efcCall('raid:leave')` then opens the right screen. Works after an online match too.
5. Credits screen: built on Riposte: Frontline 5.6.0 by its author (MIT License), three.js, sounds and textures per
   `assets/sfx/credits.json` and `assets/tex/credits.json` (mostly CC0; CC BY authors credited in those files), link to
   https://github.com/VincentDN/escape-from-claudov.
6. Look: the engine's menu style (dark, amber accent, existing button and list classes). Arrows and Enter work in lists, Escape
   goes back, focus is visible.
7. Test `tools/dev/efc/test-ui.mjs`: the page boots to the main menu with the new entries and none of the hidden ones visible;
   Hideout renders the (fake or real) stash and moving an item calls the service and re-renders; in a solo match with `raid:begin`
   emitted and a fake nearby container: the prompt appears, a simulated F hold opens the loot panel, taking calls `world:take`;
   Tab opens and closes the inventory and `ui:busy` follows; `raid:over` shows the summary and its button calls `raid:leave`.
   Three screenshots (main menu, hideout, loot panel in raid) under /tmp: look at them, fix what is broken, describe them.
