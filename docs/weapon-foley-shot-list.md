# C13 weapon foley shot list

Target **four distinct takes per applicable action and weapon family**. This list covers 76 action/family pairs and 304 slots. Nineteen credited takes are candidates for reuse, leaving **285 new takes** if all candidates pass audition. Budget up to 304 takes if none pass, plus any rejected generations. Confirm the current credit quote before starting a batch.

## Current audio

The raid currently layers shared sounds from seven handling pools. The shipped directory contains 42 base handling cuts, six later CC0 additions to the clunk and long-action pools, and two wood casing cuts. The older inventory documents stages of the pack and still describes the original 44-file layout. The current handling notes describe the 44 prompt-based replacements, while the credits JSON still has legacy provenance for the original pool IDs. Reconcile the source of each runtime file before shipping new credits. The existing shared pools remain useful as loading fallbacks and audition references. They do not fill slots in the action-specific matrix below.

The reuse candidates come from the credited engine foley. Each candidate needs a check for weight, clarity, cue timing and compatibility with the other takes in its bank. The three shell inserts are distinct cuts, including two takes at different timestamps in the same recording.

## Take matrix

Abbreviations are `R` rifle, `S` SMG, `P` pistol, `N` sniper and `T` tube shotgun. The AA-12 uses the detachable rifle-magazine rig. The sniper magazine rows cover both its detachable bolt-action and semiautomatic rigs. Sniper and shotgun charging entries are for semiautomatic mechanisms. Pump action has a separate row. Selector cues apply to families with selectable-fire weapons.

| Cue ID | Families | Target | Reuse | Generate | Credited reuse candidates |
| --- | --- | ---: | ---: | ---: | --- |
| `magout` | R S P N | 16 | 4 | 12 | R `f_magout_rifle-1`, `-2`. S `f_magout_smg`. P `f_magout_pistol`. |
| `magin` | R S P N | 16 | 4 | 12 | R `f_magin_rifle-1`, `-2`. S `f_magin_smg`. P `f_magin_pistol`. |
| `slap` | R S P N | 16 | 0 | 16 | — |
| `charge` | R S N T | 16 | 2 | 14 | R `f_charge_rifle-1`, `-2`. |
| `slide_release` | P | 4 | 2 | 2 | P `f_slide_pistol-1`, `-2`. |
| `bolt_back` | N | 4 | 2 | 2 | N `f_bolt-1`, `-2`. |
| `bolt_forward` | N | 4 | 0 | 4 | — |
| `pump` | T | 4 | 2 | 2 | T `f_pump-1`, `-2`. |
| `shell` | T | 4 | 3 | 1 | T `f_shell-1`, `-2`, `-3`. |
| `safety` | R S P N T | 20 | 0 | 20 | — |
| `selector` | R S P | 12 | 0 | 12 | — |
| `draw` | R S P N T | 20 | 0 | 20 | — |
| `stow` | R S P N T | 20 | 0 | 20 | — |
| `ads_in` | R S P N T | 20 | 0 | 20 | — |
| `ads_out` | R S P N T | 20 | 0 | 20 | — |
| `inspect` | R S P N T | 20 | 0 | 20 | — |
| `empty` | R S P N T | 20 | 0 | 20 | — |
| `pickup` | R S P N T | 20 | 0 | 20 | — |
| `mount` | R S P N T | 20 | 0 | 20 | — |
| `unmount` | R S P N T | 20 | 0 | 20 | — |
| `bipod_deploy` | R N | 8 | 0 | 8 | — |
| **Total** | **76 pairs** | **304** | **19** | **285** | |

## Generation batches

Use one isolated, close-miked, dry Foley action per take. Keep the room quiet and short. Exclude gunfire, dialogue, music and environment noise. Within each set, vary hand pressure, small material resonances and handling speed while keeping the cue recognizable. Choose a short source duration around the action, with room for the transient and decay.

Name files `wf_<family>_<cue>_<01–04>` using `rifle`, `smg`, `pistol`, `sniper` and `shotgun` as family keys. Assign reused candidates to the earliest slots in each family bank. Generate the remaining numbered slots.

| Batch | Takes | Prompt direction |
| --- | ---: | --- |
| A. Magazine removal and seating | 40 | Distinct release click and brief scrape for removal. For seating, a compact contact followed by a clean latch. For slap, a short gloved impact with body resonance and no duplicate latch. |
| B. Charging, bolt, pump and shell | 25 | Capture the signature of each action. Give a pistol slide release one short snap. Separate the sniper bolt's lift and rearward travel from the return and latch. Give the pump a longer slide with a stop. Keep the shell insert short and tactile. |
| C. Safety and selector | 32 | One small detent for the safety. Give the selector a firmer indexed click. Keep both quieter than mag seating, with no discharge or secondary action. |
| D. Draw, stow, aiming, inspect, dry fire and pickup | 140 | Use cloth and grip contact for draw and stow, an equipment movement plus a soft settle for aim-in, and a lighter release for aim-out. Keep inspect restrained. Give dry fire one short mechanical tick. Let pickup carry the weight of an object leaving a surface. |
| E. Workbench and bipod | 48 | Use a light rail scrape and a precise contact for mount. Use a release click and outward slide for unmount. Give a bipod two short hinge movements followed by a latch. |

For family character, use a firm metal-and-polymer contact for rifles, a tighter and lighter contact for SMGs, small bright transients for pistols, a heavier steel resonance for sniper rifles, and longer sliding contact for tube shotguns. Describe the desired character in the prompt. The unshipped references in the handling notes are listening references.

## Mapping and verification

- Existing keys cover magazine out and in, slap, charging, bolt opening, pump, shell, draw, stow, aim, inspect, dry fire and pickup. Separate semiautomatic sniper charging from bolt closure in the mapping. Keep the hold-R magazine check on the matching magout and insert cues.
- Use the existing `inv_mount` and `inv_unmount` events for workbench actions. Keep generic inventory feedback available when the family is absent.
- Add safety, selector and bipod cues when their gameplay events are available. Verify that each cue is triggered by the intended action before enabling its bank.
- Trim and align transients against the action event times. Keep each take within 2 dB of the pack median and check for clipping. Compare old and new banks in `#sounds`, then verify four distinct takes for every applicable family and event.
- The generation count covers weapon handling and workbench Foley. Gunshot, casing, grenade and inventory banks have their own entries in the audio inventory. Combat radio is tracked by C16.

Sources: [audio event inventory](audio-events.md), [handling Foley and unshipped references](handling-foley.md), [current lookup](../src/efc/45-efc-sounds.js), and [sound credits](../assets/sfx/credits.json).
