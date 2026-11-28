# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** C18-3 directional landings integrated with C18-1 and C18-2. C19 firing and C13 reloads are on beta.
- **Next step:** C18-4 aerial look, body twist, aiming and firing.
- **How to verify:** Use the [beta playtest checklist](../outbound/BETA_PLAYTEST_CHECKLIST.md).
- **Checks so far:** Build, declarations, raid smoke, the seven-family raid firing check and recorded fallback passed. The C19 pack is 400,083 bytes. C13 sound, operator and Partisan alignment checks passed before C19.
- **Questions for the owner:** C17-2 still needs the steep-pitch framing choice. C16-5 requires approval of the [five-line bark sample sheet](barks.md#recording-plan) before generation.
- **Watch out for:** C19 retains the existing CC0 nearby, distant and suppressed shots. C17-3 waits on C17-2 visual acceptance.

## Next open cards, in order

1. Continue with C18-4 and the [Omnimovement 2 plan](plans/2026-11-27-omnimovement-2.md).
2. C16-5 to C16-13 and C17-2 to C17-4 can resume when the owner decisions are recorded.
3. C2-1 to C2-8, Partisan modding and weapons.
4. Then C11 and C12 (section 6), followed by C3 to C8 and C14 (section 7).

Blocked on the owner: K8 (stash names, one line or two), C12 (reference image missing). Owner may still change K10's drop zone.
C1-2 hand contact quality on the contact sheets (`docs/weapon-check/`) needs the owner's eye.

## Log (one line per finished card, newest first)

- 2026-11-28 Codex Sol: Integrated directional prone, side and supine landings. Ground and air tests covered all headings, two in-flight view changes, impact, side settle and return to standing. The final C19 audio suite passed 111 checks.

- 2026-11-28 Codex Sol: Integrated the C18-1 phase model and C18-2 ground dives. All eight directions, three slide/dive settings, wall clearance and cooldown passed.

- 2026-11-28 Codex Sol: C19 produced 34 first-person variants across 17 recorded profiles from 14 ElevenLabs generations (233.310 credits) and CC0 bases. Updated the beta playtest checklist.

- 2026-11-28 Codex Sol: Wired the final C13 gameplay cues, corrected remote gunshot routing, aligned all imported Partisan rifle profiles, and updated stash placement and operator preview. Added the beta playtest checklist and C19 firing card.
- 2026-11-28 Codex Sol: C13-2 to C13-5 done on `codex/c13-2-weapon-foley`. 304 credited takes, 76 banks, 644.1023 ElevenLabs credits, Partisan turn recordings, and 102/102 sound checks.
- 2026-11-28 Codex Sol: C13-1 done. The foley audit verified 76 action/family pairs, 304 slots, 19 credited reuse candidates and 285 new takes across five batches.
- 2026-11-28 Codex Sol: C16-4 integrated from `ef536b4`. The voice script has 180 takes across 15 cues and three voice groups, plus five sample lines for approval before recording.
- 2026-11-28 Codex Sol: C15-4 done. Both clients see the magazine detach, return and cancel. Documented the raid HUD and captured rifle, pistol and pump shotgun checks. Build, declaration, translation, smoke, local and two-client checks passed.
- 2026-11-27 Codex Sol: C15-3 done. Hold Reload to show and keep the magazine in view and release to put it back. Rough is the owner-selected default, and exact numbers are selectable. Browser pose/readout, insertion check and all base checks passed.
- 2026-11-27 Codex Sol: C15-2 done. Tap Reload to reload, hold for 0.30 s to enter the local check. Focused tests ended with `magazine key tap, hold, cancellation, and rebinding ok` and `inventory keys ok`. Build, declaration, translation and smoke checks passed.
- 2026-11-27 Codex Sol: C15-1 done. The default raid HUD hides ammo and weapon names, with a persisted full-HUD toggle. Browser check ended with `minimal raid HUD default, cues, visibility, toggle and persistence ok`. Build, declaration, translation and smoke checks passed.
- 2026-11-27 Codex Sol: Raid healing follow-up done. Hold H to use a carried medical item with a first-person bandage wrap. Build, declaration and translation checks passed. Browser checks ended with `bandage hold, animation, cancellation, consumption and rebinding ok`, `items ok` and `smoke ok`.
- 2026-11-27 Codex Sol: Alt free-look follow-up done. Firing, reloads and grenade throws work while detached and use weapon aim. Focused and smoke tests passed.
- 2026-11-27 Codex Sol: C16-3 done. Scheduled raid AI cues ahead of actions, including automatic reloads and Scavenger cues. All 15 lead-time scenarios and Warden/Scavenger regressions passed.
- 2026-11-27 Codex Sol: C16-2 done. Added projected bark captions, an off-screen arrow feed, and a settings toggle. Verified ordering, 2.5 s expiry, reduced motion and the reference screenshot.
- 2026-11-27 Codex Sol: C16-1 done. Added the host bark catalogue, hearing range, priorities and cooldowns. Five logic tests and all base checks passed.
- 2026-11-27 Codex Sol: C9-8 done. Hold Alt for free-look. Low weapon holds passed first- and third-person review with AK-47, L96 and Remington 870, and both clients matched the replicated poses.
- 2026-11-27 Codex Sol: C9-7 done. Both clients saw prone, supine, both side rolls and get-up. Body yaw matched in all eight headings. Network protocol 15 and regressions passed.
- 2026-11-27 Codex Sol: C9-6 done. Prone, supine and side hit spheres share body-relative Warden aim points. Fixed rays and Warden aim passed in eight directions, and remote bots kept their legacy volumes.
- 2026-11-27 Codex Sol: C9-5 done. Prone camera yaw stays free, body yaw is bounded, and turning to the rear or holding a Lean key updates roll state. Full Lean, prone and base checks passed.
- 2026-11-27 Codex Sol: C9-4 done. Hold Crouch to go prone and crawl. Jump or tap Crouch to rise with headroom. Dive lands prone. Movement and Warden regressions passed.
- 2026-11-26 Claude: merged the Codex branches k6, k9, c10-3 (with C10-1 and C10-2) and c9-omni (with C1-2) into `beta`.
- 2026-11-26 Codex Sol: C9-3 done. Mantle and vault passed in all eight headings with blocked landing and ordinary jump fallbacks. Dive, movement, and Warden regressions passed.
- 2026-11-26 Codex Sol: C9-2 done. Sprint + Crouch dives in the air and slides on the ground. The eight-direction dive, collision, cooldown and movement/Warden regressions passed.
- 2026-11-26 Codex Sol: C9-1 done. simRun drove all six existing movement states. Sprint and Warden regressions passed. Owner chose grounded Slide and airborne Dive for Sprint + Crouch.
- 2026-11-26 Codex Sol: C10-3 done. Page-wide visible Inter text had no overflow on eight screens at both desktop resolutions. Three reference PNGs and the run-all check are committed.
- 2026-11-26 Codex Sol: C10-2 done. Inter and Barlow Condensed load locally. Vendored PeerJS 1.5.5 with matching SRI and MIT license. Default startup audit: zero off-origin requests; UI, bench and network checks passed.
- 2026-11-26 Codex Sol: C10-1 done. Seven Inter and Barlow Condensed font files and both licenses ship in dist/assets/fonts (321057 bytes).
- 2026-11-26 Codex Sol: C1-2 done. Generated four labelled first- and third-person contact sheets and confirmed the weapon is visible in all 32 tiles. Hand contact quality needs the owner's eye.
- 2026-11-26 Codex Sol: K9 done. Fixed the 25 m lane and standing target pose, and seeded each simulation tick. Full SKS test passed 5/5 (L96 1.267 s, SKS 1.733 s).
- 2026-11-26 Codex Sol: K6 done. Lean check (7) passed twice at 0.27 s and the network suite passed; beta had no reproduced bad endpoint.
- 2026-11-26 Claude: C16-9 to C16-13 (downed state and execution) planned, PR #17 merged into `beta`.
- 2026-11-26 Claude: K1 to K5, K7, K10, C0-1 to C0-4, C1-1 done and merged into `beta` (PR #15, `a9d990f`), live at /beta.
