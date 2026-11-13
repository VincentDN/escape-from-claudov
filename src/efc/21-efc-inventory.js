/* Escape From Claudov inventory logic: pure functions on a plain JSON Inventory (shape in docs/contracts/CONTRACT.md), the
   'inv:*' services, and the 'loot:give' listener that puts granted loot into the local player's raid inventory (EFC.inv).
   Weight counts the bag only (equipped slots are free); the carry limit is EFC.cfg.bagBase plus the equipped pack's cap.
   Items passed in are copied: the inventory never holds a reference the caller still owns. */

const EFC_SLOTS = ['primary', 'sidearm', 'armor', 'pack'];

function efcInvNew() { return { slots: { primary: null, sidearm: null, armor: null, pack: null }, bag: [] }; }
function efcInvOk(inv) { return !!(inv && inv.slots && Array.isArray(inv.bag)); }
function efcItemWeight(it) { const d = it && efcItemDef(it.id); return d ? d.w * (it.n || 1) : 0; }
function efcItemValue(it) { const d = it && efcItemDef(it.id); return d ? d.value * (it.n || 1) : 0; }
function efcBagWeight(bag) { let w = 0; for (const it of bag) w += efcItemWeight(it); return Math.round(w * 1000) / 1000; }
function efcInvWeight(inv) { return efcInvOk(inv) ? efcBagWeight(inv.bag) : 0; }
function efcPackCap(pack) { const d = pack && efcItemDef(pack.id); return d && d.pack ? d.pack.cap : 0; }
function efcInvCap(inv) {
  const base = typeof EFC !== 'undefined' && EFC.cfg && Number.isFinite(EFC.cfg.bagBase) ? EFC.cfg.bagBase : 8;
  return base + (efcInvOk(inv) ? efcPackCap(inv.slots.pack) : 0);
}
/* Small tolerance so float sums such as 0.1 * 3 never refuse an exact fit */
function efcFits(weight, cap) { return weight <= cap + 1e-6; }
function efcInvAll(inv) {
  if (!efcInvOk(inv)) return [];
  const out = [];
  for (const s of EFC_SLOTS) if (inv.slots[s]) out.push(efcClone(inv.slots[s]));
  for (const it of inv.bag) out.push(efcClone(it));
  return out;
}
function efcInvValue(inv) { let v = 0; for (const it of efcInvAll(inv)) v += efcItemValue(it); return v; }

/* The slot an item goes to, or null for bag-only items */
function efcSlotFor(id) {
  const d = efcItemDef(id); if (!d) return null;
  if (d.kind === 'weapon') return d.weapon.slot;
  if (d.kind === 'armor') return 'armor';
  if (d.kind === 'pack') return 'pack';
  return null;
}

/* Merges a stackable item into a list of stacks (fills existing stacks, then appends new ones). Mutates `list`. */
function efcStackInto(list, it) {
  const max = efcStackMax(it.id);
  let n = it.n;
  if (max > 1) for (const s of list) { if (n <= 0) break; if (s.id === it.id && s.n < max && !s.free && !it.free) { const k = Math.min(max - s.n, n); s.n += k; n -= k; } }
  while (n > 0) { const s = efcClone(it); s.n = Math.min(max, n); list.push(s); n -= s.n; }
}

/* Adds an item: auto-equips into an empty matching slot, otherwise stacks into the bag if the whole item fits under the limit. */
function efcInvAdd(inv, item) {
  if (!efcInvOk(inv)) return false;
  const it = efcItemNorm(item); if (!it) return false;
  const slot = efcSlotFor(it.id);
  if (slot && !inv.slots[slot]) { inv.slots[slot] = it; return true; }
  if (!efcFits(efcInvWeight(inv) + efcItemWeight(it), efcInvCap(inv))) return false;
  efcStackInto(inv.bag, it);
  return true;
}
/* Takes n (default: the whole stack) from bag entry bagIdx; returns the removed Item or null */
function efcInvRemove(inv, bagIdx, n) {
  if (!efcInvOk(inv) || !Number.isInteger(bagIdx) || !inv.bag[bagIdx]) return null;
  const s = inv.bag[bagIdx], k = n === undefined || n === null ? s.n : Math.floor(+n);
  if (!(k > 0)) return null;
  if (k >= s.n) { inv.bag.splice(bagIdx, 1); return s; }
  s.n -= k;
  const out = efcClone(s); out.n = k;
  return out;
}
/* Equips bag entry bagIdx into its slot, swapping the slot's item into the bag at the same index. Refused when the bag would end
   over the (new) carry limit. */
function efcInvEquip(inv, bagIdx) {
  if (!efcInvOk(inv) || !Number.isInteger(bagIdx) || !inv.bag[bagIdx]) return false;
  const it = inv.bag[bagIdx], slot = efcSlotFor(it.id); if (!slot) return false;
  const old = inv.slots[slot];
  const bag = inv.bag.slice(); if (old) bag[bagIdx] = old; else bag.splice(bagIdx, 1);
  const cap = efcInvCap({ slots: Object.assign({}, inv.slots, { [slot]: it }), bag });
  if (!efcFits(efcBagWeight(bag), cap)) return false;
  inv.slots[slot] = it; inv.bag = bag;
  return true;
}
/* Moves a slot's item to the bag; refused when it would exceed the carry limit (for a pack: the limit without that pack). */
function efcInvUnequip(inv, slot) {
  if (!efcInvOk(inv) || !EFC_SLOTS.includes(slot) || !inv.slots[slot]) return false;
  const it = inv.slots[slot];
  const cap = efcInvCap({ slots: Object.assign({}, inv.slots, { [slot]: null }), bag: [] });
  if (!efcFits(efcInvWeight(inv) + efcItemWeight(it), cap)) return false;
  inv.slots[slot] = null; inv.bag.push(it);
  return true;
}
/* Live primary and sidearm slot items (missing mag/res filled in place), so the raid code can write the rounds back */
function efcInvWeaponItems(inv) {
  if (!efcInvOk(inv)) return [null, null];
  const f = (s) => { const it = inv.slots[s], d = it && efcItemDef(it.id); return d && d.kind === 'weapon' ? efcWeaponFill(it) : null; };
  return [f('primary'), f('sidearm')];
}
/* The argument for the engine's makeArms(ids): an array of bare engine weapon keys (strings), primary first, then sidearm, empty
   slots omitted, e.g. ['ak47', 'm9'], ['m9'] or []. A bare key is the weapon with no attachments and no camouflage (makeArms resolves
   it to WEAPONS[key]); makeArms fills the magazine and reserve itself, the raid code then applies Item.mag / Item.res. */
function efcInvWeapons(inv) {
  const out = [];
  for (const it of efcInvWeaponItems(inv)) if (it) { const k = efcItemDef(it.id).weapon.wkey; if (typeof WEAPONS === 'undefined' || WEAPONS[k]) out.push(k); }
  return out;
}

efcProvide('inv:new', efcInvNew);
efcProvide('inv:weight', efcInvWeight);
efcProvide('inv:cap', efcInvCap);
efcProvide('inv:value', efcInvValue);
efcProvide('inv:add', efcInvAdd);
efcProvide('inv:remove', efcInvRemove);
efcProvide('inv:equip', efcInvEquip);
efcProvide('inv:unequip', efcInvUnequip);
efcProvide('inv:all', efcInvAll);
efcProvide('inv:weapons', efcInvWeapons);
efcProvide('inv:weaponItems', efcInvWeaponItems);

/* The host granted the local player an item from a container: keep it, or put it back and say why */
efcOn('loot:give', (item, containerId) => {
  if (!item) return;
  if (efcInvOk(EFC.inv) && efcInvAdd(EFC.inv, item)) { efcEmit('inv:changed'); return; }
  efcCall('world:put', containerId === undefined ? null : containerId, efcItemNorm(item) || item);
  if (typeof hudMsg === 'function') hudMsg('Too heavy, no room in your pack', 'none', 1.8);
  efcEmit('inv:changed');
});
