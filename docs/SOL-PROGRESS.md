# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** K9, make the SKS stepped time-to-kill check deterministic.
- **Branch:** `codex/k9-sks-stepped-ttk`
- **Started:** 2026-11-26 12:31 CET, Codex Sol cloud session.
- **Steps done:** Baseline passed. The duel picks the first clear line from live entity positions, and `aim0` reports the camera direction to the target chest sphere. The baseline recorded SKS 1.300 s and L96 0.000 s.
- **Next step:** Pin the 25 m duel fixture and seed the browser RNG within the duel, then run the full SKS test five times.
- **Checks so far:** `python3 build.py` — liste des assets : 221 prefabs, 39 props, 47 surfaces photo, 62 procédurales, 20 armes, 18 accessoires. `python3 tools/dev/check_decl.py` — no output, exit 0. `python3 tools/dev/check_i18n.py` — 1687 entrées anglaises, 1687 textes à traduire, 0 erreur(s). `node tools/dev/efc/smoke.mjs` — smoke ok. `node tools/dev/efc/test-sks.mjs` — sks ok.
- **Questions for the owner:**
- **Watch out for:** Serve `dist/` over loopback HTTP with `EFC_TEST_URL=http://127.0.0.1:8231/`. The cloud setup draft documents the browser path for system Chromium.

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
