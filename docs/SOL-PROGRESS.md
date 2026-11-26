# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** C10-3, font screenshots and overflow check.
- **Branch:** `codex/c10-3-font-overflow` (stacked on C10-2 while its final checks run).
- **Started:** 2026-11-26 13:42 CET, Codex Sol cloud session.
- **Steps done:** Added the Inter overflow check to run-all and visually reviewed three 1280×720 reference PNGs. The seven non-lobby screens passed at 1280×720 and 1920×1080 with no sizing changes.
- **Next step:** Fetch the C10-2 browser-test adapter fix, then run test-fonts.mjs through the lobby and complete both required UI regressions.
- **How to verify:** Run `node tools/dev/efc/test-fonts.mjs`, `node tools/dev/efc/test-ui.mjs` and `node tools/dev/efc/test-inventory-layout.mjs` against the built HTTP site. Set `FONT_SCREENSHOTS=docs/fonts` to refresh the reference PNGs.
- **Checks so far:** `python3 build.py` — liste des assets : 221 prefabs, 39 props, 47 surfaces photo, 62 procédurales, 20 armes, 18 accessoires. `python3 tools/dev/check_decl.py` — no output, exit 0. `python3 tools/dev/check_i18n.py` — 1687 entrées anglaises, 1687 textes à traduire, 0 erreur(s). `node tools/dev/efc/smoke.mjs` — smoke ok. `node tools/dev/efc/test-fonts.mjs` — 14 checks passed before the lobby failed with Host: timed out waiting for the lobby to open.
- **Questions for the owner:**
- **Watch out for:** The local production PeerJS script currently replaces the browser test rig's fake transport. C10-2 is updating only the test rig's route handling.

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

- 2026-11-26 Codex Sol: C10-2 done. Inter and Barlow Condensed load locally. Vendored PeerJS 1.5.5 with matching SRI and MIT license. Default startup audit: zero off-origin requests; UI, bench and network checks passed.
- 2026-11-26 Codex Sol: C10-1 done. Seven Inter and Barlow Condensed font files and both licenses ship in dist/assets/fonts (321057 bytes).
- 2026-11-26 Claude: K1 to K5, K7, K10, C0-1 to C0-4, C1-1 done and merged into `beta` (PR #15, `a9d990f`), live at /beta.
