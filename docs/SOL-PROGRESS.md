# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** C16-3, connect bark events to AI with lead time.
- **Branch:** `codex/c16-3-bark-timing` (stacked on C16-2 at `49fb7e5`).
- **Started:** 2026-11-27 18:30 CET, Codex Sol cloud session.
- **Steps done:** The owner approved the three listed WARDEN hooks. Found two paths outside that scope: updateBot delegates Scavenger decisions to 43-efc-scavengers.js; ctlWeapon starts empty-magazine and automatic reloads in 07c-controller.js.
- **Next step:** Confirm the additional files, then schedule warnings ahead of the actual behavior. For man_down, announce before the survivor reaction because the death has already occurred.
- **How to verify:** Use the scripted C16-3 timing scenarios and record actual bark and action times. Run the base checks.
- **Checks so far:** `python3 build.py` — liste des assets : 221 prefabs, 39 props, 47 surfaces photo, 62 procédurales, 20 armes, 18 accessoires. `python3 tools/dev/check_decl.py` — no output, exit 0. `python3 tools/dev/check_i18n.py` — 1687 entrées anglaises, 1687 textes à traduire, 0 erreur(s). `node tools/dev/efc/smoke.mjs` — smoke ok.
- **Questions for the owner:** May C16-3 also edit `src/07c-controller.js` and `src/efc/43-efc-scavengers.js` to cover those paths?
- **Watch out for:** The bark must precede the announced action. The caption card currently receives local events; online replication is C16-8.

## Next open cards, in order

1. C16-3 to C16-13, enemy combat barks (captions and radio voice; telegraphing is a core rule), then the downed state and the execution of a downed player.
2. C2-1 to C2-8, Partisan modding rules, stats table, one test, one card per weapon.
3. Then C15, C11, C12, C13 (section 6, split first), and C3, C4 to C8, C14 (section 7, already split).

Blocked on the owner: K8 (stash names, one line or two), C12 (reference image missing). Owner may still change K10's drop zone.
C1-2 hand contact quality on the contact sheets (`docs/weapon-check/`) needs the owner's eye.

## Log (one line per finished card, newest first)

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
