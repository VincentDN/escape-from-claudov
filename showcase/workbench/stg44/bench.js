// StG 44 (2044) gunsmith bench: stage, lighting, the canted rifle you turn by hand, sliding/swapping attachments and handling foley.
import * as THREE from 'three';
import * as mech from '../../shared/mech.js';
import {WEAR, PALETTES, applyPalette, materials} from './finish.js';
import {RIFLES, loadRifles} from './rifle.js';
import {readBuild, writeBuild} from './build-state.js';
import {DEFAULT_BUILD, SLOTS, optionOf} from './parts.js';
import {buildPanel} from './panel.js';
import {buildStage} from './stage.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stageEl = document.getElementById('stage'),
  status = document.getElementById('status');
const state = {variant: 'astra-a', build: {...DEFAULT_BUILD, stock: 'adjustable'}, pos: {}, palette: 'feldgrau', sound: true};
const MOUNTS = RIFLES.a.mounts; // rail ranges are shared; heights differ per rebuild
const resetPos = () => {
  for (const [k, m] of Object.entries(MOUNTS)) if (m.range) state.pos[k] = m.start;
  state.pos.stock = SLOTS.stock.slide.start;
};
resetPos();
readBuild(state, {SLOTS, PALETTES, RIFLES, WEAR});
const save = () => writeBuild(state, WEAR);
const play = fn => {
  if (!state.sound) return;
  try {
    fn();
  } catch {
    /* sound is optional */
  }
};

const {renderer, scene, camera} = buildStage(stageEl);
let dist = 2.25;

// the rifle on a pivot you turn by hand; `cant` keeps the showroom roll
const M = materials();
applyPalette(M, state.palette);
const pivot = new THREE.Group(),
  rifles = await loadRifles(M).catch(err => {
    console.error(err);
    status.textContent = 'The rifle could not load. Please reload.';
    throw err;
  }),
  rifle = new THREE.Group();
rifle.add(...Object.values(rifles).map(r => r.root));
rifle.position.x = -0.1; // centre of mass over the pivot
let rifleData = rifles[state.variant];
pivot.add(rifle);
scene.add(pivot);
const VIEWS = {hero: [-0.42, 0.14, 0.2], left: [Math.PI, 0.04, 0], right: [0, 0.04, 0], top: [-0.2, 1.15, 0], muzzle: [-1.25, 0.1, 0.1]};
const rot = {yaw: VIEWS.hero[0], pitch: VIEWS.hero[1], cant: VIEWS.hero[2], vy: 0, vp: 0, ty: null, tp: null, tc: null};
const groups = {};
function mountSlot(slot) {
  const opt = optionOf(slot, state.build[slot]);
  // stocks, magazines and the muzzle device are nodes of the rifle: show the chosen set, hide the others
  for (const r of Object.values(rifles))
    for (const o of SLOTS[slot].options) if (o.show) for (const n of r.nodes(o.show)) n.visible = o === opt;
  for (const n of rifleData.nodes('stock_adj_')) if (!n.name.endsWith('tube')) n.position.x = SLOTS.stock.slide.start - state.pos.stock;
  if (groups[slot]) rifle.remove(groups[slot]);
  delete groups[slot];
  if (!opt.build) return opt;
  const g = opt.build(M) || new THREE.Group();
  g.userData.slot = slot;
  groups[slot] = g;
  rifle.add(g);
  placeSlot(slot);
  return opt;
}
// an option shown by rifle nodes is only offered when the current rebuild has them (A has no adjustable stock)
const available = o => !o.show || rifleData.nodes(o.show).length > 0;
function showRifle(v) {
  state.variant = v;
  rifleData = rifles[v];
  for (const r of Object.values(rifles)) r.root.visible = r === rifleData;
  for (const [slot, def] of Object.entries(SLOTS))
    if (!available(optionOf(slot, state.build[slot]))) state.build[slot] = def.options.find(available).id;
  Object.keys(SLOTS).forEach(mountSlot);
  stageEl.dataset.triangles = String(rifleData.triangles);
  stageEl.dataset.variant = v;
}
function placeSlot(slot) {
  const m = rifleData.mounts[slot],
    g = groups[slot],
    opt = optionOf(slot, state.build[slot]);
  if (!g) return;
  if (m.range) {
    const half = (opt.len || 0) / 2;
    state.pos[slot] = Math.min(m.range[1] - half * 0.3, Math.max(m.range[0] + half * 0.3, state.pos[slot]));
    g.position.set(state.pos[slot], m.y, m.z || 0);
  } else g.position.set(m.x, m.y, 0);
}
showRifle(state.variant);

function setOption(slot, id) {
  const prev = optionOf(slot, state.build[slot]);
  if (prev.id === id || !available(optionOf(slot, id))) return;
  state.build[slot] = id;
  const opt = mountSlot(slot);
  const w = Math.min(1, (opt.grams || prev.grams || 100) / 600);
  play(() => (slot === 'mag' ? mech.magazine(w) : (mech.clunk(w), mech.latch(undefined, 0))));
  panel.sync();
  save();
}
function slideTo(slot, x, quiet) {
  const before = Math.round(state.pos[slot] * 100);
  state.pos[slot] = x;
  if (slot === 'stock') mountSlot('stock');
  else placeSlot(slot);
  const after = Math.round(state.pos[slot] * 100);
  if (after !== before && !quiet) play(() => mech.railStep(after > before ? 1 : -1));
  panel.sync();
  save();
}
const panel = buildPanel({
  state,
  SLOTS,
  MOUNTS,
  PALETTES,
  WEAR,
  RIFLES,
  available,
  setOption,
  slideTo,
  setVariant(v) {
    if (v === state.variant) return;
    showRifle(v);
    play(() => mech.charge());
    panel.sync();
    save();
  },
  setPalette(id) {
    state.palette = id;
    applyPalette(M, id);
    play(() => mech.tap());
    save();
  },
  setWear(v) {
    WEAR.value = v;
    play(() => mech.file());
    save();
  },
  view(name) {
    [rot.ty, rot.tp, rot.tc] = VIEWS[name];
    play(() => mech.handle(0.7));
  },
  reset() {
    Object.assign(state.build, DEFAULT_BUILD);
    resetPos();
    showRifle(state.variant);
    play(() => mech.charge());
    save();
  },
});

// pointer: drag empty space to turn the rifle, drag an attachment to slide it along its rail
const ray = new THREE.Raycaster(),
  ndc = new THREE.Vector2();
let drag = null,
  turned = 0;
const slotAt = e => {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  for (const hit of ray.intersectObject(rifle, true)) {
    let o = hit.object;
    while (o && !o.userData.slot) o = o.parent;
    return o && MOUNTS[o.userData.slot]?.range ? o.userData.slot : null;
  }
  return null;
};
renderer.domElement.addEventListener('pointerdown', e => {
  const slot = slotAt(e);
  renderer.domElement.setPointerCapture(e.pointerId);
  rot.ty = rot.tp = rot.tc = null;
  if (slot) {
    // screen direction of the bore, so dragging along the rail moves the part
    const a = new THREE.Vector3(0, 0, 0).applyMatrix4(rifle.matrixWorld).project(camera),
      b = new THREE.Vector3(0.1, 0, 0).applyMatrix4(rifle.matrixWorld).project(camera),
      r = renderer.domElement.getBoundingClientRect();
    const dx = ((b.x - a.x) * r.width) / 2,
      dy = (-(b.y - a.y) * r.height) / 2,
      len = Math.hypot(dx, dy) || 1;
    drag = {slot, x: e.clientX, y: e.clientY, ux: dx / len, uy: dy / len, perPx: 0.1 / len, start: state.pos[slot]};
    play(() => mech.handle(0.4));
  } else {
    drag = {x: e.clientX, y: e.clientY};
    play(() => mech.handle(0.6));
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!drag) {
    renderer.domElement.style.cursor = slotAt(e) ? 'ew-resize' : 'grab';
    return;
  }
  if (drag.slot) {
    const d = ((e.clientX - drag.x) * drag.ux + (e.clientY - drag.y) * drag.uy) * drag.perPx;
    slideTo(drag.slot, Math.round((drag.start + d) * 100) / 100);
    return;
  }
  const dx = (e.clientX - drag.x) * 0.006,
    dy = (e.clientY - drag.y) * 0.004;
  drag.x = e.clientX;
  drag.y = e.clientY;
  rot.yaw += dx;
  rot.pitch = Math.min(1.3, Math.max(-0.9, rot.pitch + dy));
  rot.vy = dx;
  rot.vp = dy;
  turned += Math.abs(dx) + Math.abs(dy);
  if (turned > 0.55) {
    turned = 0;
    play(() => mech.handle(0.35 + Math.min(0.5, Math.abs(dx) * 6)));
  }
});
const release = () => {
  if (drag && !drag.slot && Math.abs(rot.vy) + Math.abs(rot.vp) < 0.004) play(() => mech.tap());
  drag = null;
};
renderer.domElement.addEventListener('pointerup', release);
renderer.domElement.addEventListener('pointercancel', release);
renderer.domElement.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    dist = Math.min(3.4, Math.max(0.9, dist * (e.deltaY > 0 ? 1.08 : 0.92)));
  },
  {passive: false},
);
stageEl.addEventListener('keydown', e => {
  const k = {ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08]}[e.key];
  if (k) {
    rot.ty = rot.tp = rot.tc = null;
    rot.yaw += k[0];
    rot.pitch = Math.min(1.3, Math.max(-0.9, rot.pitch + k[1]));
    play(() => mech.handle(0.3));
  } else if (e.key === '+' || e.key === '=') dist = Math.max(0.9, dist * 0.92);
  else if (e.key === '-') dist = Math.min(3, dist * 1.08);
  else return;
  e.preventDefault();
});

function resize() {
  const w = stageEl.clientWidth,
    h = stageEl.clientHeight;
  camera.aspect = w / h;
  camera.fov = w < h ? 46 : 30;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
new ResizeObserver(resize).observe(stageEl);
resize();
status.hidden = true;
panel.sync();

let last = performance.now();
renderer.setAnimationLoop(now => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (rot.ty !== null) {
    const k = reduce ? 1 : 1 - Math.exp(-dt * 6);
    rot.yaw += (rot.ty - rot.yaw) * k;
    rot.pitch += (rot.tp - rot.pitch) * k;
    rot.cant += (rot.tc - rot.cant) * k;
  } else if (!drag && !reduce) {
    rot.yaw += rot.vy;
    rot.pitch = Math.min(1.3, Math.max(-0.9, rot.pitch + rot.vp));
    rot.vy *= 0.92;
    rot.vp *= 0.92;
  }
  const idle = reduce ? 0 : Math.sin(now / 1900) * 0.012;
  pivot.rotation.set(rot.pitch + idle, rot.yaw + idle * 0.6, 0);
  rifle.rotation.x = rot.cant;
  pivot.position.y = reduce ? 0 : Math.sin(now / 2300) * 0.004;
  camera.position.set(0, 0.2, dist);
  camera.lookAt(0, 0.0, 0);
  renderer.render(scene, camera);
});
