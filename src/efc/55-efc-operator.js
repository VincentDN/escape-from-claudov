/* Shared A8 inventory panels. Preview renders on demand through the game's outfit renderer. */
const EFC_OPERATOR_VIEWS = new Map();

function efcOperatorPanel(id, weapon, inv) {
  let view = EFC_OPERATOR_VIEWS.get(id);
  if (!view) {
    const model = $(id), hideout = id === 'efcOpHideout', root = model.closest(hideout ? '#scr-hideout' : '.efc-ov');
    model.innerHTML = '<p class="lbl">Operator</p><canvas width="300" height="400" tabindex="0" data-key="operator" aria-label="Rotate the operator with the arrow keys or by dragging"></canvas>';
    const canvas = model.querySelector('canvas');
    view = { id, root, hideout, canvas, hands: root.querySelector('.efc-op-hands'), angle: 0.55, drag: null, frame: 0, drawn: '' };
    efcOperatorInteractions(view);
    EFC_OPERATOR_VIEWS.set(id, view);
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      view.drag = { x: event.clientX, angle: view.angle };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!view.drag) return;
      view.angle = view.drag.angle - (event.clientX - view.drag.x) * 0.008;
      efcOperatorDraw(view);
    });
    canvas.addEventListener('lostpointercapture', () => { view.drag = null; });
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      view.angle += event.key === 'ArrowLeft' ? 0.13 : -0.13;
      efcOperatorDraw(view);
    });
  }
  view.inv = inv;
  if (view.selected && !view.selected.isConnected) efcOperatorSelect(view, null);
  view.skin = skinMine();
  view.weapon = weapon?.key ?? null;
  view.hands.textContent = weapon?.name || 'Empty';
  efcOperatorQuickDraw(view);
  efcOperatorDraw(view);
}

function efcOperatorGear(view) {
  const armor = view.inv?.slots.armor, pack = view.inv?.slots.pack;
  const key = JSON.stringify([armor?.id, pack?.id]);
  if (view.gearKey === key) return view.gear;
  view.gear?.traverse(node => { if (node.isMesh) node.geometry.dispose(); });
  const gear = new THREE.Group();
  const rest = soldierRest().mats[SB.CHE].clone().invert();
  const packHeight = { pack_s: .29, pack_m: .39, pack_l: .54 };
  for (const [item, width, height, z, turn] of [[armor, .34, .43, -.12, Math.PI], [pack, .36, packHeight[pack?.id] || .38, .23, 0]]) {
    if (!item) continue;
    const prop = efcCall('thumb:gearProp', efcUiDef(item.id));
    if (!prop) continue;
    const box = new THREE.Box3().setFromObject(prop), center = box.getCenter(new V3()), size = box.getSize(new V3());
    prop.position.copy(center.negate());
    const placement = new THREE.Group(); placement.add(prop);
    const scale = Math.min(width / size.x, height / size.y), p = new V3(0, 1.25, z);
    placement.matrix.copy(rest).multiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))
      .multiply(new THREE.Matrix4().makeRotationY(turn)).scale(new V3(scale, scale, scale));
    placement.matrixAutoUpdate = false;
    gear.add(placement);
  }
  view.gearKey = key; view.gear = gear;
  return gear;
}

function efcOperatorDraw(view) {
  if (view.frame) return;
  view.frame = requestAnimationFrame(() => {
    view.frame = 0;
    const canvas = view.canvas;
    if (!canvas.getClientRects().length || !renderer || gpuLostNow()) return;
    const kit = efcOperatorGear(view);
    const key = JSON.stringify([view.skin, view.weapon, view.gearKey, view.angle]);
    if (view.drawn === key) return;
    try {
      skinDraw(canvas.getContext('2d'), canvas.width, canvas.height, view.skin, 0, view.angle, view.weapon, kit);
      view.drawn = key;
    } catch (error) { gpuLog('operator preview: ' + error.message); }
  });
}

const EFC_OPERATOR_SLOTS = [['head', 'Head'], ['face', 'Face'], ['armor', 'Armour'], ['rig', 'Rig'],
  ['pack', 'Backpack'], ['primary', 'Primary'], ['secondary', 'Secondary'], ['sidearm', 'Sidearm']];
const EFC_OPERATOR_EDITABLE = new Set(['armor', 'pack', 'primary', 'sidearm']);

function efcOperatorItemAttrs(item) {
  if (!item) return '';
  return ` data-efc-id="${esc(item.id)}" data-efc-n="${+item.n || 1}"`
    + (item.mag != null ? ` data-efc-mag="${+item.mag}"` : '')
    + (item.res != null ? ` data-efc-res="${+item.res}"` : '')
    + (Number.isFinite(item.condition) ? ` data-efc-condition="${+item.condition}"` : '');
}

function efcOperatorGrid(grid, name, target, source, container) {
  if (!grid) return '';
  const items = grid.entries.flatMap(({ item, x, y, rotated, index }, i) => {
    const size = efcCall('grid:size', item, rotated);
    return size ? [{ item, w: size[0], h: size[1], x, y, index: index ?? i }] : [];
  });
  const filled = items.reduce((sum, item) => sum + item.w * item.h, 0);
  return `<section class="efc-op-section"><p class="lbl">${esc(name)} <span>${filled}/${grid.cols * grid.rows}</span></p>
    <div class="efc-op-grid" aria-label="${esc(name)}" data-op-target="${target}" style="--cols:${grid.cols};--rows:${grid.rows}">
    ${items.map(({ item, w, h, x, y, index }) => {
      const d = efcUiDef(item.id), count = item.n > 1 ? ' ×' + item.n : '';
      return `<button type="button" class="efc-op-item"${efcOperatorItemAttrs(item)} data-op-source="${source}" data-op-key="${index}" data-key="${source}-${index}" aria-pressed="false"
        ${container ? `data-op-container="${esc(container.id)}" data-op-rev="${container.rev}"` : ''}
        style="grid-area:${y + 1}/${x + 1}/span ${h}/span ${w}" aria-label="${esc(d.name + count)}">${efcThumbImg(item.id, d.kind, 'slot')}<span>${esc(d.name + count)}</span></button>`;
    }).join('')}</div></section>`;
}

function efcOperatorEquipment(id, inv) {
  const slots = inv?.slots || {};
  const grids = inv && efcCall('grid:loadout', inv);
  const equipment = EFC_OPERATOR_SLOTS.map(([slot, label]) => {
    const item = slots[slot], d = item && efcUiDef(item.id);
    const editable = EFC_OPERATOR_EDITABLE.has(slot);
    return `<button type="button" class="efc-op-slot" data-op-target="slot" data-op-key="${slot}" data-key="operator-slot-${slot}"${editable ? '' : ' disabled'}
      ${item ? 'data-op-source="slot" aria-pressed="false"' : ''}${efcOperatorItemAttrs(item)} aria-label="${esc(label + ' · ' + (d?.name || (editable ? 'Empty' : 'Unavailable')))}">
      <span>${esc(label)}</span>${d ? efcThumbImg(item.id, d.kind, 'slot') : ''}<b>${esc(d?.name || (editable ? 'Empty' : '—'))}</b></button>`;
  }).join('');
  const primary = slots.primary;
  const attachments = primary ? efcCall('weaponmods:slots', primary) : null;
  const field = id !== 'efcOpHideoutGrids' && efcHas('weaponmods:mountCarried');
  const mounts = Array.isArray(attachments) && attachments.length ? `<section class="efc-op-section"><p class="lbl">Primary attachments</p>
    <ul class="efc-op-attachments">${attachments.map(({ slot, label, item, field: swappable }) => {
      const name = item ? efcUiDef(item.id).name : 'Empty';
      return `<li><button type="button" class="efc-op-slot"${efcOperatorItemAttrs(item)}
        data-op-target="attachment" data-op-key="${esc(slot)}" data-key="operator-attachment-${esc(slot)}"${field && swappable ? '' : ' disabled'}>
        <span>${esc(label)}</span><b>${esc(name)}</b></button>
        ${item && field && swappable && efcHas('weaponmods:detachCarried')
          ? `<button type="button" class="efc-act" data-op-detach="${esc(slot)}">Detach</button>` : ''}</li>`;
    }).join('')}</ul></section>` : '';
  const bench = attachments?.length && efcHas('weaponmods:open') && id === 'efcOpHideoutGrids'
    ? '<button type="button" class="efc-act" data-op-bench>Open workbench</button>' : '';
  $(id).innerHTML = `<p class="lbl">Equipment</p><div class="efc-op-slots">${equipment}</div>${mounts}${bench}`
    + Object.entries(grids || {}).map(([kind, grid]) =>
      efcOperatorGrid(grid, kind === 'pockets' ? 'Pockets' : efcUiDef(slots[kind].id).name, 'carried', 'bag')).join('');
}

function efcOperatorRaidWeapon() {
  if (PL.knifeOut) return { name: 'Knife', key: null };
  const held = PL.ent.arms && armsW(PL.ent);
  return held ? { name: held.def.name, key: held.key || held.def.key } : null;
}

function efcOperatorVicinity(id, excluded) {
  const p = PL.ent.pos, radius = EFC.cfg.interactR, root = $(id);
  const near = (efcCall('world:list') || []).filter(c => c.id !== excluded && Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z) <= radius);
  const key = JSON.stringify(near.map(c => [c.id, c.rev]));
  if (root.dataset.near === key) return;
  root.dataset.near = key;
  const containers = near.filter(c => c.kind !== 'drop');
  const loose = near.filter(c => c.kind === 'drop');
  root.innerHTML = (containers.length ? '<p class="lbl">Nearby</p><ul class="efc-op-vicinity">'
    + containers.map(c => '<li>' + esc(efcUirName(c)) + '</li>').join('') + '</ul>' : '')
    + (loose.length ? '<p class="lbl">On the ground</p>' + loose.flatMap(c => c.items.map((it, i) =>
      efcThumbRow(it, { key: 'ground-' + c.id + '-' + i, data: { 'op-source': 'ground', 'op-key': i, 'op-container': c.id, 'op-rev': c.rev }, title: 'Take' }))).join('') : '')
    + (!near.length && !excluded ? '<p class="efc-none">Nothing within reach.</p>' : '');
}

function efcOperatorStash() {
  const st = efcCall('stash:grids');
  const view = EFC_OPERATOR_VIEWS.get('efcOpHideout');
  if (view?.selected?.dataset.opSource === 'stash') efcOperatorSelect(view, null);
  $('efcOpStash').innerHTML = (st?.stash || []).map((grid, index) =>
    efcOperatorGrid(grid, st.stash.length > 1 ? 'Stash ' + (index + 1) : 'Stash', 'stash', 'stash')).join('');
}

const EFC_OPERATOR_QUICK_KEY = 'efc_operator_quick_v1';
let EFC_OPERATOR_QUICK;
function efcOperatorQuickList() {
  if (EFC_OPERATOR_QUICK) return EFC_OPERATOR_QUICK;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(EFC_OPERATOR_QUICK_KEY)); } catch {}
  EFC_OPERATOR_QUICK = Array.from({ length: 9 }, (_, i) => {
    const item = Array.isArray(saved) && saved[i];
    return typeof item?.id === 'string' && (item.slot === null || EFC_OPERATOR_EDITABLE.has(item.slot)) ? item : null;
  });
  return EFC_OPERATOR_QUICK;
}

function efcOperatorQuickDraw(view) {
  const values = efcOperatorQuickList(), { root, inv } = view;
  const bar = root.querySelector('.efc-op-quick');
  const focused = bar.contains(document.activeElement) && document.activeElement.dataset.opKey;
  const next = values.map((entry, i) => {
    const available = entry && (entry.slot ? inv?.slots[entry.slot]?.id === entry.id : inv?.bag.some(item => item.id === entry.id));
    const name = entry ? efcUiDef(entry.id).name : 'Empty';
    return `<button type="button" data-op-target="quick" data-op-key="${i}" data-key="quick-${i}"${entry && !available ? ' class="missing"' : ''}
      aria-label="${esc('Quick slot ' + (i + 1) + ' · ' + name)}"><kbd>${i + 1}</kbd><span>${esc(name)}</span></button>`;
  }).join('');
  if (bar.efcQuickHtml === next) return;
  bar.efcQuickHtml = next;
  bar.innerHTML = next;
  if (focused !== false) bar.querySelector(`[data-op-key="${focused}"]`)?.focus({ preventScroll: true });
}

function efcOperatorQuickAssign(view, index, source) {
  efcOperatorQuickList()[index] = source && { id: source.item.id, slot: source.kind === 'slot' ? source.key : null };
  try { localStorage.setItem(EFC_OPERATOR_QUICK_KEY, JSON.stringify(EFC_OPERATOR_QUICK)); } catch {}
  efcOperatorQuickDraw(view);
}

function efcOperatorGetSource(view, node) {
  const d = node.dataset, kind = d.opSource, key = kind === 'slot' ? d.opKey : Number(d.opKey);
  let item, container;
  if (kind === 'slot') item = view.inv?.slots[key];
  if (kind === 'bag') item = view.inv?.bag[key];
  if (kind === 'stash') item = efcCall('stash:get')?.items[key];
  if (kind === 'ground' || kind === 'container') {
    container = (efcCall('world:list') || []).find(c => c.id === d.opContainer && c.rev === Number(d.opRev));
    item = container?.items[key];
  }
  return item?.id === d.efcId ? { kind, key, item, container } : null;
}

function efcOperatorSlot(item) {
  const def = efcUiDef(item.id);
  if (def.kind === 'weapon') return def.weapon?.slot;
  return def.kind === 'armor' || def.kind === 'pack' ? def.kind : null;
}

function efcOperatorCanMove(view, source, target) {
  if (!source || !target || target.disabled) return false;
  const { kind, item } = source, { opTarget, opKey } = target.dataset;
  if (opTarget === 'quick') return kind === 'slot' || kind === 'bag';
  if (opTarget === 'attachment') return kind === 'bag' && !view.hideout
    && efcCall('weaponmods:fit', view.inv?.slots.primary, item.id) === opKey;
  if (opTarget === 'stash') return view.hideout && (kind === 'slot' || kind === 'bag');
  if (opTarget === 'slot') return opKey === efcOperatorSlot(item)
    && (kind === 'bag' || ((kind === 'stash' || kind === 'ground') && !view.inv?.slots[opKey]));
  if (opTarget === 'carried') return kind === 'stash' || kind === 'ground' || kind === 'container';
  return false;
}

function efcOperatorMove(view, source, target) {
  if (!efcOperatorCanMove(view, source, target)) return false;
  const { kind, key, container } = source, { opTarget, opKey } = target.dataset;
  if (opTarget === 'quick') {
    efcOperatorQuickAssign(view, Number(opKey), source);
    return true;
  }
  if (opTarget === 'attachment') return efcCall('weaponmods:mountCarried', 'primary', key) !== false;
  if (view.hideout) {
    const service = kind === 'stash' ? 'stash:toLoadout' : opTarget === 'stash' ? 'stash:toStash' : 'stash:equip';
    return efcHoMove(() => efcCall(service, key));
  }
  if (container) return efcCall('world:take', container.id, key) !== false;
  if (efcCall('inv:equip', EFC.inv, key)) { efcUirChanged(); return true; }
  return false;
}

function efcOperatorQuickMove(view, source) {
  if (source.container) return efcCall('world:take', source.container.id, source.key);
  const fallback = view.root.querySelector(
    source.kind === 'stash' ? '[data-op-target="carried"]' : '[data-op-target="stash"]'
  );
  const slot = efcOperatorSlot(source.item);
  const target = !view.hideout && source.kind === 'bag' && slot
    ? view.root.querySelector(`[data-op-target="slot"][data-op-key="${slot}"]`) : fallback;
  return efcOperatorMove(view, source, target);
}

function efcOperatorQuickUse(view, index) {
  const entry = efcOperatorQuickList()[index];
  if (view.hideout || !entry) return;
  if (entry.slot) {
    const it = EFC.inv?.slots[entry.slot], weapons = PL.ent.arms?.slots;
    if (it?.id !== entry.id || !weapons) return;
    const engineSlot = efcUiDef(it.id).weapon?.wkey;
    const at = weapons.findIndex(arm => arm.def.key === engineSlot || arm.base === engineSlot);
    if (at >= 0) {
      switchWeapon(at);
      const next = weapons[at];
      efcOperatorPanel(view.id, { name: next.def.name, key: next.key || next.def.key }, EFC.inv);
    }
    return;
  }
  const at = EFC.inv?.bag.findIndex(item => item.id === entry.id) ?? -1;
  if (at < 0) return;
  if (efcUiDef(entry.id).kind === 'med') efcCall('med:use', at);
  else if (efcCall('inv:equip', EFC.inv, at)) efcUirChanged();
}

function efcOperatorSelect(view, button) {
  view.selected?.setAttribute('aria-pressed', 'false');
  view.selected = button;
  button?.setAttribute('aria-pressed', 'true');
  if (view.hideout) {
    const source = button && efcOperatorGetSource(view, button);
    const action = view.root.querySelector('[data-op-stash-bench]');
    if (action) action.hidden = !(source?.kind === 'stash' && efcCall('weaponmods:slots', source.item)?.length);
  }
}

function efcOperatorDragPreview(pick) {
  const rect = pick.button.getBoundingClientRect();
  const ghost = pick.button.cloneNode(true);
  ghost.inert = true;
  ghost.classList.add('efc-op-ghost');
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.margin = '0';
  pick.offsetX = pick.x - rect.left;
  pick.offsetY = pick.y - rect.top;
  pick.ghost = ghost;
  document.body.append(ghost);
}

function efcOperatorInteractions(view) {
  const { root } = view;
  const item = event => event.target.closest('[data-op-source]');
  const target = event => event.target.closest('[data-op-target]');
  root.addEventListener('click', event => {
    if (event.target.closest('[data-op-stash-bench]')) {
      const source = view.selected?.isConnected && efcOperatorGetSource(view, view.selected);
      if (source?.kind === 'stash') efcCall('weaponmods:open', source.key);
      return;
    }
    if (event.target.closest('[data-op-bench]')) { efcCall('weaponmods:open', 'primary'); return; }
    const detach = event.target.closest('[data-op-detach]');
    if (detach) { efcCall('weaponmods:detachCarried', 'primary', detach.dataset.opDetach); return; }
    const button = item(event), dest = target(event), pick = view.selected;
    if (event.detail && view.ignoreClick) return;
    if (view.hideout && event.ctrlKey && button) {
      const source = efcOperatorGetSource(view, button);
      if ((source?.kind === 'stash' || source?.kind === 'bag') && source.item.n > 1) {
        efcOperatorSelect(view, null);
        const service = source.kind === 'stash' ? 'stash:toLoadout' : 'stash:toStash';
        efcHoMove(() => efcCall(service, source.key, Math.floor(source.item.n / 2)));
        return;
      }
    }
    if (pick && dest && dest !== pick && efcOperatorMove(view, efcOperatorGetSource(view, pick), dest)) {
      efcOperatorSelect(view, null);
    } else if (dest?.dataset.opTarget === 'quick') {
      if (event.shiftKey) efcOperatorQuickAssign(view, +dest.dataset.opKey, null);
      else efcOperatorQuickUse(view, +dest.dataset.opKey);
    } else if (button) {
      const source = efcOperatorGetSource(view, button);
      if (!source) return;
      if (event.shiftKey || source.kind === 'ground') efcOperatorQuickMove(view, source);
      else efcOperatorSelect(view, pick === button ? null : button);
    }
  });
  root.addEventListener('dblclick', event => {
    const button = item(event), source = button && efcOperatorGetSource(view, button);
    if (source && source.kind !== 'ground') efcOperatorQuickMove(view, source);
  });
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    view.ignoreClick = false;
    const button = item(event);
    if (!button) return;
    button.setPointerCapture(event.pointerId);
    view.pick = { button, id: event.pointerId, x: event.clientX, y: event.clientY, started: false, target: null };
  });
  root.addEventListener('pointermove', event => {
    const pick = view.pick;
    if (pick?.id !== event.pointerId) return;
    if (!pick.started && Math.hypot(event.clientX - pick.x, event.clientY - pick.y) < 5) return;
    if (!pick.started) {
      pick.started = true;
      view.ignoreClick = true;
      efcOperatorSelect(view, pick.button);
      efcOperatorDragPreview(pick);
    }
    pick.ghost.style.left = event.clientX - pick.offsetX + 'px';
    pick.ghost.style.top = event.clientY - pick.offsetY + 'px';
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-op-target]');
    const dest = element && root.contains(element) ? element : null;
    if (dest === pick.target) return;
    pick.target?.removeAttribute('data-op-drop');
    pick.target = dest;
    if (dest) dest.dataset.opDrop = efcOperatorCanMove(view, efcOperatorGetSource(view, pick.button), dest) ? 'valid' : 'invalid';
  });
  for (const type of ['pointerup', 'lostpointercapture']) root.addEventListener(type, event => {
    const pick = view.pick;
    if (pick?.id !== event.pointerId) return;
    view.pick = null;
    pick.target?.removeAttribute('data-op-drop');
    pick.ghost?.remove();
    if (!pick.started) return;
    if (type === 'pointerup') efcOperatorMove(view, efcOperatorGetSource(view, pick.button), pick.target);
    efcOperatorSelect(view, null);
  });
}

function efcOperatorNumber(event, panel) {
  const index = Number(event.code?.match(/^Digit([1-9])$/)?.[1]) - 1;
  if (!Number.isInteger(index)) return false;
  const view = EFC_OPERATOR_VIEWS.get(panel === 'inv' ? 'efcOpRaid' : 'efcOpLoot');
  if (!view) return false;
  if (event.type === 'keydown' && !event.repeat) {
    const source = view.selected && efcOperatorGetSource(view, view.selected);
    if (source && (source.kind === 'bag' || source.kind === 'slot')) {
      efcOperatorQuickAssign(view, index, source);
      efcOperatorSelect(view, null);
    } else efcOperatorQuickUse(view, index);
  }
  return true;
}
