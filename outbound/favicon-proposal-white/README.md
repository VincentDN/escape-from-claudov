# Favicon proposal: white Kotwica and white border

Two versions of the site icon, both in the style of the old Partisan lambda icon (red tile, dithered drop shadow, soft outline on the
emblem). `comparison.png` shows them at 16, 32, 64 and 128 pixels next to the old lambda, on a dark and a light browser tab.

- **Dark green** (`favicon-dark-green.svg`, PNGs at 32, 64, 256): emblem and border in the lambda icon's dark green. This is the
  one now in the game.
- **White** (`favicon-white.svg`, PNGs at 32, 64, 256): emblem and border in white. Not shipped. The white border disappears on
  light browser tabs, where only the shadow outlines the tile.

To switch to the white version, change `SHIP` to use `WHITE_PROPOSAL` in `tools/dev/efc/brand-kotwica.mjs` and run it again.
Both are adaptations of the CC BY-SA 4.0 Kotwica drawing credited in `NOTICE.md`.
