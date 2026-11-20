# To do for Vincent: soldier animations from Mixamo

## The short version

Right now the soldiers in Claudov move with "procedural" poses: the game works out arm and leg positions with maths. It works,
but it looks a bit stiff. The game Claudov was built from used real motion-capture animations from **Mixamo**, a free Adobe
website. We had to take those out, because Mixamo lets you use its animations **in** a game, but not hand the files around to
other people. So the animations have to come from **your own** Mixamo account. Nobody else can do that step for you.

Think of it like a recipe. Mixamo is the shop, the animations are the ingredients, and our bake tool
(`tools/dev/anim/cuire.mjs`) is the oven. You buy the ingredients (free, with your login), we bake them, and only the baked
cake (a small data file) goes into the game.

## What you need

- An Adobe account (free). Log in at https://www.mixamo.com.
- About 50 animations, listed below. Most are in Mixamo's rifle and pistol locomotion packs. Mixamo's own titles differ from
  ours, so pick the closest match by looking at the preview.
- Blender (free), only to turn Mixamo's FBX files into GLB files. An agent can do this part for you if you send the files.

## Step by step

1. **Pick the soldier.** On Mixamo, choose the plain "Y Bot" character. Every animation must use the same character.
2. **Find each animation** in the list below, and download it with these settings:
   - Format: FBX Binary
   - Skin: Without Skin
   - Frames per second: 30
   - Keyframe reduction: none
   - For the walking, running and sprinting ones, tick **In Place** off (leave the movement in; our oven removes it itself).
3. **Name each file** as in the left column below, and put them in folders the same way (for example
   `fusil/debout/marche-avant.fbx`).
4. **Hand them over.** Two choices:
   - **Easy:** zip the folder and put it somewhere private an agent can reach (a private GitHub repository, or a private Dropbox
     link). Do **not** put it in the public `escape-from-claudov` repository. Then ask an agent to "convert and bake the Mixamo
     pack". It will convert FBX to GLB in Blender, write the list file the oven needs, run the oven, check the result in the game
     and commit only the baked file.
   - **Do it yourself:** convert each FBX to GLB in Blender (File, Import FBX, then File, Export glTF 2.0 as GLB), put the GLB
     folder at `anim-source/` in your local copy of the repository (that folder is never committed), and ask an agent for the
     `manifest.json` file, then run `node tools/dev/anim/cuire.mjs` and `python3 build.py`.
5. **Decide one thing** (below), then the baked file goes into the game and the soldiers move properly.

## The one decision you need to make

The baked file is small (about 90 KB) and is not the Mixamo files themselves, but it is made from them. The original game kept
its baked file in its public repository and wrote in its notice that the animations are not under the open licence. You can do
the same: commit the baked file, with a line in `NOTICE.md` saying it comes from Mixamo under Mixamo's terms and is not covered
by the MIT licence. Or, if you prefer to be careful, keep the repository private. Mixamo's terms are the authority here: if in
doubt, read them on the Mixamo site before you decide.

## The list of animations

Left: the file name the game expects. Right: what to look for on Mixamo. "Loop" means it repeats; the angle is the direction of
travel (0 is forward, 90 is to the left, -90 to the right, 180 backwards).

### Rifle, standing

| File | Look for | Loop |
| --- | --- | --- |
| `fusil/debout/idle` | rifle idle, standing relaxed | yes |
| `fusil/debout/idle-visee` | rifle idle, aiming | yes |
| `fusil/debout/marche-avant` | rifle walk forward (0) | yes |
| `fusil/debout/marche-avant-gauche` | rifle walk forward left (45) | yes |
| `fusil/debout/marche-gauche` | rifle walk left / strafe left (90) | yes |
| `fusil/debout/marche-arriere-gauche` | rifle walk backward left (135) | yes |
| `fusil/debout/marche-arriere` | rifle walk backward (180) | yes |
| `fusil/debout/marche-arriere-droite` | rifle walk backward right (-135) | yes |
| `fusil/debout/marche-droite` | rifle walk right / strafe right (-90) | yes |
| `fusil/debout/marche-avant-droite` | rifle walk forward right (-45) | yes |
| `fusil/debout/course-avant` | rifle run forward (0) | yes |
| `fusil/debout/course-avant-gauche` | rifle run forward left (45) | yes |
| `fusil/debout/course-gauche` | rifle run left (90) | yes |
| `fusil/debout/course-arriere-gauche` | rifle run backward left (135) | yes |
| `fusil/debout/course-arriere` | rifle run backward (180) | yes |
| `fusil/debout/course-arriere-droite` | rifle run backward right (-135) | yes |
| `fusil/debout/course-droite` | rifle run right (-90) | yes |
| `fusil/debout/course-avant-droite` | rifle run forward right (-45) | yes |
| `fusil/debout/sprint-avant` | rifle sprint forward (0) | yes |
| `fusil/debout/sprint-avant-gauche` | rifle sprint forward left (45) | yes |
| `fusil/debout/sprint-avant-droite` | rifle sprint forward right (-45) | yes |
| `fusil/debout/pivot-90-gauche` | rifle turn 90 left | no |
| `fusil/debout/pivot-90-droite` | rifle turn 90 right | no |

### Rifle, crouched

| File | Look for | Loop |
| --- | --- | --- |
| `fusil/accroupi/idle` | crouched rifle idle | yes |
| `fusil/accroupi/idle-visee` | crouched rifle aiming | yes |
| `fusil/accroupi/marche-avant` | crouch walk forward (0) | yes |
| `fusil/accroupi/marche-avant-gauche` | crouch walk forward left (45) | yes |
| `fusil/accroupi/marche-gauche` | crouch walk left (90) | yes |
| `fusil/accroupi/marche-arriere-gauche` | crouch walk backward left (135) | yes |
| `fusil/accroupi/marche-arriere` | crouch walk backward (180) | yes |
| `fusil/accroupi/marche-arriere-droite` | crouch walk backward right (-135) | yes |
| `fusil/accroupi/marche-droite` | crouch walk right (-90) | yes |
| `fusil/accroupi/marche-avant-droite` | crouch walk forward right (-45) | yes |
| `fusil/accroupi/pivot-90-gauche` | crouched turn 90 left | no |
| `fusil/accroupi/pivot-90-droite` | crouched turn 90 right | no |

### Rifle, jumping

| File | Look for | Loop |
| --- | --- | --- |
| `fusil/saut/depart` | rifle jump start | no |
| `fusil/saut/vol` | rifle jump in the air | yes |
| `fusil/saut/reception` | rifle jump landing | no |

### Pistol

| File | Look for | Loop |
| --- | --- | --- |
| `pistolet/idle` | pistol idle | yes |
| `pistolet/marche-avant` | pistol walk forward (0) | yes |
| `pistolet/marche-arriere` | pistol walk backward (180) | yes |
| `pistolet/course-avant` | pistol run forward (0) | yes |
| `pistolet/course-arriere` | pistol run backward (180) | yes |
| `pistolet/pas-lateral-gauche` | pistol strafe left (90) | yes |
| `pistolet/pas-lateral-droite` | pistol strafe right (-90) | yes |

### Actions

| File | Look for | Loop |
| --- | --- | --- |
| `actions/glissade` | running slide | no |
| `actions/coup-recu` | hit reaction (small flinch) | no |
| `actions/tir-recul` | rifle firing recoil | no |
| `actions/lancer-grenade` | throw grenade | no |
| `actions/rechargement` | rifle reload | no |

## How you will know it worked

After the bake, an agent runs the game's animation comparison check and takes side-by-side pictures: old procedural poses next
to the new ones. Soldiers should walk, run, crouch and turn with natural weight, and their feet should not slide.

## If you would rather not

That is fine. The game already works without these files. The omnimovement work (prone, dives, rolls) in the roadmap will add
more poses either way; real animations make everything look better but nothing depends on them.
