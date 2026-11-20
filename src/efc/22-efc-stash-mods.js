/* Save a complete bench draft in one transaction, charging or returning only the changed parts. */
function efcStashModWeapon(st, where) {
  return Number.isInteger(where) ? st.items[where] : st.loadout.slots[where];
}
function efcStashModSave(where, expected, parts, finish) {
  if (typeof MATCH === 'undefined' || MATCH.state !== 'menu' || UI.screen !== 'hideout') return false;
  const current = efcStash(), weapon = efcStashModWeapon(current, where);
  if (!efcCall('weaponmods:slots', weapon)?.length || JSON.stringify(weapon) !== expected) return false;
  const draft = efcClone(current), changed = efcModApply(weapon, parts, finish);
  if (!changed) return false;
  const previous = weapon.mods?.parts || [], next = changed.mods?.parts || [];
  for (const id of next) {
    if (previous.includes(id)) continue;
    const index = draft.items.findIndex(it => it.id === id && !it.free);
    if (index < 0) return false;
    draft.items.splice(index, 1);
    if (Number.isInteger(where) && index < where) where--;
  }
  for (const id of previous) if (!next.includes(id)) draft.items.push({ id, n: 1 });
  if (Number.isInteger(where)) draft.items[where] = changed;
  else draft.loadout.slots[where] = changed;
  if (!efcStashWrite(draft)) return false;
  efcStashCur = draft;
  efcEmit('stash:changed');
  return true;
}
efcProvide('weaponmods:save', efcStashModSave);

efcProvide('weaponmods:stashDrag', (source, slot, cell, preview = false) => {
  if (MATCH.state !== 'menu' || UI.screen !== 'hideout') return false;
  const draft = efcClone(efcStash()), inv = draft.loadout, weapon = inv.slots.primary;
  if (!weapon || typeof slot !== 'string') return false;
  const existing = weapon.mods?.parts || [];
  const mounted = existing.find(id => efcModFit(weapon, id) === slot);
  const parts = existing.filter(id => id !== mounted);
  if (cell) {
    if (!mounted || source.id !== mounted) return false;
    const item = { id: mounted, n: 1 };
    if (cell.area === 'stash') {
      const grid = efcGridStash(draft.items)?.[cell.page];
      if (!efcGridFits(grid, item, cell.x, cell.y, cell.rotated)) return false;
      draft.items.push({ ...item, cell });
    } else if (!efcCall('inv:receiveAt', inv, item, cell)) return false;
  } else {
    const list = source.kind === 'stash' ? draft.items : source.kind === 'bag' ? inv.bag : null;
    const item = list?.[source.key];
    if (!item || item.free || item.id === mounted || item.id !== source.id || efcModFit(weapon, item.id) !== slot) return false;
    list.splice(source.key, 1);
    parts.push(item.id);
    if (mounted) draft.items.push({ id: mounted, n: 1 });
  }
  inv.slots.primary = efcModApply(weapon, parts, weapon.mods?.finish || 'stock');
  if (!inv.slots.primary) return false;
  return preview || efcStashPublish(draft);
});
