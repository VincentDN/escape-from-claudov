// StG 44 (2044) bench: the two competing rebuilds (A: LLM-Rebuild, B: Neuro-Bash), their finishes and attachment mounts.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {correctNeuroMagazines} from '../neuro-magazines.js';

// Where attachments sit, in metres (+x muzzle, +y up, +z the right side). Rail slots carry the x range a part may slide along.
// Both rebuilds start from the same base model, so the rails line up within a few millimetres.
const mounts = ({rail, under, muzzle}) => ({
  optic: {y: rail, range: [0.16, 0.3], start: 0.2},
  laser: {y: rail, range: [0.28, 0.355], start: 0.32},
  light: {y: 0.054, z: 0.028, range: [0.24, 0.47], start: 0.42},
  under: {y: under, range: [0.205, 0.275], start: 0.24},
  muzzle: {x: muzzle, y: 0.05},
});
export const RIFLES = {
  'astra-a': {
    file: 'stg44-2044-astra-a.glb',
    label: 'Magnific · Tripo P2 A',
    note: 'Side-profile concept pass. Generated with Tripo P2 via Magnific’s image-to-3D API. Selected for its straight silhouette and closer match to the base drawing.',
    mounts: mounts({rail: 0.12, under: 0.031, muzzle: 0.561}),
  },
  'astra-b': {
    file: 'stg44-2044-astra-b.glb',
    label: 'Magnific · Tripo P2 B',
    note: 'Three-quarter concept pass. Generated with Tripo P2 via Magnific’s image-to-3D API. The front sight sits lower and the fore-end slopes more.',
    mounts: mounts({rail: 0.118, under: 0.023, muzzle: 0.554}),
  },
  a: {
    file: 'stg44-2044-a.glb',
    label: 'Claude Opus A · LLM-Rebuild',
    note: 'Rebuilt part by part in code from the base model, checked against reference rifles for where the bolt, ejection port, selector and pins go.',
    mounts: mounts({rail: 0.131, under: 0.0302, muzzle: 0.556}),
  },
  b: {
    file: 'stg44-2044-b.glb',
    label: 'Claude Opus B · Neuro-Bash',
    note: 'The base model kept as the hull, with its blobby parts cut away and replaced by parts from free donor rifles.',
    mounts: mounts({rail: 0.126, under: 0.033, muzzle: 0.554}),
  },
};

async function load(v, M) {
  const gltf = await new GLTFLoader().loadAsync(new URL(`../../assets/models/weapons/${RIFLES[v].file}`, import.meta.url).href);
  const root = gltf.scene;
  if (v === 'b') correctNeuroMagazines(root);
  let triangles = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry;
    // the generators tag chamfers and hard edges in _EDGE; the finish shader reads it as aEdge
    g.setAttribute('aEdge', g.getAttribute('_edge') || new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
    const finish = M[o.material.name] || M.furniture;
    if (v.startsWith('astra-')) {
      const painted = finish.clone();
      painted.onBeforeCompile = finish.onBeforeCompile;
      painted.map = o.material.map;
      painted.color = finish.color;
      o.material = painted;
    } else o.material = finish;
    o.castShadow = o.receiveShadow = true;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  const nodes = prefix => root.children.filter(o => o.name.startsWith(prefix));
  return {id: v, root, triangles: Math.round(triangles), nodes, mounts: RIFLES[v].mounts};
}

// Loads both rebuilds so switching between them is instant.
export async function loadRifles(M) {
  const rifles = Object.fromEntries(await Promise.all(Object.keys(RIFLES).map(async id => [id, await load(id, M)])));
  for (const id of ['astra-a', 'astra-b']) {
    for (const part of rifles.b.nodes('stock_adj')) {
      const stock = part.clone();
      stock.geometry = stock.geometry.clone().translate(-0.023, -0.014, 0);
      rifles[id].root.add(stock);
    }
  }
  return rifles;
}
