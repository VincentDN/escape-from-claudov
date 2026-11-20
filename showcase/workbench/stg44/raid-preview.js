// The raid menu owns stash edits. This iframe displays the current draft with the Partisan bench lighting.
import * as THREE from 'three';
import { MODELS } from '../../intro/ak15-weapon-customiser/models.js';
import { loadModel } from '../../shared/model-cache.js';
import { applyPalette, materials } from './finish.js';
import { SLOTS, optionOf } from './parts.js';
import { loadRifle } from './rifle.js';
import { buildStage } from './stage.js';

const stage = document.getElementById('stage'), status = document.getElementById('status');
const ak = new URLSearchParams(location.search).get('model') === 'ak47';
const mats = materials(), pivot = new THREE.Group(), rifle = new THREE.Group(), mounted = new Map();
let dirty = false, turn = null, yaw = -.35, pitch = .12, distance = 2.15;
const { renderer, scene, camera } = buildStage(stage, draw);
scene.add(pivot);
pivot.add(rifle);
function draw() {
  if (dirty) return;
  dirty = true;
  requestAnimationFrame(() => {
    dirty = false;
    pivot.rotation.set(pitch, yaw, .15);
    camera.position.set(0, .2, distance);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
}
function resize() {
  if (!stage.clientWidth || !stage.clientHeight) return;
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  draw();
}
new ResizeObserver(resize).observe(stage);
const defaultParts = { optic: 'none', laser: 'none', light: 'none', under: 'none', muzzle: 'brake', mag: 'kurz25', stock: 'fixed' };
const finishNames = { stock: 'feldgrau', foret: 'twotone', urbain: 'panzergrau', desert: 'feldgrau' };
const akColors = { stock: 0xffffff, foret: 0x899867, urbain: 0x91939a, desert: 0xbda574 };
let build, draft = { parts: {}, finish: 'stock' };

function sync() {
  if (!build) return;
  const parts = { ...defaultParts, ...draft.parts };
  if (ak) {
    for (const mesh of build.finishSurfaces) mesh.material.color.copy(mesh.userData.factory).multiply(new THREE.Color(akColors[draft.finish] || akColors.stock));
    for (const node of build.muzzle) node.visible = parts.muzzle !== 'supp';
    for (const node of build.mag) node.scale.y = node.userData.factoryScale * (parts.mag === 'ak45' ? 1.35 : 1);
  } else {
    applyPalette(mats, finishNames[draft.finish] || 'feldgrau');
    if (draft.finish === 'desert') {
      mats.body.color.setHex(0x6b5b42);
      mats.furniture.color.setHex(0x775f42);
    }
    for (const [slot, def] of Object.entries(SLOTS)) {
      for (const option of def.options) {
        if (option.show) for (const node of build.nodes(option.show)) node.visible = option.id === parts[slot];
      }
    }
    for (const node of build.nodes('rear_sight')) node.visible = parts.optic === 'none';
  }
  for (const [slot, mount] of Object.entries(build.mounts)) {
    const id = parts[slot], past = mounted.get(slot);
    if (past?.id === id) continue;
    if (past?.group) rifle.remove(past.group);
    const group = id === 'none' || !id ? null : optionOf(slot, id).build?.(mats);
    if (group) {
      group.position.set(mount.x ?? mount.start, mount.y, mount.z || 0);
      group.addEventListener('loaded', draw, { once: true });
      rifle.add(group);
    }
    mounted.set(slot, { id, group });
  }
  stage.dataset.mods = JSON.stringify(draft.parts);
  draw();
}
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'efc:bench-preview') return;
  draft = { parts: event.data.parts || {}, finish: event.data.finish };
  sync();
});

async function loadAk() {
  const config = MODELS.ak74m;
  const root = await loadModel(new URL('../../assets/models/weapons/ak-74m-zenitco.glb', import.meta.url).href);
  root.scale.setScalar(config.scale);
  const nodes = id => config.parts.find(part => part.id === id)?.nodes.map(name =>
    root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name))).filter(Boolean) || [];
  for (const node of [...nodes('optic'), ...nodes('foregrip')]) node.visible = false;
  const finishSurfaces = [];
  root.traverse(node => {
    if (!node.isMesh) return;
    node.material = node.material.clone();
    node.userData.factory = node.material.color.clone();
    node.castShadow = node.receiveShadow = true;
    finishSurfaces.push(node);
  });
  const mag = nodes('magazine');
  for (const node of mag) node.userData.factoryScale = node.scale.y;
  const sockets = Object.fromEntries(config.sockets.map(([key, , position]) => [key, position.map(value => value * config.scale)]));
  const mount = ([x, y, z]) => ({ x, y, z });
  return {
    root, finishSurfaces, muzzle: nodes('muzzle'), mag,
    mounts: { optic: mount(sockets.optic), under: mount(sockets.foregrip), muzzle: mount(sockets.muzzle),
      laser: mount(sockets.side), light: mount(sockets.side) },
  };
}

try {
  build = ak ? await loadAk() : await loadRifle('b', mats);
  rifle.add(build.root);
  rifle.position.x = -.08;
  status.hidden = true;
  sync();
} catch (error) {
  status.textContent = 'The weapon preview could not load.';
  console.error(error);
}
stage.addEventListener('pointerdown', event => {
  stage.setPointerCapture(event.pointerId);
  turn = [event.clientX, event.clientY];
});
stage.addEventListener('pointermove', event => {
  if (!turn) return;
  yaw += (event.clientX - turn[0]) * .008;
  pitch = THREE.MathUtils.clamp(pitch + (event.clientY - turn[1]) * .006, -.9, 1.2);
  turn = [event.clientX, event.clientY];
  draw();
});
stage.addEventListener('lostpointercapture', () => { turn = null; });
stage.addEventListener('wheel', event => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance * (event.deltaY > 0 ? 1.1 : .9), .95, 3.5);
  draw();
}, { passive: false });
stage.addEventListener('keydown', event => {
  const move = { ArrowLeft: [-.12, 0, 1], ArrowRight: [.12, 0, 1], ArrowUp: [0, -.12, 1], ArrowDown: [0, .12, 1],
    '+': [0, 0, .9], '=': [0, 0, .9], '-': [0, 0, 1.1] }[event.key];
  if (!move) return;
  event.preventDefault();
  yaw += move[0];
  pitch = THREE.MathUtils.clamp(pitch + move[1], -.9, 1.2);
  distance = THREE.MathUtils.clamp(distance * move[2], .95, 3.5);
  draw();
});
