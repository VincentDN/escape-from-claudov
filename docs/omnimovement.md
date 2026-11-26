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
| Sprint or tactical sprint | Binding pending | Dive (planned) |
| Grounded approach to an obstacle | Binding pending | Mantle (planned) |
| Grounded approach to an obstacle | Binding pending | Vault (planned) |
| Stand or crouch | Binding pending | Prone (planned) |
| Prone | Binding pending | Supine (planned) |
| Prone | Binding pending | Side (planned) |

The owner will choose the inputs for the planned transitions. This table records the intended states for future movement, weapon poses, and hit volumes.
