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
