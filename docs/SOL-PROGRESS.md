# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** K9, make the SKS stepped time-to-kill check deterministic.
- **Branch:** `codex/k9-sks-stepped-ttk`
- **Started:** 2026-11-26 12:31 CET, Codex Sol cloud session.
- **Steps done:** Baseline passed (L96 0.000 s, SKS 1.300 s). A fixed 25 m lane and seeded draws still varied across three runs (one failure). Holding the Warden's pose and preventing it from firing still failed (L96 2.533 s, SKS 1.733 s). A stepped browser clock then passed once (L96 1.267 s, SKS 1.733 s) and failed once (L96 2.533 s, SKS 1.300 s). Baseline was restored for handoff. On resume, shot tracing showed the cast starts after 3 random draws, while whole ticks consume hundreds of draws. Per-tick seeding still failed once (L96 2.533 s, SKS 1.733 s). The target crouch transition lowered the chest from about 1.24 m to 0.92 m with the crouch flag cleared. Resetting the transition state gave one full pass (L96 1.267 s, SKS 1.733 s) and one failure (L96 2.533 s, SKS 1.733 s). The target model retained different hip yaw, aim and movement phases in the shot trace.
- **Next step:** Normalize the remaining target pose values to a neutral standing fixture and verify the resulting shot sequence.
- **How to verify:** Build and serve `dist/` over loopback HTTP using the cloud startup instructions. Run `node tools/dev/efc/test-sks.mjs`; compare the stepped L96 and SKS result lines. K9 requires five full passes after a fix.
- **Checks so far:** `python3 build.py` — liste des assets : 221 prefabs, 39 props, 47 surfaces photo, 62 procédurales, 20 armes, 18 accessoires. `python3 tools/dev/check_decl.py` — no output, exit 0. `python3 tools/dev/check_i18n.py` — 1687 entrées anglaises, 1687 textes à traduire, 0 erreur(s). `node tools/dev/efc/smoke.mjs` — smoke ok. Original `node tools/dev/efc/test-sks.mjs` — sks ok. Stepped-clock probe — 1 FAILED. Per-tick seed probe — 1 FAILED. Standing fixture runs 1–2 — sks ok; 1 FAILED. `node --check tools/dev/efc/test-sks.mjs` and `git diff --check` — no output, exit 0.
- **Questions for the owner:** Should stepped TTK compare the SKS only against the semi-automatic rifles, as K9 suggests, or should the all-rifles comparison remain?
- **Watch out for:** The trace showed the Warden's yaw changing even with its position pinned. With fixed `aim0` to three decimals, shot and hit counts can still differ. The browser clock probe never changed the game's source or the original assertion. The cloud setup uses Node 22 and system Chromium via `PLAYWRIGHT_BROWSERS_PATH`; set `EFC_TEST_URL=http://127.0.0.1:8231/`.

## Next open cards, in order

1. K6, online lean timing (flaky only in slow sandboxes). Investigation only; do not loosen the 0.3 s limit.
2. K9, SKS stepped time-to-kill order (flaky; one attempt logged in the card).
3. C1-2, weapon-check contact sheets per family.
4. C10-1 to C10-3, open-licence menu font, swap, screenshots.
5. C9-1 to C9-8, omnimovement.
6. C16-1 to C16-8, enemy combat barks (captions and radio voice; telegraphing is a core rule).
7. C2-1 to C2-8, Partisan modding rules, stats table, one test, one card per weapon.
8. Then C15, C11, C12, C13 (section 6, split first), and C3, C4 to C8, C14 (section 7, already split).

Blocked on the owner: K8 (stash names, one line or two), C12 (reference image missing). Owner may still change K10's drop zone.

## Log (one line per finished card, newest first)

- 2026-11-26 Claude: K1 to K5, K7, K10, C0-1 to C0-4, C1-1 done and merged into `beta` (PR #15, `a9d990f`), live at /beta.
