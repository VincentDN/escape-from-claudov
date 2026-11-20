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
  for (const { item, index } of order) {
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
  for (const [index, item] of items.entries()) {
    let grid = efcGridFirstFit(pages.at(-1), item);
    if (!grid) {
      pages.push(efcGridContainer('stash'));
      grid = efcGridFirstFit(pages.at(-1), item);
    }
    grid.entries.at(-1).index = index;
    pages[pages.length - 1] = grid;
  }
  return pages;
}

efcProvide('grid:loadout', efcGridLoadout);
efcProvide('grid:container', efcGridContainer);
efcProvide('grid:new', efcGridNew);
efcProvide('grid:size', efcGridSize);
efcProvide('grid:place', efcGridPlace);
efcProvide('grid:move', efcGridMove);
efcProvide('grid:import', efcGridImport);
efcProvide('grid:add', efcGridAdd);
efcProvide('grid:take', efcGridTake);
efcProvide('grid:split', efcGridSplit);
