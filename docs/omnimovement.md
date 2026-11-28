# C9a movement checkpoint

In raids, hold Sprint while moving in any direction. The controller caps diagonal input at the same speed as cardinal input. Start a slide with the existing crouch or slide input while sprinting. The slide starts in the direction of current velocity and uses the existing steering, jump exit and wall stop.

Quickly release and press Sprint again while moving to start a tactical sprint. The boost lasts up to 0.82 seconds, with a 1.55-second cooldown between boosts. Releasing Sprint, aiming, or starting a slide ends the boost.

| From | Input or condition | To |
| --- | --- | --- |
| Jog | Hold Sprint and move | Sprint |
| Sprint | Release and press Sprint again within the tap window | Tactical sprint |
| Tactical sprint | Boost expires with Sprint held | Sprint |
| Sprint or tactical sprint | Start slide with enough momentum | Slide |
| Slide | Slide ends on the ground | Crouch |
| Slide | Jump | Airborne with slide momentum |
| Airborne while sprinting or tactical sprinting | Press Crouch | Dive (planned) |
| Grounded approach to an obstacle | Press Jump facing waist-high geometry with a reachable top | Mantle (planned) |
| Grounded approach to an obstacle | Press Jump facing waist-high geometry with a clear far side | Vault (planned) |
| Stand or crouch | Hold Crouch for 0.4 seconds | Prone (planned) |
| Prone | Turn the view until the look angle calls for rolling onto the back | Supine (planned) |
| Prone | Press the corresponding Lean key | Side (planned) |

The owner chose to keep Crouch during a grounded sprint as Slide and use Crouch during an airborne sprint for Dive in C9-2. Supine weapon pose and aiming are part of C9-8.

## C18 phase reporting

`efcOmniPhase(PL.ent)` reports the local raid player's movement and phase, seconds in that phase and direction in radians relative to the view at entry. A rightward launch is `+Math.PI / 2`. Dive direction stays fixed through impact and settle. The observer uses the raid tick to report the preceding controller step. Existing input handling, physics and movement speeds still use their current values.

`EFC_OMNI_TUNING` holds the C18 starting values and references the existing tactical sprint, air dive and prone settings. Use `EFC.cfg.omni = { dive: { impact: 0.2 } }` in the console to override the impact reporting duration. `efcOmniTune('dive', 'impact')` reads the override and leaves the defaults intact. The first card uses the table for slide and landing phase durations.

## Ground dive

By default, tap Crouch during a grounded sprint to slide or hold it for 0.18 seconds to dive in the movement direction. The dive anticipates for 0.08 seconds and uses the tuned travel and apex. The **Slide and dive** setting also offers **Tap dives, hold slides** and **Slide only**. Air dives retain their existing trigger. The hold gesture uses the keyboard Crouch binding.


## Dive landings

The game compares the launch direction with the view at contact. Forward dives land prone. Side dives spend 0.30 seconds on
the corresponding side before settling prone. A backward dive lands supine, with the view raised to at least 10 degrees and
the weapon across the chest. Jump and a fresh sprint input can stand the player up after the 0.12-second impact window when
there is room overhead. Hold and tap behaviour comes from the existing **Slide and dive** setting.
