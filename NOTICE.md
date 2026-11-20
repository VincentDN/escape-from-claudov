# Escape From Claudov: credits and what is not under the MIT License

Escape From Claudov is built on the source code of **Riposte: Frontline 5.6.0** (https://github.com/BenDBSS/Riposte-Frontline-Source),
which its author published under the MIT License. The `LICENSE` file keeps that license and copyright notice. This game is a separate
work with its own name and logo; it is not the official Riposte: Frontline and is not endorsed by its author.

Removed from the Riposte snapshot because the MIT License does not cover them: the Riposte name, logo, icons and Steam Deck art, the
menu, rank-up and end-of-match music, the soldier animations baked from Mixamo, and the hit-marker sound sample. Do not add them back.

What remains under its own terms:

1. **Sounds and voices** (`assets/sfx/`): each source keeps its license, listed in `assets/sfx/credits.json`. Most are CC0; the CC BY
   ones require crediting their author, as that file does.
   - Weapon handling bank (`assets/sfx/handling/hf_*`, 42 takes from Partisan Project): supplied by the owner, checked and cleared by
     the owner for this public repository. The other Partisan sounds (`f_casing_wood`, `assets/sfx/ballistics/`) are Freesound CC0,
     authors and source pages in `assets/sfx/credits.json`.
2. **Textures, skies and HDRI** (`assets/tex/`, `assets/sky/`, `assets/vendor/hdri/`): Poly Haven and ambientCG, CC0 (`assets/tex/credits.json`).
3. **Libraries**: three.js r147 (MIT, notice at the top of `assets/vendor/three-r147.js`); PeerJS (MIT), loaded from jsDelivr for online lobbies.
4. **Soldier animations**: none are shipped. The game runs on the engine's procedural poses. To add baked clips, bake them from your own
   Mixamo account with `tools/dev/anim/cuire.mjs`; Mixamo's terms allow use in a game, not redistribution of the clips on their own.
5. **Music and harbour layer** (`assets/music/`, P5): every file is CC0 1.0 from OpenGameArt, each page fetched and its licence read
   on 15 November 2026; title, author, source page and processing per file in `assets/music/credits.json`. CC0 needs no attribution,
   the authors are credited anyway:
   - Menu theme: *Tension* by Tsorthan Grove, https://opengameart.org/content/tension-0
   - Raid beds: *Dark Ambient Drone*, *Machines* and *Wastelands* by Tsorthan Grove, https://opengameart.org/content/dark-ambient-drone,
     https://opengameart.org/content/machines, https://opengameart.org/content/wastelands
   - Stings: *Dark Stinger 1* by Kresiek The Furry (https://opengameart.org/content/dark-stinger-1); *String and piano horror stings*
     by congusbongus (https://opengameart.org/content/string-and-piano-horror-stings); *Light Through a Pale Window* from
     *Background Drones Vol 1* by Tsorthan Grove (https://opengameart.org/content/background-drones-vol-1)
   - Claudov harbour chains: *Chain winch sounds* by bart (https://opengameart.org/content/chain-winch-sounds)

6. **Kotwica emblem** (`assets/brand/kotwica.svg`): the anchor sign of Polska Walcząca, the Polish Underground State (1942). The
   drawing used here is *Kotwica jako symbol Polski Walczącej* by Paweł Kruczyński, from Wikimedia Commons
   (https://commons.wikimedia.org/wiki/File:Kotwica_jako_symbol_Polski_Walcz%C4%85cej.svg), licensed **CC BY-SA 4.0**
   (https://creativecommons.org/licenses/by-sa/4.0/); file page read on 20 November 2026. The site icons (`assets/icon/`,
   `showcase/assets/img/favicon.svg`) and the intro flag texture (`showcase/intro/polish-resistance-flag.png`) are adaptations
   (placed on a red tile, and on a white and red flag) made by `tools/dev/efc/brand-kotwica.mjs`, and are shared under the same
   CC BY-SA 4.0 licence. In Poland the sign is protected by the Act of 10 June 2014 on the protection of the Sign of Fighting Poland:
   use it respectfully.

The raid StG 44 model is a reduced derivative of the Partisan Project Neuro-Bash showcase asset, cleared by Vincent De Nil for this repository. See `showcase/asset-credits.json` and `docs/weapon-port.md`.
