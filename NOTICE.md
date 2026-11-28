# Escape From Claudov: credits and what is not under the MIT License

Escape From Claudov is built on the source code of **Riposte: Frontline 5.6.0** (https://github.com/BenDBSS/Riposte-Frontline-Source),
which its author published under the MIT License. The `LICENSE` file keeps that license and copyright notice. This game is a separate
work with its own name and logo; it is not the official Riposte: Frontline and is not endorsed by its author.

Removed from the Riposte snapshot because the MIT License does not cover them: the Riposte name, logo, icons and Steam Deck art, the
menu, rank-up and end-of-match music, the soldier animations baked from Mixamo, and the hit-marker sound sample. Do not add them back.

What remains under its own terms:

1. **Sounds and voices** (`assets/sfx/`): each source keeps its license, listed in `assets/sfx/credits.json`. Most are CC0; the CC BY
   ones require crediting their author, as that file does.
   - Workbench turn bank (`assets/sfx/workbench_foley/`): the 12 Partisan Project handling and hit recordings used by the StG 44
     workbench, supplied and cleared by Vincent De Nil for this repository. Shared handling uses ElevenLabs and CC0 takes. The
     `weapon_foley` pack combines ElevenLabs generations and credited legacy recordings. See `assets/sfx/credits.json` for sources.
   - First-person firing pack (`assets/sfx/platform_fire/`) layers ElevenLabs Sound Effects v2 attacks into CC0 Free Firearm Sound
     Library recordings. The credits ledger identifies both sources for every mix.
2. **Textures, skies and HDRI** (`assets/tex/`, `assets/sky/`, `assets/vendor/hdri/`): Poly Haven and ambientCG, CC0 (`assets/tex/credits.json`).
3. **Libraries**: three.js r147 (MIT, notice at the top of `assets/vendor/three-r147.js`); PeerJS 1.5.5 (MIT), from
   https://registry.npmjs.org/peerjs/-/peerjs-1.5.5.tgz for online lobbies. Its distribution and license are in `assets/vendor/`.
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


7. **UI fonts** (`assets/fonts/`), both under the **SIL Open Font License 1.1**. Each family includes its upstream `OFL.txt`.
   - Inter 4.1, weights 400, 600 and 700, from https://github.com/rsms/inter/releases/tag/v4.1.
     The web fonts are subset to Latin and extended Latin, common punctuation, currency, arrows and symbols.
   - Barlow Condensed 1.408, weights 400, 500, 600 and 700, from
     https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/barlowcondensed.
     The upstream TrueType files were compressed to WOFF2 with their full character coverage.

The raid StG 44 model is a reduced derivative of the Partisan Project Neuro-Bash showcase asset, cleared by Vincent De Nil for this repository. See `showcase/asset-credits.json` and `docs/weapon-port.md`.

**Q2 raid rifle geometry** (`assets/raid-models/partisan.json`): from Partisan Project. Geometry is baked, reoriented and quantized for Claudov. Third-party assets retain their original terms. Source files and recorded credits are listed below.

- `ak-74m-zenitco.glb` — D_U · CC BY 4.0 · https://sketchfab.com/3d-models/low-poly-ak-74m-zenitco-35ad8e37a513453cbbbd04064fa5fb79
- `ak-15k.glb` — D_U · CC BY 4.0 · https://sketchfab.com/3d-models/low-poly-ak-15-k-68725380dd654391bb6b751e888e2c44
- `g3.glb` — DU1701 · https://sketchfab.com/3d-models/86ff01824c394e349cda876a827fa69c
- `m16.glb` — TastyTony · https://sketchfab.com/3d-models/f7eddeb852f84094a7ba26e293223d10
- `mk14.glb` — TastyTony · https://sketchfab.com/3d-models/0dc89b4028ef4a1bbc1ed2ec077f3d21
- `spear.glb` — DU1701 · https://sketchfab.com/3d-models/36ac159795ae465e8a4d44068bbaf434
- `stg44.glb` — DU1701 · https://sketchfab.com/3d-models/c343d3531806490e851976d4f0391c14
- `ppsh41.glb` — DU1701 · https://sketchfab.com/3d-models/d610bf73066d4bb7a96834858772384a
- `bren.glb` — TastyTony · https://sketchfab.com/3d-models/035555d607c142528e2eaf4c02af8c5b
- `chauchat.glb` — TastyTony · https://sketchfab.com/3d-models/ae9d3c2b5c3542e0829aac8d0cb7d6e5
- `rpk-762.glb` — DU1701 · https://sketchfab.com/3d-models/628d823c021f4bfa814a66674ac658dc
- `stg44-2044-astra-a.glb`
- `stg44-2044-astra-b.glb`

**Partisan attachment geometry** (`assets/raid-models/partisan-parts.json`), including procedurally generated Workbench parts and derivatives of these source models.

- `muzzle-set.glb` — DU1701 · https://sketchfab.com/3d-models/07f62ec5ca604446848d1a0238b11f1d
- `collimator-set.glb` — DU1701 · https://sketchfab.com/3d-models/288373d26dd84db2898920222ac3e430
- `eotech.glb` — GoldbergR · https://sketchfab.com/3d-models/5c8f29d9895e48e183a085fefabf0e14
- `iron-sight-set.glb` — DU1701 · https://sketchfab.com/3d-models/dd89d27a54474b2aa3bf1cadc699c556
- `grip-rvg.glb` — notcplkerry · https://sketchfab.com/3d-models/86b3580a65c441db9d3401712c5c9b6d
- `grip-afg.glb` — notcplkerry · https://sketchfab.com/3d-models/a92a52cbb5854f7c8e33507f579073f7
- `peq15.glb` — DU1701 · https://sketchfab.com/3d-models/522f6a04c34946dbb168022187645c1a
- `peq2.glb` — DU1701 · https://sketchfab.com/3d-models/820ee672677a4f8daab617f1723820a2
- `light-surefire.glb` — haoliu95 · https://sketchfab.com/3d-models/09bba490e5e44ac6a412cc363eb2b41e
- `ak-grips.glb` — notcplkerry · https://sketchfab.com/3d-models/044c2b403fc341738b5af9f3b90fefc9
- `ak74-drum.glb` — aayushsahaywork · https://sketchfab.com/3d-models/8ae00f51dc1649b8b5b592d153f3a3f4
- `gp25.glb` — DU1701 · https://sketchfab.com/3d-models/8dbdec74bad944a9b7eca73b2a6269fa
- `g3-bipod.glb` — GoldbergR · https://sketchfab.com/3d-models/b525a696d09d48a484db53c2002d02fb
