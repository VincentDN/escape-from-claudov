# Porting a Partisan rifle to Claudov

The raid StG 44 uses the Neuro-Bash model from Partisan. Its fixed stock, detachable magazine and clean profile helped it read as a separate rifle at raid distance. The installed model is a fixed configuration with no player attachment slots.

1. Run `blender -b --python tools/dev/efc/prepare-stg44.py` from the repository. The offline script drops the spare magazine, alternate stock and rail nodes, then decimates the remaining parts. The compact static GLB has 4,076 triangles before the engine's own world LOD step.
2. The build embeds the reduced GLB for the existing offline game entry point. The model adapter reads static indexed meshes into Three.js r147 and rotates the asset from Partisan's +X axis to the engine's −Z axis. It gives the detachable magazine its own geometry and applies the existing rifle materials.
3. The engine uses the ordinary rifle choreography and sound routing. The 7.92×33 mm Kurz rifle has a 25-round magazine, a fire rate of 520 rpm and a weight of 4.6 kg in raid inventory. It uses the shared rifle ammunition pool. The automatic weapon catalogue exposes `w_stg44`, the thumbnail and the weapon-crate and elite-Warden loot pools.

## Partisan Workbench catalogue

Run `node tools/dev/efc/prepare-partisan-raid.mjs /path/to/partisan-project` with Node 22.15 or newer. The import was generated from Partisan revision `59a544d`. It builds the 14 additional rifle configurations and supplies the full Neuro-Bash mesh when an authored swap replaces part of the compact StG 44. The export keeps separate magazine meshes and source mount points. It bakes 41 alternative choices that have geometry. Factory defaults come with the rifle. Empty options are represented by the absence of an installed item.

The raid uses Claudov's animation families and sound mix. The meshes use simplified materials. The hideout uses the assembled raid model for the preview when imported parts are available. Only the existing field-swappable slot types can be changed inside a raid.
