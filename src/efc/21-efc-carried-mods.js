/* Field changes are limited to small parts. Validate space before replacing the live kit. */
function efcCarriedMod(weaponSlot, bagIndex, detachSlot, destination, preview) {
  const inv = EFC.inv, weapon = inv?.slots[weaponSlot];
  if (!efcRaidLive() || !['primary', 'sidearm'].includes(weaponSlot) || !efcModSlots(weapon).length) return false;
  const incoming = Number.isInteger(bagIndex) && inv.bag[bagIndex];
  const slot = incoming ? efcModFit(weapon, incoming.id) : detachSlot;
  if (incoming?.free || !EFC_MOD_FIELD.includes(slot)) return false;
  const existing = weapon.mods?.parts || [], old = existing.find(id => efcModFit(weapon, id) === slot);
  if (incoming ? incoming.id === old : !old) return false;
  const parts = existing.filter(id => id !== old);
  if (incoming) parts.push(incoming.id);
  const changed = efcModApply(weapon, parts, weapon.mods?.finish || 'stock');
  if (!changed) return false;
  const draft = { ...inv, slots: { ...inv.slots, [weaponSlot]: changed }, bag: efcClone(inv.bag) };
  if (incoming) draft.bag.splice(bagIndex, 1);
  if (old) {
    const item = { id: old, n: 1 };
    const fits = destination ? efcCall('inv:receiveAt', draft, item, destination) : efcCall('inv:add', draft, item);
    if (!fits) return false;
  }
  if (preview) return true;
  inv.slots = draft.slots;
  inv.bag = draft.bag;
  efcEmit('inv:changed');
  return true;
}
efcProvide('weaponmods:mountCarried', (slot, index) => efcCarriedMod(slot, index));
efcProvide('weaponmods:detachCarried', (slot, partSlot, cell, preview) => efcCarriedMod(slot, null, partSlot, cell, preview));
