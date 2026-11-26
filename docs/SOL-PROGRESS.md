# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** C9-3, mantle and vault.
- **Branch:** `codex/c9-omni`
- **Started:** 2026-11-26 18:06 CET, Codex Sol cloud session.
- **Steps done:** Added a raid-player Jump transition onto reachable 0.5–1.2 m ledges or over them when a supported far-side landing is clear within 1 m. Checked path and landing clearance in all eight headings and preserved ordinary jump and the existing movement timers.
- **Next step:** Close C9-3, then continue C9-4.
- **Checks so far:** `build.py` — liste des assets : 221 prefabs, 39 props, 47 surfaces photo, 62 procédurales, 20 armes, 18 accessoires. `check_decl.py` — no output, exit 0. `check_i18n.py` — 1687 entrées anglaises, 1687 textes à traduire, 0 erreur(s). `smoke.mjs` — smoke ok. `test-omni-traversal.mjs` — Mantle and vault passed in all eight headings, with blocked and ordinary jump fallbacks. `test-omni-dive.mjs` — Dive passed in eight directions, stops at a wall, lands crouched, respects cooldown and preserves grounded Slide. `test-omni-states.mjs` — Movement states passed: stand → crouch → sprint → tactical → slide → air → stand. `test-omni-sprint.mjs` — Sprint and slide passed in eight directions, tactical sprint expires, Warden movement preserved. `test-warden.mjs` — test-warden: all passed.
- **Questions for the owner:**
- **Watch out for:** Traversal holds the standing collision volume. The dedicated test places test-only collision boxes on a temporary elevated slab and removes them when done.

## Next open cards, in order

1. K6, online lean timing (flaky only in slow sandboxes). Investigation only; do not loosen the 0.3 s limit.
2. K9, SKS stepped time-to-kill order (flaky; one attempt logged in the card).
3. C10-1 to C10-3, open-licence menu font, swap, screenshots.
4. C9-1 to C9-8, omnimovement.
5. C16-1 to C16-8, enemy combat barks (captions and radio voice; telegraphing is a core rule).
6. C2-1 to C2-8, Partisan modding rules, stats table, one test, one card per weapon.
7. Then C15, C11, C12, C13 (section 6, split first), and C3, C4 to C8, C14 (section 7, already split).

Blocked on the owner: K8 (stash names, one line or two), C12 (reference image missing). Owner may still change K10's drop zone.

## Log (one line per finished card, newest first)

- 2026-11-26 Codex Sol: C9-2 done. Sprint + Crouch dives in the air and slides on the ground. The eight-direction dive, collision, cooldown and movement/Warden regressions passed.
- 2026-11-26 Codex Sol: C9-1 done. simRun drove all six existing movement states. Sprint and Warden regressions passed. Owner chose grounded Slide and airborne Dive for Sprint + Crouch.
- 2026-11-26 Codex Sol: C1-2 done. Generated four labelled first- and third-person contact sheets and confirmed the weapon is visible in all 32 tiles. Hand contact quality needs the owner's eye.
- 2026-11-26 Claude: K1 to K5, K7, K10, C0-1 to C0-4, C1-1 done and merged into `beta` (PR #15, `a9d990f`), live at /beta.
