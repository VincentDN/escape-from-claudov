/* Escape From Claudov stash: the player's persistent items and loadout in localStorage ('efc_stash_v1', shape { v: 1, items, loadout }),
   the starter kit, and the raid hand-over: 'raid:kit' takes the loadout out (it is at risk), 'raid:commit' banks what was extracted.
   Corrupt or missing storage never throws: it falls back to the starter stash. Services: stash:get, stash:toLoadout, stash:toStash,
   stash:save, raid:kit, raid:commit. */

const EFC_STASH_KEY = 'efc_stash_v1';
const EFC_FALLBACK_WEAPON = 'w_m9'; // the free pistol handed to a player with no weapon; never banked
let efcStashCur = null;

function efcStashStarter() {
  const loadout = efcInvNew();
  for (const it of [{ id: 'w_mp5', n: 1 }, { id: 'w_m9', n: 1 }, { id: 'armor_t1', n: 1 }, { id: 'pack_s', n: 1 },
    { id: 'ammo_smg', n: 60 }, { id: 'ammo_pistol', n: 30 }, { id: 'med_bandage', n: 2 }]) efcInvAdd(loadout, it);
  const items = [];
  for (const it of [{ id: 'w_ak47', n: 1 }, { id: 'w_usp', n: 1 }, { id: 'ammo_rifle', n: 90 }, { id: 'ammo_pistol', n: 36 },
    { id: 'med_bandage', n: 3 }, { id: 'med_kit', n: 1 }]) { const n = efcItemNorm(it); if (n) efcStackInto(items, n); }
  return { v: 1, items, loadout };
}
/* Rebuilds a valid Inventory from untrusted data: unknown items dropped, slot items must match their slot */
function efcInvSanitize(raw) {
  const inv = efcInvNew();
  if (!raw || typeof raw !== 'object') return inv;
  const slots = raw.slots && typeof raw.slots === 'object' ? raw.slots : {};
  for (const s of EFC_SLOTS) { const it = efcItemNorm(slots[s]); if (it && efcSlotFor(it.id) === s) inv.slots[s] = it; }
  if (Array.isArray(raw.bag)) for (const r of raw.bag) { const it = efcItemNorm(r); if (it) efcStackInto(inv.bag, it); }
  return inv;
}
function efcStashLoad() {
  let raw = null;
  try { const s = localStorage.getItem(EFC_STASH_KEY); raw = s ? JSON.parse(s) : null; } catch (e) { raw = null; }
  if (!raw || typeof raw !== 'object' || raw.v !== 1 || !Array.isArray(raw.items)) return efcStashStarter();
  const st = { v: 1, items: [], loadout: efcInvSanitize(raw.loadout) };
  for (const r of raw.items) { const it = efcItemNorm(r); if (it) efcStackInto(st.items, it); }
  return st;
}
function efcStash() { return efcStashCur || (efcStashCur = efcStashLoad()); }
function efcStashSave() {
  try { localStorage.setItem(EFC_STASH_KEY, JSON.stringify(efcStash())); return true; } catch (e) { return false; }
}
function efcHasWeapon(list) { return list.some((it) => { const d = efcItemDef(it.id); return d && d.kind === 'weapon' && !it.free; }); }
/* Copy for the UI. fallback: true when the player owns no weapon at all and will get the free pistol on the next raid. */
function efcStashGet() {
  const st = efcStash(), out = efcClone(st);
  out.fallback = !efcHasWeapon(st.items) && !efcHasWeapon(efcInvAll(st.loadout));
  return out;
}
/* Stash entry -> loadout (equipped when its slot is empty, otherwise the bag within the carry limit) */
function efcStashToLoadout(idx) {
  const st = efcStash();
  if (!Number.isInteger(idx) || !st.items[idx]) return false;
  if (!efcInvAdd(st.loadout, st.items[idx])) return false;
  st.items.splice(idx, 1); efcStashSave();
  return true;
}
/* Loadout slot name or bag index -> stash */
function efcStashToStash(where) {
  const st = efcStash(), inv = st.loadout;
  let it = null;
  if (typeof where === 'string' && EFC_SLOTS.includes(where)) { it = inv.slots[where]; inv.slots[where] = null; }
  else if (Number.isInteger(where)) {
    if (inv.bag[where]) it = efcInvRemove(inv, where);
  }
  if (!it) return false;
  if (!it.free) efcStackInto(st.items, it);
  // without a pack the loadout bag may now be over the limit: move the overflow to the stash
  while (inv.bag.length && !efcFits(efcInvWeight(inv), efcInvCap(inv))) efcStackInto(st.items, inv.bag.pop());
  efcStashSave();
  return true;
}
/* The raid kit: a copy of the loadout, which leaves the stash (it is at risk). Never unarmed: a bag weapon is equipped, else the
   free fallback pistol (free: true, never banked) is added. */
function efcRaidKit() {
  const st = efcStash(), kit = efcInvSanitize(st.loadout);
  st.loadout = efcInvNew();
  if (!kit.slots.primary && !kit.slots.sidearm) {
    const i = kit.bag.findIndex((it) => efcItemDef(it.id).kind === 'weapon');
    if (i >= 0) efcInvEquip(kit, i);
    else {
      const free = efcItemNorm({ id: EFC_FALLBACK_WEAPON, n: 1 }); free.free = true;
      kit.slots.sidearm = free;
    }
  }
  efcStashSave();
  return kit;
}
/* 'extracted': everything carried (except free items) goes to the stash. Any other result: everything is lost. */
function efcRaidCommit(result, inv) {
  const st = efcStash();
  if (result === 'extracted') for (const it of efcInvAll(inv)) { const n = efcItemNorm(it); if (n && !it.free) efcStackInto(st.items, n); }
  // the loadout becomes a new empty inventory (it is already empty since raid:kit; anything put there meanwhile is banked, not lost)
  for (const it of efcInvAll(st.loadout)) if (!it.free) efcStackInto(st.items, it);
  st.loadout = efcInvNew();
  efcStashSave();
  return true;
}

efcProvide('stash:get', efcStashGet);
efcProvide('stash:toLoadout', efcStashToLoadout);
efcProvide('stash:toStash', efcStashToStash);
efcProvide('stash:save', efcStashSave);
efcProvide('raid:kit', efcRaidKit);
efcProvide('raid:commit', efcRaidCommit);
/* Hideout: equip a bag item of the stored loadout into its slot, and save */
function efcStashEquip(bagIdx) {
  const st = efcStash();
  if (!efcInvEquip(st.loadout, bagIdx)) return false;
  efcStashSave();
  return true;
}
efcProvide('stash:equip', efcStashEquip);
