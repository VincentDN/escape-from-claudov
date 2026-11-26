# Codex Sol progress (checkpoint file)

Update this file and push after every step of a card (rules: section 0 of [`CODEX-SOL-TASKS.md`](CODEX-SOL-TASKS.md)). A
fresh session reads this first and continues from **Next step**. Keep it short: the current card block plus a one-line log.

## Current card

- **Card:** C10-1, self-hosted open-licence font files.
- **Branch:** `codex/c10-1-self-hosted-fonts`
- **Started:** 2026-11-26 13:20 CET, Codex Sol cloud session.
- **Steps done:** Identified the card's owner choice before downloading fonts.
- **Next step:** Once the family is confirmed, download its official release and the existing Barlow Condensed weights and licences.
- **How to verify:** Build, confirm the fonts are shipped in `dist/`, and check that the committed assets total under 400 KB.
- **Checks so far:** `python3 build.py` — liste des assets : 221 prefabs, 39 props, 47 surfaces photo, 62 procédurales, 20 armes, 18 accessoires. `python3 tools/dev/check_decl.py` — no output, exit 0. `python3 tools/dev/check_i18n.py` — 1687 entrées anglaises, 1687 textes à traduire, 0 erreur(s). `node tools/dev/efc/smoke.mjs` — smoke ok.
- **Questions for the owner:** Use the card's default Inter at weights 400, 600 and 700 for the menu, or choose another open-licence family?
- **Watch out for:** Barlow Condensed is specified for HUD numbers. Use upstream fonts and licence texts.

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
