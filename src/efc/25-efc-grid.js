/* A6 inventory geometry. Mutations return a new grid or null, so callers can
   validate both ends of a transfer before committing either one. */
const EFC_GRID_LIMIT = 512;
const EFC_GRID_SIZES = {
  stash: [10, 20], pockets: [6, 3], crate: [8, 6],
  locker: [8, 8], bag: [6, 5], body: [20, 20], drop: [6, 3],
};

function efcGridNew(cols, rows) {
  if (![cols, rows].every(n => Number.isInteger(n) && n > 0 && n <= EFC_GRID_LIMIT)) return null;
  return { cols, rows, entries: [] };
}

function efcGridContainer(kind, id) {
  const dimensions = efcItemDef(id)?.storage || EFC_GRID_SIZES[kind];
  return Array.isArray(dimensions) ? efcGridNew(...dimensions) : null;
}

function efcGridSize(item, rotated = false) {
  const size = efcItemDef(item?.id)?.size;
  if (!size) return null;
  return rotated ? [size[1], size[0]] : size.slice();
}

function efcGridFits(grid, item, x, y, rotated, skip = -1) {
  const size = efcGridSize(item, rotated);
  if (!grid || !size || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return false;
  const [w, h] = size;
  if (x + w > grid.cols || y + h > grid.rows) return false;
  return grid.entries.every((entry, index) => {
    if (index === skip) return true;
    const [ew, eh] = efcGridSize(entry.item, entry.rotated);
    return x + w <= entry.x || entry.x + ew <= x || y + h <= entry.y || entry.y + eh <= y;
  });
}

function efcGridPlace(grid, item, x, y, rotated = false) {
  const copy = efcItemNorm(item);
  if (!copy || copy.n > efcStackMax(copy.id) || !efcGridFits(grid, copy, x, y, rotated)) return null;
  return { ...grid, entries: [...grid.entries, { item: copy, x, y, rotated: !!rotated }] };
}

function efcGridMove(grid, index, x, y, rotated) {
  const entry = grid?.entries[index];
  if (!entry || !Number.isInteger(index)) return null;
  const turn = rotated ?? entry.rotated;
  if (!efcGridFits(grid, entry.item, x, y, turn, index)) return null;
  const entries = grid.entries.slice();
  entries[index] = { ...entry, x, y, rotated: !!turn };
  return { ...grid, entries };
}

function efcGridFirstFit(grid, item) {
  const size = efcGridSize(item);
  if (!grid || !size) return null;
  const [w, h] = size;
  for (const rotated of (w === h ? [false] : [false, true])) {
    const width = rotated ? h : w, height = rotated ? w : h;
    for (let y = 0; y <= grid.rows - height; y++) {
      for (let x = 0; x <= grid.cols - width; x++) {
        if (efcGridFits(grid, item, x, y, rotated)) return efcGridPlace(grid, item, x, y, rotated);
      }
    }
  }
  return null;
}

/* Preserve list order and stack boundaries when importing existing inventories. */
function efcGridImport(grid, items) {
  if (!grid || !Array.isArray(items)) return null;
  for (const raw of items) {
    const item = efcItemNorm(raw);
    if (!item || item.n > efcStackMax(item.id)) return null;
    grid = efcGridFirstFit(grid, item);
    if (!grid) return null;
  }
  return grid;
}

function efcGridAdd(grid, raw) {
  const item = efcItemNorm(raw);
  if (!grid || !item) return null;
  const stacks = grid.entries.map(entry => entry.item);
  const merged = efcClone(stacks);
  efcStackInto(merged, item);
  const entries = grid.entries.map((entry, index) => ({ ...entry, item: merged[index] }));
  return efcGridImport({ ...grid, entries }, merged.slice(entries.length));
}

function efcGridTake(grid, index, count) {
  const entry = grid?.entries[index];
  if (!entry || !Number.isInteger(index)) return null;
  const n = count ?? entry.item.n;
  if (!Number.isInteger(n) || n <= 0 || n > entry.item.n) return null;
  const entries = grid.entries.slice();
  const item = { ...entry.item, n };
  if (n === entry.item.n) entries.splice(index, 1);
  else entries[index] = { ...entry, item: { ...entry.item, n: entry.item.n - n } };
  return { grid: { ...grid, entries }, item };
}

function efcGridSplit(grid, index, count, x, y, rotated = false) {
  const source = grid?.entries[index];
  if (!source || count >= source.item.n) return null;
  const taken = efcGridTake(grid, index, count);
  return taken && efcGridPlace(taken.grid, taken.item, x, y, rotated);
}

function efcGridStoredCell(cell) {
  if (!cell || !['pockets', 'armor', 'pack', 'stash'].includes(cell.area)) return null;
  const { area, x, y, page = 0 } = cell;
  if (![x, y, page].every(n => Number.isSafeInteger(n) && n >= 0) || x >= EFC_GRID_LIMIT || y >= EFC_GRID_LIMIT) return null;
  return { area, x, y, page: area === 'stash' ? page : 0, rotated: cell.rotated === true };
}

function efcGridStoredItems(target, raw) {
  for (const source of raw || []) {
    const item = efcItemNorm(source);
    if (!item) continue;
    const cell = efcGridStoredCell(source.cell);
    if (cell && item.n <= efcStackMax(item.id)) target.push({ ...item, cell });
    else efcStackInto(target, item);
  }
}

function efcGridPin(grid, item, index) {
  const cell = item.cell;
  const pinned = efcGridPlace(grid, item, cell.x, cell.y, cell.rotated);
  if (pinned) pinned.entries.at(-1).index = index;
  return pinned;
}

/* The list UI keeps bag indexes; the grid view carries those indexes through placement. */
function efcGridLoadout(inv) {
  const grids = { pockets: efcGridContainer('pockets') };
  for (const slot of ['armor', 'pack']) {
    if (inv.slots[slot]) grids[slot] = efcGridContainer(slot, inv.slots[slot].id);
  }
  const order = inv.bag.map((item, index) => {
    const size = efcGridSize(item);
    return { item, index, area: size ? size[0] * size[1] : 0 };
  });
  if (order.some(entry => !entry.area)) return null;
  order.sort((a, b) => b.area - a.area);
  const pinned = new Set();
  for (const { item, index } of order) {
    const kind = item.cell?.area;
    if (!Object.hasOwn(grids, kind)) continue;
    const next = efcGridPin(grids[kind], item, index);
    if (next) { grids[kind] = next; pinned.add(index); }
  }
  for (const { item, index } of order) {
    if (pinned.has(index)) continue;
    let placed = false;
    for (const kind of Object.keys(grids)) {
      const grid = efcGridFirstFit(grids[kind], item);
      if (!grid) continue;
      grid.entries.at(-1).index = index;
      grids[kind] = grid;
      placed = true;
      break;
    }
    if (!placed) return null;
  }
  return grids;
}

/* Old stashes had no capacity limit. Keep all entries when building their grid. */
function efcGridStash(items) {
  const pages = [efcGridContainer('stash')];
  const pinned = new Set();
  for (const [index, item] of items.entries()) {
    const cell = item.cell;
    if (cell?.area !== 'stash' || !Number.isSafeInteger(cell.page) || cell.page < 0 || cell.page >= items.length) continue;
    while (pages.length <= cell.page) pages.push(efcGridContainer('stash'));
    const next = efcGridPin(pages[cell.page], item, index);
    if (next) { pages[cell.page] = next; pinned.add(index); }
  }
  for (const [index, item] of items.entries()) {
    if (pinned.has(index)) continue;
    let page = 0, grid;
    for (; page < pages.length; page++) {
      grid = efcGridFirstFit(pages[page], item);
      if (grid) break;
    }
    if (!grid) grid = efcGridFirstFit(efcGridContainer('stash'), item);
    if (!grid) return null;
    grid.entries.at(-1).index = index;
    pages[page] = grid;
  }
  return pages;
}

// Validate the existing cell occupancy first, then validate the entire resulting
// inventory for gear removal and weight limits. Both callers publish atomically.
function efcGridTransfer(stash, inv, source, destination) {
  if (!efcInvOk(inv)) return null;
  const cell = efcGridStoredCell(destination);
  if (!cell || !['stash', 'bag', 'slot'].includes(source?.kind)) return null;
  const { kind, key } = source;
  const sourceList = kind === 'stash' ? stash : kind === 'bag' ? inv.bag : null;
  const item = kind === 'slot' && EFC_SLOTS.includes(key) ? inv.slots[key] : sourceList?.[key];
  if (!item || item.id !== source.id) return null;
  const target = cell.area === 'stash' ? stash : inv.bag;
  const stashGrids = stash ? efcGridStash(stash) : null, loadoutGrids = efcGridLoadout(inv);
  const grid = cell.area === 'stash' ? stashGrids?.[cell.page] : loadoutGrids?.[cell.area];
  if (!target || !grid || (cell.area === 'stash' && item.free)) return null;
  const count = source.count ?? item.n;
  if (!Number.isSafeInteger(count) || count < 1 || count > item.n) return null;
  const skip = sourceList === target && count === item.n ? grid.entries.findIndex(entry => entry.index === key) : -1;
  if (!efcGridFits(grid, item, cell.x, cell.y, cell.rotated, skip)) return null;
  const next = efcClone({ stash, inv });
  for (const [area, layout] of Object.entries(loadoutGrids || {})) {
    for (const { index, x, y, rotated } of layout.entries) next.inv.bag[index].cell = { area, x, y, rotated, page: 0 };
  }
  for (const [page, layout] of (stashGrids || []).entries()) {
    for (const { index, x, y, rotated } of layout.entries) next.stash[index].cell = { area: 'stash', page, x, y, rotated };
  }
  const list = kind === 'stash' ? next.stash : next.inv.bag;
  if (kind === 'slot') next.inv.slots[key] = null;
  else if (count === item.n) list.splice(key, 1);
  else list[key].n -= count;
  const listAtDestination = cell.area === 'stash' ? next.stash : next.inv.bag;
  listAtDestination.push({ ...efcClone(item), n: count, cell });
  if (!efcFits(efcInvWeight(next.inv), efcInvCap(next.inv))) return null;
  const nextLoadout = efcGridLoadout(next.inv);
  if (!nextLoadout) return null;
  const nextGrid = cell.area === 'stash' ? efcGridStash(next.stash)?.[cell.page] : nextLoadout[cell.area];
  if (!nextGrid?.entries.some(entry => entry.index === listAtDestination.length - 1 && entry.x === cell.x && entry.y === cell.y && entry.rotated === cell.rotated)) return null;
  return next;
}

efcProvide('inv:place', (inv, source, cell, preview) => {
  const next = efcGridTransfer(null, inv, source, cell);
  if (!next) return false;
  if (!preview) Object.assign(inv, next.inv);
  return true;
});
efcProvide('inv:receiveAt', (inv, raw, cell, preview = false) => {
  const item = efcItemNorm(raw);
  return !!item && !!cell && cell.area !== 'stash' && !!efcReceivePlaced(inv, item, cell, preview);
});

function efcReceivePlaced(inv, item, cell, preview) {
  const next = efcGridTransfer([item], inv, { kind: 'stash', key: 0, id: item.id }, cell);
  if (next && !preview) Object.assign(inv, next.inv);
  return next;
}

efcProvide('inv:sendGridItem', (inv, source, preview = false) => {
  if (!efcInvOk(inv)) return null;
  const next = efcClone(inv), { key, kind, id, count } = source;
  let item;
  if (kind === 'bag' && next.bag[key]?.id === id) item = efcInvRemove(next, key, count);
  if (kind === 'slot' && EFC_SLOTS.includes(key) && next.slots[key]?.id === id && count == null) {
    item = next.slots[key];
    next.slots[key] = null;
  }
  if (!item || !efcFits(efcInvWeight(next), efcInvCap(next)) || !efcGridLoadout(next)) return null;
  if (!preview) Object.assign(inv, next);
  return item;
});

efcProvide('grid:loadout', efcGridLoadout);
efcProvide('grid:container', efcGridContainer);
efcProvide('grid:new', efcGridNew);
efcProvide('grid:size', efcGridSize);
efcProvide('grid:fits', efcGridFits);
efcProvide('grid:place', efcGridPlace);
efcProvide('grid:move', efcGridMove);
efcProvide('grid:import', efcGridImport);
efcProvide('grid:add', efcGridAdd);
efcProvide('grid:take', efcGridTake);
efcProvide('grid:split', efcGridSplit);
