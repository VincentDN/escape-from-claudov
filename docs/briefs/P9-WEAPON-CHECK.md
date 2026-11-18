# P9 raid-start weapon check

The existing inspect in [06d-reload.js](../../src/06d-reload.js) tilts long guns and pistols and plays handling cues. It keeps both hands on the weapon. The reload system already has a visual state for holding the original magazine, so the detachable-magazine check can reuse that state and the existing foley.

The SKS is the first case that needs changes beyond choreography tables. Its charging handle and receiver are static geometry in [06la-modeles-sks.js](../../src/06la-modeles-sks.js). The right-hand solver in [06d-reload.js](../../src/06d-reload.js) targets a hard-coded turn-bolt point, and [06c-models.js](../../src/06c-models.js) blends all right-hand choreography into the same bolt grip. A moving SKS handle needs its own model-space contact and right-hand frame selection before the arm solver in [06f-hands.js](../../src/06f-hands.js) can follow it. For the pump shotgun, verify the support hand stays aligned to the moving pump during its check. Reuse the current hand exit path, and reset any moving geometry and carried magazine on cancellation.

## Proposed implementation

1. Add a visual-only insertion action with its own per-weapon timeline and an opt-out setting. Register it after the raid kit equips the first-person model. Reuse authored handling cues. Keep all ammunition, chamber, reload and inventory state in the existing gameplay path.
2. Add the moving model contacts and hand frames needed for the SKS and family-specific checks. Cover detachable magazines, bolt actions and pump shotguns with each family's authored motion. Restore the normal model pose on both completion and cancellation.
3. Cancel on the first gameplay input, before that input is handled, and preserve it for the normal controller. This follows the handoff's immediate-cancellation rule. If ordinary walking should coexist with the animation as proposed in the older polish plan, treat walking as a documented exception with its own test.
4. Replicate the cosmetic action and its cancellation to other clients using the existing animation event path. Keep the action separate from simulated reloads.

## Acceptance

- An eligible insertion starts the check once, and setting it off skips it. Re-entering menus, respawning outside a raid, or observing another player cannot start a local check.
- For each weapon family, record first- and third-person contact sheets at the key poses. Verify the hand follows its contact, the magazine or bolt returns to its resting pose, and canceling in the middle leaves no detached geometry.
- Send the first movement, aim, fire, sprint and weapon-switch inputs in separate scenarios. Verify that the first input is handled in the same frame and that the check itself preserves magazine and reserve counts and creates no reload or dropped item. Verify a remote client sees the start and cancellation in a two-client test.
