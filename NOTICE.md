# Escape From Claudov: credits and what is not under the MIT License

Escape From Claudov is built on the source code of **Riposte: Frontline 5.6.0** (https://github.com/BenDBSS/Riposte-Frontline-Source),
which its author published under the MIT License. The `LICENSE` file keeps that license and copyright notice. This game is a separate
work with its own name and logo; it is not the official Riposte: Frontline and is not endorsed by its author.

Removed from the Riposte snapshot because the MIT License does not cover them: the Riposte name, logo, icons and Steam Deck art, the
menu, rank-up and end-of-match music, the soldier animations baked from Mixamo, and the hit-marker sound sample. Do not add them back.

What remains under its own terms:

1. **Sounds and voices** (`assets/sfx/`): each source keeps its license, listed in `assets/sfx/credits.json`. Most are CC0; the CC BY
   ones require crediting their author, as that file does.
2. **Textures, skies and HDRI** (`assets/tex/`, `assets/sky/`, `assets/vendor/hdri/`): Poly Haven and ambientCG, CC0 (`assets/tex/credits.json`).
3. **Libraries**: three.js r147 (MIT, notice at the top of `assets/vendor/three-r147.js`); PeerJS (MIT), loaded from jsDelivr for online lobbies.
4. **Soldier animations**: none are shipped. The game runs on the engine's procedural poses. To add baked clips, bake them from your own
   Mixamo account with `tools/dev/anim/cuire.mjs`; Mixamo's terms allow use in a game, not redistribution of the clips on their own.
