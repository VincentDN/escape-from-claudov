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
| Sprint or tactical sprint | Press Crouch | Dive (planned) |
| Grounded approach to an obstacle | Press Jump facing waist-high geometry with a reachable top | Mantle (planned) |
| Grounded approach to an obstacle | Press Jump facing waist-high geometry with a clear far side | Vault (planned) |
| Stand or crouch | Hold Crouch for 0.4 seconds | Prone (planned) |
| Prone | Turn the view until the look angle calls for rolling onto the back | Supine (planned) |
| Prone | Press the corresponding Lean key | Side (planned) |

Crouch while sprinting currently starts a slide. C9-2 must account for that overlap when it adds the planned dive input. Supine weapon pose and aiming are part of C9-8.
