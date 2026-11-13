# Contract between work packages

All `src/efc/*.js` files share one global scope with the engine. Packages never call each other's functions directly. They talk
through `src/efc/00-efc-core.js`:

- **Events**: `efcOn(ev, fn)`, `efcEmit(ev, ...args)`, `efcFilter(ev, value, ...args)`.
- **Services**: `efcProvide(name, fn)`, `efcCall(name, ...args)` (returns `undefined` when the provider is not loaded), `efcHas(name)`.
- **Network**: `efcNetOnHost`, `efcNetOnClient`, `efcNetToHost`, `efcNetToAll`, `efcNetTo`, `efcIsHost()`, `efcMyId()`.
- **State**: `EFC.inv` (local player's raid inventory), `EFC.cfg` (tunables), `efcRaidMode()`, `efcRaidLive()`.

Your package must load, build and pass the smoke test **without** any other package present. Treat every `efcCall` result as
possibly `undefined`. Register listeners at load time (top level of your file).

## Data shapes (plain JSON, no class instances)

```
ItemDef   { id, name, kind: 'weapon'|'ammo'|'armor'|'pack'|'med'|'loot', w (kg), value, stack (max per stack, 1 if absent),
            weapon: { wkey }            // key of the engine WEAPONS table
            ammo:   { fam }             // 'rifle'|'smg'|'sniper'|'shotgun'|'pistol'
            armor:  { tier 1..3, cut }  // cut: share of torso damage removed, 0..1
            pack:   { cap }             // kg added to the carry limit
            med:    { heal, time } }    // health restored, seconds to use
Item      { id, n }                     // n: count. Weapons also carry { mag, res } (rounds in the magazine, reserve rounds)
Inventory { slots: { primary: Item|null, sidearm: Item|null, armor: Item|null, pack: Item|null }, bag: Item[] }
Container { id, kind: 'crate'|'locker'|'bag'|'body'|'drop', x, y, z, yaw, name, items: Item[] }
MapData   { inserts:  [{ x, z, yaw }],                       // one per squad, members spawn around it
            extracts: [{ id, name, x, z, r, openAt }],        // openAt: raid seconds before it opens
            containers: [{ kind, table, x, z, yaw }],         // table: loot table name
            guards:   [{ x, z, r, n, elite }] }               // Warden group posts
Summary   { result: 'extracted'|'dead'|'mia', kills, time, extract (name or ''), items: Item[], value }
```

Entity fields added to engine soldiers: `e.squad` (number 0..3 for player squads, `'w'` for Wardens). Two soldiers are allies in a
raid when their `squad` is equal. `e.team` keeps its engine meaning and stays 0 or 1.

## Services

| Name | Provider | Signature | Notes |
| --- | --- | --- | --- |
| `map:data` | core | `() -> MapData or null` | From `MAP_DEFS.<id>.efc`, else derived from the map's points of interest |
| `item:def` | ITEMS | `(id) -> ItemDef` | |
| `item:all` | ITEMS | `() -> ItemDef[]` | |
| `inv:new` | ITEMS | `() -> Inventory` | Empty |
| `inv:weight` / `inv:cap` / `inv:value` | ITEMS | `(inv) -> number` | Weight counts the bag only; equipped slots are free |
| `inv:add` | ITEMS | `(inv, item) -> boolean` | Stacks, then appends; false when over the carry limit. Auto-equips into an empty matching slot |
| `inv:remove` | ITEMS | `(inv, bagIdx, n) -> Item or null` | |
| `inv:equip` / `inv:unequip` | ITEMS | `(inv, bagIdx)` / `(inv, slot) -> boolean` | |
| `inv:all` | ITEMS | `(inv) -> Item[]` | Everything carried, slots included (what a body holds) |
| `inv:weapons` | ITEMS | `(inv) -> array` | The argument `makeArms()` expects, built from the primary and sidearm slots; fists/knife-only fallback handled by the engine |
| `stash:get` | ITEMS | `() -> { items: Item[], loadout: Inventory }` | Persisted in `localStorage` key `efc_stash_v1` |
| `stash:toLoadout` / `stash:toStash` | ITEMS | `(stashIdx)` / `(slotOrBagIdx) -> boolean` | Save after each move |
| `raid:kit` | ITEMS | `() -> Inventory` | Moves the loadout out of the stash (it is now at risk) and returns it. Never returns an unarmed kit: adds the free fallback pistol |
| `raid:commit` | ITEMS | `(result, inv)` | `'extracted'`: everything goes to the stash. Otherwise it is lost |
| `loot:roll` | ITEMS | `(table, rng) -> Item[]` | Tables: `crate`, `locker`, `bag`, `weapons`, `medical`, `warden`, `warden_elite` |
| `med:use` | ITEMS | `(bagIdx) -> boolean` | Starts a timed heal on the local player from `EFC.inv` |
| `world:spawn` | WORLD | `(kind, {x,y,z,yaw}, items, name) -> id` | Host only |
| `world:body` | WORLD | `({x,y,z}, items, name)` | Any machine; routed to the host, which spawns a `body` container |
| `world:list` | WORLD | `() -> Container[]` | Replicated copy on every machine |
| `world:near` | WORLD | `({x,y,z}, r) -> Container or null` | Nearest within r |
| `world:take` | WORLD | `(id, idx)` | Asks the host; on success the taker gets event `loot:give` |
| `world:put` | WORLD | `(idOrNull, item)` | Puts into a container, or drops at the local player's feet (`drop` container) |
| `raid:state` | RAID | `() -> { state, t, left, extracts, hold, holdId }` | `state`: `'idle'|'live'|'out'|'dead'|'mia'` |
| `ui:busy` | UI | `() -> boolean` | True while an inventory or loot panel is open (the player must not fire or turn) |

## Events

| Event | Emitted by | Arguments | Meaning |
| --- | --- | --- | --- |
| `raid:begin` | RAID | `()` | Raid started on this machine; `EFC.inv` is set |
| `raid:over` | RAID | `(Summary)` | The local player's raid ended; stash already committed |
| `tick` | RAID | `(dt)` | Every logic step of a live raid |
| `damage` (filter) | RAID, in `applyDamage` | `(dmg, victim, attacker, weapon, head) -> dmg` | Only for victims simulated on this machine |
| `died` | RAID, in `killEnt` | `(victim, attacker)` | Victim simulated on this machine (local player, or a bot on the host) |
| `loadout` | RAID | `()` | The local player's weapons were (re)built from `EFC.inv` |
| `inv:changed` | whoever mutates `EFC.inv` | `()` | UI refreshes; RAID rebuilds weapons when a weapon slot changed |
| `world:changed` | WORLD | `(id)` | A container was added, removed or its items changed |
| `loot:give` | WORLD | `(item, containerId)` | The host granted the local player an item; the listener adds it to `EFC.inv` or puts it back |

## Engine files and who may edit them

| Package | Engine files it may edit | Its `src/efc/` files |
| --- | --- | --- |
| RAID | `src/09i-modes.js`, `src/09-game.js`, `src/08-player.js`, `src/09l-fin.js`, `src/09b-killcam.js`, `src/09y-decompte.js`, `src/08b-killstreaks.js`, `src/06ga-tenues.js` | `10-efc-raid*.js`, `11-efc-squad.js` |
| ITEMS | none | `20-efc-items.js`, `21-efc-inventory.js`, `22-efc-stash.js`, `23-efc-vitals.js`, `24-efc-loot-tables.js` |
| WORLD | `src/08c-pickups.js` | `30-efc-world*.js` |
| NETLOBBY | `src/09c-net.js`, `src/09cb-serveurs.js`, `src/09d-netrelay.js` | `35-efc-netlobby.js` |
| WARDEN | `src/07-bots.js`, `src/07b-tactics.js`, `src/07c-controller.js`, `src/07d-squad.js`, `src/07e-humain.js` | `40-efc-wardens.js` |
| UI | `shell.html`, `src/09e-menus.js`, `src/09ea-liste.js`, `src/08a-binds.js`, `i18n/en.txt` | `50-efc-ui-*.js` |
| MAP | `src/02-map.js`, `src/02z-load.js`, `assets/maps/` | `60-efc-claudov*.js` |

Everything else is the lead's. If you need a change outside your files, do not make it: describe it in your handoff note.

## Tests

`tools/dev/efc/harness.mjs` opens the built game headless and steps game logic without rendering (`openGame`, `startSolo`,
`simRun`). Software rendering is very slow here (4 game seconds take 2 minutes of real frames), so test logic with `simRun` and
take at most one or two screenshots. Add `tools/dev/efc/test-<package>.mjs`; it must exit non-zero on failure.
