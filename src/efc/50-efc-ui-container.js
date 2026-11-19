/* A7: arrange the host-owned container from the raid loot panel. */
const EFC_CONTAINER_UI = { container: null, rev: null, picked: null, cell: 0, drag: null, ignoreClick: false };
const EFC_CONTAINER_ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

function efcContainerCell(index) { return $('efcLootGrid').querySelector(`[data-cell="${index}"]`); }
function efcContainerDraw(container) {
  const root = $('efcLootGrid'), box = $('efcLootArrange'), toggle = $('efcLootArrangeToggle');
  const previous = EFC_CONTAINER_UI.container;
  const c = container?.kind !== 'drop' && container?.grid ? container : null;
  const same = previous && c && previous.id === c.id;
  const changed = !same || EFC_CONTAINER_UI.rev !== c?.rev;
  if (changed) { EFC_CONTAINER_UI.picked = null; EFC_CONTAINER_UI.drag = null; }
  if (!same) EFC_CONTAINER_UI.cell = 0;
  EFC_CONTAINER_UI.container = c;
  EFC_CONTAINER_UI.rev = c?.rev;
  toggle.hidden = !c;
  if (!c) { box.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  if (box.hidden) { root.replaceChildren(); return; }
  if (!changed && root.firstElementChild) return;

  const focus = root.contains(document.activeElement);
  const { cols, rows, entries } = c.grid;
  root.style.setProperty('--cols', cols);
  const tiles = Array(cols * rows).fill(null);
  for (const [idx, entry] of entries.entries()) {
    const [width, height] = efcCall('grid:size', entry.item, entry.rotated);
    const name = efcUiDef(entry.item.id).name + (entry.item.n > 1 ? ' ×' + entry.item.n : '');
    for (let y = entry.y; y < entry.y + height; y++) {
      for (let x = entry.x; x < entry.x + width; x++) {
        tiles[y * cols + x] = { idx, name, first: x === entry.x && y === entry.y };
      }
    }
  }
  root.innerHTML = tiles.map((tile, i) => {
    const label = `${i % cols + 1}, ${Math.floor(i / cols) + 1}: ${tile?.name || 'Empty'}`;
    return `<button type="button" data-cell="${i}" tabindex="${i === EFC_CONTAINER_UI.cell ? 0 : -1}" aria-label="${esc(label)}"${tile ? ` data-entry="${tile.idx}"` : ''}>${tile?.first ? esc(tile.name) : ''}</button>`;
  }).join('');
  if (focus) efcContainerCell(EFC_CONTAINER_UI.cell)?.focus();
  efcContainerPreview();
}

function efcContainerPreview() {
  const { container, picked, cell } = EFC_CONTAINER_UI, root = $('efcLootGrid');
  const mark = root.querySelector('.efc-placement');
  if (mark) mark.remove();
  if (!picked || EFC_CONTAINER_UI.drag?.outside) return null;
  const grid = container.grid, x = cell % grid.cols, y = Math.floor(cell / grid.cols);
  const { idx, rotated, count } = picked, entry = grid.entries[idx];
  const proposal = count === undefined
    ? efcCall('grid:move', grid, idx, x, y, rotated)
    : efcCall('grid:split', grid, idx, count, x, y, rotated);
  const [width, height] = efcCall('grid:size', entry.item, rotated);
  const preview = document.createElement('span');
  preview.className = 'efc-placement' + (proposal ? '' : ' blocked');
  preview.style.gridArea = `${y + 1} / ${x + 1} / span ${Math.min(height, grid.rows - y)} / span ${Math.min(width, grid.cols - x)}`;
  root.append(preview);
  return proposal ? { x, y } : null;
}
function efcContainerTarget(button) {
  efcContainerCell(EFC_CONTAINER_UI.cell)?.setAttribute('tabindex', '-1');
  EFC_CONTAINER_UI.cell = +button.dataset.cell;
  button.tabIndex = 0;
  efcContainerPreview();
}
function efcContainerPick(button, split) {
  const c = EFC_CONTAINER_UI.container, idx = +button.dataset.entry, entry = c.grid.entries[idx];
  if (!entry || (split && entry.item.n < 2)) return;
  EFC_CONTAINER_UI.picked = { idx, rotated: entry.rotated, count: split ? Math.floor(entry.item.n / 2) : undefined };
  efcContainerPreview();
}
function efcContainerPlace() {
  const cell = efcContainerPreview();
  if (!cell) return;
  const { container, picked, rev } = EFC_CONTAINER_UI;
  EFC_CONTAINER_UI.picked = null;
  efcContainerPreview();
  efcCall('world:place', container.id, picked.idx, cell.x, cell.y, picked.rotated, picked.count, rev);
}
function efcContainerKey(event) {
  const button = event.target.closest?.('#efcLootGrid [data-cell]'), c = EFC_CONTAINER_UI.container;
  if (!button || !c) return false;
  const step = EFC_CONTAINER_ARROWS[event.code];
  if (step) {
    const { cols, rows } = c.grid, i = +button.dataset.cell;
    const x = clamp(i % cols + step[0], 0, cols - 1), y = clamp(Math.floor(i / cols) + step[1], 0, rows - 1);
    if (event.type === 'keydown') efcContainerCell(y * cols + x)?.focus();
  } else if (event.code === 'Escape' || event.code === 'KeyR') {
    if (event.type === 'keydown' && !event.repeat) {
      if (EFC_CONTAINER_UI.picked) {
        if (event.code === 'Escape') EFC_CONTAINER_UI.picked = null;
        else EFC_CONTAINER_UI.picked.rotated = !EFC_CONTAINER_UI.picked.rotated;
        efcContainerPreview();
      } else if (event.code === 'Escape') {
        const toggle = $('efcLootArrangeToggle');
        toggle.click();
        toggle.focus();
      }
    }
  } else if (event.code === 'Enter' || event.code === 'NumpadEnter') {
    if (event.type === 'keydown' && !event.repeat) {
      if (EFC_CONTAINER_UI.picked) efcContainerPlace();
      else efcContainerPick(button, event.ctrlKey);
    }
  } else return false;
  return true;
}
efcOn('ui:init', () => {
  const root = $('efcLootGrid');
  $('efcLootArrangeToggle').addEventListener('click', () => {
    const box = $('efcLootArrange');
    box.hidden = !box.hidden;
    $('efcLootArrangeToggle').setAttribute('aria-expanded', String(!box.hidden));
    EFC_CONTAINER_UI.picked = null;
    efcContainerDraw(efcUirCont());
    if (!box.hidden) efcContainerCell(EFC_CONTAINER_UI.cell)?.focus();
  });
  root.addEventListener('focusin', event => efcContainerTarget(event.target));
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-cell]');
    if (!button || (event.detail && EFC_CONTAINER_UI.ignoreClick)) return;
    efcContainerTarget(button);
    if (EFC_CONTAINER_UI.picked) efcContainerPlace();
    else efcContainerPick(button, event.ctrlKey);
  });
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    EFC_CONTAINER_UI.ignoreClick = false;
    const button = event.target.closest('[data-entry]');
    if (!button) return;
    button.setPointerCapture(event.pointerId);
    EFC_CONTAINER_UI.drag = { button, id: event.pointerId, x: event.clientX, y: event.clientY, split: event.ctrlKey };
  });
  root.addEventListener('pointermove', event => {
    const drag = EFC_CONTAINER_UI.drag;
    if (drag?.id !== event.pointerId) return;
    if (!drag.started) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
      drag.started = true;
      EFC_CONTAINER_UI.ignoreClick = true;
      EFC_CONTAINER_UI.picked = null;
      efcContainerPick(drag.button, drag.split);
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('#efcLootGrid [data-cell]');
    const wasOutside = drag.outside;
    drag.outside = !target;
    if (target && +target.dataset.cell !== EFC_CONTAINER_UI.cell) efcContainerTarget(target);
    else if (drag.outside !== wasOutside) efcContainerPreview();
  });
  for (const type of ['pointerup', 'lostpointercapture']) root.addEventListener(type, event => {
    const drag = EFC_CONTAINER_UI.drag;
    if (drag?.id !== event.pointerId) return;
    if (drag.started) {
      if (type === 'pointerup' && !drag.outside) efcContainerPlace();
      EFC_CONTAINER_UI.picked = null;
      efcContainerPreview();
    }
    EFC_CONTAINER_UI.drag = null;
  });
});
