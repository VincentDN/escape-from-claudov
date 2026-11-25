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
  view.hands.dataset.opTarget = 'hands';
  const held = ['primary', 'sidearm'].find(slot => {
    const item = inv?.slots[slot];
    return item && weapon?.key && (efcCall('weaponmods:definition', item)?.key || efcUiDef(item.id).weapon?.wkey) === weapon.key;
  });
  if (held) {
    Object.assign(view.hands.dataset, { opSource: 'slot', opKey: held, efcId: inv.slots[held].id });
    view.hands.tabIndex = 0;
  } else {
    for (const key of ['opSource', 'opKey', 'efcId']) delete view.hands.dataset[key];
    view.hands.removeAttribute('tabindex');
  }
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

function efcOperatorGrid(grid, name, target, source, container, area = target, page = 0) {
  if (!grid) return '';
  const items = grid.entries.flatMap(({ item, x, y, rotated, index }, i) => {
    const size = efcCall('grid:size', item, rotated);
    return size ? [{ item, w: size[0], h: size[1], x, y, rotated, index: index ?? i }] : [];
  });
  const filled = items.reduce((sum, item) => sum + item.w * item.h, 0);
  return `<section class="efc-op-section"><p class="lbl">${esc(name)} <span>${filled}/${grid.cols * grid.rows}</span></p>
    <div class="efc-op-grid" aria-label="${esc(name)}" data-op-target="${target}" data-op-area="${area}" data-op-page="${page}"
      data-op-cols="${grid.cols}" data-op-rows="${grid.rows}" style="--cols:${grid.cols};--rows:${grid.rows}">
    ${items.map(({ item, w, h, x, y, rotated, index }) => {
      const d = efcUiDef(item.id), count = item.n > 1 ? ' ×' + item.n : '';
      return `<button type="button" class="efc-op-item"${efcOperatorItemAttrs(item)} data-op-source="${source}" data-op-key="${index}" data-key="${source}-${index}" aria-pressed="false"
        data-op-x="${x}" data-op-y="${y}" data-op-rotated="${rotated ? '1' : '0'}" ${container ? `data-op-container="${esc(container.id)}" data-op-rev="${container.rev}"` : ''}
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
  const hideout = id === 'efcOpHideoutGrids', field = !hideout && efcHas('weaponmods:mountCarried');
  const mounts = Array.isArray(attachments) && attachments.length ? `<section class="efc-op-section"><p class="lbl">Primary attachments</p>
    <ul class="efc-op-attachments">${attachments.map(({ slot, label, item, field: swappable }) => {
      const name = item ? efcUiDef(item.id).name : 'Empty';
      const editable = hideout ? efcHas('weaponmods:stashDrag') : field && swappable;
      return `<li><button type="button" class="efc-op-slot"${efcOperatorItemAttrs(item)}
        data-op-target="attachment" data-op-key="${esc(slot)}" data-key="operator-attachment-${esc(slot)}"${editable ? '' : ' disabled'}
        ${item && editable ? 'data-op-source="attachment" aria-pressed="false"' : ''}>
        <span>${esc(label)}</span><b>${esc(name)}</b></button>
        ${item && field && swappable && efcHas('weaponmods:detachCarried')
          ? `<button type="button" class="efc-act" data-op-detach="${esc(slot)}">Detach</button>` : ''}</li>`;
    }).join('')}</ul></section>` : '';
  const bench = attachments?.length && efcHas('weaponmods:open') && id === 'efcOpHideoutGrids'
    ? '<button type="button" class="efc-act" data-op-bench>Open workbench</button>' : '';
  $(id).innerHTML = `<p class="lbl">Equipment</p><div class="efc-op-slots">${equipment}</div>${mounts}${bench}`
    + Object.entries(grids || {}).map(([kind, grid]) =>
      efcOperatorGrid(grid, kind === 'pockets' ? 'Pockets' : efcUiDef(slots[kind].id).name, 'carried', 'bag', null, kind)).join('');
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
    efcOperatorGrid(grid, st.stash.length > 1 ? 'Stash ' + (index + 1) : 'Stash', 'stash', 'stash', null, 'stash', index)).join('');
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
  const d = node.dataset, kind = d.opSource, key = kind === 'slot' || kind === 'attachment' ? d.opKey : Number(d.opKey);
  let item, container;
  if (kind === 'slot') item = view.inv?.slots[key];
  if (kind === 'bag') item = view.inv?.bag[key];
  if (kind === 'stash') item = efcCall('stash:get')?.items[key];
  if (kind === 'attachment') item = efcCall('weaponmods:slots', view.inv?.slots.primary)?.find(part => part.slot === key)?.item;
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
  if (opTarget === 'hands') return (kind === 'slot' || kind === 'bag') && efcUiDef(item.id).kind === 'weapon';
  if (opTarget === 'attachment') return (kind === 'bag' || (view.hideout && kind === 'stash'))
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
  if (opTarget === 'hands') {
    if (view.hideout) return kind === 'slot' || efcHoMove(() => efcCall('stash:equip', key));
    const slot = efcOperatorSlot(source.item);
    if (kind === 'bag') {
      if (!efcCall('inv:equip', EFC.inv, key)) return false;
      efcUirChanged();
    }
    const engineKey = efcUiDef(source.item.id).weapon.wkey;
    const index = PL.ent.arms?.slots.findIndex(arm => arm.def.id === engineKey);
    if (!(index >= 0) || EFC.inv?.slots[slot]?.id !== source.item.id) return false;
    switchWeapon(index);
    return true;
  }
  if (opTarget === 'attachment') {
    if (view.hideout) return efcHoMove(() => efcCall('weaponmods:stashDrag', { kind, key, id: source.item.id }, opKey));
    return efcCall('weaponmods:mountCarried', 'primary', key) !== false;
  }
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
  pick.w = rect.width;
  pick.h = rect.height;
  document.body.append(ghost);
}

function efcOperatorOrigin(button) {
  const grid = button.closest('.efc-op-grid');
  if (!grid) return null;
  return { area: grid.dataset.opArea, page: +grid.dataset.opPage, x: +button.dataset.opX,
    y: +button.dataset.opY, rotated: button.dataset.opRotated === '1' };
}

function efcOperatorExact(view, pick, preview) {
  const { source, cell, target } = pick;
  if (!cell || !source) return null;
  const from = { kind: source.kind, key: source.key, id: source.item.id, count: pick.count };
  if (source.kind === 'container' && cell.area === 'container' && target.closest('#efcOpLootGrid') && source.container.id === EFC_UIR.cid) {
    const { grid, id, rev } = source.container;
    const proposal = pick.count == null ? efcCall('grid:move', grid, source.key, cell.x, cell.y, cell.rotated) :
      efcCall('grid:split', grid, source.key, pick.count, cell.x, cell.y, cell.rotated);
    if (!proposal) return false;
    if (preview) return true;
    const settle = accepted => efcEmit('ui:inventory-gesture', accepted ? (pick.count ? 'split' : 'place') : 'refuse', source.item);
    return efcCall('world:place', id, source.key, cell.x, cell.y, cell.rotated, pick.count, rev, settle) === true ? 'pending' : false;
  }
  if (source.container && target.dataset.opTarget === 'carried') {
    const item = pick.count ? { ...source.item, n: pick.count } : source.item;
    if (!efcCall('inv:receiveAt', EFC.inv, item, cell, true)) return false;
    if (preview) return true;
    const settle = accepted => { if (!accepted) efcEmit('ui:inventory-gesture', 'refuse', source.item); };
    return efcCall('world:take', source.container.id, source.key, { rev: source.container.rev, cell, count: pick.count, settle }) === true ? 'pending' : false;
  }
  if (source.kind === 'attachment') {
    if (view.hideout && ['stash', 'carried'].includes(target.dataset.opTarget)) {
      return preview ? efcCall('weaponmods:stashDrag', from, source.key, cell, true) :
        efcHoMove(() => efcCall('weaponmods:stashDrag', from, source.key, cell));
    }
    if (target.dataset.opTarget === 'carried') return efcCall('weaponmods:detachCarried', 'primary', source.key, cell, preview) === true;
  }
  if (cell.area === 'container' && ['bag', 'slot'].includes(source.kind)) {
    const container = efcUirCont();
    if (!container) return false;
    const fits = efcCall('inv:sendGridItem', EFC.inv, from, true);
    if (!fits || !efcCall('grid:place', container.grid, fits, cell.x, cell.y, cell.rotated)) return false;
    if (preview) return true;
    const inv = EFC.inv;
    const item = efcCall('inv:sendGridItem', inv, from);
    if (!item) return false;
    const settle = accepted => {
      if (!accepted && EFC.inv === inv) {
        const restored = source.kind === 'slot' ? !inv.slots[source.key] && (inv.slots[source.key] = item) :
          efcCall('inv:receiveAt', inv, item, pick.origin);
        if (!restored && !efcCall('inv:add', inv, item)) efcCall('world:put', null, item);
      }
      if (EFC.inv === inv) efcUirChanged();
      efcEmit('ui:inventory-gesture', accepted ? (pick.count ? 'split' : 'place') : 'refuse', item);
    };
    if (!efcCall('world:putAt', container.id, item, cell, container.rev, settle)) settle(false);
    else efcUirChanged();
    return 'pending';
  }
  if (!['stash', 'carried'].includes(target.dataset.opTarget)) return null;
  if (view.hideout) return preview ? efcCall('stash:place', from, cell, true) : efcHoMove(() => efcCall('stash:place', from, cell));
  const placed = efcCall('inv:place', EFC.inv, from, cell, preview);
  if (placed && !preview) efcUirChanged();
  return !!placed;
}

function efcOperatorDragMove(view, pick, x, y, grid = null) {
  pick.last = [x, y];
  const under = grid || document.elementFromPoint(x, y);
  const hit = under?.closest('[data-op-target]');
  const target = hit && view.root.contains(hit) ? hit : null;
  pick.outside = !grid && !under?.closest('.efc-box');
  const data = target?.dataset;
  let cell = null;
  let width = pick.rotated === pick.initialRotation ? pick.w : pick.h;
  let height = pick.rotated === pick.initialRotation ? pick.h : pick.w;
  if (data?.opArea) {
    const rect = target.getBoundingClientRect(), cols = +data.opCols, rows = +data.opRows;
    const size = efcCall('grid:size', pick.source.item, pick.rotated);
    if (size) { width = size[0] * rect.width / cols; height = size[1] * rect.height / rows; }
    const xCell = clamp(Math.floor((x - rect.left) * cols / rect.width), 0, cols - 1);
    const yCell = clamp(Math.floor((y - rect.top) * rows / rect.height), 0, rows - 1);
    cell = { area: data.opArea, page: +data.opPage, x: xCell, y: yCell, rotated: pick.rotated };
  }
  pick.ghost.style.width = width + 'px';
  pick.ghost.style.height = height + 'px';
  pick.ghost.style.left = x - width * pick.offsetX / pick.w + 'px';
  pick.ghost.style.top = y - height * pick.offsetY / pick.h + 'px';
  if (target === pick.target && cell?.x === pick.cell?.x && cell?.y === pick.cell?.y && cell?.rotated === pick.cell?.rotated) return;
  pick.target?.removeAttribute('data-op-drop');
  pick.preview?.remove();
  pick.target = target;
  pick.cell = cell;
  if (!target) return;
  if (cell) {
    const fit = efcOperatorExact(view, pick, true);
    if (fit !== null) {
      const [w, h] = efcCall('grid:size', pick.source.item, pick.rotated);
      const mark = document.createElement('span');
      mark.className = 'efc-placement' + (fit ? '' : ' blocked');
      mark.style.gridArea = `${cell.y + 1} / ${cell.x + 1} / span ${Math.min(h, +data.opRows - cell.y)} / span ${Math.min(w, +data.opCols - cell.x)}`;
      pick.preview = mark;
      target.append(mark);
      target.dataset.opDrop = fit ? 'valid' : 'invalid';
      return;
    }
  }
  target.dataset.opDrop = efcOperatorCanMove(view, pick.source, target) ? 'valid' : 'invalid';
}

function efcOperatorRotate(event, view) {
  const pick = view?.pick;
  if (event.code !== 'KeyR' || !pick?.started) return false;
  if (event.type === 'keydown' && !event.repeat) {
    const size = efcCall('grid:size', pick.source.item);
    if (size && size[0] !== size[1]) {
      pick.rotated = !pick.rotated;
      efcOperatorDragMove(view, pick, ...pick.last, pick.keyboard ? pick.target : null);
      efcEmit('ui:inventory-gesture', 'rotate', pick.source.item);
    }
  }
  return true;
}

function efcOperatorDragEnd(view, commit) {
  const pick = view.pick;
  view.pick = null;
  pick.target?.removeAttribute('data-op-drop');
  pick.preview?.remove();
  pick.ghost?.remove();
  if (!pick.started) return;
  if (commit && pick.button.isConnected) {
    const source = efcOperatorGetSource(view, pick.button);
    let placed = source && (efcOperatorExact(view, pick, false) ?? (!pick.count && efcOperatorMove(view, source, pick.target)));
    if (!pick.target && pick.outside && !view.hideout && source && ['bag', 'slot'].includes(source.kind)) {
      const item = efcCall('inv:sendGridItem', EFC.inv, { kind: source.kind, key: source.key, id: source.item.id, count: pick.count });
      if (item) { efcCall('world:put', null, item); efcUirChanged(); placed = true; }
    }
    if (placed !== 'pending') {
      const action = { slot: 'equip', hands: 'equip', attachment: 'mount' }[pick.target?.dataset.opTarget] || (pick.source.kind === 'attachment' ? 'unmount' : 'place');
      efcEmit('ui:inventory-gesture', placed ? (pick.count ? 'split' : action) : 'refuse', pick.source.item);
    }
  }
  efcOperatorSelect(view, null);
}

function efcOperatorKeyboard(event, view) {
  if (!view || !view.root.contains(event.target)) return false;
  if (efcOperatorRotate(event, view)) return true;
  const code = event.code, confirm = code === 'Enter' || code === 'NumpadEnter';
  if (!confirm && !view.pick?.keyboard) return false;
  const button = event.target.closest('[data-op-source]');
  if (!view.pick && !button) return false;
  if (!confirm && code !== 'Escape' && !Object.hasOwn(EFC_CONTAINER_ARROWS, code)) return false;
  if (event.type !== 'keydown' || event.repeat) return true;
  if (view.pick) {
    if (!view.pick.keyboard) return false;
    if (confirm || code === 'Escape') { efcOperatorDragEnd(view, confirm); return true; }
  } else {
    const source = efcOperatorGetSource(view, button);
    if (!source) return false;
    const rect = button.getBoundingClientRect();
    const rotated = button.dataset.opRotated === '1';
    view.pick = { button, source, started: true, keyboard: true, x: rect.left, y: rect.top, initialRotation: rotated, rotated, origin: efcOperatorOrigin(button) };
    if (event.ctrlKey && source.item.n > 1) view.pick.count = Math.floor(source.item.n / 2);
    efcOperatorSelect(view, button);
    efcOperatorDragPreview(view.pick);
    efcEmit('ui:inventory-gesture', 'pick', source.item);
  }
  const pick = view.pick, [dx, dy] = EFC_CONTAINER_ARROWS[code] || [0, 0];
  let grid = pick.target || button.closest('.efc-op-grid') || view.root.querySelector('.efc-op-grid[data-op-area="pockets"]');
  if (!grid) { efcOperatorDragEnd(view, false); return true; }
  let x = pick.cell?.x || 0, y = pick.cell?.y || 0;
  if (!pick.cell && grid.contains(button)) {
    const rect = button.getBoundingClientRect(), bounds = grid.getBoundingClientRect();
    x = Math.round((rect.left - bounds.left) * Number(grid.dataset.opCols) / bounds.width);
    y = Math.round((rect.top - bounds.top) * Number(grid.dataset.opRows) / bounds.height);
  }
  if (event.shiftKey && (dx || dy)) {
    const grids = [...view.root.querySelectorAll('.efc-op-grid')].filter(node => node.getClientRects().length);
    const next = clamp(grids.indexOf(grid) + (dx || dy), 0, grids.length - 1);
    grid = grids[next];
    grid.scrollIntoView({ block: 'nearest' });
  } else { x += dx; y += dy; }
  const bounds = grid.getBoundingClientRect(), cols = +grid.dataset.opCols, rows = +grid.dataset.opRows;
  efcOperatorDragMove(view, pick, bounds.left + (clamp(x, 0, cols - 1) + 0.5) * bounds.width / cols,
    bounds.top + (clamp(y, 0, rows - 1) + 0.5) * bounds.height / rows, grid);
  return true;
}

function efcOperatorInteractions(view) {
  const { root } = view;
  const item = event => event.target.closest('[data-op-source]');
  const target = event => event.target.closest('[data-op-target]');
  if (view.hideout) root.addEventListener('keydown', event => {
    if (efcOperatorKeyboard(event, view)) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  root.addEventListener('click', event => {
    if (event.target.closest('[data-op-stash-bench]')) {
      const source = view.selected?.isConnected && efcOperatorGetSource(view, view.selected);
      if (source?.kind === 'stash') efcCall('weaponmods:open', source.key);
      return;
    }
    if (event.target.closest('[data-op-bench]')) { efcCall('weaponmods:open', 'primary'); return; }
    const detach = event.target.closest('[data-op-detach]');
    if (detach) {
      const part = view.inv?.slots.primary && efcCall('weaponmods:slots', view.inv.slots.primary)?.find(p => p.slot === detach.dataset.opDetach)?.item;
      if (efcCall('weaponmods:detachCarried', 'primary', detach.dataset.opDetach) === true && part) efcEmit('ui:inventory-gesture', 'unmount', part);
      return;
    }
    const button = item(event), dest = target(event), pick = view.selected;
    if (event.detail && view.ignoreClick) return;
    if (view.hideout && event.ctrlKey && button) {
      const source = efcOperatorGetSource(view, button);
      if ((source?.kind === 'stash' || source?.kind === 'bag') && source.item.n > 1) {
        efcOperatorSelect(view, null);
        const service = source.kind === 'stash' ? 'stash:toLoadout' : 'stash:toStash';
        const moved = efcHoMove(() => efcCall(service, source.key, Math.floor(source.item.n / 2)));
        efcEmit('ui:inventory-gesture', moved ? 'split' : 'refuse', source.item);
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
    if (view.pick?.keyboard) efcOperatorDragEnd(view, false);
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
      pick.source = efcOperatorGetSource(view, pick.button);
      if (!pick.source) { view.pick = null; return; }
      pick.initialRotation = pick.rotated = pick.button.dataset.opRotated === '1';
      pick.origin = efcOperatorOrigin(pick.button);
      if (event.ctrlKey && pick.source.item.n > 1) pick.count = Math.floor(pick.source.item.n / 2);
      view.ignoreClick = true;
      efcOperatorSelect(view, pick.button);
      efcOperatorDragPreview(pick);
      efcEmit('ui:inventory-gesture', 'pick', pick.source.item);
    }
    efcOperatorDragMove(view, pick, event.clientX, event.clientY);
  });
  for (const type of ['pointerup', 'lostpointercapture']) root.addEventListener(type, event => {
    const pick = view.pick;
    if (pick?.id !== event.pointerId) return;
    efcOperatorDragEnd(view, type === 'pointerup');
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
