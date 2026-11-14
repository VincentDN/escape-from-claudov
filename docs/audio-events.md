# Audio events: weapon handling, firing and inventory (polish pass, P2)

Audit of every handling and firing sound the engine plays, what played before P2 and what plays now. "Engine foley" is the
recorded pack `foley` (`assets/sfx/foley`, CC0 sources listed in `assets/sfx/credits.json`); "synthesis" is the fallback in
`src/05-audio.js` that plays while a pack is loading or when it is missing. New sounds come from Partisan Project:

- pack `handling` (`assets/sfx/handling`, 44 takes, 168 KB): the 42 owner-cleared handling takes, six per category, banks
  `hf_click`, `hf_clunk`, `hf_ratchet`, `hf_slide`, `hf_hit`, `hf_handle`, `hf_long`, plus `f_casing_wood` (two Freesound CC0 takes);
- pack `ballistics` (`assets/sfx/ballistics`, 9 takes, 73 KB): Freesound CC0 ricochets `pt_ric`, fly-bys `pt_flyby` and rifle
  shots `g_pt_sniper_pov`.

Both are built by `python3 tools/build_sfx.py --build --famille partisan` then `python3 tools/build_sfx.py --paquet handling,ballistics`
(family `tools/sfx/partisan.py`). The game loads them after the other game packs (`SFX_GAME`, `src/05a-sfx.js`). While they load,
or if they are missing, every event below plays exactly what it played before (engine foley, else synthesis).

How a handling event plays now (`src/efc/45-efc-sounds.js`): the engine's `sfxMech(kind)` asks `efcHandlingPlay` first. Each event
is one to two layers of the bank, a random take per layer (never the same take twice in a row), random pitch +-4 % and gain +-1.5 dB,
and a playback rate from the weapon's mass (`1.08 * kg^-0.09`: Glock 1.12, M4 0.98, L96 0.91, Barrett 0.86; bots use their family's
mass). The decisive click of click, clunk and hit takes sits 6 ms into the take, so it lands on the event time of the reload
choreography (`src/06d-reload.js`).

## Handling, per weapon family

Families: rifle (M4, AK-47, SCAR-H, FAMAS, AA-12), SMG (MP5, MP7, UMP45, Vector), pistol (M9, USP, Glock 18, Desert Eagle),
sniper (L96 bolt action; SVD and M82 use the rifle magazine rig), shotgun (M1014, Remington 870: shell by shell).

| Event | Where the engine fires it | Before P2 | After P2 (layers: bank, offset) |
|---|---|---|---|
| Magazine out | choreography `magout` (rifle 0.3 s, pistol 0.18 s, sniper 0.43 s); bots at +0.15 s | engine foley `f_magout_rifle` / `_smg` / `_pistol` | `hf_click` + `hf_handle` (+50 ms) |
| Magazine in | choreography `insert` (rifle 1.2 s, pistol 0.9 s, sniper 1.71 s); bots | `f_magin_<family>` | `hf_clunk` + `hf_click` (+30 ms) |
| Magazine slap | `insert` + 50 ms | `f_slap` | `hf_hit` |
| Charging handle (rifle, SMG, empty) | `catch` (rifle empty 1.53 s) | `f_charge_rifle` | `hf_long` (a full charging cycle, Partisan's "charge") |
| Slide release (pistol, empty) | `slide` (1.28 s) | `f_slide_pistol` | `hf_click` + `hf_clunk` (+25 ms), pitched up 15 % |
| Bolt back (sniper) | `boltsnd` (bolt action 0.16 s; empty reload 2.38 s) | `f_bolt` | `hf_click` + `hf_slide` (+30 ms) |
| Bolt forward (sniper) | `boltfwd` (0.6 s; empty reload 2.62 s) | `f_charge_rifle` | `hf_clunk` + `hf_click` (+60 ms) |
| Pump (shotgun) | `pumpsnd` (shellEnd 0.16 s), old pump action | `f_pump` | `hf_slide` + `hf_clunk` (+130 ms) |
| Shell insert (shotgun) | `shellin` (0.39 s of each shell) | `f_shell` | `hf_click` + `hf_hit` (+15 ms) |
| Draw | weapon switch (at the swap), knife, `shellStart` | `f_draw` | `hf_handle` + `hf_click` (+90 ms) |
| Holster | killstreak and mecha only; **weapon switch had none** | `f_stow` | `hf_handle` + `hf_hit` (+70 ms); now also when a weapon switch starts (raid) |
| Aim in | `ads` when aiming starts; grenade cook | `f_ads` (same take in and out) | `hf_handle`, quiet, pitched up 6 % |
| Aim out | `ads` when aiming stops | `f_ads` | `hf_handle`, quieter, pitched down 6 % |
| Inspect | `draw` events of the inspect choreography (0.02 s, 1.65 s; pistol 1.4 s) | `f_draw` (same as a draw) | `hf_handle` + `hf_ratchet` (+80 ms, quiet) |
| Dry fire | trigger on an empty magazine | `f_dry` | `hf_click`, pitched up 20 % |
| Weapon pickup | picking up a weapon, bots | `f_pickup` | `hf_handle` + `hf_clunk` (+60 ms) |
| Magazine hits the ground | dropped magazine | `f_magdrop` | unchanged (a ground impact, not handling) |
| Knife, grenade pin, spoon, wind-up, throw | knife and grenades | engine foley | unchanged |

## Firing

| Event | Before P2 | After P2 |
|---|---|---|
| First person (all profiles) | recorded `g_<profile>_pov` (3 takes), FFSL; synthesis while loading | unchanged, except the L96 |
| First person, L96 (`sniper` profile) | `g_sniper_pov` | Partisan rifle shots `g_pt_sniper_pov` (3 takes), see below |
| Near, under 40 m | `g_<profile>_near` (2 takes) | unchanged |
| Far | `g_far_<class>` (2 takes per class) | unchanged |
| Suppressed | `g_sup_*` | unchanged |
| Casing landing, player | `f_brass` (hard) or `f_brass_soft` (dirt, grass, snow), one shot in two | by surface: soft ground (now with sand and crushed ice) `f_brass_soft`; wood, painted wood and boards `f_casing_wood` (new, recorded); metal, hull, rust, grating `f_brass` pitched up 12 %; the rest `f_brass` |
| Casing landing, shooter within 10 m | none | same surface choice at the shooter, one shot in three |
| Shotgun shells | `f_shells` | unchanged |
| Ricochet (1 in 10 hits on concrete or metal within 30 m) | `i_ric` (3 takes) | `i_ric` or Partisan `pt_ric` (3 longer takes), half each |
| Fly-by (near miss) | `i_whiz` (4 takes) | `i_whiz`, or Partisan `pt_flyby` (3 takes) one time in three |

No family's shot was synthesised: every profile has recorded first-person, near and far banks. Measured on the first 250 ms of each
first-person take (peak-normalised), the L96's `g_sniper_pov` was clearly the thinnest of the heavy class: 6 % of its energy under
200 Hz, against 21 % for the SVD (`dmr`), 41 % for the Barrett (`sniper50`), 25 % for the pump shotgun, and its tail died out after
0.2 s. Partisan's rifle shots (LilMati, florianreichelt; 8 % to 54 % under 200 Hz, with their own rolling outdoor tail) replace it
when the `ballistics` pack is loaded. Their first 60 ms are matched to the old take (gain 0.39), and the engine's far "roll" layer is
not added under them since they carry their own. Partisan's AK shots were not used: the engine's rifle family takes are as dense and
already per-weapon. Everything else in firing is unchanged.

## Inventory and looting (raid)

From events only (`src/efc/45-efc-sounds.js`), through the game's effects mix (effects volume and mute apply):

| Action | How it is detected | Sound |
|---|---|---|
| Open a container or the inventory | `ui:busy` turns true (polled each raid step), or a `ui:panel(true, kind, id)` event if the UI emits one | `hf_handle` + `hf_slide` |
| Close it | `ui:busy` turns false, or `ui:panel(false)` | `hf_hit`, soft |
| Take an item | `loot:give` | `hf_handle` |
| Equip | `inv:changed` and a slot gained an item | `hf_clunk` + `hf_click` |
| Unequip | a slot emptied and the bag grew | `hf_click` + `hf_handle` |
| Drop or put in a container | a slot emptied, or the bag shrank (not a med item) | `hf_clunk`, low |
| Use a med item | the bag lost a med item | two `hf_handle` takes |

## Checks

`node tools/dev/efc/test-sounds.mjs` (after `python3 build.py`): every event above resolves to a loaded sample, no sample peaks at
or above 0 dBFS, every take of `handling` and `ballistics` is within 6 dB of its pack's median active level, a full reload of one
weapon per family (normal and empty, the L96 bolt, the shotgun shell cycle) plays its sounds in the choreography's order at its event
times, inventory sounds follow their events, and with both packs removed the match runs and the engine's own sounds play.

Audition by ear: build, then open `dist/index.html#sounds` (see the panel's buttons: old and new for every event, per family).
