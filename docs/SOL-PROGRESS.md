# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** C9-1, movement state classifier and transition table.
- **Branch:** `codex/c9-omni` (stacked on completed C1-2).
- **Started:** 2026-11-26 13:36 CET, Codex Sol parallel session.
- **Steps done:** 1. Added a read-only classifier for the six current movement states. 2. Documented six planned transitions and recorded the owner’s controls.
- **Next step:** Complete step 3 by driving existing movement transitions with simRun.
- **Checks so far:** `python3 build.py` — liste des assets : 221 prefabs, 39 props, 47 surfaces photo, 62 procédurales, 20 armes, 18 accessoires. `python3 tools/dev/check_decl.py` — exit 0, no output. `python3 tools/dev/check_i18n.py` — 1687 entrées anglaises, 1687 textes à traduire, 0 erreur(s). `node tools/dev/efc/smoke.mjs` — smoke ok. Inline Node assertion — six states classified. Table assertion — six planned transitions documented.
- **How to verify:** Run the base checks, `test-omni-states.mjs`, `test-omni-sprint.mjs`, and `test-warden.mjs`.
- **Questions for the owner:** None for this card. C9-2 should account for the overlap with the current sprint-to-slide input.
- **Watch out for:** Use the isolated checkout and local HTTP port 8249 for Playwright checks.

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

- 2026-11-26 Codex Sol: C1-2 done. Generated four labelled first- and third-person contact sheets and confirmed the weapon is visible in all 32 tiles. Hand contact quality needs the owner's eye.
- 2026-11-26 Claude: K1 to K5, K7, K10, C0-1 to C0-4, C1-1 done and merged into `beta` (PR #15, `a9d990f`), live at /beta.
